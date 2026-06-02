const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");
const { spawn } = require("child_process");

const PORT = Number(process.env.PORT || 5107);
const HOST = "127.0.0.1";
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const DB_PATH = path.join(DATA_DIR, "db.json");
const MAX_BODY_SIZE = 30 * 1024 * 1024;
const MAX_UPLOAD_SIZE = Number(process.env.MAX_UPLOAD_SIZE_BYTES || Number.MAX_SAFE_INTEGER);
const MAX_UPLOAD_CHUNK_SIZE = 12 * 1024 * 1024;
const MAX_GRAPH_SOURCE_CHARS = 320000;
const AI_UNLIMITED_EXTRACTOR = "ai-unlimited-pdf-graph-agent";
const AI_AGENT_TIMEOUT_MS = Math.max(60 * 1000, Number(process.env.AI_PDF_AGENT_TIMEOUT_MS || 8 * 60 * 1000));
const PDF_LIMITS = {
  maxFileBytes: 300 * 1024 * 1024,
  maxStreams: 1400,
  maxCompressedStreamBytes: 12 * 1024 * 1024,
  maxInflatedStreamBytes: 5 * 1024 * 1024,
  maxCollectedStreamChars: 14 * 1024 * 1024,
  maxExtractedTextChars: 260000
};
const PDF_AGENT_TIMEOUT_MS = Math.max(4 * 60 * 1000, Number(process.env.PDF_AGENT_TIMEOUT_MS || 20 * 60 * 1000));

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const graphJobs = new Map();
const uploadSessions = new Map();

function now() {
  return new Date().toISOString();
}

function uid(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function sampleGraph(ownerId, subject, title, global = false) {
  const templates = {
    数学: ["函数", "一次函数", "二次函数", "导数", "极限", "概率", "数列", "解析几何"],
    物理: ["力学", "牛顿定律", "运动学", "动量守恒", "能量守恒", "万有引力", "电磁学", "热学", "光学"],
    化学: ["物质结构", "化学键", "氧化还原", "化学平衡", "电化学", "有机化学", "实验探究"],
    语文: ["现代文阅读", "文言文", "古诗词", "写作", "语言运用", "名著阅读"],
    英语: ["词汇", "语法", "阅读理解", "完形填空", "写作", "听力"]
  };
  const words = templates[subject] || templates.物理;
  const root = `${subject}核心知识`;
  const nodes = [{ id: "n0", label: root, group: "root" }].concat(
    words.map((label, index) => ({ id: `n${index + 1}`, label, group: index % 3 === 0 ? "concept" : "topic" }))
  );
  const links = words.map((_, index) => ({
    source: "n0",
    target: `n${index + 1}`,
    label: index % 2 === 0 ? "包含" : "关联"
  }));
  for (let i = 1; i < words.length; i += 1) {
    if (i % 2 === 0) links.push({ source: `n${i}`, target: `n${i + 1}`, label: "支撑" });
  }
  return {
    id: uid("graph"),
    ownerId,
    subject,
    title,
    sourceName: "系统示例",
    nodes,
    links,
    global,
    createdAt: now(),
    updatedAt: now()
  };
}

function createInitialDb() {
  const teacherId = "20260001";
  const studentId = "20260002";
  const classId = "class_seed";
  const physicsGraph = sampleGraph(teacherId, "物理", "物理学科知识图谱", true);
  const mathGraph = sampleGraph(teacherId, "数学", "高一数学选择性必修一知识图谱", true);
  const conversationId = uid("conv");
  const chatThreadId = uid("thread");
  const homeworkId = uid("homework");

  return {
    users: [
      {
        id: teacherId,
        name: "黄豆",
        role: "teacher",
        password: "123456",
        subject: "数学",
        className: "",
        avatar: "黄",
        createdAt: now()
      },
      {
        id: studentId,
        name: "绿豆",
        role: "student",
        password: "123456",
        subject: "",
        className: "豆1班",
        classIds: [classId],
        avatar: "绿",
        createdAt: now()
      }
    ],
    knowledgeGraphs: [physicsGraph, mathGraph],
    conversations: [
      {
        id: conversationId,
        userId: studentId,
        role: "student",
        title: "物理学习方向",
        mode: "study-plan",
        messages: [
          { id: uid("msg"), role: "assistant", content: "你好！我是你的 AI 导师，请提出你的学习问题。", createdAt: now() }
        ],
        createdAt: now(),
        updatedAt: now()
      }
    ],
    models: [],
    friendships: [
      { userId: teacherId, friendId: studentId, createdAt: now() },
      { userId: studentId, friendId: teacherId, createdAt: now() }
    ],
    chatThreads: [
      {
        id: chatThreadId,
        type: "direct",
        name: "黄豆 / 绿豆",
        memberIds: [teacherId, studentId],
        messages: [
          { id: uid("chat"), fromUserId: teacherId, content: "作业有问题可以在这里问我。", createdAt: now(), deletedFor: [] }
        ],
        createdAt: now(),
        updatedAt: now()
      }
    ],
    classes: [
      {
        id: classId,
        teacherId,
        name: "豆1班",
        subject: "物理",
        inviteCode: "PHYS2601",
        studentIds: [studentId],
        importedRoster: [{ id: studentId, name: "绿豆", source: "seed", createdAt: now() }],
        applications: [],
        createdAt: now(),
        updatedAt: now()
      }
    ],
    homework: [
      {
        id: homeworkId,
        teacherId,
        classId,
        title: "牛顿第二定律应用题",
        description: "请解释 F=ma 在水平面匀加速运动中的含义，并完成一道自拟例题。",
        answer: "力等于质量与加速度的乘积。解题时先受力分析，再列出 F=ma，结合运动学公式求解。",
        attachments: [],
        createdAt: now(),
        updatedAt: now()
      }
    ],
    submissions: []
  };
}

function readDb() {
  ensureDataDir();
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(createInitialDb(), null, 2), "utf8");
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function writeDb(db) {
  ensureDataDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

function publicUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

function generateUserId(db) {
  for (let i = 0; i < 1000; i += 1) {
    const id = String(Math.floor(10000000 + Math.random() * 90000000));
    if (!db.users.some((user) => user.id === id)) return id;
  }
  throw new Error("无法生成唯一用户 ID");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_SIZE) {
        reject(Object.assign(new Error("请求体过大"), { status: 413 }));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(Object.assign(new Error("JSON 格式不正确"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function readBinaryBody(req, limit = MAX_UPLOAD_SIZE) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error(`上传文件过大，当前限制为 ${Math.round(limit / 1024 / 1024)}MB`), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks, size)));
    req.on("error", reject);
  });
}

function send(res, status, payload, headers = {}) {
  res.writeHead(status, { ...JSON_HEADERS, ...headers });
  res.end(JSON.stringify(payload));
}

function sendError(res, status, message) {
  send(res, status, { ok: false, error: message });
}

function notFound(res) {
  sendError(res, 404, "资源不存在");
}

function assertRequired(payload, keys) {
  for (const key of keys) {
    if (payload[key] === undefined || payload[key] === null || payload[key] === "") {
      throw Object.assign(new Error(`缺少字段：${key}`), { status: 400 });
    }
  }
}

function getUser(db, userId) {
  return db.users.find((user) => user.id === userId);
}

function ensureUser(db, userId) {
  const user = getUser(db, userId);
  if (!user) throw Object.assign(new Error("用户不存在"), { status: 404 });
  return user;
}

function normalizeSubject(subject) {
  return String(subject || "通用").trim() || "通用";
}

function limitText(text, maxLength = MAX_GRAPH_SOURCE_CHARS) {
  const value = String(text || "");
  if (value.length <= maxLength) return value;
  const head = value.slice(0, Math.floor(maxLength * 0.72));
  const tail = value.slice(-Math.floor(maxLength * 0.28));
  return `${head}\n\n……中间超长内容已截断，保留开头和结尾用于生成图谱……\n\n${tail}`;
}

function isAiUnlimitedExtractor(extractor) {
  return String(extractor || "") === AI_UNLIMITED_EXTRACTOR;
}

function hasConfiguredUploadLimit() {
  return Number.isFinite(MAX_UPLOAD_SIZE) && MAX_UPLOAD_SIZE < Number.MAX_SAFE_INTEGER;
}

function createGraphJob(meta = {}) {
  const job = {
    id: uid("graphjob"),
    status: "queued",
    stage: "等待处理",
    progress: 3,
    message: "任务已创建",
    graphId: null,
    error: null,
    meta,
    cancelRequested: false,
    abort: null,
    createdAt: now(),
    updatedAt: now()
  };
  graphJobs.set(job.id, job);
  return job;
}

function updateGraphJob(jobId, patch) {
  const job = graphJobs.get(jobId);
  if (!job) return null;
  if (job.status === "canceled" && patch.status !== "canceled") return job;
  Object.assign(job, patch, { updatedAt: now() });
  return job;
}

function canceledGraphError() {
  return Object.assign(new Error("图谱生成已终止"), { canceled: true });
}

function isGraphJobCanceled(jobId) {
  const job = graphJobs.get(jobId);
  return !job || job.cancelRequested || job.status === "canceled";
}

function assertGraphJobActive(jobId) {
  if (isGraphJobCanceled(jobId)) throw canceledGraphError();
}

function cancelGraphJob(jobId) {
  const job = graphJobs.get(jobId);
  if (!job) return null;
  if (["complete", "failed", "canceled"].includes(job.status)) return job;
  job.cancelRequested = true;
  if (typeof job.abort === "function") {
    try {
      job.abort();
    } catch {}
  }
  return updateGraphJob(jobId, {
    status: "canceled",
    stage: "已终止",
    progress: Math.max(0, Number(job.progress || 0)),
    message: "已终止生成，当前表单内容已清空",
    error: null
  });
}

function publicGraphJob(job) {
  if (!job) return null;
  return {
    id: job.id,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    message: job.message,
    graphId: job.graphId,
    error: job.error,
    meta: job.meta,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt
  };
}

function cleanupGraphJobs() {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, job] of graphJobs.entries()) {
    if (new Date(job.updatedAt).getTime() < cutoff) graphJobs.delete(id);
  }
}

function sanitizeFileName(name) {
  return String(name || "upload.pdf").replace(/[\\/:*?"<>|]/g, "_").slice(0, 160);
}

function createUploadSession({ userId, fileName, fileType, size }) {
  ensureDataDir();
  const uploadId = uid("upload");
  const safeName = sanitizeFileName(fileName);
  const filePath = path.join(UPLOAD_DIR, `${uploadId}_${safeName}`);
  const session = {
    id: uploadId,
    userId,
    fileName: safeName,
    fileType: String(fileType || "application/octet-stream"),
    size: Number(size || 0),
    received: 0,
    chunks: 0,
    filePath,
    createdAt: now(),
    updatedAt: now()
  };
  fs.writeFileSync(filePath, Buffer.alloc(0));
  uploadSessions.set(uploadId, session);
  return session;
}

function getUploadSession(uploadId) {
  const session = uploadSessions.get(uploadId);
  if (!session) throw Object.assign(new Error("上传会话不存在或已过期"), { status: 404 });
  return session;
}

function publicUploadSession(session) {
  return {
    id: session.id,
    fileName: session.fileName,
    fileType: session.fileType,
    size: session.size,
    received: session.received,
    chunks: session.chunks,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  };
}

function cleanupUploadSession(uploadId, removeFile = true) {
  const session = uploadSessions.get(uploadId);
  if (!session) return;
  uploadSessions.delete(uploadId);
  if (removeFile) {
    try {
      fs.unlinkSync(session.filePath);
    } catch {}
  }
}

function cleanupUploadSessions() {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, session] of uploadSessions.entries()) {
    if (new Date(session.updatedAt).getTime() < cutoff) cleanupUploadSession(id, true);
  }
}

function decodeDataUrl(dataUrl) {
  const raw = String(dataUrl || "");
  const commaIndex = raw.indexOf(",");
  if (commaIndex < 0) return Buffer.alloc(0);
  return Buffer.from(raw.slice(commaIndex + 1), "base64");
}

function decodeUtf16Hex(hex) {
  const clean = String(hex || "").replace(/\s+/g, "");
  if (!clean) return "";
  if (clean.length % 4 === 0) {
    let text = "";
    for (let i = 0; i < clean.length; i += 4) {
      const code = parseInt(clean.slice(i, i + 4), 16);
      if (Number.isFinite(code) && code > 0) text += String.fromCharCode(code);
    }
    if (/[\u4e00-\u9fa5A-Za-z0-9]/.test(text)) return text;
  }
  const bytes = [];
  for (let i = 0; i < clean.length; i += 2) {
    const byte = parseInt(clean.slice(i, i + 2), 16);
    if (Number.isFinite(byte)) bytes.push(byte);
  }
  return Buffer.from(bytes).toString("utf8").replace(/\u0000/g, "");
}

function decodePdfLiteralString(value) {
  const body = String(value || "").replace(/^\(/, "").replace(/\)$/, "");
  let result = "";
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch !== "\\") {
      result += ch;
      continue;
    }
    const next = body[i + 1];
    if (next === "n") result += "\n";
    else if (next === "r") result += "\r";
    else if (next === "t") result += "\t";
    else if (next === "b") result += "\b";
    else if (next === "f") result += "\f";
    else if (next === "(" || next === ")" || next === "\\") result += next;
    else if (/[0-7]/.test(next || "")) {
      const octal = body.slice(i + 1).match(/^[0-7]{1,3}/)?.[0] || "";
      result += String.fromCharCode(parseInt(octal, 8));
      i += octal.length;
      continue;
    }
    i += 1;
  }
  return result;
}

function parsePdfCMap(text) {
  const map = new Map();
  const bfCharBlocks = text.match(/beginbfchar[\s\S]*?endbfchar/g) || [];
  bfCharBlocks.forEach((block) => {
    const pairs = block.matchAll(/<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>/g);
    for (const pair of pairs) map.set(pair[1].toUpperCase(), decodeUtf16Hex(pair[2]));
  });

  const rangeBlocks = text.match(/beginbfrange[\s\S]*?endbfrange/g) || [];
  rangeBlocks.forEach((block) => {
    const ranges = block.matchAll(/<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>/g);
    for (const range of ranges) {
      const start = parseInt(range[1], 16);
      const end = parseInt(range[2], 16);
      const target = parseInt(range[3], 16);
      const keyWidth = range[1].length;
      for (let code = start; code <= end && code - start < 256; code += 1) {
        const key = code.toString(16).toUpperCase().padStart(keyWidth, "0");
        const value = (target + code - start).toString(16).toUpperCase().padStart(4, "0");
        map.set(key, decodeUtf16Hex(value));
      }
    }
  });
  return map;
}

function decodePdfHexString(value, cmap) {
  const clean = String(value || "").replace(/[<>\s]/g, "").toUpperCase();
  if (!clean) return "";
  if (cmap && cmap.size) {
    const keyLengths = Array.from(new Set([...cmap.keys()].map((key) => key.length))).sort((a, b) => b - a);
    let result = "";
    let index = 0;
    while (index < clean.length) {
      const keyLength = keyLengths.find((length) => cmap.has(clean.slice(index, index + length)));
      if (keyLength) {
        result += cmap.get(clean.slice(index, index + keyLength));
        index += keyLength;
      } else {
        result += decodeUtf16Hex(clean.slice(index, index + 4));
        index += 4;
      }
    }
    return result;
  }
  return decodeUtf16Hex(clean);
}

function extractPdfStrings(content, cmap) {
  const chunks = [];
  const textBlocks = content.match(/BT[\s\S]*?ET/g) || [content];
  textBlocks.forEach((block) => {
    const tj = block.matchAll(/(\((?:\\.|[^\\)])*\)|<[\dA-Fa-f\s]+>)\s*Tj/g);
    for (const match of tj) {
      chunks.push(match[1].startsWith("(") ? decodePdfLiteralString(match[1]) : decodePdfHexString(match[1], cmap));
    }

    const tjArrays = block.matchAll(/\[([\s\S]*?)\]\s*TJ/g);
    for (const arrayMatch of tjArrays) {
      const strings = arrayMatch[1].match(/\((?:\\.|[^\\)])*\)|<[\dA-Fa-f\s]+>/g) || [];
      chunks.push(strings.map((item) => item.startsWith("(") ? decodePdfLiteralString(item) : decodePdfHexString(item, cmap)).join(""));
    }
  });
  return chunks.join("\n");
}

function normalizeExtractedText(text) {
  return String(text || "")
    .replace(/\u0000/g, "")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isLikelyImageStream(dictionary) {
  return /\/Subtype\s*\/Image/.test(dictionary) || /\/Image\b/.test(dictionary) || /DCTDecode|JPXDecode|JBIG2Decode|CCITTFaxDecode/.test(dictionary);
}

function extractPdfTextFromBuffer(buffer, onProgress = () => {}) {
  if (buffer.length > PDF_LIMITS.maxFileBytes) {
    throw Object.assign(new Error(`PDF 文件过大，当前限制为 ${Math.round(PDF_LIMITS.maxFileBytes / 1024 / 1024)}MB。建议拆分章节后上传。`), { status: 413 });
  }
  const binary = buffer.toString("latin1");
  const streamRegex = /<<(?:.|\r|\n)*?>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
  const contentStreams = [];
  const cmap = new Map();
  const stats = {
    scannedStreams: 0,
    skippedStreams: 0,
    imageStreams: 0,
    inflatedStreams: 0,
    collectedChars: 0,
    truncated: false
  };
  let match;
  while ((match = streamRegex.exec(binary))) {
    stats.scannedStreams += 1;
    if (stats.scannedStreams > PDF_LIMITS.maxStreams) {
      stats.truncated = true;
      break;
    }
    const fullMatch = match[0];
    const dictionary = fullMatch.slice(0, fullMatch.indexOf("stream"));
    if (isLikelyImageStream(dictionary)) {
      stats.imageStreams += 1;
      continue;
    }
    let data = Buffer.from(match[1], "latin1");
    if (data.length > PDF_LIMITS.maxCompressedStreamBytes) {
      stats.skippedStreams += 1;
      continue;
    }
    if (/FlateDecode/.test(dictionary)) {
      try {
        data = zlib.inflateSync(data, { maxOutputLength: PDF_LIMITS.maxInflatedStreamBytes });
        stats.inflatedStreams += 1;
      } catch {
        try {
          data = zlib.inflateRawSync(data, { maxOutputLength: PDF_LIMITS.maxInflatedStreamBytes });
          stats.inflatedStreams += 1;
        } catch {
          stats.skippedStreams += 1;
          continue;
        }
      }
    }
    if (data.length > PDF_LIMITS.maxInflatedStreamBytes) {
      stats.skippedStreams += 1;
      continue;
    }
    const stream = data.toString("latin1");
    const parsed = parsePdfCMap(stream);
    parsed.forEach((value, key) => cmap.set(key, value));
    if (/BT|TJ|Tj/.test(stream)) {
      stats.collectedChars += stream.length;
      if (stats.collectedChars <= PDF_LIMITS.maxCollectedStreamChars) {
        contentStreams.push(stream);
      } else {
        stats.truncated = true;
      }
    }
    if (stats.scannedStreams % 80 === 0) onProgress(stats);
  }

  let text = "";
  for (const stream of contentStreams) {
    text += `\n${extractPdfStrings(stream, cmap)}`;
    if (text.length > PDF_LIMITS.maxExtractedTextChars) {
      text = text.slice(0, PDF_LIMITS.maxExtractedTextChars);
      stats.truncated = true;
      break;
    }
  }
  if (!text.trim() && buffer.length < 4 * 1024 * 1024) {
    text = extractPdfStrings(binary, cmap).slice(0, PDF_LIMITS.maxExtractedTextChars);
  }
  return { text: normalizeExtractedText(text), stats };
}

function extractUploadedBookText(file, onProgress = () => {}) {
  if (!file || !file.dataUrl) return { text: "", meta: null };
  const name = String(file.name || "上传书本");
  const type = String(file.type || "");
  const buffer = decodeDataUrl(file.dataUrl);
  return extractUploadedBookBuffer({ name, type, buffer }, onProgress);
}

function extractUploadedBookBuffer({ name = "上传书本", type = "", buffer }, onProgress = () => {}) {
  if (!buffer || !buffer.length) return { text: "", meta: { name, type, method: "empty-upload", characters: 0 } };
  const lowerName = name.toLowerCase();
  let text = "";
  let method = "text-reader";
  let stats = null;
  if (type.includes("pdf") || lowerName.endsWith(".pdf")) {
    method = "local-pdf-text-agent";
    const extracted = extractPdfTextFromBuffer(buffer, onProgress);
    text = extracted.text;
    stats = extracted.stats;
  } else {
    text = buffer.toString("utf8").slice(0, PDF_LIMITS.maxExtractedTextChars);
  }
  return { text, meta: { name, type, method, characters: text.length, size: buffer.length, stats } };
}

function resolvePythonCommand() {
  if (process.env.PDF_AGENT_PYTHON) return process.env.PDF_AGENT_PYTHON;
  return "python";
}

function runAdvancedPdfAgent({ filePath, maxChars, jobId, envOverrides = {}, timeoutMs = PDF_AGENT_TIMEOUT_MS }, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    if (jobId) assertGraphJobActive(jobId);
    const scriptPath = path.join(ROOT, "scripts", "pdf_text_agent.py");
    const outputPath = path.join(UPLOAD_DIR, `${uid("pdftext")}.txt`);
    const python = resolvePythonCommand();
    const child = spawn(python, [scriptPath, filePath, outputPath, String(maxChars)], {
      windowsHide: true,
      cwd: ROOT,
      env: {
        ...process.env,
        PYTHONUTF8: "1",
        PYTHONIOENCODING: "utf-8",
        ...envOverrides
      }
    });
    let stdout = "";
    let stderrBuffer = "";
    let stderrFull = "";
    let canceled = false;
    const startedAt = Date.now();
    const job = jobId ? graphJobs.get(jobId) : null;
    if (job) {
      job.abort = () => {
        canceled = true;
        child.kill();
      };
    }
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("高级 PDF/OCR 智能体解析超时，请尝试拆分 PDF、减少 OCR 页数，或设置 PDF_AGENT_OCR_MAX_PAGES 后重试"));
    }, Math.max(60 * 1000, Number(timeoutMs || PDF_AGENT_TIMEOUT_MS)));

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      stderrFull += text;
      stderrBuffer += text;
      const lines = stderrBuffer.split(/\r?\n/);
      stderrBuffer = lines.pop() || "";
      lines.forEach((line) => {
        if (!line.startsWith("PROGRESS ")) return;
        try {
          if (jobId) assertGraphJobActive(jobId);
          onProgress(JSON.parse(line.slice("PROGRESS ".length)));
        } catch {}
      });
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (job && job.abort) job.abort = null;
      if (canceled || (jobId && isGraphJobCanceled(jobId))) {
        reject(canceledGraphError());
        return;
      }
      if (code !== 0) {
        reject(new Error(stderrFull.trim() || `高级 PDF 智能体退出码：${code}`));
        return;
      }
      try {
        const meta = JSON.parse(stdout.trim() || "{}");
        const text = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
        try {
          fs.unlinkSync(outputPath);
        } catch {}
        resolve({
          text: normalizeExtractedText(text).slice(0, maxChars),
          meta: {
            ...meta,
            method: meta.method || "advanced-python-pdf-agent",
            durationMs: Date.now() - startedAt
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function extractUploadedBookFile({ name = "上传书本", type = "", filePath, extractor = "", subject = "", sourceText = "" }, onProgress = () => {}, jobId = null) {
  const size = fs.statSync(filePath).size;
  const lowerName = name.toLowerCase();
  const aiUnlimited = isAiUnlimitedExtractor(extractor);
  if (type.includes("pdf") || lowerName.endsWith(".pdf")) {
    if (aiUnlimited) {
      onProgress({
        method: AI_UNLIMITED_EXTRACTOR,
        stage: "ai-start",
        pages: 0,
        page: 0,
        characters: 0,
        message: "AI 自动图谱智能体正在分块读取 PDF 线索，优先融合文本层、目录、补充内容和文件名"
      });
      try {
        const advanced = await runAdvancedPdfAgent({
          filePath,
          maxChars: Math.min(PDF_LIMITS.maxExtractedTextChars, 160000),
          jobId,
          timeoutMs: AI_AGENT_TIMEOUT_MS,
          envOverrides: {
            PDF_AGENT_OCR_MAX_PAGES: String(process.env.AI_PDF_AGENT_OCR_MAX_PAGES || 10),
            PDF_AGENT_OCR_LEADING_PAGES: String(process.env.AI_PDF_AGENT_OCR_LEADING_PAGES || 10),
            PDF_AGENT_OCR_SCALE: String(process.env.AI_PDF_AGENT_OCR_SCALE || 1.25)
          }
        }, onProgress);
        return {
          text: advanced.text,
          meta: {
            name,
            type,
            size,
            method: AI_UNLIMITED_EXTRACTOR,
            characters: advanced.text.length,
            stats: {
              ...advanced.meta,
              extractor,
              subject,
              suppliedOutlineCharacters: String(sourceText || "").length,
              fallbackReady: advanced.text.trim().length < 20
            }
          }
        };
      } catch (error) {
        if (error.canceled) throw error;
        onProgress({
          method: AI_UNLIMITED_EXTRACTOR,
          stage: "ai-fallback",
          pages: 0,
          page: 0,
          characters: 0,
          message: `AI 自动图谱智能体未取得稳定文本，改用目录/学科/文件名融合生成：${error.message}`
        });
        return {
          text: "",
          meta: {
            name,
            type,
            size,
            method: AI_UNLIMITED_EXTRACTOR,
            characters: 0,
            stats: {
              extractor,
              subject,
              suppliedOutlineCharacters: String(sourceText || "").length,
              fallbackReady: true,
              errors: [error.message]
            }
          }
        };
      }
    }

    try {
      const advanced = await runAdvancedPdfAgent({ filePath, maxChars: PDF_LIMITS.maxExtractedTextChars, jobId }, onProgress);
      if (advanced.text.trim().length >= 20 || advanced.meta?.ocrUsed) {
        return {
          text: advanced.text,
          meta: {
            name,
            type,
            size,
            method: advanced.meta.method,
            characters: advanced.text.length,
            stats: advanced.meta
          }
        };
      }
    } catch (error) {
      if (error.canceled) throw error;
      onProgress({ message: `高级解析失败，切换轻量解析：${error.message}` });
    }

    if (size > PDF_LIMITS.maxFileBytes) {
      throw new Error("高级 PDF/OCR 智能体未能识别到可用文本，且文件过大，无法使用轻量解析兜底。请确认 PaddleOCR 环境可用，或先粘贴目录/知识点后再处理。");
    }
    const buffer = fs.readFileSync(filePath);
    return extractUploadedBookBuffer({ name, type, buffer }, onProgress);
  }
  const text = fs.readFileSync(filePath, "utf8").slice(0, PDF_LIMITS.maxExtractedTextChars);
  return { text, meta: { name, type, size, method: "text-reader", characters: text.length, stats: null } };
}

function splitKnowledgeSentences(text) {
  return String(text || "")
    .split(/(?<=[。！？!?；;])|\n+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 6)
    .slice(0, 80);
}

function knowledgePointsForKeyword(text, keyword) {
  const sentences = splitKnowledgeSentences(text);
  const exact = sentences.filter((sentence) => sentence.includes(keyword)).slice(0, 5);
  if (exact.length) return exact.map((sentence) => sentence.slice(0, 160));
  return sentences.slice(0, 3).map((sentence) => sentence.slice(0, 160));
}

function extractKeywords(text, subject) {
  const source = `${subject} ${String(text || "")}`;
  const stopWords = new Set(["这是", "一个", "可以", "进行", "知识", "图谱", "学生", "老师", "内容", "文件", "上传", "生成", "学习", "教学", "本节", "掌握", "理解"]);
  const cnWords = (source.match(/[\u4e00-\u9fa5]{2,10}/g) || []).filter((word) => !stopWords.has(word));
  const enWords = Array.from(new Set((source.match(/[A-Za-z][A-Za-z0-9_-]{2,}/g) || []).map((word) => word.toLowerCase())));
  const rankedCn = Array.from(cnWords.reduce((map, word) => map.set(word, (map.get(word) || 0) + 1), new Map()).entries())
    .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)
    .map(([word]) => word);
  const merged = rankedCn.concat(enWords).slice(0, 12);
  if (merged.length >= 5) return merged;
  const fallback = {
    数学: ["函数", "方程", "导数", "图像", "概率", "数列"],
    物理: ["运动", "力", "能量", "动量", "电场", "磁场"],
    化学: ["反应", "结构", "实验", "平衡", "电解", "有机物"],
    语文: ["阅读", "写作", "文言文", "修辞", "人物", "主题"],
    英语: ["vocabulary", "grammar", "reading", "writing", "listening"]
  };
  return Array.from(new Set(merged.concat(fallback[subject] || fallback.物理))).slice(0, 10);
}

const COMPUTER_ORG_OUTLINE = [
  {
    label: "计算机系统概述",
    points: ["计算机发展历程", "系统层次结构", "硬件与软件接口", "性能指标"],
    details: "对应目录第 1 章，建立计算机系统整体视角，理解硬件、软件、层次结构、工作原理和性能评价。",
    sections: [
      {
        label: "计算机发展历程",
        points: ["理解硬件和软件的发展脉络，建立系统演进视角。"],
        children: ["计算机硬件的发展", "计算机软件的发展"]
      },
      {
        label: "计算机系统层次结构",
        points: ["计算机系统由硬件系统和软件系统共同组成。", "ISA 是软件和硬件之间的重要接口。"],
        children: ["计算机系统的组成", "计算机硬件", "计算机软件", "计算机系统的层次结构", "计算机系统的工作原理"]
      },
      {
        label: "计算机的性能指标",
        points: ["主频、时钟周期、CPI、MIPS、FLOPS、吞吐率和响应时间需要结合场景解释。"],
        children: ["计算机的主要性能指标", "几个专业术语"]
      },
      {
        label: "本章小结",
        points: ["用系统组成、层次结构和性能指标串联本章。"],
        children: ["常见问题和易混淆知识点"]
      }
    ]
  },
  {
    label: "数据的表示和运算",
    points: ["数制与编码", "定点数", "运算电路", "浮点数"],
    details: "对应目录第 2 章，解决数据如何在机器中编码、存储和参与算术逻辑运算的问题。",
    sections: [
      {
        label: "数制与编码",
        points: ["二进制、八进制、十六进制之间可按位分组转换。", "整数类型转换需要关注位宽、符号扩展和截断。"],
        children: ["进位计数制及其相互转换", "定点数的编码表示", "整数的表示", "C 语言中的整数类型及类型转换"]
      },
      {
        label: "运算方法和运算电路",
        points: ["基本运算部件、移位、加减、乘除共同构成定点运算基础。"],
        children: ["基本运算部件", "定点数的移位运算", "定点数的加减运算", "定点数的乘除运算"]
      },
      {
        label: "浮点数的表示与运算",
        points: ["阶码、尾数、规格化、舍入和溢出共同决定浮点数表示能力。"],
        children: ["浮点数的表示", "浮点数的加减运算", "C 语言中的浮点数类型", "数据的大小端和对齐存储"]
      },
      {
        label: "本章小结",
        points: ["从数制编码、定点运算、浮点运算和存储布局形成数据表示主线。"],
        children: ["常见问题和易混淆知识点"]
      }
    ]
  },
  {
    label: "存储系统",
    points: ["存储层次", "主存储器", "Cache", "虚拟存储器"],
    details: "对应目录第 3 章，围绕容量、速度、成本之间的矛盾建立多级存储层次。",
    sections: [
      {
        label: "存储器概述",
        points: ["寄存器、Cache、主存、辅存构成由快到慢、由小到大的层次。"],
        children: ["存储器的分类", "存储器的性能指标", "多级层次的存储系统"]
      },
      {
        label: "主存储器",
        points: ["SRAM、DRAM、ROM、地址译码和多模块结构是主存设计核心。"],
        children: ["SRAM 芯片和 DRAM 芯片", "只读存储器", "主存储器的基本组成", "多模块存储器"]
      },
      {
        label: "主存储器与 CPU 的连接",
        points: ["主存与 CPU 的连接要处理容量扩展、地址分配、片选和数据线连接。"],
        children: ["连接原理", "主存容量的扩展", "存储芯片的地址分配和片选", "存储器与 CPU 的连接"]
      },
      {
        label: "外部存储器",
        points: ["外存关注非易失、大容量和较慢访问速度。"],
        children: ["磁盘存储器", "固态硬盘"]
      },
      {
        label: "高速缓冲存储器",
        points: ["局部性原理、映射方式、替换算法和一致性问题影响 Cache 命中率。"],
        children: ["程序访问的局部性原理", "Cache 的基本工作原理", "Cache 和主存的映射方式", "Cache 中主存块的替换算法", "Cache 的一致性问题"]
      },
      {
        label: "虚拟存储器",
        points: ["页式、段式、段页式管理通过地址变换扩展逻辑地址空间。"],
        children: ["虚拟存储器的基本概念", "页式虚拟存储器", "段式虚拟存储器", "段页式虚拟存储器", "虚拟存储器与 Cache 的比较"]
      },
      {
        label: "本章小结",
        points: ["从存储层次、主存、Cache 和虚拟存储器串联访存路径。"],
        children: ["常见问题和易混淆知识点"]
      }
    ]
  },
  {
    label: "指令系统",
    points: ["指令格式", "寻址方式", "机器级代码", "CISC 与 RISC"],
    details: "对应目录第 4 章，说明机器指令如何描述操作、操作数位置以及处理器需要执行的动作。",
    sections: [
      {
        label: "指令系统",
        points: ["操作码、地址码、寻址特征和指令长度共同决定指令表达能力。"],
        children: ["指令集体系结构", "指令的基本格式", "定长操作码指令格式", "扩展操作码指令格式", "指令的操作类型"]
      },
      {
        label: "指令的寻址方式",
        points: ["指令寻址和数据寻址决定操作数定位与访存过程。"],
        children: ["指令寻址和数据寻址", "常见的数据寻址方式"]
      },
      {
        label: "程序的机器级代码表示",
        points: ["汇编指令、选择语句、循环语句和过程调用对应机器级执行过程。"],
        children: ["常用汇编指令介绍", "选择语句的机器级表示", "循环语句的机器级表示", "过程调用的机器级表示"]
      },
      {
        label: "CISC 和 RISC 的基本概念",
        points: ["CISC 指令复杂且类型多，RISC 强调简单指令、流水线和寄存器利用。"],
        children: ["复杂指令系统计算机（CISC）", "精简指令系统计算机（RISC）", "CISC 和 RISC 的比较"]
      },
      {
        label: "本章小结",
        points: ["把指令格式、寻址、机器级程序和体系结构风格连接到 CPU 执行。"],
        children: ["常见问题和易混淆知识点"]
      }
    ]
  },
  {
    label: "中央处理器",
    points: ["CPU 结构", "指令执行", "数据通路", "控制器", "流水线"],
    details: "对应目录第 5 章，关注 CPU 内部如何组织数据流、控制流，并高效完成指令执行。",
    sections: [
      {
        label: "CPU 的功能和基本结构",
        points: ["ALU、寄存器组、控制器、内部总线和状态寄存器构成基本 CPU。"],
        children: ["CPU 的功能", "CPU 的基本结构", "CPU 的寄存器"]
      },
      {
        label: "指令执行过程",
        points: ["取指、译码、执行、访存、写回构成典型指令周期。"],
        children: ["指令周期", "指令周期的数据流", "执行方案"]
      },
      {
        label: "数据通路的功能和基本结构",
        points: ["组合逻辑、时序逻辑、寄存器传送和多路选择器共同组织数据流。"],
        children: ["数据通路的功能", "数据通路的组成", "数据通路的基本结构", "数据通路的操作举例"]
      },
      {
        label: "控制器的功能和工作原理",
        points: ["硬布线控制速度快，微程序控制灵活，二者适合不同设计目标。"],
        children: ["控制器的结构和功能", "硬布线控制器", "微程序控制器"]
      },
      {
        label: "异常和中断机制",
        points: ["异常源于处理器执行过程，中断通常来自外设或外部事件。"],
        children: ["异常和中断的基本概念", "异常和中断的分类", "异常和中断的处理"]
      },
      {
        label: "指令流水线",
        points: ["结构冒险、数据冒险和控制冒险会影响流水线吞吐率。"],
        children: ["指令流水线的基本概念", "流水线的基本实现", "流水线的冒险与处理", "流水线的性能指标", "高级流水线技术"]
      },
      {
        label: "多处理器的基本概念",
        points: ["多处理器通过并行结构提升吞吐能力。"],
        children: ["SISD、SIMD、MIMD 的基本概念", "硬件多线程的基本概念", "多核处理器的基本概念", "共享内存多处理器的基本概念"]
      },
      {
        label: "本章小结",
        points: ["把 CPU 结构、控制、数据通路、流水线和并行处理串成执行主线。"],
        children: ["常见问题和易混淆知识点"]
      }
    ]
  },
  {
    label: "总线",
    points: ["总线概念", "总线分类", "系统总线结构", "总线仲裁"],
    details: "对应目录第 6 章，处理计算机各部件之间共享通信、仲裁、定时和性能评价。",
    sections: [
      {
        label: "总线概述",
        points: ["数据总线、地址总线、控制总线通过仲裁和定时完成共享通信。"],
        children: ["总线的基本概念", "总线的分类", "系统总线的结构", "常见的总线标准", "总线的性能指标"]
      },
      {
        label: "总线仲裁",
        points: ["总线事务和总线定时决定共享总线的访问顺序和传输节拍。"],
        children: ["总线事务", "总线定时"]
      },
      {
        label: "本章小结",
        points: ["用结构、标准、性能、仲裁和定时总结总线系统。"],
        children: ["常见问题和易混淆知识点"]
      }
    ]
  },
  {
    label: "输入/输出系统",
    points: ["I/O 系统", "外部设备", "I/O 接口", "I/O 方式"],
    details: "对应目录第 7 章，处理主机与外部设备之间的数据传送、接口编址、中断和 DMA。",
    sections: [
      {
        label: "I/O 系统基本概念",
        points: ["I/O 系统把外部设备、接口和控制方式纳入主机数据通路。"],
        children: ["输入/输出系统", "外部设备", "I/O 控制方式"]
      },
      {
        label: "I/O 接口",
        points: ["接口完成地址译码、数据缓冲、状态保存和控制命令交互。"],
        children: ["I/O 接口的功能", "I/O 接口的基本结构", "I/O 端口及其编址", "I/O 端口及其地址"]
      },
      {
        label: "I/O 方式",
        points: ["程序查询、中断和 DMA 分别代表不同 CPU 参与程度的数据传送方式。"],
        children: ["程序查询方式", "程序中断方式", "DMA 方式"]
      },
      {
        label: "本章小结",
        points: ["用外设、接口、端口编址、查询、中断和 DMA 串联 I/O 系统。"],
        children: ["常见问题和易混淆知识点"]
      }
    ]
  }
];

function looksLikeComputerOrganization(subject, text) {
  const source = `${subject} ${text}`.toLowerCase();
  return /计算机组成|组成原理|computer organization|cpu|cache|指令系统|存储系统|总线|中央处理器|输入\/输出|i\/o/.test(source);
}

function makeGraphNode({ id, label, group, level, knowledgePoints = [], details = "" }) {
  return {
    id,
    label,
    group,
    level,
    details,
    knowledgePoints: knowledgePoints.filter(Boolean).map((point) => String(point).slice(0, 180))
  };
}

function fallbackOutlinePoints(label, parentLabel = "") {
  const topic = String(label || "知识点");
  const parent = String(parentLabel || "本模块");
  return [
    `掌握「${topic}」的基本概念、适用条件和常见考法。`,
    `理解「${topic}」在「${parent}」中的位置，并能和相邻知识点建立联系。`,
    `复习时关注定义、结构关系、计算规则或执行流程中的易混淆点。`
  ];
}

function buildComputerOrganizationGraph({ ownerId, title, subject, sourceName, sourceText, extraction }) {
  const cleanSubject = normalizeSubject(subject || "计算机组成原理");
  const rootId = "n0";
  const nodes = [makeGraphNode({
    id: rootId,
    label: "计算机组成原理",
    group: "root",
    level: 0,
    details: `由${sourceName || "教材内容"}生成。${extraction?.characters ? `已识别 ${extraction.characters} 个文本字符。` : ""}`,
    knowledgePoints: [
      "围绕数据表示、存储系统、指令系统、CPU、总线与 I/O 建立计算机硬件系统知识主线。",
      "重点关注各部件之间的数据流、控制流、地址变换和性能影响。",
      "适合用于 26 王道《计算机组成原理》教材复习、章节串联和试题定位。"
    ]
  })];
  const links = [];
  COMPUTER_ORG_OUTLINE.forEach((chapter, chapterIndex) => {
    const chapterId = `c${chapterIndex + 1}`;
    nodes.push(makeGraphNode({
      id: chapterId,
      label: chapter.label,
      group: "chapter",
      level: 1,
      details: chapter.details,
      knowledgePoints: chapter.points
    }));
    links.push({ source: rootId, target: chapterId, label: "一级章节" });
    chapter.sections.forEach((rawSection, sectionIndex) => {
      const section = Array.isArray(rawSection)
        ? { label: rawSection[0], points: rawSection[1] || [], children: [] }
        : rawSection;
      const label = section.label;
      const points = Array.isArray(section.points) && section.points.length
        ? section.points
        : fallbackOutlinePoints(label, chapter.label);
      const sectionId = `${chapterId}s${sectionIndex + 1}`;
      nodes.push(makeGraphNode({
        id: sectionId,
        label,
        group: sectionIndex % 2 === 0 ? "concept" : "topic",
        level: 2,
        details: `「${chapter.label}」下的核心知识点：${label}`,
        knowledgePoints: points.length ? points : knowledgePointsForKeyword(sourceText, label)
      }));
      links.push({ source: chapterId, target: sectionId, label: "包含" });
      (section.children || []).forEach((rawChild, childIndex) => {
        const child = typeof rawChild === "string" ? { label: rawChild } : rawChild;
        const childLabel = child.label || `知识点${childIndex + 1}`;
        const childId = `${sectionId}k${childIndex + 1}`;
        const childPoints = Array.isArray(child.points) && child.points.length
          ? child.points
          : fallbackOutlinePoints(childLabel, label);
        nodes.push(makeGraphNode({
          id: childId,
          label: childLabel,
          group: "detail",
          level: 3,
          details: `「${chapter.label} > ${label}」下的三级知识点：${childLabel}`,
          knowledgePoints: childPoints
        }));
        links.push({ source: sectionId, target: childId, label: "细分" });
      });
    });
  });
  [
    ["c2s2", "c5s3", "支撑数据通路"],
    ["c2s3", "c5s3", "进入数据通路"],
    ["c3s5", "c5s6", "缓解访存瓶颈"],
    ["c4s1", "c5s2", "驱动执行过程"],
    ["c4s2", "c3s6", "参与地址变换"],
    ["c5s5", "c7s3", "响应外部事件"],
    ["c6s2", "c7s2", "连接 I/O 接口"],
    ["c7s3", "c3s2", "直接访问主存"],
    ["c3s1", "c5s1", "服务 CPU 访存"]
  ].forEach(([source, target, label]) => links.push({ source, target, label }));
  return {
    id: uid("graph"),
    ownerId,
    subject: cleanSubject,
    title: title || "计算机组成原理知识图谱",
    sourceName: sourceName || "26王道《计算机组成原理》.pdf",
    extraction: extraction || null,
    nodes,
    links,
    global: false,
    createdAt: now(),
    updatedAt: now()
  };
}

function buildGraphFromText({ ownerId, title, subject, sourceName, sourceText, extraction }) {
  const cleanSubject = normalizeSubject(subject);
  const graphSourceText = limitText([sourceText, title, sourceName].filter(Boolean).join("\n\n"));
  if (looksLikeComputerOrganization(cleanSubject, graphSourceText)) {
    return buildComputerOrganizationGraph({ ownerId, title, subject: cleanSubject, sourceName, sourceText: graphSourceText, extraction });
  }
  const keywords = extractKeywords(graphSourceText, cleanSubject);
  const nodes = [{
    id: "n0",
    label: `${cleanSubject}知识主线`,
    group: "root",
    level: 0,
    knowledgePoints: splitKnowledgeSentences(graphSourceText).slice(0, 6),
    details: `由${sourceName || "输入内容"}生成。${extraction?.characters ? `已识别 ${extraction.characters} 个文本字符。` : ""}`
  }];
  const links = [];
  const groups = [];
  for (let i = 0; i < keywords.length; i += 3) groups.push(keywords.slice(i, i + 3));
  groups.forEach((group, groupIndex) => {
    const chapterId = `g${groupIndex + 1}`;
    const chapterLabel = group[0] || `模块${groupIndex + 1}`;
    nodes.push({
      id: chapterId,
      label: chapterLabel,
      group: "chapter",
      level: 1,
      knowledgePoints: knowledgePointsForKeyword(graphSourceText, chapterLabel),
      details: `从书本内容中抽取的一级模块：「${chapterLabel}」。`
    });
    links.push({ source: "n0", target: chapterId, label: "一级模块" });
    group.slice(1).forEach((keyword, sectionIndex) => {
      const nodeId = `${chapterId}s${sectionIndex + 1}`;
      nodes.push({
        id: nodeId,
        label: keyword,
        group: sectionIndex % 2 === 0 ? "concept" : "topic",
        level: 2,
        knowledgePoints: knowledgePointsForKeyword(graphSourceText, keyword),
        details: `从书本内容和补充知识点中抽取的「${keyword}」相关知识。`
      });
      links.push({ source: chapterId, target: nodeId, label: "包含" });
    });
    if (groupIndex > 0) links.push({ source: `g${groupIndex}`, target: chapterId, label: "递进" });
  });
  return {
    id: uid("graph"),
    ownerId,
    subject: cleanSubject,
    title: title || `${cleanSubject}知识图谱`,
    sourceName: sourceName || "手动导入",
    extraction: extraction || null,
    nodes,
    links,
    global: false,
    createdAt: now(),
    updatedAt: now()
  };
}

function validateGraph(raw, fallback) {
  const graph = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.links)) {
    throw Object.assign(new Error("图谱 JSON 需要包含 nodes 和 links 数组"), { status: 400 });
  }
  return {
    id: uid("graph"),
    ownerId: fallback.ownerId,
    subject: normalizeSubject(graph.subject || fallback.subject),
    title: graph.title || fallback.title || "导入知识图谱",
    sourceName: fallback.sourceName || "JSON 导入",
    extraction: graph.extraction || null,
    nodes: graph.nodes.map((node, index) => ({
      id: String(node.id || `n${index}`),
      label: String(node.label || node.name || `节点${index + 1}`),
      group: String(node.group || "topic"),
      level: Number.isFinite(Number(node.level)) ? Number(node.level) : undefined,
      x: Number.isFinite(Number(node.x)) ? Number(node.x) : undefined,
      y: Number.isFinite(Number(node.y)) ? Number(node.y) : undefined,
      details: String(node.details || ""),
      knowledgePoints: Array.isArray(node.knowledgePoints) ? node.knowledgePoints.map(String) : []
    })),
    links: graph.links.map((link) => ({
      source: String(link.source),
      target: String(link.target),
      label: String(link.label || link.relation || "关联")
    })),
    global: false,
    createdAt: now(),
    updatedAt: now()
  };
}

function processGraphGenerationJob(jobId, payload) {
  setImmediate(async () => {
    try {
      const aiUnlimited = isAiUnlimitedExtractor(payload.extractor);
      assertGraphJobActive(jobId);
      updateGraphJob(jobId, {
        status: "running",
        stage: aiUnlimited ? "AI 识别文件" : "解析文件",
        progress: 22,
        message: payload.file?.filePath || payload.file?.buffer?.length
          ? (aiUnlimited ? "AI 自动图谱智能体正在分块读取 PDF，扫描版会做有限 OCR 并融合目录线索" : "正在解析上传文件，扫描版 PDF 会自动尝试 OCR")
          : "正在读取输入内容"
      });

      const uploaded = payload.file?.filePath
        ? await extractUploadedBookFile({
          ...payload.file,
          extractor: payload.extractor,
          subject: payload.subject,
          sourceText: payload.sourceText
        }, (stats) => {
          if (isGraphJobCanceled(jobId)) return;
          const totalPages = Number(stats.pages || 0);
          const currentPage = Number(stats.page || 0);
          const isOcrStage = String(stats.stage || "").startsWith("ocr") || /OCR/i.test(String(stats.method || ""));
          const pdfPageInfo = stats.pdfPage
            ? `（PDF 第 ${stats.pdfPage}${stats.pdfPages ? `/${stats.pdfPages}` : ""} 页）`
            : "";
          updateGraphJob(jobId, {
            progress: totalPages
              ? Math.min(62, 24 + Math.floor((currentPage / Math.max(1, totalPages)) * 38))
              : Math.min(58, 26 + Math.floor(Number(stats.scannedStreams || 0) / 30)),
            message: stats.message || (totalPages
              ? `${stats.method || "PDF 智能体"} 正在${isOcrStage ? "OCR" : "解析"}第 ${currentPage}/${totalPages} 页${pdfPageInfo}，已识别 ${stats.characters || 0} 字符`
              : (stats.message || `已扫描 ${stats.scannedStreams || 0} 个 PDF 内容流，跳过图片流 ${stats.imageStreams || 0} 个`))
          });
        }, jobId)
        : payload.file?.buffer?.length
          ? extractUploadedBookBuffer(payload.file, (stats) => {
            if (isGraphJobCanceled(jobId)) return;
            updateGraphJob(jobId, {
              progress: Math.min(58, 26 + Math.floor(stats.scannedStreams / 30)),
              message: `已扫描 ${stats.scannedStreams} 个 PDF 内容流，跳过图片流 ${stats.imageStreams} 个`
            });
          })
        : { text: "", meta: null };

      assertGraphJobActive(jobId);
      updateGraphJob(jobId, {
        stage: "抽取知识点",
        progress: 66,
        message: uploaded.meta
          ? (aiUnlimited && !uploaded.meta.characters
            ? "AI 自动图谱智能体已进入目录、学科和文件名融合生成"
            : `文本识别完成，识别 ${uploaded.meta.characters} 个字符`)
          : "正在根据补充内容抽取知识点",
        meta: { ...graphJobs.get(jobId).meta, extraction: uploaded.meta }
      });

      const sourceText = limitText([
        uploaded.text,
        payload.sourceText,
        aiUnlimited ? payload.subject : "",
        aiUnlimited ? payload.title : "",
        aiUnlimited ? payload.sourceName : ""
      ].filter(Boolean).join("\n\n"));
      const isPdf = payload.file && (String(payload.file.type || "").includes("pdf") || String(payload.file.name || "").toLowerCase().endsWith(".pdf"));
      if (isPdf && !uploaded.text.trim() && !String(payload.sourceText || "").trim() && !aiUnlimited) {
        throw new Error("PDF 文本层和 OCR 都未识别到可用于生成图谱的内容。请确认本机 PaddleOCR 可用，或在补充目录/知识点中粘贴章节信息后再生成。");
      }

      assertGraphJobActive(jobId);
      updateGraphJob(jobId, { stage: "构建图谱", progress: 82, message: "正在生成节点、关系和节点知识点" });
      const graph = buildGraphFromText({
        ownerId: payload.userId,
        title: payload.title,
        subject: payload.subject,
        sourceName: payload.sourceName || uploaded.meta?.name,
        sourceText,
        extraction: uploaded.meta ? { ...uploaded.meta, agent: payload.extractor || "local-pdf-text-agent" } : null
      });

      assertGraphJobActive(jobId);
      updateGraphJob(jobId, { stage: "保存图谱", progress: 94, message: "正在写入当前账号图谱库" });
      const db = readDb();
      ensureUser(db, payload.userId);
      db.knowledgeGraphs.push(graph);
      writeDb(db);
      updateGraphJob(jobId, {
        status: "complete",
        stage: "生成完成",
        progress: 100,
        message: `图谱已生成：${graph.nodes.length} 个节点，${graph.links.length} 条关系`,
        graphId: graph.id,
        meta: { ...graphJobs.get(jobId).meta, extraction: graph.extraction }
      });
    } catch (error) {
      if (error.canceled || isGraphJobCanceled(jobId)) {
        updateGraphJob(jobId, {
          status: "canceled",
          stage: "已终止",
          progress: Math.max(0, Number(graphJobs.get(jobId)?.progress || 0)),
          message: "已终止生成，当前表单内容已清空",
          error: null
        });
        return;
      }
      updateGraphJob(jobId, {
        status: "failed",
        stage: "生成失败",
        progress: 100,
        message: error.message || "生成失败",
        error: error.message || "生成失败"
      });
    } finally {
      if (payload.uploadId) cleanupUploadSession(payload.uploadId, true);
      else if (payload.file?.filePath) {
        try {
          fs.unlinkSync(payload.file.filePath);
        } catch {}
      }
    }
  });
}

function aiAnswer({ role, mode, prompt }) {
  const text = String(prompt || "").trim();
  const topic = text || "当前知识点";
  const teacherModes = {
    explain: `围绕「${topic}」可以按“概念引入-例题拆解-错因归纳-迁移练习”展开。先用生活场景建立直觉，再把关键公式或定义写成可操作步骤，最后安排 2 道基础题和 1 道综合题检查掌握情况。`,
    questions: `根据「${topic}」生成练习：1. 写出核心概念并说明适用条件。2. 给出一个基础计算题，要求列出关键步骤。3. 设计一个开放题，让学生比较真实情境与理想模型的差异。`,
    plan: `教学方案建议：目标是让学生能解释「${topic}」并完成迁移应用。课堂前 5 分钟诊断前置知识，15 分钟讲解主干，15 分钟小组建模或题目演练，8 分钟展示反馈，最后 2 分钟布置分层作业。`
  };
  const studentModes = {
    explain: `关于「${topic}」，建议先抓住定义和适用条件，再做一道最小例题。你可以把题目拆成“已知量、要求量、相关公式、计算或论证、检查单位/结论”五步。`,
    questions: `给你三道练习：1. 用自己的话解释「${topic}」。2. 完成一道基础题并写出每一步理由。3. 找一个生活中的例子，判断它是否满足该知识点的前提。`,
    plan: `学习方向：先补齐「${topic}」的核心概念，再整理易错点。每天 20 分钟复盘笔记，20 分钟做基础题，10 分钟记录错因；连续三天后做一套综合题检测。`
  };
  const map = role === "teacher" ? teacherModes : studentModes;
  return map[mode] || map.explain;
}

function scoreMatch(answer, submission) {
  const normalize = (text) => Array.from(new Set(String(text || "").replace(/\s+/g, "").match(/[\u4e00-\u9fa5A-Za-z0-9]{1,4}/g) || []));
  const a = normalize(answer);
  const b = normalize(submission);
  if (!a.length || !b.length) return 60;
  const overlap = b.filter((item) => a.includes(item)).length;
  const score = Math.round(Math.min(100, Math.max(45, (overlap / a.length) * 100 + 20)));
  return score;
}

function findOrCreateDirectThread(db, userA, userB) {
  let thread = db.chatThreads.find((item) => item.type === "direct" && item.memberIds.includes(userA) && item.memberIds.includes(userB));
  if (!thread) {
    const a = getUser(db, userA);
    const b = getUser(db, userB);
    thread = {
      id: uid("thread"),
      type: "direct",
      name: `${a ? a.name : userA} / ${b ? b.name : userB}`,
      memberIds: [userA, userB],
      messages: [],
      createdAt: now(),
      updatedAt: now()
    };
    db.chatThreads.push(thread);
  }
  return thread;
}

function areFriends(db, userId, friendId) {
  return db.friendships.some((item) => item.userId === userId && item.friendId === friendId);
}

function addFriendship(db, userId, friendId) {
  if (userId === friendId) throw Object.assign(new Error("不能添加自己为好友"), { status: 400 });
  if (!areFriends(db, userId, friendId)) db.friendships.push({ userId, friendId, createdAt: now() });
  if (!areFriends(db, friendId, userId)) db.friendships.push({ userId: friendId, friendId: userId, createdAt: now() });
  return findOrCreateDirectThread(db, userId, friendId);
}

function routePattern(pathname, pattern) {
  const a = pathname.split("/").filter(Boolean);
  const b = pattern.split("/").filter(Boolean);
  if (a.length !== b.length) return null;
  const params = {};
  for (let i = 0; i < b.length; i += 1) {
    if (b[i].startsWith(":")) params[b[i].slice(1)] = decodeURIComponent(a[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

function getRelevantState(db, userId) {
  const user = ensureUser(db, userId);
  const classIds = user.role === "teacher"
    ? db.classes.filter((item) => item.teacherId === userId).map((item) => item.id)
    : (user.classIds || []);
  return {
    user: publicUser(user),
    users: db.users.map(publicUser),
    knowledgeGraphs: db.knowledgeGraphs.filter((graph) => graph.ownerId === userId || graph.global),
    conversations: db.conversations.filter((conv) => conv.userId === userId),
    models: db.models.filter((model) => model.ownerId === userId),
    friends: db.friendships.filter((item) => item.userId === userId).map((item) => publicUser(getUser(db, item.friendId))).filter(Boolean),
    chatThreads: db.chatThreads.filter((thread) => thread.memberIds.includes(userId)).map((thread) => ({
      ...thread,
      messages: thread.messages.filter((message) => !(message.deletedFor || []).includes(userId))
    })),
    classes: db.classes.filter((item) => item.teacherId === userId || item.studentIds.includes(userId)),
    homework: db.homework.filter((item) => item.teacherId === userId || classIds.includes(item.classId)),
    submissions: db.submissions.filter((item) => item.studentId === userId || db.homework.some((homework) => homework.id === item.homeworkId && homework.teacherId === userId))
  };
}

async function handleApi(req, res, pathname, searchParams) {
  const method = req.method;
  const db = readDb();

  if (method === "POST" && pathname === "/api/auth/register") {
    const body = await readBody(req);
    assertRequired(body, ["name", "password", "role"]);
    if (!["teacher", "student"].includes(body.role)) throw Object.assign(new Error("身份必须是 teacher 或 student"), { status: 400 });
    const user = {
      id: generateUserId(db),
      name: String(body.name).trim(),
      role: body.role,
      password: String(body.password),
      subject: body.role === "teacher" ? String(body.subject || "") : "",
      className: String(body.className || ""),
      classIds: [],
      avatar: String(body.name).trim().slice(0, 1) || "用",
      createdAt: now()
    };
    db.users.push(user);
    writeDb(db);
    return send(res, 201, { ok: true, user: publicUser(user), message: `注册成功，系统分配 ID：${user.id}` });
  }

  if (method === "POST" && pathname === "/api/auth/login") {
    const body = await readBody(req);
    assertRequired(body, ["account", "password"]);
    const account = String(body.account).trim();
    const user = db.users.find((item) => (item.id === account || item.name === account) && item.password === String(body.password));
    if (!user) return sendError(res, 401, "账号或密码错误");
    return send(res, 200, { ok: true, user: publicUser(user), state: getRelevantState(db, user.id) });
  }

  if (method === "GET" && pathname === "/api/state") {
    return send(res, 200, { ok: true, state: getRelevantState(db, searchParams.get("userId")) });
  }

  if (method === "GET" && pathname === "/api/users/search") {
    const userId = searchParams.get("userId");
    const query = String(searchParams.get("query") || "").trim().toLowerCase();
    const role = searchParams.get("role");
    const users = db.users
      .filter((user) => user.id !== userId)
      .filter((user) => !role || user.role === role)
      .filter((user) => !query || user.id.toLowerCase().includes(query) || user.name.toLowerCase().includes(query))
      .slice(0, 20)
      .map(publicUser);
    return send(res, 200, { ok: true, users });
  }

  let params = routePattern(pathname, "/api/users/:id");
  if (method === "PUT" && params) {
    const body = await readBody(req);
    const user = ensureUser(db, params.id);
    ["name", "subject", "className", "email", "phone"].forEach((key) => {
      if (body[key] !== undefined) user[key] = String(body[key]);
    });
    if (body.classIds && Array.isArray(body.classIds)) user.classIds = body.classIds.map(String);
    user.updatedAt = now();
    writeDb(db);
    return send(res, 200, { ok: true, user: publicUser(user) });
  }

  if (method === "GET" && pathname === "/api/graphs") {
    const userId = searchParams.get("userId");
    const subject = searchParams.get("subject");
    ensureUser(db, userId);
    let graphs = db.knowledgeGraphs.filter((graph) => graph.ownerId === userId || graph.global);
    if (subject) graphs = graphs.filter((graph) => graph.subject === subject);
    return send(res, 200, { ok: true, graphs });
  }

  if (method === "POST" && pathname === "/api/uploads/start") {
    cleanupUploadSessions();
    const body = await readBody(req);
    assertRequired(body, ["userId", "fileName", "size"]);
    ensureUser(db, body.userId);
    const size = Number(body.size || 0);
    if (!Number.isFinite(size) || size <= 0) return sendError(res, 400, "文件大小不正确");
    if (hasConfiguredUploadLimit() && size > MAX_UPLOAD_SIZE) {
      return sendError(res, 413, `上传文件过大，当前限制为 ${Math.round(MAX_UPLOAD_SIZE / 1024 / 1024)}MB`);
    }
    const session = createUploadSession({
      userId: body.userId,
      fileName: body.fileName,
      fileType: body.fileType,
      size
    });
    return send(res, 201, { ok: true, upload: publicUploadSession(session) });
  }

  params = routePattern(pathname, "/api/uploads/:id/chunk");
  if (method === "POST" && params) {
    const session = getUploadSession(params.id);
    const index = Number(searchParams.get("index") || session.chunks);
    const offset = Number(searchParams.get("offset") || session.received);
    if (offset !== session.received) return sendError(res, 409, "上传分块顺序不一致，请重新上传");
    const chunk = await readBinaryBody(req, MAX_UPLOAD_CHUNK_SIZE);
    if (!chunk.length) return sendError(res, 400, "上传分块为空");
    if (session.received + chunk.length > session.size) return sendError(res, 400, "上传内容超过声明文件大小");
    fs.appendFileSync(session.filePath, chunk);
    session.received += chunk.length;
    session.chunks = Math.max(session.chunks, index + 1);
    session.updatedAt = now();
    return send(res, 200, { ok: true, upload: publicUploadSession(session) });
  }

  if (method === "POST" && pathname === "/api/graphs/generate-upload") {
    const body = await readBody(req);
    assertRequired(body, ["userId", "uploadId", "subject"]);
    ensureUser(db, body.userId);
    const session = getUploadSession(body.uploadId);
    if (session.userId !== body.userId) return sendError(res, 403, "不能使用其他账号的上传文件");
    if (session.received !== session.size) return sendError(res, 400, "文件尚未上传完成");
    const subject = normalizeSubject(body.subject);
    const title = body.title || `${subject}知识图谱`;
    const sourceName = body.sourceName || session.fileName;
    const extractor = body.extractor || AI_UNLIMITED_EXTRACTOR;
    const job = createGraphJob({
      subject,
      title,
      sourceName,
      fileSize: session.size,
      extractor,
      uploadId: session.id
    });
    send(res, 202, { ok: true, job: publicGraphJob(job) });
    processGraphGenerationJob(job.id, {
      userId: body.userId,
      subject,
      title,
      sourceName,
      sourceText: body.sourceText || "",
      extractor,
      uploadId: session.id,
      file: {
        name: session.fileName,
        type: session.fileType,
        filePath: session.filePath
      }
    });
    return;
  }

  params = routePattern(pathname, "/api/graphs/jobs/:id");
  if (method === "GET" && params) {
    cleanupGraphJobs();
    const job = graphJobs.get(params.id);
    if (!job) return notFound(res);
    return send(res, 200, { ok: true, job: publicGraphJob(job) });
  }

  params = routePattern(pathname, "/api/graphs/jobs/:id/cancel");
  if (method === "POST" && params) {
    const job = graphJobs.get(params.id);
    if (!job) return notFound(res);
    const canceled = cancelGraphJob(params.id);
    return send(res, 200, { ok: true, job: publicGraphJob(canceled) });
  }

  if (method === "POST" && pathname === "/api/graphs/generate-file") {
    const userId = searchParams.get("userId");
    const subject = normalizeSubject(searchParams.get("subject"));
    const title = searchParams.get("title") || `${subject}知识图谱`;
    const sourceText = searchParams.get("sourceText") || "";
    const sourceName = searchParams.get("sourceName") || "上传书本";
    const extractor = searchParams.get("extractor") || AI_UNLIMITED_EXTRACTOR;
    assertRequired({ userId, subject }, ["userId", "subject"]);
    ensureUser(db, userId);
    const buffer = await readBinaryBody(req, MAX_UPLOAD_SIZE);
    if (!buffer.length) return sendError(res, 400, "上传文件为空");
    const job = createGraphJob({
      subject,
      title,
      sourceName,
      fileSize: buffer.length,
      extractor
    });
    send(res, 202, { ok: true, job: publicGraphJob(job) });
    processGraphGenerationJob(job.id, {
      userId,
      subject,
      title,
      sourceName,
      sourceText,
      extractor,
      file: {
        name: sourceName,
        type: searchParams.get("fileType") || req.headers["content-type"] || "",
        buffer
      }
    });
    return;
  }

  if (method === "POST" && pathname === "/api/graphs/generate") {
    const body = await readBody(req);
    assertRequired(body, ["userId", "subject"]);
    ensureUser(db, body.userId);
    const uploaded = extractUploadedBookText(body.file);
    const sourceText = [uploaded.text, body.sourceText].filter(Boolean).join("\n\n");
    const graph = buildGraphFromText({
      ownerId: body.userId,
      title: body.title,
      subject: body.subject,
      sourceName: body.sourceName || uploaded.meta?.name,
      sourceText,
      extraction: uploaded.meta ? { ...uploaded.meta, agent: body.extractor || "local-pdf-text-agent" } : null
    });
    db.knowledgeGraphs.push(graph);
    writeDb(db);
    return send(res, 201, { ok: true, graph });
  }

  if (method === "POST" && pathname === "/api/graphs/import") {
    const body = await readBody(req);
    assertRequired(body, ["userId", "graph"]);
    ensureUser(db, body.userId);
    const graph = validateGraph(body.graph, {
      ownerId: body.userId,
      subject: body.subject,
      title: body.title,
      sourceName: body.sourceName
    });
    db.knowledgeGraphs.push(graph);
    writeDb(db);
    return send(res, 201, { ok: true, graph });
  }

  params = routePattern(pathname, "/api/graphs/:id/upload-global");
  if (method === "POST" && params) {
    const body = await readBody(req);
    const graph = db.knowledgeGraphs.find((item) => item.id === params.id);
    if (!graph) return notFound(res);
    if (graph.ownerId !== body.userId) return sendError(res, 403, "只能上传自己的图谱");
    graph.global = true;
    graph.updatedAt = now();
    writeDb(db);
    return send(res, 200, { ok: true, graph });
  }

  params = routePattern(pathname, "/api/graphs/:id");
  if (method === "GET" && params) {
    const graph = db.knowledgeGraphs.find((item) => item.id === params.id);
    if (!graph) return notFound(res);
    return send(res, 200, { ok: true, graph });
  }
  if (method === "DELETE" && params) {
    const userId = searchParams.get("userId");
    const index = db.knowledgeGraphs.findIndex((item) => item.id === params.id);
    if (index < 0) return notFound(res);
    if (db.knowledgeGraphs[index].ownerId !== userId) return sendError(res, 403, "只能删除自己的图谱");
    db.knowledgeGraphs.splice(index, 1);
    writeDb(db);
    return send(res, 200, { ok: true });
  }

  if (method === "GET" && pathname === "/api/conversations") {
    const userId = searchParams.get("userId");
    ensureUser(db, userId);
    return send(res, 200, { ok: true, conversations: db.conversations.filter((item) => item.userId === userId) });
  }

  if (method === "POST" && pathname === "/api/conversations") {
    const body = await readBody(req);
    assertRequired(body, ["userId"]);
    const user = ensureUser(db, body.userId);
    const conv = {
      id: uid("conv"),
      userId: user.id,
      role: user.role,
      title: body.title || "新的对话",
      mode: body.mode || "explain",
      messages: [],
      createdAt: now(),
      updatedAt: now()
    };
    db.conversations.unshift(conv);
    writeDb(db);
    return send(res, 201, { ok: true, conversation: conv });
  }

  if (method === "POST" && pathname === "/api/ai/chat") {
    const body = await readBody(req);
    assertRequired(body, ["userId", "prompt"]);
    const user = ensureUser(db, body.userId);
    let conv = body.conversationId ? db.conversations.find((item) => item.id === body.conversationId && item.userId === user.id) : null;
    if (!conv) {
      conv = {
        id: uid("conv"),
        userId: user.id,
        role: user.role,
        title: String(body.prompt).slice(0, 24) || "新的对话",
        mode: body.mode || "explain",
        messages: [],
        createdAt: now(),
        updatedAt: now()
      };
      db.conversations.unshift(conv);
    }
    const userMessage = { id: uid("msg"), role: "user", content: String(body.prompt), createdAt: now() };
    const assistantMessage = {
      id: uid("msg"),
      role: "assistant",
      content: aiAnswer({ role: user.role, mode: body.mode || conv.mode, prompt: body.prompt }),
      createdAt: now()
    };
    conv.mode = body.mode || conv.mode;
    conv.messages.push(userMessage, assistantMessage);
    conv.updatedAt = now();
    if (conv.title === "新的对话") conv.title = String(body.prompt).slice(0, 24);
    writeDb(db);
    return send(res, 200, { ok: true, conversation: conv, messages: [userMessage, assistantMessage] });
  }

  params = routePattern(pathname, "/api/conversations/:id");
  if (method === "DELETE" && params) {
    const userId = searchParams.get("userId");
    const index = db.conversations.findIndex((item) => item.id === params.id && item.userId === userId);
    if (index < 0) return notFound(res);
    db.conversations.splice(index, 1);
    writeDb(db);
    return send(res, 200, { ok: true });
  }

  if (method === "GET" && pathname === "/api/models") {
    const userId = searchParams.get("userId");
    const subject = searchParams.get("subject");
    ensureUser(db, userId);
    let models = db.models.filter((item) => item.ownerId === userId);
    if (subject) models = models.filter((item) => item.subject === subject);
    return send(res, 200, { ok: true, models });
  }

  if (method === "POST" && pathname === "/api/models") {
    const body = await readBody(req);
    assertRequired(body, ["userId", "name", "subject"]);
    ensureUser(db, body.userId);
    const existing = body.id ? db.models.find((item) => item.id === body.id && item.ownerId === body.userId) : null;
    const payload = {
      ownerId: body.userId,
      name: String(body.name),
      subject: normalizeSubject(body.subject),
      mode: body.mode || "ideal",
      components: Array.isArray(body.components) ? body.components : [],
      notes: String(body.notes || ""),
      updatedAt: now()
    };
    if (existing) {
      Object.assign(existing, payload);
      writeDb(db);
      return send(res, 200, { ok: true, model: existing });
    }
    const model = { id: uid("model"), ...payload, createdAt: now() };
    db.models.unshift(model);
    writeDb(db);
    return send(res, 201, { ok: true, model });
  }

  params = routePattern(pathname, "/api/models/:id");
  if (method === "DELETE" && params) {
    const userId = searchParams.get("userId");
    const index = db.models.findIndex((item) => item.id === params.id && item.ownerId === userId);
    if (index < 0) return notFound(res);
    db.models.splice(index, 1);
    writeDb(db);
    return send(res, 200, { ok: true });
  }

  if (method === "GET" && pathname === "/api/chat") {
    const userId = searchParams.get("userId");
    ensureUser(db, userId);
    return send(res, 200, {
      ok: true,
      friends: db.friendships.filter((item) => item.userId === userId).map((item) => publicUser(getUser(db, item.friendId))).filter(Boolean),
      threads: db.chatThreads.filter((thread) => thread.memberIds.includes(userId)).map((thread) => ({
        ...thread,
        messages: thread.messages.filter((message) => !(message.deletedFor || []).includes(userId))
      }))
    });
  }

  if (method === "POST" && pathname === "/api/friends") {
    const body = await readBody(req);
    assertRequired(body, ["userId", "target"]);
    ensureUser(db, body.userId);
    const targetText = String(body.target).trim();
    const friend = db.users.find((user) => user.id === targetText || user.name === targetText || `${user.id}-${user.name}` === targetText);
    if (!friend) return sendError(res, 404, "未找到用户，请检查 ID 或姓名");
    const thread = addFriendship(db, body.userId, friend.id);
    writeDb(db);
    return send(res, 201, { ok: true, friend: publicUser(friend), thread });
  }

  params = routePattern(pathname, "/api/friends/:friendId");
  if (method === "DELETE" && params) {
    const userId = searchParams.get("userId");
    db.friendships = db.friendships.filter((item) => !(item.userId === userId && item.friendId === params.friendId) && !(item.userId === params.friendId && item.friendId === userId));
    writeDb(db);
    return send(res, 200, { ok: true });
  }

  if (method === "POST" && pathname === "/api/chat/groups") {
    const body = await readBody(req);
    assertRequired(body, ["ownerId", "name"]);
    ensureUser(db, body.ownerId);
    const memberIds = Array.from(new Set([body.ownerId].concat(Array.isArray(body.memberIds) ? body.memberIds : []))).filter((id) => getUser(db, id));
    if (memberIds.length < 2) return sendError(res, 400, "群聊至少需要 2 名成员");
    const thread = {
      id: uid("thread"),
      type: "group",
      name: String(body.name),
      memberIds,
      messages: [],
      createdAt: now(),
      updatedAt: now()
    };
    db.chatThreads.unshift(thread);
    writeDb(db);
    return send(res, 201, { ok: true, thread });
  }

  if (method === "POST" && pathname === "/api/chat/messages") {
    const body = await readBody(req);
    assertRequired(body, ["threadId", "fromUserId", "content"]);
    const thread = db.chatThreads.find((item) => item.id === body.threadId && item.memberIds.includes(body.fromUserId));
    if (!thread) return notFound(res);
    const message = { id: uid("chat"), fromUserId: body.fromUserId, content: String(body.content), createdAt: now(), deletedFor: [] };
    thread.messages.push(message);
    thread.updatedAt = now();
    writeDb(db);
    return send(res, 201, { ok: true, message, thread });
  }

  if (method === "DELETE" && pathname === "/api/chat/messages") {
    const body = await readBody(req);
    assertRequired(body, ["threadId", "userId", "messageIds"]);
    const thread = db.chatThreads.find((item) => item.id === body.threadId && item.memberIds.includes(body.userId));
    if (!thread) return notFound(res);
    thread.messages.forEach((message) => {
      if (body.messageIds.includes(message.id)) {
        message.deletedFor = Array.from(new Set([...(message.deletedFor || []), body.userId]));
      }
    });
    thread.updatedAt = now();
    writeDb(db);
    return send(res, 200, { ok: true, thread });
  }

  if (method === "GET" && pathname === "/api/classes") {
    const teacherId = searchParams.get("teacherId");
    const studentId = searchParams.get("studentId");
    let classes = db.classes;
    if (teacherId) classes = classes.filter((item) => item.teacherId === teacherId);
    if (studentId) classes = classes.filter((item) => item.studentIds.includes(studentId));
    return send(res, 200, { ok: true, classes });
  }

  if (method === "POST" && pathname === "/api/classes") {
    const body = await readBody(req);
    assertRequired(body, ["teacherId", "name", "subject"]);
    const teacher = ensureUser(db, body.teacherId);
    if (teacher.role !== "teacher") return sendError(res, 403, "只有教师可以创建班级");
    const klass = {
      id: uid("class"),
      teacherId: teacher.id,
      name: String(body.name),
      subject: normalizeSubject(body.subject),
      inviteCode: crypto.randomBytes(4).toString("hex").toUpperCase(),
      studentIds: [],
      importedRoster: [],
      applications: [],
      createdAt: now(),
      updatedAt: now()
    };
    db.classes.unshift(klass);
    writeDb(db);
    return send(res, 201, { ok: true, class: klass });
  }

  params = routePattern(pathname, "/api/classes/:id/import-students");
  if (method === "POST" && params) {
    const body = await readBody(req);
    const klass = db.classes.find((item) => item.id === params.id);
    if (!klass) return notFound(res);
    if (klass.teacherId !== body.teacherId) return sendError(res, 403, "只能导入自己的班级");
    const rows = Array.isArray(body.students) ? body.students : [];
    const added = [];
    rows.forEach((row) => {
      const name = String(row.name || "").trim();
      const studentNo = String(row.id || "").trim();
      if (!name && !studentNo) return;
      let user = db.users.find((item) => item.role === "student" && (item.id === studentNo || (name && item.name === name)));
      if (!user) {
        user = {
          id: studentNo && /^\d{8}$/.test(studentNo) && !db.users.some((item) => item.id === studentNo) ? studentNo : generateUserId(db),
          name: name || `学生${studentNo || db.users.length + 1}`,
          role: "student",
          password: "123456",
          subject: "",
          className: klass.name,
          classIds: [],
          avatar: (name || "学").slice(0, 1),
          createdAt: now()
        };
        db.users.push(user);
      }
      if (!klass.studentIds.includes(user.id)) klass.studentIds.push(user.id);
      user.classIds = Array.from(new Set([...(user.classIds || []), klass.id]));
      user.className = klass.name;
      if (!klass.importedRoster.some((item) => item.id === user.id)) {
        klass.importedRoster.push({ id: user.id, name: user.name, source: "import", createdAt: now() });
      }
      added.push(publicUser(user));
    });
    klass.updatedAt = now();
    writeDb(db);
    return send(res, 200, { ok: true, added, class: klass });
  }

  params = routePattern(pathname, "/api/classes/:id/apply");
  if (method === "POST" && params) {
    const body = await readBody(req);
    assertRequired(body, ["studentId"]);
    const klass = db.classes.find((item) => item.id === params.id || item.inviteCode === params.id);
    if (!klass) return notFound(res);
    const student = ensureUser(db, body.studentId);
    const existsInRoster = klass.importedRoster.some((item) => item.id === student.id || item.name === student.name);
    if (!klass.studentIds.includes(student.id)) klass.studentIds.push(student.id);
    student.classIds = Array.from(new Set([...(student.classIds || []), klass.id]));
    student.className = klass.name;
    const application = {
      id: uid("app"),
      studentId: student.id,
      studentName: student.name,
      status: "approved",
      reason: existsInRoster ? "导入名单匹配，自动通过" : "不在导入名单，已添加到班级名单并通过",
      createdAt: now(),
      updatedAt: now()
    };
    klass.applications.unshift(application);
    klass.updatedAt = now();
    writeDb(db);
    return send(res, 200, { ok: true, application, class: klass });
  }

  if (method === "GET" && pathname === "/api/homework") {
    const teacherId = searchParams.get("teacherId");
    const studentId = searchParams.get("studentId");
    let homework = db.homework;
    if (teacherId) homework = homework.filter((item) => item.teacherId === teacherId);
    if (studentId) {
      const user = ensureUser(db, studentId);
      const ids = user.classIds || [];
      homework = homework.filter((item) => ids.includes(item.classId));
    }
    return send(res, 200, { ok: true, homework, submissions: db.submissions });
  }

  if (method === "POST" && pathname === "/api/homework") {
    const body = await readBody(req);
    assertRequired(body, ["teacherId", "classId", "title"]);
    const klass = db.classes.find((item) => item.id === body.classId && item.teacherId === body.teacherId);
    if (!klass) return sendError(res, 404, "班级不存在或无权限");
    const homework = {
      id: uid("homework"),
      teacherId: body.teacherId,
      classId: body.classId,
      title: String(body.title),
      description: String(body.description || ""),
      answer: String(body.answer || ""),
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      createdAt: now(),
      updatedAt: now()
    };
    db.homework.unshift(homework);
    writeDb(db);
    return send(res, 201, { ok: true, homework });
  }

  params = routePattern(pathname, "/api/homework/:id/submit");
  if (method === "POST" && params) {
    const body = await readBody(req);
    assertRequired(body, ["studentId"]);
    const homework = db.homework.find((item) => item.id === params.id);
    if (!homework) return notFound(res);
    const student = ensureUser(db, body.studentId);
    if (!(student.classIds || []).includes(homework.classId)) return sendError(res, 403, "该学生不在作业所属班级");
    let submission = db.submissions.find((item) => item.homeworkId === homework.id && item.studentId === student.id);
    const payload = {
      homeworkId: homework.id,
      studentId: student.id,
      answerText: String(body.answerText || ""),
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      status: "submitted",
      updatedAt: now()
    };
    if (submission) {
      Object.assign(submission, payload);
    } else {
      submission = { id: uid("submission"), ...payload, createdAt: now() };
      db.submissions.unshift(submission);
    }
    writeDb(db);
    return send(res, 201, { ok: true, submission });
  }

  params = routePattern(pathname, "/api/submissions/:id/ai-grade");
  if (method === "POST" && params) {
    const body = await readBody(req);
    const submission = db.submissions.find((item) => item.id === params.id);
    if (!submission) return notFound(res);
    const homework = db.homework.find((item) => item.id === submission.homeworkId);
    if (!homework || homework.teacherId !== body.teacherId) return sendError(res, 403, "无批改权限");
    const score = scoreMatch(homework.answer, submission.answerText);
    submission.score = score;
    submission.status = "graded";
    submission.gradeType = "ai";
    submission.comment = `AI 按参考答案匹配度给出 ${score} 分。已结合文字答案，图片/视频内容请在手动复核时确认关键步骤。`;
    submission.gradedAt = now();
    submission.updatedAt = now();
    writeDb(db);
    return send(res, 200, { ok: true, submission });
  }

  params = routePattern(pathname, "/api/submissions/:id/manual-grade");
  if (method === "POST" && params) {
    const body = await readBody(req);
    const submission = db.submissions.find((item) => item.id === params.id);
    if (!submission) return notFound(res);
    const homework = db.homework.find((item) => item.id === submission.homeworkId);
    if (!homework || homework.teacherId !== body.teacherId) return sendError(res, 403, "无批改权限");
    submission.score = Number(body.score);
    submission.status = "graded";
    submission.gradeType = "manual";
    submission.comment = String(body.comment || "");
    submission.gradedAt = now();
    submission.updatedAt = now();
    writeDb(db);
    return send(res, 200, { ok: true, submission });
  }

  return notFound(res);
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
  }[ext] || "application/octet-stream";
}

function serveStatic(req, res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      fs.readFile(path.join(PUBLIC_DIR, "index.html"), (fallbackError, fallback) => {
        if (fallbackError) {
          res.writeHead(404);
          res.end("Not found");
        } else {
          res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          res.end(fallback);
        }
      });
      return;
    }
    res.writeHead(200, { "content-type": contentType(filePath) });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url.pathname, url.searchParams);
      return;
    }
    serveStatic(req, res, url.pathname);
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error(error);
    sendError(res, status, error.message || "服务器错误");
  }
});

function listenWithFallback(port, attemptsLeft = 20) {
  server.once("error", (error) => {
    if ((error.code === "EADDRINUSE" || error.code === "EACCES") && !process.env.PORT && attemptsLeft > 0) {
      listenWithFallback(port + 1, attemptsLeft - 1);
      return;
    }
    console.error(error);
    process.exit(1);
  });
  server.listen(port, HOST, () => {
    ensureDataDir();
    readDb();
    console.log(`智慧教育智能体平台已启动：http://${HOST}:${port}`);
  });
}

listenWithFallback(PORT);
