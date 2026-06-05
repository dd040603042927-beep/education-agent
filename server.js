const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");
const { spawn } = require("child_process");

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) return;
    const index = clean.indexOf("=");
    if (index <= 0) return;
    const key = clean.slice(0, index).trim();
    let value = clean.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  });
}

loadEnvFile();

const PORT = Number(process.env.PORT || 5107);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, "data"));
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const RUNTIME_DIR = path.join(DATA_DIR, "runtime");
const LOG_DIR = path.resolve(process.env.LOG_DIR || path.join(ROOT, "logs"));
const DB_PATH = path.join(DATA_DIR, "db.json");
const AUDIT_LOG_PATH = path.join(LOG_DIR, "audit.log");
const GRAPH_JOBS_PATH = path.join(RUNTIME_DIR, "graph_jobs.json");
const UPLOAD_SESSIONS_PATH = path.join(RUNTIME_DIR, "upload_sessions.json");
const MAX_BODY_SIZE = 30 * 1024 * 1024;
const MAX_UPLOAD_SIZE = Number(process.env.MAX_UPLOAD_SIZE_BYTES || Number.MAX_SAFE_INTEGER);
const MAX_UPLOAD_CHUNK_SIZE = 12 * 1024 * 1024;
const MAX_GRAPH_SOURCE_CHARS = 320000;
const RAG_CHUNK_CHARS = 900;
const RAG_CHUNK_OVERLAP = 160;
const RAG_MAX_CONTEXT_CHUNKS = 5;
const RAG_VECTOR_DIM = 64;
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
const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || "edu_session";
const SESSION_SECRET_CONFIGURED = Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET !== "replace-with-a-long-random-secret");
const SESSION_SECRET = SESSION_SECRET_CONFIGURED ? process.env.SESSION_SECRET : crypto.createHash("sha256").update(`${ROOT}:education-agent-dev-secret`).digest("hex");
const SESSION_MAX_IDLE_TIMEOUT_MS = 2 * 24 * 60 * 60 * 1000;
const REQUESTED_SESSION_IDLE_TIMEOUT_MS = Number(process.env.SESSION_IDLE_TIMEOUT_MS || process.env.SESSION_TTL_MS || SESSION_MAX_IDLE_TIMEOUT_MS);
const SESSION_IDLE_TIMEOUT_MS = Math.max(30 * 60 * 1000, Math.min(SESSION_MAX_IDLE_TIMEOUT_MS, REQUESTED_SESSION_IDLE_TIMEOUT_MS));
const SESSION_TTL_MS = SESSION_IDLE_TIMEOUT_MS;
const LOGIN_MAX_FAILURES = Math.max(3, Number(process.env.LOGIN_MAX_FAILURES || 5));
const LOGIN_COOLDOWN_MS = Math.max(60 * 1000, Number(process.env.LOGIN_COOLDOWN_MS || 10 * 60 * 1000));
const MODEL_CODE_TIMEOUT_MS = Math.max(1000, Math.min(30 * 1000, Number(process.env.MODEL_CODE_TIMEOUT_MS || 10 * 1000)));
const MODEL_CODE_MAX_CHARS = Math.max(1000, Math.min(200000, Number(process.env.MODEL_CODE_MAX_CHARS || 80000)));
const MODEL_CODE_MAX_OUTPUT_CHARS = Math.max(2000, Math.min(200000, Number(process.env.MODEL_CODE_MAX_OUTPUT_CHARS || 30000)));
const SUPPORTED_UPLOAD_EXTENSIONS = new Set([".pdf", ".txt", ".md", ".csv", ".json", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const TEXT_UPLOAD_EXTENSIONS = new Set([".txt", ".md", ".csv", ".json"]);
const ZIP_OFFICE_EXTENSIONS = new Set([".docx", ".pptx", ".xlsx"]);
const BINARY_OFFICE_EXTENSIONS = new Set([".doc", ".ppt", ".xls"]);
const IMAGE_UPLOAD_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "same-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "content-security-policy": "default-src 'self'; img-src 'self' data: blob:; media-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'"
};
const NO_CACHE_STATIC_EXTENSIONS = new Set([".html", ".js", ".css"]);
const graphJobs = new Map();
const uploadSessions = new Map();

function now() {
  return new Date().toISOString();
}

function uid(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(String(value || ""), "base64url").toString("utf8");
}

function timingSafeEqualText(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password || ""), salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(user, password) {
  if (!user) return false;
  if (user.passwordHash && String(user.passwordHash).startsWith("scrypt$")) {
    const [, salt, expected] = String(user.passwordHash).split("$");
    if (!salt || !expected) return false;
    const actual = crypto.scryptSync(String(password || ""), salt, 64).toString("hex");
    return timingSafeEqualText(actual, expected);
  }
  return user.password !== undefined && String(user.password) === String(password);
}

function migratePasswordIfNeeded(user, password) {
  if (!user.passwordHash) user.passwordHash = hashPassword(password);
  delete user.password;
  user.passwordUpdatedAt = user.passwordUpdatedAt || now();
  return user;
}

function signSessionPayload(payload) {
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifySessionToken(token) {
  const [body, signature] = String(token || "").split(".");
  if (!body || !signature) return null;
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  if (!timingSafeEqualText(signature, expected)) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(body));
    if (!payload.sub || Number(payload.exp || 0) < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function createSessionToken(user) {
  return signSessionPayload({
    sub: user.id,
    role: user.role,
    iat: Date.now(),
    exp: Date.now() + SESSION_TTL_MS,
    idleTtlMs: SESSION_TTL_MS,
    jti: crypto.randomBytes(12).toString("hex")
  });
}

function cookieOptions(maxAgeMs = SESSION_TTL_MS) {
  const secure = process.env.COOKIE_SECURE === "true" ? "; Secure" : "";
  return `HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.max(0, Math.floor(maxAgeMs / 1000))}${secure}`;
}

function sessionCookie(user) {
  return `${SESSION_COOKIE}=${createSessionToken(user)}; ${cookieOptions()}`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; ${cookieOptions(0)}`;
}

function parseCookies(req) {
  return String(req.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const index = part.indexOf("=");
      if (index > 0) cookies[part.slice(0, index)] = decodeURIComponent(part.slice(index + 1));
      return cookies;
    }, {});
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  if (!fs.existsSync(RUNTIME_DIR)) fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function checkDirWritable(dirPath) {
  try {
    ensureDataDir();
    const probePath = path.join(dirPath, `.ready-${process.pid}-${Date.now()}.tmp`);
    fs.writeFileSync(probePath, "ok", "utf8");
    fs.unlinkSync(probePath);
    return true;
  } catch {
    return false;
  }
}

function checkDataDirWritable() {
  return checkDirWritable(DATA_DIR);
}

function checkRuntimeDirWritable() {
  return checkDirWritable(RUNTIME_DIR);
}

function atomicWriteJson(filePath, data) {
  ensureDataDir();
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmpPath, filePath);
}

function readJsonFile(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
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
  return enhanceGraphForEducation({
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
  });
}

function createInitialDb() {
  const teacherId = "20260001";
  const studentId = "20260002";

  return {
    users: [
      {
        id: teacherId,
        name: "黄豆",
        role: "teacher",
        passwordHash: hashPassword("123456"),
        subject: "数学",
        className: "",
        classIds: [],
        avatar: "黄",
        createdAt: now()
      },
      {
        id: studentId,
        name: "绿豆",
        role: "student",
        passwordHash: hashPassword("123456"),
        subject: "",
        className: "",
        classIds: [],
        avatar: "绿",
        createdAt: now()
      }
    ],
    knowledgeGraphs: [],
    conversations: [],
    models: [],
    friendships: [],
    chatThreads: [],
    classes: [],
    homework: [],
    submissions: [],
    courseMaterials: [],
    learningProfiles: [
      createLearningProfile(studentId, "student"),
      createLearningProfile(teacherId, "teacher")
    ],
    wrongNotes: [],
    agentRuns: [],
    auditLogs: [],
    friendRequests: [],
    chatInvites: []
  };
}

function readDb() {
  ensureDataDir();
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(createInitialDb(), null, 2), "utf8");
  }
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  if (ensureDbShape(db)) writeDb(db);
  return db;
}

function writeDb(db) {
  atomicWriteJson(DB_PATH, db);
}

function createLearningProfile(userId, role = "student") {
  return {
    userId,
    role,
    level: role === "teacher" ? "教师" : "待诊断",
    goals: [],
    questionCount: 0,
    practiceCount: 0,
    gradedCount: 0,
    studyMinutes: 0,
    mastery: {},
    weakPoints: [],
    recentActivity: [],
    updatedAt: now()
  };
}

function ensureLearningProfile(db, userId) {
  db.learningProfiles = Array.isArray(db.learningProfiles) ? db.learningProfiles : [];
  const user = getUser(db, userId);
  let profile = db.learningProfiles.find((item) => item.userId === userId);
  if (!profile) {
    profile = createLearningProfile(userId, user?.role || "student");
    db.learningProfiles.push(profile);
  }
  profile.mastery = profile.mastery && typeof profile.mastery === "object" ? profile.mastery : {};
  profile.weakPoints = Array.isArray(profile.weakPoints) ? profile.weakPoints : [];
  profile.recentActivity = Array.isArray(profile.recentActivity) ? profile.recentActivity : [];
  profile.goals = Array.isArray(profile.goals) ? profile.goals : [];
  return profile;
}

function normalizeKeywordText(text) {
  return String(text || "")
    .replace(/[^\u4e00-\u9fa5A-Za-z0-9_+\-#/.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function tokenizeForSearch(text) {
  const normalized = normalizeKeywordText(text);
  const tokens = normalized.match(/[\u4e00-\u9fa5]{2,10}|[a-z0-9_+\-#/.]{2,}/g) || [];
  const cn = normalized.replace(/[^\u4e00-\u9fa5]/g, "");
  for (let index = 0; index < cn.length - 1; index += 1) tokens.push(cn.slice(index, index + 2));
  return Array.from(new Set(tokens)).slice(0, 80);
}

function tokenHash(token) {
  const hash = crypto.createHash("sha1").update(String(token)).digest();
  return hash.readUInt32BE(0);
}

function embeddingFromTokens(tokens) {
  const vector = Array(RAG_VECTOR_DIM).fill(0);
  tokens.forEach((token, index) => {
    const hash = tokenHash(token);
    const slot = hash % RAG_VECTOR_DIM;
    const sign = hash & 1 ? 1 : -1;
    const weight = Math.max(0.4, 1 - index / Math.max(12, tokens.length * 1.5));
    vector[slot] += sign * weight;
  });
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / norm).toFixed(5)));
}

function embeddingForText(text) {
  return embeddingFromTokens(tokenizeForSearch(text));
}

function cosineSimilarity(left = [], right = []) {
  if (!left.length || !right.length) return 0;
  const length = Math.min(left.length, right.length);
  let sum = 0;
  for (let index = 0; index < length; index += 1) sum += Number(left[index] || 0) * Number(right[index] || 0);
  return Math.max(-1, Math.min(1, sum));
}

function sourceChapterForText(text, fallback = "课程资料") {
  const match = String(text || "").match(/第\s*[一二三四五六七八九十百\d]+\s*[章节]\s*[^。\n\r]{0,24}|[一二三四五六七八九十百\d]+[.、]\s*[^。\n\r]{2,24}/);
  return match ? match[0].replace(/\s+/g, " ").trim() : fallback;
}

function chunkCourseMaterialText(text, material) {
  const clean = normalizeExtractedText(text).slice(0, PDF_LIMITS.maxExtractedTextChars);
  const chunks = [];
  if (!clean.trim()) return chunks;
  const paragraphs = clean.split(/\n{2,}|(?<=。|！|？|；)\s*/).map((item) => item.trim()).filter(Boolean);
  let buffer = "";
  let page = 1;
  let chapter = sourceChapterForText(clean, material.title || material.subject || "课程资料");
  const pushChunk = () => {
    const content = buffer.trim();
    if (!content) return;
    chapter = sourceChapterForText(content, chapter);
    const index = chunks.length;
    chunks.push({
      id: `${material.id}_chunk_${index + 1}`,
      index,
      page,
      chapter,
      text: content.slice(0, RAG_CHUNK_CHARS + RAG_CHUNK_OVERLAP),
      keywords: tokenizeForSearch(`${material.subject} ${material.title} ${chapter} ${content}`).slice(0, 36),
      embedding: embeddingForText(`${material.subject} ${material.title} ${chapter} ${content}`)
    });
    page += Math.max(1, Math.round(content.length / 1200));
    buffer = content.slice(Math.max(0, content.length - RAG_CHUNK_OVERLAP));
  };
  paragraphs.forEach((paragraph) => {
    if ((buffer + "\n" + paragraph).length > RAG_CHUNK_CHARS) pushChunk();
    buffer = [buffer, paragraph].filter(Boolean).join("\n");
  });
  pushChunk();
  return chunks.slice(0, 260);
}

function createCourseMaterial({ ownerId, subject, title, sourceName, type = "text/plain", text, global = false, classId = "" }) {
  const id = uid("mat");
  const material = {
    id,
    ownerId,
    subject: normalizeSubject(subject),
    title: String(title || sourceName || "课程资料").trim() || "课程资料",
    sourceName: String(sourceName || title || "手动录入").trim() || "手动录入",
    type,
    text: normalizeExtractedText(text).slice(0, PDF_LIMITS.maxExtractedTextChars),
    chunks: [],
    global: Boolean(global),
    classId: String(classId || ""),
    createdAt: now(),
    updatedAt: now()
  };
  material.chunks = chunkCourseMaterialText(material.text, material);
  return material;
}

function seedCourseMaterials(teacherId) {
  return [
    createCourseMaterial({
      ownerId: teacherId,
      subject: "物理",
      title: "牛顿第二定律课堂讲义",
      sourceName: "系统内置讲义",
      global: true,
      text: "第 1 章 力与运动。牛顿第二定律说明物体的加速度与合外力成正比，与质量成反比，方向与合外力方向相同，公式为 F=ma。解题时通常先选研究对象，再进行受力分析，建立坐标轴，列出合力与加速度的关系。常见误区是把速度方向当成合力方向，或者漏掉摩擦力、支持力等受力。课堂练习应让学生区分匀速、匀加速和静止三种状态。"
    }),
    createCourseMaterial({
      ownerId: teacherId,
      subject: "计算机组成原理",
      title: "Cache 映射方式与主存关系摘要",
      sourceName: "系统内置讲义",
      global: true,
      text: "第 3 章 存储系统。Cache 位于 CPU 和主存之间，用来缓解 CPU 与主存速度不匹配的问题。Cache 与主存的映射方式包括直接映射、全相联映射和组相联映射。直接映射实现简单但冲突较多，全相联映射冲突少但硬件代价高，组相联映射在冲突率和硬件复杂度之间折中。常见考点包括地址划分、命中率、替换算法、写策略以及 Cache 与主存一致性问题。"
    })
  ];
}

function ensureDbShape(db) {
  let changed = false;
  const ensureArray = (key) => {
    if (!Array.isArray(db[key])) {
      db[key] = [];
      changed = true;
    }
  };
  [
    "knowledgeGraphs",
    "conversations",
    "models",
    "classes",
    "homework",
    "courseMaterials",
    "learningProfiles",
    "wrongNotes",
    "agentRuns",
    "submissions",
    "auditLogs",
    "friendships",
    "chatThreads",
    "friendRequests",
    "chatInvites"
  ].forEach(ensureArray);
  db.users = Array.isArray(db.users) ? db.users : [];
  (db.users || []).forEach((user) => {
    if (!user.passwordHash && user.password !== undefined) {
      migratePasswordIfNeeded(user, user.password);
      changed = true;
    }
    if (!["admin", "teacher", "student"].includes(user.role)) {
      user.role = "student";
      changed = true;
    }
    user.classIds = Array.isArray(user.classIds) ? user.classIds : [];
    const before = db.learningProfiles.length;
    ensureLearningProfile(db, user.id);
    if (db.learningProfiles.length !== before) changed = true;
  });
  db.courseMaterials.forEach((material) => {
    if (!Array.isArray(material.chunks) || !material.chunks.length) {
      material.chunks = chunkCourseMaterialText(material.text || "", material);
      changed = true;
    }
    (material.chunks || []).forEach((chunk) => {
      if (!Array.isArray(chunk.embedding) || chunk.embedding.length !== RAG_VECTOR_DIM) {
        chunk.embedding = embeddingForText(`${material.subject} ${material.title} ${chunk.chapter || ""} ${chunk.text || ""}`);
        changed = true;
      }
      if (!Array.isArray(chunk.keywords) || chunk.keywords.length < 8) {
        chunk.keywords = tokenizeForSearch(`${material.subject} ${material.title} ${chunk.chapter || ""} ${chunk.text || ""}`).slice(0, 36);
        changed = true;
      }
    });
  });
  (db.homework || []).forEach((homework) => {
    if (!Array.isArray(homework.rubric) || !homework.rubric.length) {
      homework.rubric = parseRubricInput(homework.rubricText || "", homework);
      homework.rubricText = rubricToText(homework.rubric);
      changed = true;
    }
  });
  (db.chatThreads || []).forEach((thread) => {
    const memberIds = Array.isArray(thread.memberIds) ? Array.from(new Set(thread.memberIds.map(String))) : [];
    if (!Array.isArray(thread.memberIds) || memberIds.length !== thread.memberIds.length) {
      thread.memberIds = memberIds;
      changed = true;
    }
    if (!Array.isArray(thread.messages)) {
      thread.messages = [];
      changed = true;
    }
    if (thread.type === "group") {
      if (!thread.ownerId) {
        thread.ownerId = thread.memberIds[0] || "";
        changed = true;
      }
      const adminIds = Array.isArray(thread.adminIds) && thread.adminIds.length ? Array.from(new Set(thread.adminIds.map(String))) : [thread.ownerId].filter(Boolean);
      if (!Array.isArray(thread.adminIds) || adminIds.length !== thread.adminIds.length) {
        thread.adminIds = adminIds;
        changed = true;
      }
      const pendingInviteIds = Array.isArray(thread.pendingInviteIds) ? Array.from(new Set(thread.pendingInviteIds.map(String))) : [];
      if (!Array.isArray(thread.pendingInviteIds) || pendingInviteIds.length !== thread.pendingInviteIds.length) {
        thread.pendingInviteIds = pendingInviteIds;
        changed = true;
      }
    }
  });
  return changed;
}

function publicUser(user) {
  if (!user) return null;
  const {
    password,
    passwordHash,
    passwordUpdatedAt,
    failedLoginCount,
    lockUntil,
    lastLoginIp,
    ...safe
  } = user;
  return safe;
}

function generateUserId(db) {
  for (let i = 0; i < 1000; i += 1) {
    const id = String(Math.floor(10000000 + Math.random() * 90000000));
    if (!db.users.some((user) => user.id === id)) return id;
  }
  throw new Error("无法生成唯一用户 ID");
}

function normalizeDisplayName(value) {
  const name = String(value || "").replace(/\s+/g, " ").trim();
  if (!name) throw Object.assign(new Error("用户名不能为空"), { status: 400 });
  if (name.length > 30) throw Object.assign(new Error("用户名不能超过 30 个字符"), { status: 400 });
  return name;
}

function normalizeOptionalProfileField(value, maxLength = 60) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizePasswordInput(value) {
  const password = String(value || "");
  if (password.length < 6) throw Object.assign(new Error("密码至少 6 位"), { status: 400 });
  if (password.length > 128) throw Object.assign(new Error("密码不能超过 128 位"), { status: 400 });
  return password;
}

function normalizeAccountInput(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function extractLoginId(account) {
  if (/^\d{8}$/.test(account)) return account;
  const match = account.match(/\b\d{8}\b/);
  return match ? match[0] : "";
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
      if (!body) return resolve(enforceBodyPrincipal({}, req.actor));
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch (error) {
        return reject(Object.assign(new Error("JSON 格式不正确"), { status: 400 }));
      }
      try {
        resolve(enforceBodyPrincipal(parsed, req.actor));
      } catch (error) {
        reject(error);
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

function requestIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "")
    .split(",")[0]
    .trim();
}

function recordAudit(db, actor, action, detail = {}, req = null) {
  db.auditLogs = Array.isArray(db.auditLogs) ? db.auditLogs : [];
  const entry = {
    id: uid("audit"),
    actorId: actor?.id || detail.actorId || "",
    actorRole: actor?.role || detail.actorRole || "",
    action,
    resourceType: detail.resourceType || "",
    resourceId: detail.resourceId || "",
    ip: req ? requestIp(req) : "",
    userAgent: req ? String(req.headers["user-agent"] || "").slice(0, 180) : "",
    meta: detail.meta || {},
    createdAt: now()
  };
  db.auditLogs.unshift(entry);
  db.auditLogs = db.auditLogs.slice(0, 1000);
  try {
    ensureDataDir();
    fs.appendFileSync(AUDIT_LOG_PATH, `${JSON.stringify(entry)}\n`, "utf8");
  } catch (error) {
    console.warn("audit log write failed", error.message);
  }
  return entry;
}

function getSessionUser(req, db) {
  const cookies = parseCookies(req);
  const payload = verifySessionToken(cookies[SESSION_COOKIE]);
  if (!payload) return null;
  return getUser(db, payload.sub) || null;
}

function requireActor(req, db) {
  const user = getSessionUser(req, db);
  if (!user) throw Object.assign(new Error("登录已过期，请重新登录"), { status: 401 });
  req.actor = user;
  return user;
}

function ensureActorCanUseId(actor, id, role = "") {
  if (!id) return;
  if (actor.role === "admin") return;
  if (String(id) !== actor.id) throw Object.assign(new Error("无权使用其他用户身份操作"), { status: 403 });
  if (role && actor.role !== role) throw Object.assign(new Error(`当前账号不是${role === "teacher" ? "教师" : "学生"}身份`), { status: 403 });
}

function enforceBodyPrincipal(body, actor) {
  if (!actor || !body || typeof body !== "object" || Array.isArray(body) || actor.role === "admin") return body;
  [
    ["userId", ""],
    ["ownerId", ""],
    ["fromUserId", ""],
    ["teacherId", "teacher"],
    ["studentId", "student"]
  ].forEach(([key, role]) => {
    if (body[key] !== undefined && body[key] !== null && body[key] !== "") {
      ensureActorCanUseId(actor, body[key], role);
    }
  });
  return body;
}

function queryUserId(searchParams, actor, key = "userId", role = "") {
  const requested = searchParams.get(key);
  ensureActorCanUseId(actor, requested || actor.id, role);
  return actor.role === "admin" && requested ? requested : actor.id;
}

function requireRole(actor, roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(actor.role)) {
    throw Object.assign(new Error("当前账号无权执行该操作"), { status: 403 });
  }
}

function send(res, status, payload, headers = {}) {
  const responseHeaders = { ...SECURITY_HEADERS, ...JSON_HEADERS, ...headers };
  const hasSetCookie = Object.keys(responseHeaders).some((key) => key.toLowerCase() === "set-cookie");
  if (!hasSetCookie && res.sessionActor) {
    responseHeaders["set-cookie"] = sessionCookie(res.sessionActor);
  }
  res.writeHead(status, responseHeaders);
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

function requestText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(requestText).filter(Boolean).join("\n");
  if (typeof value === "object") {
    for (const key of ["value", "text", "content", "sourceText"]) {
      if (value[key] !== undefined) return requestText(value[key]);
    }
    return Object.values(value).map(requestText).filter(Boolean).join("\n");
  }
  return String(value);
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

function persistGraphJobs() {
  const jobs = Array.from(graphJobs.values()).map((job) => {
    const { abort, ...safe } = job;
    return safe;
  });
  atomicWriteJson(GRAPH_JOBS_PATH, { version: 1, jobs });
}

function persistUploadSessions() {
  atomicWriteJson(UPLOAD_SESSIONS_PATH, { version: 1, sessions: Array.from(uploadSessions.values()) });
}

function loadRuntimeState() {
  ensureDataDir();
  graphJobs.clear();
  uploadSessions.clear();

  const graphState = readJsonFile(GRAPH_JOBS_PATH, { jobs: [] });
  (Array.isArray(graphState.jobs) ? graphState.jobs : []).forEach((item) => {
    if (!item?.id) return;
    const interrupted = ["queued", "running"].includes(item.status);
    graphJobs.set(item.id, {
      ...item,
      status: interrupted ? "failed" : item.status,
      stage: interrupted ? "已中断" : item.stage,
      message: interrupted ? "服务曾重启，原图谱生成任务已中断，请重新上传或重新生成。" : item.message,
      error: interrupted ? "服务重启导致任务中断" : item.error,
      cancelRequested: Boolean(item.cancelRequested),
      abort: null,
      updatedAt: interrupted ? now() : item.updatedAt
    });
  });
  if (graphJobs.size) persistGraphJobs();

  const uploadState = readJsonFile(UPLOAD_SESSIONS_PATH, { sessions: [] });
  let uploadChanged = false;
  (Array.isArray(uploadState.sessions) ? uploadState.sessions : []).forEach((item) => {
    if (!item?.id || !item.filePath || !fs.existsSync(item.filePath)) {
      uploadChanged = true;
      return;
    }
    const actualSize = fs.statSync(item.filePath).size;
    uploadSessions.set(item.id, {
      ...item,
      received: Math.min(Number(item.size || actualSize), actualSize),
      chunks: Number(item.chunks || 0),
      updatedAt: item.updatedAt || now()
    });
  });
  if (uploadChanged || uploadSessions.size) persistUploadSessions();
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
  persistGraphJobs();
  return job;
}

function updateGraphJob(jobId, patch) {
  const job = graphJobs.get(jobId);
  if (!job) return null;
  if (job.status === "canceled" && patch.status !== "canceled") return job;
  Object.assign(job, patch, { updatedAt: now() });
  persistGraphJobs();
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
  let changed = false;
  for (const [id, job] of graphJobs.entries()) {
    if (new Date(job.updatedAt).getTime() < cutoff) {
      graphJobs.delete(id);
      changed = true;
    }
  }
  if (changed) persistGraphJobs();
}

function sanitizeFileName(name) {
  return String(name || "upload.pdf").replace(/[\\/:*?"<>|]/g, "_").slice(0, 160);
}

function uploadExtension(name = "") {
  return path.extname(String(name || "").toLowerCase());
}

function uploadExpectedKinds(name = "", type = "") {
  const ext = uploadExtension(name);
  const mime = String(type || "").toLowerCase();
  const kinds = new Set();
  if (ext === ".pdf" || mime.includes("pdf")) kinds.add("pdf");
  if (ZIP_OFFICE_EXTENSIONS.has(ext) || /officedocument|wordprocessingml|presentationml|spreadsheetml/.test(mime)) kinds.add("office-zip");
  if (BINARY_OFFICE_EXTENSIONS.has(ext) || /msword|ms-powerpoint|ms-excel/.test(mime)) kinds.add("office-binary");
  if (TEXT_UPLOAD_EXTENSIONS.has(ext) || /^text\//.test(mime)) kinds.add("text");
  if (IMAGE_UPLOAD_EXTENSIONS.has(ext) || /^image\//.test(mime)) kinds.add("image");
  return kinds;
}

function assertSupportedUploadDeclaration(name = "", type = "") {
  const ext = uploadExtension(name);
  const mime = String(type || "").toLowerCase();
  const blockedMime = /x-msdownload|x-dosexec|octet-stream-exe|shellscript/.test(mime);
  if (blockedMime) {
    throw Object.assign(new Error("不支持上传可执行或脚本类文件"), { status: 415 });
  }
  if (ext && !SUPPORTED_UPLOAD_EXTENSIONS.has(ext)) {
    throw Object.assign(new Error(`不支持的文件格式：${ext}。请上传 PDF、Word、PPT、Excel、TXT、Markdown、CSV 或常见图片格式。`), { status: 415 });
  }
}

function isProbablyTextBuffer(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  if (!sample.length) return true;
  let control = 0;
  for (const byte of sample) {
    if (byte === 0) return false;
    if (byte < 9 || (byte > 13 && byte < 32)) control += 1;
  }
  return control / sample.length < 0.08;
}

function sniffUploadKind(buffer) {
  if (!buffer || !buffer.length) return "empty";
  const hex8 = buffer.subarray(0, 8).toString("hex").toLowerCase();
  const ascii5 = buffer.subarray(0, 5).toString("latin1");
  const ascii4 = buffer.subarray(0, 4).toString("latin1");
  const ascii12 = buffer.subarray(0, 12).toString("latin1");
  if (ascii5 === "%PDF-") return "pdf";
  if (ascii4 === "PK\u0003\u0004" || ascii4 === "PK\u0005\u0006" || ascii4 === "PK\u0007\b") return "office-zip";
  if (hex8 === "d0cf11e0a1b11ae1") return "office-binary";
  if (hex8 === "89504e470d0a1a0a") return "image";
  if (hex8.startsWith("ffd8ff")) return "image";
  if (ascii4 === "GIF8" || (ascii4 === "RIFF" && ascii12.slice(8, 12) === "WEBP")) return "image";
  if (isProbablyTextBuffer(buffer)) return "text";
  return "unknown-binary";
}

function assertUploadContent({ name = "", type = "", buffer }) {
  assertSupportedUploadDeclaration(name, type);
  const sample = buffer || Buffer.alloc(0);
  const actual = sniffUploadKind(sample);
  if (actual === "empty") {
    throw Object.assign(new Error("上传文件为空"), { status: 400 });
  }
  const expected = uploadExpectedKinds(name, type);
  if (!expected.size) {
    if (actual === "unknown-binary") {
      throw Object.assign(new Error("未能识别上传文件类型，请使用带扩展名的 PDF、Word、PPT、Excel、TXT 或图片文件"), { status: 415 });
    }
    return;
  }
  if (expected.has(actual)) return;
  if (expected.has("text") && actual === "text") return;
  if (expected.has("image") && actual === "image") return;
  throw Object.assign(new Error("上传文件内容与声明格式不一致，请检查文件是否损坏或伪装成其他格式"), { status: 415 });
}

function assertStoredUploadSafe(session) {
  const size = fs.statSync(session.filePath).size;
  const fd = fs.openSync(session.filePath, "r");
  try {
    const buffer = Buffer.alloc(Math.min(size, 8192));
    fs.readSync(fd, buffer, 0, buffer.length, 0);
    assertUploadContent({ name: session.fileName, type: session.fileType, buffer });
  } finally {
    fs.closeSync(fd);
  }
}

function createUploadSession({ userId, fileName, fileType, size }) {
  ensureDataDir();
  assertSupportedUploadDeclaration(fileName, fileType);
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
  persistUploadSessions();
  return session;
}

function getUploadSession(uploadId) {
  const session = uploadSessions.get(uploadId);
  if (!session) throw Object.assign(new Error("上传会话不存在或已过期"), { status: 404 });
  if (!fs.existsSync(session.filePath)) {
    uploadSessions.delete(uploadId);
    persistUploadSessions();
    throw Object.assign(new Error("上传文件已丢失，请重新上传"), { status: 404 });
  }
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
  persistUploadSessions();
}

function cleanupUploadSessions() {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  let changed = false;
  for (const [id, session] of uploadSessions.entries()) {
    if (new Date(session.updatedAt).getTime() < cutoff || !fs.existsSync(session.filePath)) {
      uploadSessions.delete(id);
      try {
        if (session.filePath) fs.unlinkSync(session.filePath);
      } catch {}
      changed = true;
    }
  }
  if (changed) persistUploadSessions();
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
  assertUploadContent({ name, type, buffer: buffer.subarray(0, Math.min(buffer.length, 8192)) });
  const lowerName = name.toLowerCase();
  let text = "";
  let method = "text-reader";
  let stats = null;
  if (type.includes("pdf") || lowerName.endsWith(".pdf")) {
    method = "local-pdf-text-agent";
    const extracted = extractPdfTextFromBuffer(buffer, onProgress);
    text = extracted.text;
    stats = extracted.stats;
  } else if (isOfficeOpenXmlFile(lowerName, type)) {
    method = "office-openxml-agent";
    text = extractOfficeOpenXmlText(buffer, lowerName);
  } else if (/\.(doc|ppt)$/i.test(lowerName)) {
    method = "binary-office-text-fallback";
    text = extractBinaryOfficeText(buffer);
  } else {
    text = buffer.toString("utf8").slice(0, PDF_LIMITS.maxExtractedTextChars);
  }
  return { text, meta: { name, type, method, characters: text.length, size: buffer.length, stats } };
}

function isOfficeOpenXmlFile(lowerName, type = "") {
  return /\.(docx|pptx|xlsx)$/i.test(lowerName)
    || /officedocument|wordprocessingml|presentationml|spreadsheetml/.test(String(type || "").toLowerCase());
}

function decodeXmlEntities(text) {
  return String(text || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function xmlToPlainText(xml) {
  return decodeXmlEntities(String(xml || "")
    .replace(/<a:br\s*\/>|<w:br\s*\/>/g, "\n")
    .replace(/<\/w:p>|<\/a:p>|<\/row>|<\/xdr:row>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\n\s+/g, "\n"))
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function readZipEntries(buffer) {
  const entries = [];
  const eocdSignature = 0x06054b50;
  let eocd = -1;
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 66000); offset -= 1) {
    if (buffer.readUInt32LE(offset) === eocdSignature) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) return entries;
  const totalEntries = buffer.readUInt16LE(eocd + 10);
  let centralOffset = buffer.readUInt32LE(eocd + 16);
  for (let index = 0; index < totalEntries; index += 1) {
    if (buffer.readUInt32LE(centralOffset) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(centralOffset + 10);
    const compressedSize = buffer.readUInt32LE(centralOffset + 20);
    const fileNameLength = buffer.readUInt16LE(centralOffset + 28);
    const extraLength = buffer.readUInt16LE(centralOffset + 30);
    const commentLength = buffer.readUInt16LE(centralOffset + 32);
    const localOffset = buffer.readUInt32LE(centralOffset + 42);
    const name = buffer.slice(centralOffset + 46, centralOffset + 46 + fileNameLength).toString("utf8");
    if (buffer.readUInt32LE(localOffset) === 0x04034b50) {
      const localNameLength = buffer.readUInt16LE(localOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const raw = buffer.slice(dataStart, dataStart + compressedSize);
      try {
        const data = method === 0 ? raw : method === 8 ? zlib.inflateRawSync(raw) : Buffer.alloc(0);
        entries.push({ name, data });
      } catch {}
    }
    centralOffset += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

function extractOfficeOpenXmlText(buffer, lowerName = "") {
  const entries = readZipEntries(buffer);
  const wanted = entries
    .filter((entry) => {
      const name = entry.name.replace(/\\/g, "/");
      if (lowerName.endsWith(".docx")) return /^word\/(document|header|footer|footnotes|endnotes).*\.xml$/i.test(name);
      if (lowerName.endsWith(".pptx")) return /^ppt\/(slides|notesSlides)\/.*\.xml$/i.test(name);
      if (lowerName.endsWith(".xlsx")) return /^xl\/(worksheets|sharedStrings)\/.*\.xml$/i.test(name);
      return /^(word|ppt|xl)\/.*\.xml$/i.test(name);
    })
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  return wanted
    .map((entry) => xmlToPlainText(entry.data.toString("utf8")))
    .filter(Boolean)
    .join("\n\n")
    .slice(0, PDF_LIMITS.maxExtractedTextChars);
}

function extractBinaryOfficeText(buffer) {
  const utf8 = buffer.toString("utf8");
  const utf16 = buffer.toString("utf16le");
  const pick = utf16.replace(/[^\u4e00-\u9fa5A-Za-z0-9，。！？；：、,.!?;:()（）\s-]/g, " ").length
    > utf8.replace(/[^\u4e00-\u9fa5A-Za-z0-9，。！？；：、,.!?;:()（）\s-]/g, " ").length
    ? utf16
    : utf8;
  return normalizeExtractedText(pick.replace(/[^\u4e00-\u9fa5A-Za-z0-9，。！？；：、,.!?;:()（）\s-]/g, " "))
    .slice(0, PDF_LIMITS.maxExtractedTextChars);
}

function resolvePythonCommand() {
  if (process.env.PDF_AGENT_PYTHON) return process.env.PDF_AGENT_PYTHON;
  return "python";
}

function resolveModelCodePythonCommand() {
  if (process.env.MODEL_CODE_PYTHON) return process.env.MODEL_CODE_PYTHON;
  if (process.env.PDF_AGENT_PYTHON) return process.env.PDF_AGENT_PYTHON;
  return "python";
}

function formatModelCodeOutput({ stdout = "", stderr = "", exitCode = 0, timedOut = false, durationMs = 0 }) {
  const sections = [];
  sections.push(`执行状态：${timedOut ? "超时终止" : exitCode === 0 ? "运行成功" : `运行失败（退出码 ${exitCode}）`}`);
  sections.push(`耗时：${durationMs} ms`);
  const cleanStdout = String(stdout || "").trimEnd();
  const cleanStderr = String(stderr || "").trimEnd();
  if (cleanStdout) sections.push(`\n[stdout]\n${cleanStdout}`);
  if (cleanStderr) sections.push(`\n[stderr]\n${cleanStderr}`);
  if (!cleanStdout && !cleanStderr) sections.push("\n程序没有输出。请在代码中使用 print(...) 输出测试结果。");
  return sections.join("\n").slice(0, MODEL_CODE_MAX_OUTPUT_CHARS);
}

function modelCodeExecutableSource(source) {
  return `import ast
import traceback

_source = ${JSON.stringify(String(source || ""))}
_globals = {"__name__": "__main__", "__file__": "main.py"}

try:
    _tree = ast.parse(_source, filename="main.py", mode="exec")
except SyntaxError:
    if "\\n" not in _source and _source.strip():
        print(_source.strip())
    else:
        raise
else:
    try:
        if _tree.body and isinstance(_tree.body[-1], ast.Expr):
            _last_expr = ast.Expression(_tree.body.pop().value)
            ast.fix_missing_locations(_tree)
            ast.fix_missing_locations(_last_expr)
            exec(compile(_tree, "main.py", "exec"), _globals)
            try:
                _value = eval(compile(_last_expr, "main.py", "eval"), _globals)
            except NameError:
                if len(_tree.body) == 0 and "\\n" not in _source and _source.strip().isidentifier():
                    print(_source.strip())
                else:
                    raise
            else:
                if _value is not None:
                    print(_value)
        else:
            ast.fix_missing_locations(_tree)
            exec(compile(_tree, "main.py", "exec"), _globals)
    except Exception:
        traceback.print_exc()
        raise
`;
}

function removeRuntimeTempDir(tempDir) {
  const resolvedRuntime = path.resolve(RUNTIME_DIR);
  const resolvedTarget = path.resolve(tempDir);
  if (!resolvedTarget.startsWith(resolvedRuntime)) return;
  try {
    fs.rmSync(resolvedTarget, { recursive: true, force: true });
  } catch {}
}

function runModelCodeSnippet(code) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const source = String(code || "");
    if (!source.trim()) {
      resolve({
        success: false,
        exitCode: 1,
        timedOut: false,
        durationMs: 0,
        output: "执行状态：运行失败（退出码 1）\n\n[stderr]\n代码为空，请先在画布代码编辑器中输入 Python 代码。"
      });
      return;
    }
    if (source.length > MODEL_CODE_MAX_CHARS) {
      resolve({
        success: false,
        exitCode: 1,
        timedOut: false,
        durationMs: 0,
        output: `执行状态：运行失败（退出码 1）\n\n[stderr]\n代码长度不能超过 ${MODEL_CODE_MAX_CHARS} 个字符。`
      });
      return;
    }
    fs.mkdirSync(RUNTIME_DIR, { recursive: true });
    const tempDir = fs.mkdtempSync(path.join(RUNTIME_DIR, "model-code-"));
    const scriptPath = path.join(tempDir, "main.py");
    fs.writeFileSync(scriptPath, modelCodeExecutableSource(source), "utf8");
    const python = resolveModelCodePythonCommand();
    const child = spawn(python, ["-u", scriptPath], {
      windowsHide: true,
      cwd: tempDir,
      env: {
        ...process.env,
        PYTHONUTF8: "1",
        PYTHONIOENCODING: "utf-8",
        MPLBACKEND: "Agg"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;
    const appendLimited = (current, chunk) => {
      const next = current + chunk.toString("utf8");
      if (next.length <= MODEL_CODE_MAX_OUTPUT_CHARS * 2) return next;
      return next.slice(0, MODEL_CODE_MAX_OUTPUT_CHARS * 2);
    };
    const finish = (exitCode = 1) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const durationMs = Date.now() - startedAt;
      const payload = {
        success: !timedOut && exitCode === 0,
        exitCode,
        timedOut,
        durationMs,
        stdout: stdout.slice(0, MODEL_CODE_MAX_OUTPUT_CHARS),
        stderr: stderr.slice(0, MODEL_CODE_MAX_OUTPUT_CHARS)
      };
      payload.output = formatModelCodeOutput(payload);
      removeRuntimeTempDir(tempDir);
      resolve(payload);
    };
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill();
      } catch {}
      stderr = appendLimited(stderr, `\n代码执行超过 ${MODEL_CODE_TIMEOUT_MS} ms，已自动终止。`);
      finish(124);
    }, MODEL_CODE_TIMEOUT_MS);
    child.stdout.on("data", (chunk) => {
      stdout = appendLimited(stdout, chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr = appendLimited(stderr, chunk);
    });
    child.on("error", (error) => {
      stderr = appendLimited(stderr, `无法启动 Python：${error.message}`);
      finish(1);
    });
    child.on("close", (code) => finish(Number.isFinite(Number(code)) ? Number(code) : 1));
  });
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
  assertStoredUploadSafe({ fileName: name, fileType: type, filePath });
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
  const buffer = fs.readFileSync(filePath);
  const extracted = extractUploadedBookBuffer({ name, type, buffer }, onProgress);
  return {
    text: extracted.text,
    meta: {
      ...(extracted.meta || {}),
      name,
      type,
      size,
      characters: extracted.text.length
    }
  };
}

function isPdfUpload(name = "", type = "") {
  return String(type || "").toLowerCase().includes("pdf") || String(name || "").toLowerCase().endsWith(".pdf");
}

async function extractCourseMaterialUpload({ name = "课程资料", type = "", dataUrl = "", filePath = "" }) {
  if (filePath) {
    return extractUploadedBookFile({
      name,
      type,
      filePath,
      extractor: "advanced-python-pdf-agent",
      subject: "课程资料"
    }, () => {});
  }
  if (!dataUrl) return { text: "", meta: null };
  const buffer = decodeDataUrl(dataUrl);
  const local = extractUploadedBookBuffer({ name, type, buffer }, () => {});
  if (!isPdfUpload(name, type) || local.text.trim().length >= 80) return local;

  const tempPath = path.join(UPLOAD_DIR, `${uid("material")}_${sanitizeFileName(name || "scan.pdf")}`);
  fs.writeFileSync(tempPath, buffer);
  try {
    const advanced = await runAdvancedPdfAgent({
      filePath: tempPath,
      maxChars: PDF_LIMITS.maxExtractedTextChars,
      timeoutMs: PDF_AGENT_TIMEOUT_MS,
      envOverrides: {
        PDF_AGENT_OCR_MAX_PAGES: String(process.env.MATERIAL_PDF_OCR_MAX_PAGES || process.env.PDF_AGENT_OCR_MAX_PAGES || 80),
        PDF_AGENT_OCR_LEADING_PAGES: String(process.env.MATERIAL_PDF_OCR_LEADING_PAGES || process.env.PDF_AGENT_OCR_LEADING_PAGES || 40),
        PDF_AGENT_OCR_SCALE: String(process.env.MATERIAL_PDF_OCR_SCALE || process.env.PDF_AGENT_OCR_SCALE || 1.6)
      }
    }, () => {});
    return {
      text: advanced.text,
      meta: {
        name,
        type,
        size: buffer.length,
        method: advanced.meta.method || "advanced-python-pdf-agent",
        characters: advanced.text.length,
        stats: advanced.meta
      }
    };
  } finally {
    try {
      fs.unlinkSync(tempPath);
    } catch {}
  }
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

function uniqueTexts(items) {
  const seen = new Set();
  return (items || [])
    .map((item) => String(item || "").trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

function extractKeywords(text, subject) {
  const source = `${subject} ${String(text || "")}`;
  const stopWords = new Set([
    "这是", "一个", "可以", "进行", "知识", "图谱", "学生", "老师", "内容", "文件", "上传", "生成", "学习", "教学", "本节", "掌握", "理解",
    "下面", "然后", "因此", "所以", "我们", "这里", "他们", "这些", "那些", "其中", "包括", "首先", "其次", "最后", "如果",
    "为了", "通过", "使用", "需要", "已经", "没有", "方法", "问题", "相关", "主要", "一般", "一种", "一些", "以及", "能够"
  ]);
  const cnWords = (source.match(/[\u4e00-\u9fa5]{2,10}/g) || []).filter((word) => !stopWords.has(word) && isUsefulGraphLabel(word));
  const enWords = Array.from(new Set((source.match(/[A-Za-z][A-Za-z0-9_-]{2,}/g) || []).map((word) => word.toLowerCase())));
  const rankedCn = Array.from(cnWords.reduce((map, word) => map.set(word, (map.get(word) || 0) + 1), new Map()).entries())
    .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)
    .map(([word]) => word);
  const merged = rankedCn.concat(enWords.filter(isUsefulGraphLabel)).slice(0, 12);
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

const GENERIC_GRAPH_BAD_LABELS = new Set([
  "目录", "前言", "序言", "附录", "参考文献", "索引", "版权", "声明", "致谢", "封面", "目录页",
  "下面", "然后", "因此", "所以", "首先", "其次", "最后", "我们", "这里", "他们", "这些", "那些",
  "其中", "包括", "如果", "为了", "通过", "使用", "需要", "已经", "没有", "问题", "方法", "内容",
  "学习", "机器", "模型", "数据", "算法", "本章", "本节", "小结", "习题", "练习", "答案"
]);

const ML_TERM_PATTERNS = [
  {
    label: "训练集/验证集/测试集",
    pattern: /训练集|验证集|测试集|train(?:ing)? set|validation set|test set/i,
    points: ["训练集用于拟合模型参数，验证集用于调参和模型选择，测试集用于最终评估泛化能力。", "常见误区是把测试集用于反复调参，导致评估结果过于乐观。"]
  },
  {
    label: "监督学习",
    pattern: /监督学习|有标签|supervised/i,
    points: ["监督学习利用带标签样本学习输入到输出的映射，典型任务包括分类和回归。", "复习时要能说明损失函数、训练数据、预测目标和泛化评估之间的关系。"]
  },
  {
    label: "无监督学习",
    pattern: /无监督学习|聚类|降维|unsupervised/i,
    points: ["无监督学习不依赖人工标签，常用于发现数据结构、聚类模式或低维表示。", "需要区分聚类、降维、密度估计等任务的目标和评价方式。"]
  },
  {
    label: "特征工程",
    pattern: /特征工程|特征选择|特征提取|归一化|标准化|feature/i,
    points: ["特征工程通过选择、变换和构造特征提升模型可学性与可解释性。", "不同模型对尺度、稀疏性、异常值和类别变量的敏感程度不同。"]
  },
  {
    label: "损失函数",
    pattern: /损失函数|目标函数|代价函数|loss|objective|cost/i,
    points: ["损失函数度量预测结果与真实目标之间的差距，是优化算法更新参数的依据。", "不同任务常用不同损失，例如平方损失、交叉熵损失、合页损失。"]
  },
  {
    label: "梯度下降",
    pattern: /梯度下降|随机梯度|批量梯度|SGD|gradient/i,
    points: ["梯度下降沿损失函数下降最快方向迭代更新参数，学习率决定每一步更新幅度。", "需要关注学习率过大震荡、过小收敛慢以及局部最优/鞍点问题。"]
  },
  {
    label: "过拟合与欠拟合",
    pattern: /过拟合|欠拟合|泛化|正则化|overfit|underfit|generalization/i,
    points: ["过拟合表示模型记住训练集噪声而泛化差，欠拟合表示模型容量或训练不足。", "可通过正则化、交叉验证、早停、数据增强或调整模型复杂度改进。"]
  },
  {
    label: "交叉验证",
    pattern: /交叉验证|留出法|K\s*折|cross.?validation/i,
    points: ["交叉验证通过多次划分训练/验证数据估计模型稳定性，适合样本量有限时做模型选择。", "需要避免数据泄漏，预处理流程也应在每个训练折内独立拟合。"]
  },
  {
    label: "线性回归",
    pattern: /线性回归|最小二乘|linear regression/i,
    points: ["线性回归假设输出是输入特征的线性组合，常用平方损失和最小二乘估计参数。", "重点掌握模型形式、参数估计、残差含义和正则化扩展。"]
  },
  {
    label: "逻辑回归",
    pattern: /逻辑回归|logistic regression|sigmoid/i,
    points: ["逻辑回归用 Sigmoid 或 Softmax 把线性得分转换为类别概率，常用于分类任务。", "它名字中有回归，但解决的是分类问题，这是常见易混点。"]
  },
  {
    label: "K 近邻",
    pattern: /KNN|K\s*近邻|最近邻|nearest neighbor/i,
    points: ["K 近邻根据距离度量寻找相似样本并投票或平均，训练简单但预测开销较大。", "K 值、距离度量、特征尺度和样本分布会显著影响结果。"]
  },
  {
    label: "朴素贝叶斯",
    pattern: /朴素贝叶斯|naive bayes|贝叶斯/i,
    points: ["朴素贝叶斯基于贝叶斯公式和条件独立假设估计类别后验概率。", "适合文本分类等高维稀疏特征场景，但独立性假设可能与真实数据不一致。"]
  },
  {
    label: "决策树",
    pattern: /决策树|ID3|C4\.5|CART|信息增益|基尼/i,
    points: ["决策树通过递归划分特征空间形成可解释的判断规则。", "重点比较信息增益、增益率、基尼指数、剪枝和连续特征划分。"]
  },
  {
    label: "集成学习",
    pattern: /集成学习|随机森林|Boosting|Bagging|GBDT|AdaBoost|XGBoost/i,
    points: ["集成学习组合多个基学习器降低方差或偏差，典型方法包括 Bagging、Boosting 和随机森林。", "需要理解基学习器差异性、投票/加权和迭代纠错思想。"]
  },
  {
    label: "支持向量机",
    pattern: /支持向量机|SVM|最大间隔|核函数|kernel/i,
    points: ["支持向量机通过最大化分类间隔提升泛化能力，核函数可处理非线性可分问题。", "重点掌握支持向量、间隔、软间隔、惩罚参数和核技巧。"]
  },
  {
    label: "K-means 聚类",
    pattern: /K[-\s]?means|K均值|聚类中心|簇/i,
    points: ["K-means 通过迭代分配样本和更新簇中心最小化簇内平方误差。", "它对初始中心、K 值、异常点和特征尺度敏感。"]
  },
  {
    label: "主成分分析 PCA",
    pattern: /PCA|主成分|方差最大|降维/i,
    points: ["PCA 寻找能保留最大方差的正交方向，用于降维、去噪和可视化。", "需要区分无监督降维目标与分类目标，不能把方差大直接等同于类别可分。"]
  },
  {
    label: "神经网络",
    pattern: /神经网络|感知机|反向传播|深度学习|CNN|RNN|Transformer|neural|deep learning/i,
    points: ["神经网络通过多层非线性变换学习复杂表示，反向传播负责高效计算梯度。", "重点关注激活函数、网络层、损失函数、优化器和过拟合控制。"]
  }
];

function cleanOutlineLabel(label) {
  return String(label || "")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/[·•●▪□◆◇■]+/g, " ")
    .replace(/\.{2,}|…{1,}|-{3,}|_{3,}/g, " ")
    .replace(/\s*\(?第?\s*\d+\s*页\)?\s*$/i, "")
    .replace(/\s+\d{1,4}\s*$/g, "")
    .replace(/^[\s.．。:：、-]+|[\s.．。:：、-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function outlineLabelCore(label) {
  return cleanOutlineLabel(label)
    .replace(/^第\s*[一二三四五六七八九十百零〇两\d]+\s*[章节篇]\s*/g, "")
    .replace(/^\d{1,2}(?:[.．]\d{1,2}){0,3}\s*/g, "")
    .replace(/^[（(]?\d+[)）]\s*/g, "")
    .trim();
}

function isUsefulGraphLabel(label) {
  const text = cleanOutlineLabel(label);
  const core = outlineLabelCore(text);
  if (!text || !core) return false;
  if (GENERIC_GRAPH_BAD_LABELS.has(text) || GENERIC_GRAPH_BAD_LABELS.has(core)) return false;
  if (core.length < 2 && !/[A-Za-z]{2,}|K|PCA|SVM/i.test(core)) return false;
  if (core.length > 32) return false;
  if (/^\d+([.．]\d+)*$/.test(core)) return false;
  if (/^[,，.。;；:：!?！？、\s-]+$/.test(core)) return false;
  if (/^(第?\d+页|page\s*\d+|chapter\s*\d*)$/i.test(core)) return false;
  if (/版权|出版社|ISBN|作者|印刷|定价|http|www\.|公众号|扫描|下载|课后习题答案/.test(core)) return false;
  return true;
}

function looksLikeMachineLearning(subject, text) {
  const source = `${subject} ${text}`.toLowerCase();
  return /机器学习|动手学机器学习|machine learning|监督学习|无监督学习|深度学习|神经网络|决策树|支持向量机|svm|knn|pca|k-means|梯度下降|过拟合|特征工程/.test(source);
}

function fallbackMachineLearningOutline() {
  return [
    { level: 1, number: "1", label: "第1章 机器学习概述" },
    { level: 2, number: "1.1", label: "1.1 学习任务与数据集" },
    { level: 2, number: "1.2", label: "1.2 监督学习、无监督学习与强化学习" },
    { level: 2, number: "1.3", label: "1.3 训练流程与泛化能力" },
    { level: 1, number: "2", label: "第2章 数据预处理与特征工程" },
    { level: 2, number: "2.1", label: "2.1 数据清洗与缺失值处理" },
    { level: 2, number: "2.2", label: "2.2 特征缩放、编码与选择" },
    { level: 2, number: "2.3", label: "2.3 数据划分与数据泄漏防控" },
    { level: 1, number: "3", label: "第3章 监督学习基础模型" },
    { level: 2, number: "3.1", label: "3.1 K 近邻与距离度量" },
    { level: 2, number: "3.2", label: "3.2 朴素贝叶斯与概率分类" },
    { level: 2, number: "3.3", label: "3.3 线性回归与逻辑回归" },
    { level: 1, number: "4", label: "第4章 模型评估与选择" },
    { level: 2, number: "4.1", label: "4.1 损失函数与评价指标" },
    { level: 2, number: "4.2", label: "4.2 交叉验证与超参数选择" },
    { level: 2, number: "4.3", label: "4.3 偏差、方差、过拟合与欠拟合" },
    { level: 1, number: "5", label: "第5章 优化方法与正则化" },
    { level: 2, number: "5.1", label: "5.1 梯度下降与随机梯度下降" },
    { level: 2, number: "5.2", label: "5.2 学习率、收敛与局部最优" },
    { level: 2, number: "5.3", label: "5.3 L1/L2 正则化与早停" },
    { level: 1, number: "6", label: "第6章 决策树与集成学习" },
    { level: 2, number: "6.1", label: "6.1 决策树划分准则与剪枝" },
    { level: 2, number: "6.2", label: "6.2 Bagging、随机森林与 Boosting" },
    { level: 2, number: "6.3", label: "6.3 GBDT、XGBoost 与特征重要性" },
    { level: 1, number: "7", label: "第7章 支持向量机与核方法" },
    { level: 2, number: "7.1", label: "7.1 最大间隔与支持向量" },
    { level: 2, number: "7.2", label: "7.2 软间隔、惩罚参数与核函数" },
    { level: 2, number: "7.3", label: "7.3 SVM 分类与回归应用" },
    { level: 1, number: "8", label: "第8章 无监督学习与降维" },
    { level: 2, number: "8.1", label: "8.1 K-means 聚类与聚类评估" },
    { level: 2, number: "8.2", label: "8.2 高斯混合模型与 EM 算法" },
    { level: 2, number: "8.3", label: "8.3 PCA、流形学习与可视化" },
    { level: 1, number: "9", label: "第9章 神经网络与深度学习" },
    { level: 2, number: "9.1", label: "9.1 感知机、多层网络与激活函数" },
    { level: 2, number: "9.2", label: "9.2 反向传播、优化器与正则化" },
    { level: 2, number: "9.3", label: "9.3 CNN、RNN 与 Transformer 基础" },
    { level: 1, number: "10", label: "第10章 机器学习应用实践" },
    { level: 2, number: "10.1", label: "10.1 项目流程与实验设计" },
    { level: 2, number: "10.2", label: "10.2 模型部署、监控与可解释性" },
    { level: 2, number: "10.3", label: "10.3 推荐、文本与图像任务案例" }
  ];
}

function parseOutlineLine(rawLine, options = {}) {
  const allowBareChapter = Boolean(options.allowBareChapter);
  const line = cleanOutlineLabel(rawLine);
  if (!isUsefulGraphLabel(line)) return null;
  let match = line.match(/^第\s*([一二三四五六七八九十百零〇两\d]+)\s*([章节篇])\s*[:：、.\s-]*(.{2,36})$/);
  if (match) {
    const number = match[1];
    const title = cleanOutlineLabel(match[3]);
    const label = `第${number}${match[2]} ${title}`;
    return isUsefulGraphLabel(title) ? { level: 1, number, label } : null;
  }
  match = allowBareChapter ? line.match(/^([0-9]{1,2})(?:[.．]\s*|\s+)(?![0-9.．])(.{2,36})$/) : null;
  if (match && !/[。！？；;]$/.test(match[2])) {
    const title = cleanOutlineLabel(match[2]);
    if (!isUsefulGraphLabel(title)) return null;
    return { level: 1, number: match[1], label: `第${match[1]}章 ${title}` };
  }
  match = line.match(/^([0-9]{1,2}(?:[.．][0-9]{1,2}){1,3})\s*(.{2,42})$/);
  if (match) {
    const number = match[1].replace(/．/g, ".");
    const title = cleanOutlineLabel(match[2]);
    const level = Math.min(3, number.split(".").length);
    if (!isUsefulGraphLabel(title)) return null;
    return { level, number, label: `${number} ${title}` };
  }
  return null;
}

function extractBookOutline(text, subject = "", sourceName = "") {
  const source = normalizeExtractedText([text, subject, sourceName].filter(Boolean).join("\n\n"));
  const lower = source.toLowerCase();
  let markerIndex = -1;
  const markerMatch = lower.match(/(?:^|\n)\s*(目录|目\s*录|contents|table of contents)\s*(?:\n|$)/i);
  if (markerMatch) {
    markerIndex = markerMatch.index;
  }
  const inToc = markerIndex >= 0;
  const outlineWindow = inToc
    ? source.slice(markerIndex, markerIndex + 100000)
    : source.slice(0, 90000);
  const lines = outlineWindow
    .split(/\r?\n+/)
    .map((line) => cleanOutlineLabel(line))
    .filter((line) => line.length >= 3 && line.length <= 70);
  const combinedLines = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const next = lines[index + 1] || "";
    if (/^第\s*[一二三四五六七八九十百零〇两\d]+\s*[章节篇]$/.test(line) && isUsefulGraphLabel(next)) {
      combinedLines.push(`${line} ${next}`);
      index += 1;
      continue;
    }
    if (/^\d{1,2}(?:[.．]\d{1,2}){1,3}$/.test(line) && isUsefulGraphLabel(next)) {
      combinedLines.push(`${line} ${next}`);
      index += 1;
      continue;
    }
    combinedLines.push(line);
  }
  const outline = [];
  const seen = new Set();
  for (const line of combinedLines) {
    const item = parseOutlineLine(line, { allowBareChapter: inToc });
    if (!item) continue;
    const key = `${item.level}:${item.number}:${outlineLabelCore(item.label)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    outline.push(item);
    if (outline.length >= 90) break;
  }
  const chapterCount = outline.filter((item) => item.level === 1).length;
  if (chapterCount >= 2 && outline.length >= 5) return outline;
  if (looksLikeMachineLearning(subject, `${sourceName}\n${source}`)) return fallbackMachineLearningOutline();
  return outline;
}

function textAroundLabel(text, label, fallbackStart = 0) {
  const source = String(text || "");
  if (!source) return "";
  const core = outlineLabelCore(label);
  const candidates = uniqueTexts([label, core, core.replace(/\s+/g, ""), core.split(/[、，,\s/]+/).find((part) => part.length >= 2)]);
  let index = -1;
  for (const candidate of candidates) {
    if (!candidate) continue;
    index = source.indexOf(candidate);
    if (index >= 0) break;
  }
  if (index < 0) index = Math.max(0, Math.min(source.length - 1, fallbackStart));
  return source.slice(Math.max(0, index - 1200), Math.min(source.length, index + 5200));
}

function fallbackTermsForSection(label, subject = "") {
  const text = `${subject} ${label}`;
  if (/初探|人工智能|机器学习是什么/.test(text)) return ["人工智能与机器学习", "预测与决策", "泛化能力", "归纳偏置"];
  if (/数学|向量|矩阵|梯度|凸函数/.test(text)) return ["向量", "矩阵", "梯度", "凸函数"];
  if (/K\s*近邻|KNN|最近邻/.test(text)) return ["KNN 算法原理", "分类任务", "回归任务", "距离度量与 K 值"];
  if (/线性回归/.test(text)) return ["映射形式与学习目标", "解析方法", "梯度下降", "学习率影响"];
  if (/基本思想|欠拟合|过拟合|超参数|交叉验证/.test(text)) return ["欠拟合与过拟合", "正则化约束", "参数与超参数", "数据集划分与交叉验证"];
  if (/逻辑斯谛|逻辑回归|Logistic/i.test(text)) return ["逻辑斯谛函数", "最大似然估计", "分类评价指标", "交叉熵损失"];
  if (/双线性|矩阵分解|因子分解/.test(text)) return ["矩阵分解", "隐向量表示", "因子分解机", "推荐任务"];
  if (/多层感知机|感知机|反向传播/.test(text)) return ["人工神经网络", "感知机", "隐含层与多层感知机", "反向传播"];
  if (/卷积神经网络|CNN|卷积|VGG/.test(text)) return ["卷积", "图像分类", "预训练网络", "内容表示与风格表示"];
  if (/循环神经网络|RNN|GRU|门控/.test(text)) return ["循环神经网络原理", "隐藏状态", "门控循环单元 GRU", "序列建模"];
  if (/支持向量机|SVM|核函数|最大间隔/.test(text)) return ["最大间隔", "支持向量", "SMO 求解", "核函数"];
  if (/决策树|ID3|C4\.5|CART/.test(text)) return ["决策树构造", "ID3 与 C4.5", "CART 算法", "剪枝与泛化"];
  if (/集成|随机森林|Boost|GBDT|梯度提升/.test(text)) return ["自举聚合 Bagging", "随机森林", "Boosting", "梯度提升决策树"];
  if (/k\s*均值|K-means|聚类/.test(text)) return ["k 均值原理", "聚类中心更新", "k-means++", "聚类评估"];
  if (/主成分|PCA|降维/.test(text)) return ["主成分与方差", "协方差矩阵", "特征分解", "降维可视化"];
  if (/概率图|贝叶斯|马尔可夫|朴素贝叶斯/.test(text)) return ["贝叶斯网络", "最大后验估计", "朴素贝叶斯", "马尔可夫网络"];
  if (/\bEM\b|EM 算法|高斯混合|GMM/.test(text)) return ["高斯混合模型", "E 步", "M 步", "收敛性"];
  if (/自编码|编码器|解码器/.test(text)) return ["编码器", "解码器", "重构损失", "表示学习"];
  if (/概述|任务|泛化|流程/.test(text)) return ["监督学习", "无监督学习", "训练集/验证集/测试集", "泛化能力"];
  if (/预处理|特征|数据/.test(text)) return ["数据清洗", "特征工程", "特征缩放", "数据泄漏"];
  if (/评估|选择|指标|验证/.test(text)) return ["损失函数", "交叉验证", "过拟合与欠拟合", "评价指标"];
  if (/优化|梯度|正则/.test(text)) return ["梯度下降", "学习率", "L1/L2 正则化", "早停"];
  if (/线性|回归|逻辑/.test(text)) return ["线性回归", "逻辑回归", "最小二乘", "Sigmoid 函数"];
  if (/近邻|KNN/.test(text)) return ["K 近邻", "距离度量", "K 值选择", "特征尺度"];
  if (/贝叶斯|概率/.test(text)) return ["朴素贝叶斯", "贝叶斯公式", "条件独立假设", "后验概率"];
  if (/决策树|集成|森林|Boost|GBDT/.test(text)) return ["决策树", "信息增益/基尼指数", "随机森林", "Boosting"];
  if (/支持向量|SVM|核/.test(text)) return ["支持向量机", "最大间隔", "软间隔", "核函数"];
  if (/聚类|降维|PCA|无监督/.test(text)) return ["K-means 聚类", "主成分分析 PCA", "高斯混合模型", "EM 算法"];
  if (/神经|深度|网络|CNN|RNN|Transformer/.test(text)) return ["神经网络", "反向传播", "激活函数", "CNN/RNN/Transformer"];
  if (/应用|实践|部署|解释/.test(text)) return ["项目流程", "模型部署", "可解释性", "实验复现"];
  return looksLikeMachineLearning(subject, text)
    ? ["数据集", "模型训练", "模型评估", "常见误区"]
    : [];
}

function extractTermsForSection(text, label, subject = "") {
  const sectionText = textAroundLabel(text, label);
  const matched = [];
  ML_TERM_PATTERNS.forEach((item) => {
    if (item.pattern.test(`${label}\n${sectionText}\n${subject}`)) matched.push(item.label);
  });
  const fallback = fallbackTermsForSection(label, subject);
  if (fallback.length >= 3 && /^第\s*[一二三四五六七八九十百零〇两\d]+\s*章/.test(cleanOutlineLabel(label))) {
    return uniqueTexts(fallback).filter(isUsefulGraphLabel).slice(0, 5);
  }
  const keywordTerms = extractKeywords(sectionText || label, subject).filter((item) => !outlineLabelCore(label).includes(item));
  return uniqueTexts(fallback.concat(matched, keywordTerms))
    .filter(isUsefulGraphLabel)
    .slice(0, 5);
}

function knowledgePointsForTerm(sectionText, term, parentLabel, subject = "") {
  const matched = ML_TERM_PATTERNS.find((item) => item.label === term || item.pattern.test(term));
  const extracted = knowledgePointsForKeyword(sectionText, term);
  return uniqueTexts([
    ...(matched?.points || []),
    ...extracted,
    `学习定位：「${term}」属于「${parentLabel}」，复习时要说明定义、输入输出、适用条件和典型题型。`,
    `GraphRAG 提示：回答「${term}」相关问题时，优先引用教材中对应章节，再补充模型推理和易错点。`,
    looksLikeMachineLearning(subject, `${term} ${parentLabel}`)
      ? `易错提醒：不要只记算法名称，要同时说明训练目标、关键假设、参数影响和评估方式。`
      : `易错提醒：不要只背节点名称，要结合上级章节解释它解决的问题。`
  ]).slice(0, 6);
}

function buildOutlineHierarchy(outline) {
  const chapters = [];
  let currentChapter = null;
  let currentSection = null;
  const chapterByNumber = new Map();
  outline.forEach((item) => {
    if (item.level <= 1 || !currentChapter) {
      currentChapter = { ...item, sections: [] };
      currentSection = null;
      chapters.push(currentChapter);
      if (item.number) chapterByNumber.set(String(item.number).split(".")[0], currentChapter);
      return;
    }
    const chapterKey = String(item.number || "").split(".")[0];
    const parentChapter = chapterByNumber.get(chapterKey) || currentChapter;
    if (item.level === 2 || !currentSection) {
      currentSection = { ...item, children: [] };
      parentChapter.sections.push(currentSection);
      currentChapter = parentChapter;
      return;
    }
    currentSection.children.push(item);
  });
  return chapters.slice(0, 14);
}

function addMachineLearningCrossLinks(nodes, links) {
  const findNode = (pattern) => nodes.find((node) => pattern.test(node.label));
  [
    [/训练集|验证集|测试集/, /泛化|过拟合/, "支撑泛化评估"],
    [/损失函数/, /梯度下降|优化/, "驱动参数更新"],
    [/正则化|早停/, /过拟合/, "抑制过拟合"],
    [/特征工程|特征缩放/, /K 近邻|K-means|SVM/, "影响距离与间隔"],
    [/决策树/, /随机森林|Boosting|集成/, "组成集成学习"],
    [/PCA|降维/, /可视化|聚类|K-means/, "服务结构发现"],
    [/反向传播/, /神经网络|深度学习/, "训练深层模型"]
  ].forEach(([sourcePattern, targetPattern, label]) => {
    const source = findNode(sourcePattern);
    const target = findNode(targetPattern);
    if (source && target && source.id !== target.id) links.push({ source: source.id, target: target.id, label, type: "cross-link" });
  });
}

function buildOutlineGraphFromText({ ownerId, title, subject, sourceName, sourceText, extraction, outline }) {
  const cleanSubject = normalizeSubject(subject);
  const chapters = buildOutlineHierarchy(outline);
  const rootLabel = title || `${cleanSubject}知识图谱`;
  const nodes = [makeGraphNode({
    id: "n0",
    label: rootLabel,
    group: "root",
    level: 0,
    subject: cleanSubject,
    details: `由${sourceName || "教材内容"}按“目录分支 -> 章节知识点 -> 微目标”生成。${extraction?.characters ? `已识别 ${extraction.characters} 个文本字符。` : ""}`,
    knowledgePoints: [
      `本图谱先根据目录确定「${cleanSubject}」主分支，再回到书本内容为各分支抽取知识点。`,
      "节点按章、节、知识点分级，可用于课程问答、GraphRAG 检索、学习路径规划和薄弱点归因。",
      "双击任一节点可查看知识路径、前置依赖、教学资源、考察属性和知识点详情。"
    ]
  })];
  const links = [];
  chapters.forEach((chapter, chapterIndex) => {
    const chapterId = `ch${chapterIndex + 1}`;
    const chapterText = textAroundLabel(sourceText, chapter.label, chapterIndex * 8000);
    const chapterCore = outlineLabelCore(chapter.label);
    nodes.push(makeGraphNode({
      id: chapterId,
      label: chapter.label,
      group: "chapter",
      level: 1,
      subject: cleanSubject,
      parentLabel: rootLabel,
      details: `一级分支：${chapter.label}。来源于教材目录，作为本章知识组织入口。`,
      knowledgePoints: uniqueTexts([
        ...knowledgePointsForKeyword(chapterText, chapterCore),
        ...fallbackOutlinePoints(chapter.label, rootLabel)
      ]).slice(0, 6)
    }));
    links.push({ source: "n0", target: chapterId, label: "一级章节", type: "contains" });
    if (chapterIndex > 0) links.push({ source: `ch${chapterIndex}`, target: chapterId, label: "前置依赖", type: "prerequisite" });

    const sections = chapter.sections.length
      ? chapter.sections
      : extractTermsForSection(chapterText || sourceText, chapter.label, cleanSubject).slice(0, 3).map((label, index) => ({
        level: 2,
        number: `${chapterIndex + 1}.${index + 1}`,
        label
      }));
    sections.slice(0, 8).forEach((section, sectionIndex) => {
      const sectionId = `${chapterId}s${sectionIndex + 1}`;
      const sectionText = textAroundLabel(sourceText || chapterText, section.label, chapterIndex * 8000 + sectionIndex * 1800);
      const sectionCore = outlineLabelCore(section.label);
      nodes.push(makeGraphNode({
        id: sectionId,
        label: section.label,
        group: sectionIndex % 2 === 0 ? "concept" : "topic",
        level: 2,
        subject: cleanSubject,
        parentLabel: chapter.label,
        details: `「${chapter.label}」下的二级知识分支：${section.label}。`,
        knowledgePoints: uniqueTexts([
          ...knowledgePointsForKeyword(sectionText || chapterText, sectionCore),
          `本节围绕「${sectionCore || section.label}」组织概念、方法、适用场景和常见误区。`,
          `学习时先明确它与「${chapter.label}」的关系，再通过例题或实验验证掌握情况。`
        ]).slice(0, 6)
      }));
      links.push({ source: chapterId, target: sectionId, label: "包含", type: "contains" });
      if (sectionIndex > 0) links.push({ source: `${chapterId}s${sectionIndex}`, target: sectionId, label: "前置依赖", type: "prerequisite" });

      const childLabels = uniqueTexts((section.children || []).map((item) => item.label)
        .concat(extractTermsForSection(sectionText || chapterText, section.label, cleanSubject)))
        .filter((label) => isUsefulGraphLabel(label) && outlineLabelCore(label) !== sectionCore)
        .slice(0, 5);
      childLabels.forEach((childLabel, childIndex) => {
        const childId = `${sectionId}k${childIndex + 1}`;
        nodes.push(makeGraphNode({
          id: childId,
          label: childLabel,
          group: "detail",
          level: 3,
          subject: cleanSubject,
          parentLabel: section.label,
          details: `「${chapter.label} > ${section.label}」下的三级知识点：${childLabel}。`,
          knowledgePoints: knowledgePointsForTerm(sectionText || chapterText, childLabel, section.label, cleanSubject)
        }));
        links.push({ source: sectionId, target: childId, label: "细分", type: "contains" });
      });
    });
  });
  if (looksLikeMachineLearning(cleanSubject, `${sourceName}\n${sourceText}`)) addMachineLearningCrossLinks(nodes, links);
  return enhanceGraphForEducation({
    id: uid("graph"),
    ownerId,
    subject: cleanSubject,
    title: title || `${cleanSubject}知识图谱`,
    sourceName: sourceName || "教材/讲义导入",
    extraction: {
      ...(extraction || {}),
      outlineDriven: true,
      outlineNodes: outline.length,
      outlineChapters: chapters.length,
      graphAgent: "outline-aware-education-kg-agent"
    },
    nodes,
    links,
    global: false,
    createdAt: now(),
    updatedAt: now()
  });
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

const EDUCATION_COGNITIVE_LEVELS = ["记忆", "理解", "应用", "分析", "评价", "创造"];
const EDUCATION_COMPETENCIES = ["逻辑推理", "模型建构", "科学探究", "数据意识", "问题解决", "系统思维", "价值判断"];
const EDUCATION_ONTOLOGY_LAYERS = ["学科知识图谱", "认知能力图谱", "教学资源图谱", "素养与价值图谱", "学习者认知图谱"];
const EDUCATION_SEMANTIC_RELATIONS = ["contains", "prerequisite", "misconception", "cross-link", "assessment", "resource", "competency", "semantic"];
const EDUCATION_GRAPHRAG_SCHEMA = ["层级路径", "前置依赖", "下级知识点", "易混淆概念", "教学资源", "考察属性", "学生掌握状态"];

function stableNumber(value, modulo = 100) {
  let hash = 2166136261;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) % modulo;
}

function inferOntologyType(group, level) {
  if (level === 0 || group === "root") return "domain-root";
  if (level === 1 || group === "chapter") return "chapter";
  if (level === 2 || group === "concept" || group === "topic") return "knowledge-point";
  return "micro-objective";
}

function inferCognitiveLevel(label, level = 2) {
  const text = String(label || "");
  if (/设计|创造|综合|方案|建构|项目/.test(text)) return "创造";
  if (/评价|比较|权衡|优劣|性能指标/.test(text)) return "评价";
  if (/分析|过程|机制|原理|数据流|控制流|地址变换/.test(text)) return "分析";
  if (/应用|计算|例题|执行|操作|实验|DMA|Cache|CPU/.test(text)) return "应用";
  if (/概念|结构|功能|分类|特点/.test(text)) return "理解";
  return EDUCATION_COGNITIVE_LEVELS[Math.min(EDUCATION_COGNITIVE_LEVELS.length - 1, Math.max(0, level + 1))] || "理解";
}

function inferCompetencies(label, subject = "") {
  const text = `${subject} ${label}`;
  const result = [];
  if (/数学|函数|导数|公式|运算|数制|编码|逻辑/.test(text)) result.push("逻辑推理");
  if (/物理|实验|探究|I\/O|总线|Cache|CPU|系统|结构/.test(text)) result.push("科学探究", "模型建构");
  if (/数据|存储|地址|编码|图|表|统计/.test(text)) result.push("数据意识");
  if (/方案|应用|题|问题|执行|性能/.test(text)) result.push("问题解决");
  if (/组成|系统|层次|网络|架构|总线|计算机/.test(text)) result.push("系统思维");
  if (!result.length) result.push(EDUCATION_COMPETENCIES[stableNumber(text, EDUCATION_COMPETENCIES.length)]);
  return Array.from(new Set(result)).slice(0, 3);
}

function inferNodeResources(label, subject = "") {
  const topic = String(label || "知识点");
  return [
    { type: "micro-video", title: `${topic} 5 分钟微课`, use: "课前预习或错题后快速回看" },
    { type: "exercise", title: `${topic} 分层练习`, use: "基础题、迁移题、综合题逐级检测" },
    { type: /实验|CPU|Cache|总线|I\/O|物理|系统/.test(`${subject}${topic}`) ? "interactive-sim" : "worked-example", title: `${topic} 互动模型/例题`, use: "把抽象过程可视化，支撑应用与分析" }
  ];
}

function inferAssessment(label, level = 2) {
  const seed = stableNumber(label, 100);
  const difficulty = Math.min(0.95, Math.max(0.18, 0.25 + level * 0.13 + seed / 420));
  return {
    examFrequency: seed > 72 ? "高频" : seed > 38 ? "中频" : "低频",
    difficulty: Number(difficulty.toFixed(2)),
    discrimination: Number(Math.min(0.92, 0.35 + difficulty * 0.58).toFixed(2))
  };
}

function inferLearnerState(label, level = 2) {
  const seed = stableNumber(label, 100);
  const states = ["未掌握", "模糊", "基本掌握", "精通"];
  const index = level <= 1 ? 2 : seed > 72 ? 1 : seed > 42 ? 2 : seed > 18 ? 0 : 3;
  const mastery = [0.18, 0.42, 0.68, 0.9][index];
  return {
    status: states[index],
    mastery,
    heat: Number((1 - mastery).toFixed(2)),
    weight: Number((1 + level * 0.18 + (100 - seed) / 180).toFixed(2)),
    evidence: "依据节点层级、知识点关系和模拟学习行为生成，可接入真实做题/提问/停留时间实时更新。"
  };
}

function relationTypeLabel(type) {
  return {
    contains: "层级包含",
    prerequisite: "前置依赖",
    misconception: "易混淆/迷思概念",
    "cross-link": "横向关联",
    assessment: "考察属性",
    resource: "教学资源",
    competency: "核心素养",
    semantic: "语义关联"
  }[type] || "语义关联";
}

function educationalNodeProfile({ label, group, level, subject, parentLabel, details }) {
  return {
    ontology: {
      domain: subject || "通用",
      type: inferOntologyType(group, level),
      parent: parentLabel || "",
      layer: level === 0 ? "学科根" : level === 1 ? "章" : level === 2 ? "节/知识点" : "考点/微目标"
    },
    cognitive: {
      bloom: inferCognitiveLevel(label, level),
      objective: `学生能够围绕「${label}」完成${inferCognitiveLevel(label, level)}层级的解释、迁移或问题解决。`
    },
    resources: inferNodeResources(label, subject),
    competencies: inferCompetencies(label, subject),
    assessment: inferAssessment(label, level),
    learnerState: inferLearnerState(label, level),
    graphRag: {
      retrievalRole: level <= 1 ? "context-anchor" : level === 2 ? "retrieval-concept" : "evidence-node",
      keywords: Array.from(new Set(String(label || "").split(/[、，,\s/]+/).filter(Boolean))).slice(0, 6),
      contextSchema: EDUCATION_GRAPHRAG_SCHEMA,
      subgraphQuery: "向上取层级路径，向下取 1-2 层子节点，同时取 prerequisite、misconception、cross-link 关系。",
      promptHint: `回答与「${label}」相关问题时，优先提取它的前置依赖、下级节点、易混淆点、典型例题和资源节点。`
    },
    navigation: {
      learningPathRole: level <= 1 ? "路径锚点" : level === 2 ? "核心学习节点" : "补救/考点节点",
      shortestPathHint: `从当前已掌握节点到「${label}」时，优先沿前置依赖和章节包含关系生成最短学习路径。`,
      weaknessTraceHint: `若「${label}」相关题目出错，沿 prerequisite 入边向前追溯低掌握度节点，定位真正薄弱点。`
    },
    misconception: /易错|混淆|问题|错误|风险/.test(`${label}${details || ""}`)
      ? `学生容易把「${label}」与相邻概念边界混淆，应先比较定义、条件和适用场景。`
      : `学习「${label}」时要避免只背名称，应同时说明条件、过程、例题和相邻关系。`
  };
}

function makeGraphNode({ id, label, group, level, knowledgePoints = [], details = "", subject = "", parentLabel = "" }) {
  const profile = educationalNodeProfile({ label, group, level, subject, parentLabel, details });
  return {
    id,
    label,
    group,
    level,
    details,
    knowledgePoints: knowledgePoints.filter(Boolean).map((point) => String(point).slice(0, 180)),
    ...profile
  };
}

function educationalLink(link, index = 0) {
  const rawLabel = String(link.label || link.relation || "关联");
  let type = String(link.type || "");
  if (!type) {
    if (/包含|章节|模块|细分/.test(rawLabel)) type = "contains";
    else if (/前置|递进|支撑|驱动|进入|服务/.test(rawLabel)) type = "prerequisite";
    else if (/易混|迷思|常见问题|易错/.test(rawLabel)) type = "misconception";
    else if (/考|高频|难度|区分度/.test(rawLabel)) type = "assessment";
    else if (/跨|关联|连接|响应|参与|缓解/.test(rawLabel)) type = "cross-link";
    else type = "semantic";
  }
  return {
    source: String(link.source),
    target: String(link.target),
    label: rawLabel,
    type,
    typeLabel: relationTypeLabel(type),
    weight: Number.isFinite(Number(link.weight)) ? Number(link.weight) : Number((0.55 + stableNumber(`${link.source}-${link.target}-${rawLabel}`, 40) / 100).toFixed(2)),
    pedagogy: link.pedagogy || (
      type === "prerequisite" ? "学习路径规划和薄弱点归因优先使用"
        : type === "misconception" ? "用于提前预警常见错误概念"
          : type === "assessment" ? "用于考频、难度和区分度分析"
            : type === "cross-link" ? "用于跨章节/跨学科迁移"
              : "用于层级上下文组织"
    )
  };
}

function isContainsEducationLink(link) {
  return String(link.type || "") === "contains" || /包含|章节|模块|细分|一级/.test(String(link.label || link.relation || ""));
}

function graphEducationStats(nodes, links) {
  const countBy = (items, getter) => items.reduce((acc, item) => {
    const key = getter(item) || "未知";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return {
    ontology: countBy(nodes, (node) => node.ontology?.layer),
    cognitive: countBy(nodes, (node) => node.cognitive?.bloom),
    learnerState: countBy(nodes, (node) => node.learnerState?.status),
    relationTypes: countBy(links, (link) => link.type)
  };
}

function enhanceGraphForEducation(graph) {
  const nodes = graph.nodes || [];
  const nodeMap = new Map(nodes.map((node) => [String(node.id), node]));
  const parentByChild = new Map();
  (graph.links || []).forEach((link) => {
    if (isContainsEducationLink(link) && !parentByChild.has(String(link.target))) {
      parentByChild.set(String(link.target), String(link.source));
    }
  });
  const enhancedNodes = nodes.map((node, index) => {
    const id = String(node.id || `n${index}`);
    const label = String(node.label || node.name || `节点${index + 1}`);
    const level = Number.isFinite(Number(node.level)) ? Number(node.level) : index === 0 ? 0 : undefined;
    const parent = nodeMap.get(parentByChild.get(id));
    const profile = educationalNodeProfile({
      label,
      group: node.group || "topic",
      level: Number.isFinite(Number(level)) ? Number(level) : 2,
      subject: graph.subject,
      parentLabel: parent?.label || "",
      details: node.details
    });
    return {
      ...node,
      id,
      label,
      group: String(node.group || "topic"),
      level,
      details: String(node.details || ""),
      knowledgePoints: Array.isArray(node.knowledgePoints) ? node.knowledgePoints.map(String) : [],
      ontology: { ...profile.ontology, ...(node.ontology || {}) },
      cognitive: { ...profile.cognitive, ...(node.cognitive || {}) },
      resources: Array.isArray(node.resources) && node.resources.length ? node.resources : profile.resources,
      competencies: Array.isArray(node.competencies) && node.competencies.length ? node.competencies : profile.competencies,
      assessment: { ...profile.assessment, ...(node.assessment || {}) },
      learnerState: { ...profile.learnerState, ...(node.learnerState || {}) },
      graphRag: { ...profile.graphRag, ...(node.graphRag || {}) },
      navigation: { ...profile.navigation, ...(node.navigation || {}) },
      misconception: node.misconception || profile.misconception
    };
  });
  const enhancedLinks = (graph.links || []).map(educationalLink);
  const existing = new Set(enhancedLinks.map((link) => `${link.source}->${link.target}:${link.type}`));
  const childrenByParent = new Map();
  enhancedLinks.forEach((link) => {
    if (!["contains"].includes(link.type)) return;
    if (!childrenByParent.has(link.source)) childrenByParent.set(link.source, []);
    childrenByParent.get(link.source).push(link.target);
  });
  childrenByParent.forEach((children) => {
    children.forEach((target, index) => {
      if (index === 0) return;
      const source = children[index - 1];
      const key = `${source}->${target}:prerequisite`;
      if (!existing.has(key)) {
        enhancedLinks.push(educationalLink({ source, target, label: "前置依赖", type: "prerequisite" }));
        existing.add(key);
      }
    });
  });
  enhancedNodes.forEach((node) => {
    if (!/易错|常见问题|混淆|误区|小结/.test(String(node.label))) return;
    const parentId = parentByChild.get(node.id);
    if (!parentId) return;
    const key = `${parentId}->${node.id}:misconception`;
    if (!existing.has(key)) {
      enhancedLinks.push(educationalLink({ source: parentId, target: node.id, label: "易混淆/迷思概念", type: "misconception" }));
      existing.add(key);
    }
  });
  const educationStats = graphEducationStats(enhancedNodes, enhancedLinks);
  return {
    ...graph,
    nodes: enhancedNodes,
    links: enhancedLinks,
    meta: {
      ...(graph.meta || {}),
      educationModel: "Domain KG + Cognitive KG + Resource KG + Competency KG + Learner State KG",
      graphRagReady: true,
      ontologyLayers: EDUCATION_ONTOLOGY_LAYERS,
      semanticRelations: EDUCATION_SEMANTIC_RELATIONS,
      graphRag: {
        ready: true,
        localSubgraphExtraction: true,
        contextSchema: EDUCATION_GRAPHRAG_SCHEMA,
        hallucinationControl: "优先用局部子图、前置依赖、例题资源和节点证据组织大模型上下文。"
      },
      navigation: {
        shortestLearningPath: true,
        weaknessAttribution: true,
        dynamicLearnerOverlay: true
      },
      stats: educationStats,
      updatedBy: "education-kg-enricher"
    }
  };
}

function fallbackOutlinePoints(label, parentLabel = "") {
  const topic = String(label || "知识点");
  const parent = String(parentLabel || "本模块");
  const focused = [];
  if (/Cache|缓存|高速缓冲/.test(topic)) focused.push("重点区分命中率、映射方式、替换算法、写策略和一致性问题。");
  if (/CPU|处理器|控制器|数据通路|流水线/.test(topic)) focused.push("重点沿取指、译码、执行、访存、写回分析数据流和控制信号。");
  if (/存储|主存|虚拟|页式|段式|磁盘|固态/.test(topic)) focused.push("重点比较容量、速度、成本、地址变换和访存路径。");
  if (/指令|寻址|机器级|汇编|CISC|RISC/.test(topic)) focused.push("重点说明操作码、操作数位置、寻址过程和机器级执行结果。");
  if (/总线|I\/O|接口|DMA|中断|外部设备/.test(topic)) focused.push("重点关注主机与外设之间的数据传送路径、控制方式和 CPU 参与程度。");
  if (/数制|编码|定点|浮点|运算|移位|加减|乘除|整数/.test(topic)) focused.push("重点写清表示范围、符号位规则、溢出判断和运算步骤。");
  return [
    `核心定位：「${topic}」是「${parent}」中的关键节点，先明确它解决的硬件组织或机器级执行问题。`,
    `学习任务：能解释「${topic}」的定义、组成、工作流程和适用条件，并能画出简化关系图。`,
    focused[0] || `复习重点：围绕「${topic}」整理概念边界、结构关系、典型公式或执行步骤。`,
    `考查方式：常结合选择题、综合题或流程分析题，要求判断条件、比较差异并说明原因。`,
    `易错提醒：不要孤立背诵「${topic}」，要说明它与「${parent}」及相邻节点之间的数据流、控制流或层次关系。`
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
    subject: cleanSubject,
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
      subject: cleanSubject,
      parentLabel: "计算机组成原理",
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
        subject: cleanSubject,
        parentLabel: chapter.label,
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
          subject: cleanSubject,
          parentLabel: label,
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
  return enhanceGraphForEducation({
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
  });
}

function buildGraphFromText({ ownerId, title, subject, sourceName, sourceText, extraction }) {
  const cleanSubject = normalizeSubject(subject);
  const graphSourceText = limitText([sourceText, title, sourceName].filter(Boolean).join("\n\n"));
  if (looksLikeComputerOrganization(cleanSubject, graphSourceText)) {
    return buildComputerOrganizationGraph({ ownerId, title, subject: cleanSubject, sourceName, sourceText: graphSourceText, extraction });
  }
  const outline = extractBookOutline(graphSourceText, cleanSubject, sourceName);
  if (outline.length >= 3) {
    return buildOutlineGraphFromText({
      ownerId,
      title,
      subject: cleanSubject,
      sourceName,
      sourceText: graphSourceText,
      extraction,
      outline
    });
  }
  const keywords = extractKeywords(graphSourceText, cleanSubject);
  const nodes = [makeGraphNode({
    id: "n0",
    label: `${cleanSubject}知识主线`,
    group: "root",
    level: 0,
    subject: cleanSubject,
    knowledgePoints: splitKnowledgeSentences(graphSourceText).slice(0, 6),
    details: `由${sourceName || "输入内容"}生成。${extraction?.characters ? `已识别 ${extraction.characters} 个文本字符。` : ""}`
  })];
  const links = [];
  const groups = [];
  for (let i = 0; i < keywords.length; i += 3) groups.push(keywords.slice(i, i + 3));
  groups.forEach((group, groupIndex) => {
    const chapterId = `g${groupIndex + 1}`;
    const chapterLabel = group[0] || `模块${groupIndex + 1}`;
    nodes.push(makeGraphNode({
      id: chapterId,
      label: chapterLabel,
      group: "chapter",
      level: 1,
      subject: cleanSubject,
      parentLabel: `${cleanSubject}知识主线`,
      knowledgePoints: knowledgePointsForKeyword(graphSourceText, chapterLabel),
      details: `从书本内容中抽取的一级模块：「${chapterLabel}」。`
    }));
    links.push({ source: "n0", target: chapterId, label: "一级模块" });
    group.slice(1).forEach((keyword, sectionIndex) => {
      const nodeId = `${chapterId}s${sectionIndex + 1}`;
      nodes.push(makeGraphNode({
        id: nodeId,
        label: keyword,
        group: sectionIndex % 2 === 0 ? "concept" : "topic",
        level: 2,
        subject: cleanSubject,
        parentLabel: chapterLabel,
        knowledgePoints: knowledgePointsForKeyword(graphSourceText, keyword),
        details: `从书本内容和补充知识点中抽取的「${keyword}」相关知识。`
      }));
      links.push({ source: chapterId, target: nodeId, label: "包含" });
    });
    if (groupIndex > 0) links.push({ source: `g${groupIndex}`, target: chapterId, label: "递进" });
  });
  return enhanceGraphForEducation({
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
  });
}

function validateGraph(raw, fallback) {
  const graph = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.links)) {
    throw Object.assign(new Error("图谱 JSON 需要包含 nodes 和 links 数组"), { status: 400 });
  }
  const sanitized = {
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
      knowledgePoints: Array.isArray(node.knowledgePoints) ? node.knowledgePoints.map(String) : [],
      ontology: node.ontology && typeof node.ontology === "object" ? node.ontology : undefined,
      cognitive: node.cognitive && typeof node.cognitive === "object" ? node.cognitive : undefined,
      resources: Array.isArray(node.resources) ? node.resources : undefined,
      competencies: Array.isArray(node.competencies) ? node.competencies.map(String) : undefined,
      assessment: node.assessment && typeof node.assessment === "object" ? node.assessment : undefined,
      learnerState: node.learnerState && typeof node.learnerState === "object" ? node.learnerState : undefined,
      graphRag: node.graphRag && typeof node.graphRag === "object" ? node.graphRag : undefined,
      navigation: node.navigation && typeof node.navigation === "object" ? node.navigation : undefined,
      misconception: node.misconception ? String(node.misconception) : undefined
    })),
    links: graph.links.map((link) => ({
      source: String(link.source),
      target: String(link.target),
      label: String(link.label || link.relation || "关联"),
      type: link.type ? String(link.type) : undefined,
      typeLabel: link.typeLabel ? String(link.typeLabel) : undefined,
      weight: Number.isFinite(Number(link.weight)) ? Number(link.weight) : undefined,
      pedagogy: link.pedagogy ? String(link.pedagogy) : undefined
    })),
    global: false,
    createdAt: now(),
    updatedAt: now()
  };
  return enhanceGraphForEducation(sanitized);
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
        requestText(payload.sourceText),
        aiUnlimited ? payload.subject : "",
        aiUnlimited ? payload.title : "",
        aiUnlimited ? payload.sourceName : ""
      ].filter(Boolean).join("\n\n"));
      const isPdf = payload.file && (String(payload.file.type || "").includes("pdf") || String(payload.file.name || "").toLowerCase().endsWith(".pdf"));
      if (isPdf && !uploaded.text.trim() && !String(payload.sourceText || "").trim() && !aiUnlimited) {
        throw new Error("PDF 文本层和 OCR 都未识别到可用于生成图谱的内容。请确认本机 PaddleOCR 可用，或在补充目录/知识点中粘贴章节信息后再生成。");
      }

      assertGraphJobActive(jobId);
      updateGraphJob(jobId, { stage: "构建图谱", progress: 82, message: "正在先识别目录分支，再抽取章节知识点和语义关系" });
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

function normalizeRubricCriteria(criteria, fallbackText = "") {
  const rows = (Array.isArray(criteria) ? criteria : []).map((item, index) => ({
    id: item.id || `criterion_${index + 1}`,
    title: String(item.title || item.name || `评分项 ${index + 1}`).trim().slice(0, 40),
    points: Number(item.points ?? item.score ?? 0),
    expected: String(item.expected || item.description || item.text || fallbackText || "").trim().slice(0, 500)
  })).filter((item) => item.title || item.expected);
  if (!rows.length) return [];
  const explicitTotal = rows.reduce((sum, item) => sum + (Number.isFinite(item.points) && item.points > 0 ? item.points : 0), 0);
  if (explicitTotal <= 0) {
    const each = Math.floor(100 / rows.length);
    rows.forEach((item, index) => {
      item.points = index === rows.length - 1 ? 100 - each * (rows.length - 1) : each;
    });
    return rows;
  }
  rows.forEach((item) => {
    item.points = Math.max(1, Math.round((Math.max(0, item.points) / explicitTotal) * 100));
  });
  const total = rows.reduce((sum, item) => sum + item.points, 0);
  if (total !== 100 && rows.length) rows[rows.length - 1].points += 100 - total;
  return rows;
}

function parseRubricInput(input, fallback = {}) {
  if (Array.isArray(input)) return normalizeRubricCriteria(input, fallback.answer || fallback.description || fallback.title || "");
  const text = String(input || "").trim();
  if (text) {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const parsed = lines.map((line, index) => {
      const match = line.match(/^(?:\d+[.、]\s*)?(.*?)(?:[:：,，]\s*)?(\d{1,3})\s*分?\s*(?:[:：,，-]\s*)?(.*)$/);
      if (match && (match[1] || match[3])) {
        return {
          id: `criterion_${index + 1}`,
          title: (match[1] || `评分项 ${index + 1}`).trim(),
          points: Number(match[2]),
          expected: (match[3] || match[1] || line).trim()
        };
      }
      return {
        id: `criterion_${index + 1}`,
        title: line.slice(0, 24),
        points: 0,
        expected: line
      };
    });
    return normalizeRubricCriteria(parsed, text);
  }
  const answer = String(fallback.answer || "").trim();
  const description = String(fallback.description || fallback.title || "").trim();
  return normalizeRubricCriteria([
    { title: "核心概念与事实", points: 35, expected: answer || description },
    { title: "解题步骤与推理", points: 35, expected: [description, answer].filter(Boolean).join(" ") },
    { title: "关键术语覆盖", points: 20, expected: answer || description },
    { title: "表达完整与规范", points: 10, expected: "结构清晰，结论明确，必要时说明依据和单位。" }
  ], answer || description);
}

function rubricToText(rubric = []) {
  return (rubric || []).map((item) => `${item.title} ${item.points}分：${item.expected}`).join("\n");
}

function evaluateCriterion(criterion, submissionText) {
  const expectedTokens = tokenizeForSearch(`${criterion.title} ${criterion.expected}`).slice(0, 30);
  const answerTokens = new Set(tokenizeForSearch(submissionText));
  const matched = expectedTokens.filter((token) => answerTokens.has(token));
  const missing = expectedTokens.filter((token) => !answerTokens.has(token)).slice(0, 6);
  const ratio = expectedTokens.length ? matched.length / expectedTokens.length : 0;
  const hasAnswer = String(submissionText || "").trim().length > 0;
  const factor = !hasAnswer ? 0 : ratio >= 0.75 ? 1 : ratio >= 0.45 ? 0.78 : ratio >= 0.2 ? 0.48 : ratio > 0 ? 0.28 : 0.12;
  const score = Math.round(Number(criterion.points || 0) * factor);
  return {
    id: criterion.id,
    title: criterion.title,
    points: criterion.points,
    score,
    matched: matched.slice(0, 6),
    missing,
    comment: score >= criterion.points * 0.8
      ? "覆盖较充分。"
      : missing.length
        ? `建议补充：${missing.join("、")}。`
        : "需要补充更明确的解释或推理过程。"
  };
}

function visibleCourseMaterials(db, userId) {
  const user = ensureUser(db, userId);
  if (user.role === "admin") return db.courseMaterials || [];
  const teacherIds = classTeacherIdsForUser(db, user);
  return (db.courseMaterials || []).filter((material) => (
    material.ownerId === userId
    || (user.role === "student" && material.global && teacherIds.includes(material.ownerId))
    || (material.classId && (user.classIds || []).includes(material.classId))
  ));
}

function publicCourseMaterial(material) {
  return {
    id: material.id,
    ownerId: material.ownerId,
    subject: material.subject,
    title: material.title,
    sourceName: material.sourceName,
    type: material.type,
    global: Boolean(material.global),
    classId: material.classId || "",
    chunkCount: (material.chunks || []).length,
    characters: String(material.text || "").length,
    preview: String(material.text || "").slice(0, 180),
    extraction: material.extraction || null,
    createdAt: material.createdAt,
    updatedAt: material.updatedAt
  };
}

function searchCourseKnowledge(db, userId, query, options = {}) {
  const subject = normalizeSubject(options.subject || "");
  const queryTokens = tokenizeForSearch(query);
  const queryTokenSet = new Set(queryTokens);
  const queryVector = embeddingFromTokens(queryTokens);
  const queryText = String(query || "");
  const queryHead = queryText.replace(/\s+/g, "").slice(0, 16);
  const materials = visibleCourseMaterials(db, userId)
    .filter((material) => !subject || subject === "通用" || material.subject === subject || String(query).includes(material.subject));
  const materialHits = [];
  materials.forEach((material) => {
    (material.chunks || []).forEach((chunk) => {
      const chunkTokens = chunk.keywords?.length ? chunk.keywords : tokenizeForSearch(chunk.text);
      const overlap = chunkTokens.filter((token) => queryTokenSet.has(token));
      const vectorScore = cosineSimilarity(queryVector, chunk.embedding || embeddingForText(chunk.text || ""));
      const exactBoost = queryHead && String(chunk.text || "").replace(/\s+/g, "").includes(queryHead) ? 5 : 0;
      const subjectBoost = subject && subject !== "通用" && material.subject === subject ? 2 : 0;
      const titleBoost = chunkTokens.some((token) => String(material.title || "").includes(token)) ? 1 : 0;
      const chapterBoost = chunkTokens.some((token) => String(chunk.chapter || "").includes(token)) ? 1 : 0;
      const score = Number((overlap.length * 2.2 + Math.max(0, vectorScore) * 12 + exactBoost + subjectBoost + titleBoost + chapterBoost).toFixed(3));
      if (score <= 0.5 && materialHits.length > 0) return;
      materialHits.push({
        type: "material",
        score,
        scoreDetail: {
          lexical: overlap.length,
          vector: Number(vectorScore.toFixed(3)),
          exact: exactBoost > 0
        },
        materialId: material.id,
        chunkId: chunk.id,
        title: material.title,
        sourceName: material.sourceName,
        subject: material.subject,
        chapter: chunk.chapter || material.title,
        page: chunk.page || Math.max(1, (chunk.index || 0) + 1),
        quote: String(chunk.text || "").slice(0, 220),
        text: chunk.text
      });
    });
  });

  const graphHits = [];
  visibleKnowledgeGraphs(db, userId)
    .filter((graph) => !subject || subject === "通用" || graph.subject === subject || String(query).includes(graph.subject))
    .forEach((graph) => {
      (graph.nodes || []).forEach((node) => {
        const nodeText = [node.label, node.details, ...(node.knowledgePoints || [])].join(" ");
        const tokens = tokenizeForSearch(nodeText);
        const overlap = tokens.filter((token) => queryTokenSet.has(token));
        const vectorScore = cosineSimilarity(queryVector, embeddingFromTokens(tokens));
        const exactBoost = String(query).includes(node.label) ? 5 : 0;
        const score = Number((overlap.length * 1.8 + Math.max(0, vectorScore) * 8 + exactBoost).toFixed(3));
        if (score <= 0.5) return;
        graphHits.push({
          type: "graph",
          score,
          scoreDetail: {
            lexical: overlap.length,
            vector: Number(vectorScore.toFixed(3)),
            exact: exactBoost > 0
          },
          graphId: graph.id,
          nodeId: node.id,
          title: graph.title,
          sourceName: graph.sourceName || graph.title,
          subject: graph.subject,
          chapter: node.ontology?.parent || node.ontology?.layer || "知识图谱",
          page: null,
          quote: nodeText.slice(0, 220),
          text: nodeText,
          nodeLabel: node.label
        });
      });
    });

  const ranked = materialHits.concat(graphHits)
    .sort((a, b) => b.score - a.score)
    .reduce((items, hit) => {
      const sameSourceCount = items.filter((item) => item.sourceName === hit.sourceName).length;
      const sameChapterCount = items.filter((item) => item.sourceName === hit.sourceName && item.chapter === hit.chapter).length;
      const adjustedScore = hit.score - sameSourceCount * 0.6 - sameChapterCount * 0.8;
      items.push({ ...hit, score: Number(adjustedScore.toFixed(3)) });
      return items.sort((a, b) => b.score - a.score);
    }, []);

  return ranked.slice(0, options.limit || RAG_MAX_CONTEXT_CHUNKS);
}

function citationsFromHits(hits) {
  return hits.map((hit, index) => ({
    id: `S${index + 1}`,
    type: hit.type,
    title: hit.title,
    sourceName: hit.sourceName,
    subject: hit.subject,
    chapter: hit.chapter,
    page: hit.page,
    quote: hit.quote,
    materialId: hit.materialId,
    graphId: hit.graphId,
    nodeId: hit.nodeId
  }));
}

function isAcademicMisuse(prompt) {
  return /直接.*(写|生成|完成).*(作业|论文|实验报告|考试|答案)|代写|替我写|帮我作弊|考试.*答案|不要解释.*只给答案/.test(String(prompt || ""));
}

const AI_MODE_META = {
  qa: {
    label: "问答模式",
    strategy: "课程 RAG 问答",
    structure: "结论、依据、补充推理、下一步"
  },
  explain: {
    label: "讲解模式",
    strategy: "分层讲解",
    structure: "定义、通俗解释、资料依据、例子、误区、练习"
  },
  guided: {
    label: "引导模式",
    strategy: "苏格拉底式引导",
    structure: "关键提示、追问、前置知识、下一步作答"
  },
  practice: {
    label: "练习模式",
    strategy: "自适应练习",
    structure: "知识点、分层题目、答案解析、错因提醒"
  },
  grade: {
    label: "批改模式",
    strategy: "错因诊断",
    structure: "总体评价、正确点、错误点、修改建议、复习建议"
  },
  plan: {
    label: "规划模式",
    strategy: "学习路径规划",
    structure: "目标、优先级、每日任务、练习安排、检测方式"
  }
};

function aiModeAlias(mode) {
  const raw = String(mode || "").trim().toLowerCase();
  const aliases = {
    rag: "qa",
    answer: "qa",
    question: "qa",
    questions: "practice",
    quiz: "practice",
    socratic: "guided",
    hint: "guided",
    guide: "guided",
    guided_tutoring: "guided",
    "study-plan": "plan",
    "teacher-plan": "plan",
    correction: "grade",
    grading: "grade",
    qa: "qa",
    explain: "explain",
    guided: "guided",
    practice: "practice",
    grade: "grade",
    plan: "plan"
  };
  return aliases[raw] || null;
}

function detectTeachingIntent(prompt, requestedMode, role = "student") {
  const text = String(prompt || "");
  let mode = aiModeAlias(requestedMode);
  if (!mode || String(requestedMode || "").trim().toLowerCase() === "auto") {
    if (/批改|评分|看看.*答案|哪里错|错因|修改建议|改作业|检查代码|实验报告反馈/.test(text)) mode = "grade";
    else if (/苏格拉底|追问|引导|提示模式|只给.*提示|分步提示|不要直接给答案|先问我|一步步/.test(text)) mode = "guided";
    else if (/出题|生成.*题|练习|测验|选择题|填空题|简答题|计算题|编程题|错题|类似题|同类题/.test(text)) mode = "practice";
    else if (/复习|学习路径|复习路径|学习计划|规划|薄弱点|掌握度|推荐顺序|每日|每周|考试|教案|教学设计|课堂设计|授课方案/.test(text)) mode = "plan";
    else if (/讲解|解释|是什么|为什么|原理|通俗|推导|举例|对比|区别/.test(text)) mode = "explain";
    else mode = "qa";
  }
  const teacherDesign = role === "teacher" && /教学设计|教案|课堂设计|授课方案|教学目标|重难点|课堂流程|评分标准/.test(text);
  const strategy = teacherDesign
    ? "教师助手：教学设计生成"
    : AI_MODE_META[mode]?.strategy || "课程 RAG 问答";
  const intent = teacherDesign ? "teacher-design" : mode;
  return {
    mode,
    label: AI_MODE_META[mode]?.label || "问答模式",
    intent,
    strategy,
    answerStructure: AI_MODE_META[mode]?.structure || AI_MODE_META.qa.structure
  };
}

function inferQuestionTopics(text, subject = "") {
  return extractKeywords(text, subject).slice(0, 6);
}

function linkEndpointId(value) {
  if (value && typeof value === "object") return String(value.id || value.key || value.label || "");
  return String(value || "");
}

function relationBucket(label = "") {
  const text = String(label || "");
  if (/前置|依赖|先修|基础/.test(text)) return "prerequisite";
  if (/混淆|误区|迷思|区别|对比/.test(text)) return "misconception";
  if (/考|题|测|评分|难度/.test(text)) return "assessment";
  if (/资源|视频|讲义|实验|资料/.test(text)) return "resource";
  if (/复习|路径|推荐/.test(text)) return "review";
  return "related";
}

function graphNodeText(node) {
  return [
    node.label,
    node.details,
    node.summary,
    node.description,
    node.ontology?.layer,
    node.ontology?.parent,
    ...(node.knowledgePoints || []),
    ...(node.misconceptions || [])
  ].filter(Boolean).join(" ");
}

function findGraphContext(db, userId, subject, prompt, topics = [], hits = []) {
  const queryText = [prompt, subject, ...topics].filter(Boolean).join(" ");
  const queryTokens = new Set(tokenizeForSearch(queryText));
  const graphHitNodeIds = new Set(hits.filter((hit) => hit.type === "graph").map((hit) => `${hit.graphId}:${hit.nodeId}`));
  const graphs = visibleKnowledgeGraphs(db, userId).filter((graph) => (
    !subject || subject === "通用" || graph.subject === subject || String(prompt).includes(graph.subject)
  ));
  const candidates = [];
  graphs.forEach((graph) => {
    (graph.nodes || []).forEach((node) => {
      const nodeText = graphNodeText(node);
      const tokens = tokenizeForSearch(nodeText);
      const overlap = tokens.filter((token) => queryTokens.has(token)).length;
      const exact = String(prompt).includes(node.label) ? 8 : 0;
      const hitBoost = graphHitNodeIds.has(`${graph.id}:${node.id}`) ? 6 : 0;
      const score = overlap * 2 + exact + hitBoost;
      if (score > 0) candidates.push({ graph, node, score });
    });
  });
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best) {
    return {
      focusNode: null,
      relatedNodes: topics.slice(0, 6).map((topic) => ({ label: topic })),
      prerequisiteNodes: [],
      misconceptionNodes: [],
      path: [],
      graphTitle: "",
      graphId: ""
    };
  }
  const nodeMap = new Map((best.graph.nodes || []).map((node) => [String(node.id), node]));
  const related = [];
  const prerequisite = [];
  const misconception = [];
  (best.graph.links || []).forEach((link) => {
    const source = linkEndpointId(link.source);
    const target = linkEndpointId(link.target);
    const touches = source === String(best.node.id) || target === String(best.node.id);
    if (!touches) return;
    const otherId = source === String(best.node.id) ? target : source;
    const other = nodeMap.get(otherId);
    if (!other) return;
    const item = {
      id: other.id,
      label: other.label,
      relation: link.label || "关联",
      direction: target === String(best.node.id) ? "incoming" : "outgoing"
    };
    const bucket = relationBucket(link.label);
    if (bucket === "prerequisite" || (target === String(best.node.id) && /包含|细分|支撑/.test(String(link.label || "")))) prerequisite.push(item);
    else if (bucket === "misconception") misconception.push(item);
    else related.push(item);
  });
  const parentLabel = best.node.ontology?.parent || "";
  const path = [best.graph.subject, parentLabel, best.node.label].filter(Boolean);
  return {
    graphId: best.graph.id,
    graphTitle: best.graph.title,
    focusNode: {
      id: best.node.id,
      label: best.node.label,
      details: best.node.details || best.node.summary || "",
      layer: best.node.ontology?.layer || best.node.group || "知识点"
    },
    relatedNodes: related.concat(candidates.slice(1, 7).map((item) => ({
      id: item.node.id,
      label: item.node.label,
      relation: "相邻知识点"
    }))).slice(0, 8),
    prerequisiteNodes: prerequisite.slice(0, 6),
    misconceptionNodes: misconception.concat((best.node.misconceptions || []).map((label) => ({ label, relation: "常见误区" }))).slice(0, 6),
    path
  };
}

function profileMasterySummary(profile) {
  const entries = Object.entries(profile.mastery || {})
    .map(([topic, item]) => ({ topic, score: Number(item.score || 0), status: item.status || "待诊断" }))
    .sort((a, b) => a.score - b.score);
  return {
    weak: entries.filter((item) => item.score < 0.58).slice(0, 6),
    strong: entries.filter((item) => item.score >= 0.75).slice(-6).reverse(),
    count: entries.length,
    average: entries.length ? Number((entries.reduce((sum, item) => sum + item.score, 0) / entries.length).toFixed(2)) : null
  };
}

function updateTopicMastery(db, userId, topics, delta, evidence) {
  const profile = ensureLearningProfile(db, userId);
  topics.filter(Boolean).slice(0, 8).forEach((topic) => {
    const current = profile.mastery[topic] || { score: 0.52, status: "待诊断", evidence: [] };
    const nextScore = Math.max(0.08, Math.min(0.98, Number(current.score || 0.52) + delta));
    current.score = Number(nextScore.toFixed(2));
    current.status = nextScore < 0.35 ? "未掌握" : nextScore < 0.58 ? "模糊" : nextScore < 0.78 ? "基本掌握" : "精通";
    current.evidence = Array.isArray(current.evidence) ? current.evidence.slice(-8) : [];
    current.evidence.push({ text: evidence, at: now() });
    current.updatedAt = now();
    profile.mastery[topic] = current;
  });
  const weakSet = new Set(profile.weakPoints || []);
  Object.entries(profile.mastery || {}).forEach(([topic, item]) => {
    if (Number(item.score || 0) < 0.58) weakSet.add(topic);
    else weakSet.delete(topic);
  });
  profile.weakPoints = Array.from(weakSet).slice(0, 12);
  profile.updatedAt = now();
  return profile;
}

function recordLearningActivity(db, userId, activity) {
  const profile = ensureLearningProfile(db, userId);
  profile.questionCount = Number(profile.questionCount || 0) + (activity.kind === "question" ? 1 : 0);
  profile.practiceCount = Number(profile.practiceCount || 0) + (activity.kind === "practice" ? 1 : 0);
  profile.studyMinutes = Number(profile.studyMinutes || 0) + Number(activity.minutes || 3);
  profile.recentActivity = Array.isArray(profile.recentActivity) ? profile.recentActivity : [];
  profile.recentActivity.unshift({ ...activity, at: now() });
  profile.recentActivity = profile.recentActivity.slice(0, 30);
  profile.updatedAt = now();
  return profile;
}

function addWrongNote(db, userId, note) {
  db.wrongNotes = Array.isArray(db.wrongNotes) ? db.wrongNotes : [];
  const wrongNote = {
    id: uid("wrong"),
    userId,
    source: note.source || "智能体反馈",
    topic: note.topic || "待归类",
    question: note.question || "",
    answer: note.answer || "",
    analysis: note.analysis || "",
    recommendation: note.recommendation || "",
    createdAt: now()
  };
  db.wrongNotes.unshift(wrongNote);
  db.wrongNotes = db.wrongNotes.slice(0, 500);
  return wrongNote;
}

function formatCitations(citations) {
  if (!citations.length) return "暂无课程资料引用。";
  const shown = citations.slice(0, 2);
  const lines = shown.map((citation) => {
    const location = citation.page ? `${citation.chapter || "课程片段"}，第 ${citation.page} 页` : (citation.chapter || "知识图谱节点");
    const source = String(citation.sourceName || citation.title || "课程资料").replace(/\s+/g, " ").slice(0, 28);
    const compactLocation = String(location || "").replace(/\s+/g, " ").slice(0, 36);
    return `[${citation.id}] ${source} · ${compactLocation}`;
  });
  if (citations.length > shown.length) lines.push(`还有 ${citations.length - shown.length} 条引用，已放在右侧“引用来源”栏。`);
  return lines.join("\n");
}

function answerDepthLabel(depth) {
  return {
    brief: "简洁解释",
    layered: "分层讲解",
    full: "完整解析",
    exam: "考试版"
  }[String(depth || "layered")] || "分层讲解";
}

function citationEvidenceLines(hits, max = 3) {
  return hits.slice(0, max).map((hit, index) => `依据 [S${index + 1}]：${String(hit.text || hit.quote || "").replace(/\s+/g, " ").slice(0, 150)}`);
}

function masteryItemsForTopics(profile, topics) {
  return topics.slice(0, 8).map((topic) => {
    const item = profile.mastery?.[topic] || {};
    return {
      topic,
      score: item.score === undefined ? null : Number(item.score),
      status: item.status || "待诊断"
    };
  });
}

function buildRecommendedExercises(mode, topics, graphContext) {
  const topic = topics[0] || graphContext?.focusNode?.label || "当前知识点";
  if (mode === "practice") {
    return [
      `基础题：用一句话解释「${topic}」并列出适用条件。`,
      `提高题：比较「${topic}」和一个相邻知识点的区别。`,
      `迁移题：设计一个需要应用「${topic}」解决的小题并写出评分点。`
    ];
  }
  if (mode === "grade") {
    return [
      `复盘题：重新写出「${topic}」的定义、条件和解题步骤。`,
      "错因题：把本次错误归类为概念、条件、步骤或表达问题。",
      "同类题：换一组条件再完成一次，并标出每一步依据。"
    ];
  }
  if (mode === "plan") {
    return [
      `今天：整理「${topic}」的定义和前置知识。`,
      "明天：完成 3 道基础题和 1 道迁移题。",
      "复盘：24 小时后重做错题并更新掌握度。"
    ];
  }
  if (mode === "guided") {
    return [
      `先回答：你认为「${topic}」最关键的条件是什么？`,
      "再写出第一步依据，不要直接跳到结论。",
      "如果卡住，只补充你不确定的那一步。"
    ];
  }
  return [
    `复述「${topic}」的定义并举一个例子。`,
    `列出「${topic}」的一个易错点。`,
    "做 1 道基础题检验是否真正理解。"
  ];
}

function buildAgentActions(mode, topics) {
  const topic = topics[0] || "当前知识点";
  const common = [
    { type: "simplify", label: "讲得更简单", mode: "explain", prompt: `请把「${topic}」讲得更简单，并用生活类比说明。` },
    { type: "example", label: "举个例子", mode: "explain", prompt: `请围绕「${topic}」举一个完整例子，并说明每一步对应的知识点。` },
    { type: "sources", label: "显示来源", mode, prompt: "" }
  ];
  const byMode = {
    qa: [{ type: "hint", label: "只给提示", mode: "guided", prompt: `围绕「${topic}」只给我下一步提示，不要直接给完整答案。` }],
    explain: [{ type: "quiz", label: "给我一道题", mode: "practice", prompt: `请根据「${topic}」生成 1 道基础题、1 道提高题，并附答案解析。` }],
    guided: [{ type: "full", label: "完整解析", mode: "explain", prompt: `请把「${topic}」按完整解析模式讲清楚。` }],
    practice: [{ type: "grade", label: "批改我的答案", mode: "grade", prompt: `请按批改模式检查我对「${topic}」的答案。` }],
    grade: [{ type: "quiz", label: "生成同类题", mode: "practice", prompt: `请根据本次错因，为「${topic}」生成 2 道同类题并附解析。` }],
    plan: [{ type: "quiz", label: "生成阶段测验", mode: "practice", prompt: `请根据「${topic}」生成一组阶段测验题并附答案解析。` }]
  };
  return common.concat(byMode[mode] || []).concat([
    { type: "wrong-note", label: "加入错题本", mode, prompt: "" },
    { type: "mastered", label: "标记已掌握", mode, prompt: "" }
  ]);
}

function buildLearningPanel({ citations, topics, graphContext, profile, mode, strategy, answerDepth }) {
  const mastery = masteryItemsForTopics(profile, topics);
  const prerequisites = (graphContext?.prerequisiteNodes || []).map((node) => ({
    label: node.label,
    relation: node.relation || "前置依赖"
  }));
  const related = [
    ...(graphContext?.focusNode ? [{ label: graphContext.focusNode.label, relation: "当前焦点" }] : []),
    ...(graphContext?.relatedNodes || []).map((node) => ({ label: node.label, relation: node.relation || "相关知识点" })),
    ...topics.map((topic) => ({ label: topic, relation: "自动识别" }))
  ].filter((item, index, array) => item.label && array.findIndex((other) => other.label === item.label) === index).slice(0, 10);
  const misconceptions = (graphContext?.misconceptionNodes || []).map((node) => ({
    label: node.label,
    relation: node.relation || "易混淆"
  }));
  const weak = mastery.filter((item) => item.score === null || item.score < 0.58).slice(0, 4);
  const suggestions = [
    citations.length ? "本轮回答已优先依据课程资料，可在引用来源中追溯。" : "当前缺少明确资料引用，建议先上传教材、课件或讲义。",
    prerequisites.length ? `先复习前置知识：${prerequisites.slice(0, 3).map((item) => item.label).join("、")}。` : "如果理解困难，先补充定义、条件和典型例题。",
    weak.length ? `需要重点观察：${weak.map((item) => item.topic).join("、")}。` : "当前知识点暂无明显低掌握记录。"
  ];
  return {
    mode,
    strategy,
    answerDepth: answerDepthLabel(answerDepth),
    citations: citations.slice(0, 5),
    relatedKnowledgePoints: related,
    prerequisites,
    misconceptions,
    recommendedExercises: buildRecommendedExercises(mode, topics, graphContext),
    mastery,
    suggestions,
    graphFocus: graphContext?.focusNode ? {
      graphId: graphContext.graphId,
      graphTitle: graphContext.graphTitle,
      nodeId: graphContext.focusNode.id,
      label: graphContext.focusNode.label,
      path: graphContext.path || []
    } : null
  };
}

function answerFromEvidence({ user, mode, prompt, hits, citations, profile, teaching, answerDepth, chapter, knowledgePoint }) {
  const hasEvidence = hits.length > 0 && hits[0].score > 0;
  const topics = Array.from(new Set([
    knowledgePoint,
    ...inferQuestionTopics([prompt, chapter, knowledgePoint, ...hits.map((hit) => hit.text)].join("\n"), hits[0]?.subject || user.subject || "")
  ].filter(Boolean))).slice(0, 8);
  const mastery = profileMasterySummary(profile);
  const levelHint = profile.level === "基础" || mastery.average < 0.58
    ? "我会先用通俗语言解释，再补充正式定义。"
    : "你已有一定基础，我会同时给出原理、边界条件和迁移应用。";
  const effectiveMode = mode || teaching?.mode || "qa";
  const depthHint = `回答深度：${answerDepthLabel(answerDepth)}。`;
  if (!hasEvidence) {
    if (effectiveMode === "guided") {
      return {
        content: [
          "课程资料中没有检索到足够明确的依据，下面内容仅作为引导性学习建议。",
          "",
          `【引导追问：${prompt}】`,
          "1. 你认为这个问题最核心的概念是什么？请先用一句话说出你的理解。",
          "2. 这个概念成立需要哪些前提条件？如果条件变化，结论是否还成立？",
          "3. 你能举一个教材、课堂或生活中的例子来验证它吗？",
          "4. 如果你卡住了，请补充题干、你的第一步思路或你不确定的地方，我会继续给分步提示。",
          "",
          "【可靠性说明】当前没有课程资料引用，建议上传教材/讲义后再进行可追溯回答。"
        ].join("\n"),
        confidence: "low",
        topics
      };
    }
    if (effectiveMode === "practice") {
      const topic = topics[0] || prompt;
      return {
        content: [
          "课程资料中没有检索到足够明确的依据，下面练习为模型根据题意生成，建议教师复核。",
          "",
          `【围绕「${topic}」的练习】`,
          `1. 基础题：请解释「${topic}」的定义、适用条件和一个典型例子。`,
          "参考要点：定义准确；能说明条件；例子与概念对应。",
          "",
          `2. 提高题：比较「${topic}」与一个相邻概念的区别，并说明容易混淆的地方。`,
          "参考要点：边界清楚；能指出误区；能用反例说明。",
          "",
          `3. 综合题：设计一个需要应用「${topic}」解决的小题，并写出评分标准。`,
          "参考要点：题干完整；步骤可检查；评分点覆盖概念、过程和结论。",
          "",
          "【可靠性说明】当前没有课程资料引用，上传资料后可按章节和页码生成更准确练习。"
        ].join("\n"),
        confidence: "low",
        topics
      };
    }
    if (effectiveMode === "grade") {
      const topic = topics[0] || prompt;
      return {
        content: [
          "课程资料中没有检索到足够明确的参考答案，因此以下批改只能作为学习反馈，不能直接作为最终评分。",
          "",
          `【批改反馈：${topic}】`,
          "1. 总体评价：请先确认你的答案是否写出了定义、条件、步骤和结论。",
          "2. 可能正确点：如果你已经写出核心概念和应用场景，这部分可以保留。",
          "3. 需要检查点：是否缺少关键条件、前置知识、推导依据或例题对应关系。",
          "4. 修改建议：把答案改成“结论 + 依据 + 步骤 + 易错点”的结构。",
          "5. 建议复习：上传标准答案或对应章节后，我可以按课程资料逐项评分。",
          "",
          "【可靠性说明】当前没有课程资料引用，建议补充标准答案或课程资料。"
        ].join("\n"),
        confidence: "low",
        topics
      };
    }
    if (effectiveMode === "plan" && teaching?.intent === "teacher-design") {
      const topic = topics[0] || prompt;
      return {
        content: [
          "课程资料中没有检索到足够明确的依据，下面教学设计为通用框架，建议上传对应章节后再细化。",
          "",
          `【45 分钟教学设计：${topic}】`,
          `教学目标：学生能够解释「${topic}」的定义、条件、应用场景和常见误区。`,
          "重难点：概念边界、前置知识、典型题型和迁移应用。",
          "教学流程：",
          "1. 5 分钟：前测提问，诊断学生已有认知。",
          "2. 10 分钟：概念讲解，建立定义、条件和例子。",
          "3. 12 分钟：例题拆解，强调每一步依据。",
          "4. 10 分钟：分层练习，基础题到迁移题逐步推进。",
          "5. 6 分钟：错因归纳，比较易混淆概念。",
          "6. 2 分钟：布置课后复习任务。",
          "课堂提问：这个概念的前置知识是什么？哪些条件变化会导致结论失效？",
          "课后作业：1 道基础题、1 道综合题、1 条错因反思。",
          "",
          "【可靠性说明】当前没有课程资料引用，教师应结合教材章节复核。"
        ].join("\n"),
        confidence: "low",
        topics
      };
    }
    if (effectiveMode === "plan") {
      const weak = mastery.weak.map((item) => item.topic).concat(profile.weakPoints || []).filter(Boolean);
      return {
        content: [
          "课程资料中没有检索到足够明确的依据，下面路径为通用复习建议。",
          "",
          "【复习路径】",
          `当前画像：${profile.level || "基础"}；已记录薄弱点：${weak.slice(0, 5).join("、") || "暂未形成明确薄弱点"}。`,
          `1. 第 1 步：先整理「${topics[0] || prompt}」的定义、条件和例题。`,
          "2. 第 2 步：列出前置知识，找出最不熟的一项先补。",
          "3. 第 3 步：完成 3 道基础题，要求写出每一步依据。",
          "4. 第 4 步：完成 1 道迁移题，并记录错因。",
          "5. 第 5 步：24 小时后再做同类题，更新掌握度。",
          "",
          "【可靠性说明】当前没有课程资料引用，上传课程资料后可生成带章节依据的路径。"
        ].join("\n"),
        confidence: "low",
        topics
      };
    }
    if (effectiveMode === "explain") {
      const topic = topics[0] || prompt;
      return {
        content: [
          "课程资料中没有检索到足够明确的依据，下面讲解只作为模型推理，不能当作教材结论。",
          "",
          `【概念讲解：${topic}】`,
          "1. 简明定义：请先补充教材或课件后，我可以给出基于资料的准确定义。",
          "2. 通俗解释：先把概念放到具体场景中理解，再回到正式定义。",
          "3. 例子：用一个小例子验证这个概念的适用条件。",
          "4. 常见误区：不要只记结论，要说明边界条件和前置知识。",
          "5. 推荐练习：写出一个例子，再说明它为什么符合这个概念。",
          "",
          "【可靠性说明】当前没有课程资料引用，建议上传对应章节。"
        ].join("\n"),
        confidence: "low",
        topics
      };
    }
    return {
      content: [
        "课程资料中没有检索到足够明确的依据，因此我不能把下面内容当作资料结论。",
        "",
        `【不确定说明】当前问题是：「${prompt}」。建议先上传教材、课件或讲义，或指定章节/页码后再问。`,
        "【可作为模型推理的学习建议】先明确相关概念的定义、适用条件、典型例题和易混淆点；如果是题目，请补充题干、已知量和你的解题步骤。"
      ].join("\n"),
      confidence: "low",
      topics
    };
  }

  const evidenceLines = citationEvidenceLines(hits);
  if (effectiveMode === "guided") {
    return {
      content: [
        `${levelHint}`,
        depthHint,
        "【苏格拉底式引导】我先不直接给最终答案，先按三步帮你判断：",
        `1. 先看资料依据：${evidenceLines[0] || "当前片段不足"}`,
        `2. 你先回答：这里最关键的概念或条件是什么？`,
        `3. 如果是题目，请你先写出第一步公式/定义/判断依据，我再根据你的回答继续提示。`,
        "",
        "【可能误区】不要只背结论，要说明前提条件、适用范围和与相邻知识点的区别。",
        "",
        `【引用来源】\n${formatCitations(citations)}`
      ].join("\n"),
      confidence: "medium",
      topics
    };
  }
  if (effectiveMode === "practice") {
    const topic = topics[0] || prompt;
    return {
      content: [
        `根据课程资料为「${topic}」生成自适应练习：`,
        "",
        `1. 基础选择题：${topic} 的核心定义或作用是什么？`,
        "A. 只记名称即可  B. 说明定义、条件和作用  C. 与相邻概念无关  D. 不需要例题",
        "答案：B。解析：资料要求同时把定义、条件、作用和相邻关系说清楚。",
        "",
        `2. 提高题：结合资料 [S1]，说明「${topic}」在本章知识结构中的作用。`,
        "答案要点：写出概念定位、前置知识、适用场景和常见误区。",
        "",
        `3. 综合题：设计一个能考查「${topic}」的课堂问题，并说明评分标准。`,
        "参考：看学生是否能引用资料依据、解释过程，并识别易混淆点。",
        "",
        `【引用来源】\n${formatCitations(citations)}`
      ].join("\n"),
      confidence: "high",
      topics
    };
  }
  if (effectiveMode === "grade") {
    const topic = topics[0] || prompt;
    return {
      content: [
        `【批改反馈：${topic}】`,
        "1. 总体评价：你的答案需要和课程资料中的定义、条件、步骤逐项对应。",
        `2. 资料依据：${evidenceLines[0] || "当前片段不足"}。`,
        "3. 正确的地方：如果答案已经覆盖核心定义和适用场景，可以作为保留部分。",
        "4. 需要补充的地方：检查是否遗漏前置条件、推导过程、关键术语或结论边界。",
        "5. 修改建议：按“概念定位 -> 关键条件 -> 分步依据 -> 最终结论 -> 易错提醒”重写。",
        "6. 建议复习知识点：先复盘相关定义，再做 1 道同类题检验。",
        "",
        `【引用来源】\n${formatCitations(citations)}`
      ].join("\n"),
      confidence: "high",
      topics
    };
  }
  if (effectiveMode === "plan" && teaching?.intent === "teacher-design") {
    const topic = topics[0] || prompt;
    return {
      content: [
        `【45 分钟教学设计：${topic}】`,
        `教学目标：学生能依据课程资料解释「${topic}」的概念、条件和应用。`,
        "重难点：概念边界、典型题型、易混淆点和迁移应用。",
        "教学流程：5 分钟前测；12 分钟概念讲解；12 分钟例题拆解；10 分钟分层练习；4 分钟错因归纳；2 分钟布置复习任务。",
        "课堂提问：这个概念的前置知识是什么？如果条件变化，结论是否仍成立？",
        "课后作业：1 道基础题、1 道迁移题、1 个错因反思。",
        "",
        `【引用来源】\n${formatCitations(citations)}`
      ].join("\n"),
      confidence: "high",
      topics
    };
  }
  if (effectiveMode === "plan") {
    const weak = mastery.weak.map((item) => item.topic).concat(profile.weakPoints || []).filter(Boolean);
    return {
      content: [
        "【个性化学习路径】",
        `当前画像：${profile.level || "基础"}；薄弱点：${weak.slice(0, 5).join("、") || "暂未形成明确薄弱点"}。`,
        "1. 先复习资料中最直接相关的定义和例题。",
        `2. 按顺序学习：${topics.slice(0, 5).join(" → ") || "概念 → 例题 → 练习 → 错题复盘"}。`,
        "3. 每个知识点完成 2 道基础题和 1 道迁移题。",
        "4. 做错后把错因归类到“概念不清、条件漏看、步骤错误、计算错误”。",
        "5. 复习 24 小时后再做一次同类题，更新掌握度。",
        "",
        `【引用来源】\n${formatCitations(citations)}`
      ].join("\n"),
      confidence: "high",
      topics
    };
  }
  if (effectiveMode === "explain") {
    const topic = topics[0] || prompt;
    return {
      content: [
        `${levelHint}`,
        depthHint,
        `【概念讲解：${topic}】`,
        `1. 简明定义：${String(hits[0].text || hits[0].quote).replace(/\s+/g, " ").slice(0, 180)}。`,
        hits[1] ? `2. 通俗解释：可以结合资料 [S2] 把它理解为：${String(hits[1].text || hits[1].quote).replace(/\s+/g, " ").slice(0, 140)}。` : "2. 通俗解释：先把概念放进具体例题或实验场景中理解。",
        `3. 课程资料依据：${evidenceLines[0] || "当前片段不足"}。`,
        `4. 例子：围绕「${topic}」写一个小例子，并说明条件如何对应到定义。`,
        "5. 常见误区：只记结论而不说明适用条件，或者把相邻概念混为一谈。",
        `6. 推荐练习：用自己的话复述「${topic}」，再做 1 道基础题。`,
        "",
        `【引用来源】\n${formatCitations(citations)}`
      ].join("\n"),
      confidence: "high",
      topics
    };
  }
  return {
    content: [
      `${levelHint}`,
      depthHint,
      "【课程资料依据】",
      ...evidenceLines,
      "",
      "【回答】",
      `围绕「${prompt}」，课程资料支持的核心结论是：${String(hits[0].text || hits[0].quote).slice(0, 180)}。`,
      hits[1] ? `进一步看，${String(hits[1].text || hits[1].quote).slice(0, 150)}。` : "",
      "",
      "【模型推理/补充】",
      "基于以上资料，可以按“定义/条件/步骤/例题/易错点”五个角度复习。若这是解题问题，请先列出题干条件，再把相关公式或规则与条件逐一对应。",
      "",
      `【引用来源】\n${formatCitations(citations)}`
    ].filter(Boolean).join("\n"),
    confidence: hasEvidence ? "high" : "low",
    topics
  };
}

function buildEducationalAgentAnswer(db, user, body) {
  const prompt = String(body.prompt || "").trim();
  const teaching = detectTeachingIntent(prompt, body.mode || "auto", user.role);
  const mode = teaching.mode;
  const subject = normalizeSubject(body.subject || user.subject || "");
  const chapter = String(body.chapter || "").trim();
  const knowledgePoint = String(body.knowledgePoint || "").trim();
  const answerDepth = String(body.answerDepth || "layered");
  const profile = ensureLearningProfile(db, user.id);
  if (isAcademicMisuse(prompt)) {
    const topics = inferQuestionTopics(prompt, subject);
    const graphContext = findGraphContext(db, user.id, subject, prompt, topics, []);
    const learningPanel = buildLearningPanel({
      citations: [],
      topics,
      graphContext,
      profile,
      mode: "guided",
      strategy: "学习诚信保护",
      answerDepth
    });
    return {
      content: "我不能直接代写作业、论文、实验报告或考试答案。可以改为帮你梳理结构、解释知识点、检查你的草稿、给出修改建议，或按提示模式一步步引导你完成。",
      citations: [],
      confidence: "safety",
      topics,
      mode: "guided",
      label: AI_MODE_META.guided.label,
      intent: "academic-integrity",
      strategy: "学习诚信保护",
      knowledgePoints: topics,
      graphContext,
      actions: buildAgentActions("guided", topics),
      learningPanel,
      retrieved: []
    };
  }
  const retrievalQuery = [prompt, chapter, knowledgePoint].filter(Boolean).join("\n");
  const hits = searchCourseKnowledge(db, user.id, retrievalQuery, { subject, limit: RAG_MAX_CONTEXT_CHUNKS });
  const citations = citationsFromHits(hits);
  const agent = answerFromEvidence({ user, mode, prompt, hits, citations, profile, teaching, answerDepth, chapter, knowledgePoint });
  const graphContext = findGraphContext(db, user.id, subject, retrievalQuery, agent.topics, hits);
  const topics = Array.from(new Set([
    knowledgePoint,
    graphContext.focusNode?.label,
    ...(agent.topics || [])
  ].filter(Boolean))).slice(0, 8);
  const evidenceDelta = agent.confidence === "high" ? 0.04 : agent.confidence === "medium" ? 0.02 : -0.02;
  const updatedProfile = updateTopicMastery(db, user.id, topics, evidenceDelta, `智能体对话：${prompt.slice(0, 60)}`);
  recordLearningActivity(db, user.id, {
    kind: mode === "practice" ? "practice" : "question",
    mode,
    prompt: prompt.slice(0, 120),
    topics,
    confidence: agent.confidence,
    minutes: mode === "plan" ? 6 : 3
  });
  if (mode === "grade" && topics[0]) {
    addWrongNote(db, user.id, {
      source: "批改反馈",
      topic: topics[0],
      question: prompt,
      analysis: "本轮触发批改/错因诊断，建议记录错误类型并生成同类题。",
      recommendation: "按修改建议重写答案，再完成 1 道同类题。"
    });
  }
  const learningPanel = buildLearningPanel({
    citations,
    topics,
    graphContext,
    profile: updatedProfile,
    mode,
    strategy: teaching.strategy,
    answerDepth
  });
  return {
    ...agent,
    citations,
    mode,
    label: teaching.label,
    intent: teaching.intent,
    strategy: teaching.strategy,
    answerDepth,
    knowledgePoints: topics,
    graphContext,
    actions: buildAgentActions(mode, topics),
    learningPanel,
    retrieved: hits.map((hit) => ({ type: hit.type, title: hit.title, score: hit.score, subject: hit.subject, chapter: hit.chapter })),
    tools: [
      "intent_router",
      "retrieve_course_material",
      "query_knowledge_graph",
      mode === "practice" ? "generate_quiz" : "",
      mode === "grade" ? "grade_answer" : "",
      mode === "plan" ? "create_study_plan" : "",
      "update_mastery"
    ].filter(Boolean)
  };
}

function learningAnalytics(db, userId) {
  const profile = ensureLearningProfile(db, userId);
  const summary = profileMasterySummary(profile);
  const wrongNotes = (db.wrongNotes || []).filter((item) => item.userId === userId).slice(0, 10);
  const recommendations = [];
  if (summary.weak[0]) {
    recommendations.push(`优先复习「${summary.weak[0].topic}」，这条建议来自你的掌握度记录。`);
  }
  if (wrongNotes[0]) {
    recommendations.push(`最近错题记录包含「${wrongNotes[0].topic}」，建议先回看对应答案和解析。`);
  }
  return {
    profile,
    summary,
    wrongNotes,
    recommendations
  };
}

function gradeSubmissionWithFeedback(db, homework, submission) {
  const rubric = parseRubricInput(homework.rubric?.length ? homework.rubric : homework.rubricText, homework);
  const rubricResults = rubric.map((criterion) => evaluateCriterion(criterion, submission.answerText));
  const rubricScore = rubricResults.reduce((sum, item) => sum + item.score, 0);
  const fallbackScore = scoreMatch(homework.answer, submission.answerText);
  const score = rubricResults.length ? Math.max(0, Math.min(100, rubricScore)) : fallbackScore;
  const referenceTokens = tokenizeForSearch(`${homework.answer} ${rubric.map((item) => item.expected).join(" ")}`);
  const answerTokens = new Set(tokenizeForSearch(submission.answerText));
  const missing = referenceTokens.filter((token) => !answerTokens.has(token)).slice(0, 8);
  const topics = inferQuestionTopics(`${homework.title} ${homework.description} ${homework.answer}`, "");
  const strengths = score >= 75 ? "答案覆盖了主要要点，结构基本完整。" : "答案已经给出部分相关内容，但关键条件或步骤还不完整。";
  const weakness = missing.length ? `缺少或表达不清：${missing.join("、")}。` : "主要关键词已覆盖，建议补充更完整的推理过程。";
  const comment = [
    `AI 评分建议：${score} 分（需教师确认后才作为正式成绩）。`,
    strengths,
    weakness,
    "建议教师复核图片/视频附件中的关键步骤，最终分数以教师确认为准。"
  ].join(" ");
  return { score, comment, missing, topics, rubric, rubricResults };
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

function publicChatThreadForUser(thread, userId) {
  return {
    ...thread,
    memberIds: Array.isArray(thread.memberIds) ? thread.memberIds : [],
    adminIds: Array.isArray(thread.adminIds) ? thread.adminIds : [],
    pendingInviteIds: Array.isArray(thread.pendingInviteIds) ? thread.pendingInviteIds : [],
    messages: (thread.messages || []).filter((message) => !(message.deletedFor || []).includes(userId))
  };
}

function visibleFriendRequests(db, userId) {
  return (db.friendRequests || [])
    .filter((item) => item.fromUserId === userId || item.toUserId === userId)
    .slice(-120);
}

function visibleChatInvites(db, userId) {
  const ownedGroupIds = new Set((db.chatThreads || [])
    .filter((thread) => thread.type === "group" && thread.ownerId === userId)
    .map((thread) => thread.id));
  return (db.chatInvites || [])
    .filter((item) => item.fromUserId === userId || item.toUserId === userId || ownedGroupIds.has(item.threadId))
    .slice(-160);
}

function addSystemChatMessage(thread, content) {
  thread.messages = Array.isArray(thread.messages) ? thread.messages : [];
  thread.messages.push({
    id: uid("chat"),
    fromUserId: "system",
    system: true,
    content: String(content || ""),
    createdAt: now(),
    deletedFor: []
  });
  thread.updatedAt = now();
}

function addFriendship(db, userId, friendId) {
  if (userId === friendId) throw Object.assign(new Error("不能添加自己为好友"), { status: 400 });
  if (!areFriends(db, userId, friendId)) db.friendships.push({ userId, friendId, createdAt: now() });
  if (!areFriends(db, friendId, userId)) db.friendships.push({ userId: friendId, friendId: userId, createdAt: now() });
  return findOrCreateDirectThread(db, userId, friendId);
}

function resolveUserByTarget(db, targetText) {
  const target = normalizeAccountInput(targetText);
  if (!target) return { error: Object.assign(new Error("请输入用户 ID 或姓名"), { status: 400 }) };
  const loginId = extractLoginId(target);
  let user = loginId ? db.users.find((item) => item.id === loginId) : null;
  if (!user) {
    const nameMatches = db.users.filter((item) => item.name === target);
    if (nameMatches.length > 1) return { error: Object.assign(new Error("该姓名对应多个用户，请使用 8 位 ID"), { status: 409 }) };
    user = nameMatches[0] || null;
  }
  if (!user) return { error: Object.assign(new Error("未找到用户，请检查 ID 或姓名"), { status: 404 }) };
  return { user };
}

function createFriendRequest(db, fromUserId, toUserId, message = "") {
  if (fromUserId === toUserId) throw Object.assign(new Error("不能添加自己为好友"), { status: 400 });
  const toUser = ensureUser(db, toUserId);
  if (areFriends(db, fromUserId, toUserId)) {
    return { status: "already_friends", thread: findOrCreateDirectThread(db, fromUserId, toUserId), friend: toUser };
  }
  const reverse = (db.friendRequests || []).find((item) => item.status === "pending" && item.fromUserId === toUserId && item.toUserId === fromUserId);
  if (reverse) {
    return { status: "accepted_reverse", request: respondFriendRequest(db, reverse.id, fromUserId, "accept"), thread: findOrCreateDirectThread(db, fromUserId, toUserId), friend: toUser };
  }
  let request = (db.friendRequests || []).find((item) => item.status === "pending" && item.fromUserId === fromUserId && item.toUserId === toUserId);
  if (!request) {
    request = {
      id: uid("friendReq"),
      fromUserId,
      toUserId,
      message: String(message || "").slice(0, 160),
      status: "pending",
      createdAt: now(),
      updatedAt: now()
    };
    db.friendRequests.unshift(request);
  }
  return { status: "pending", request, friend: toUser };
}

function respondFriendRequest(db, requestId, userId, action) {
  const request = (db.friendRequests || []).find((item) => item.id === requestId);
  if (!request) throw Object.assign(new Error("好友申请不存在"), { status: 404 });
  if (request.toUserId !== userId) throw Object.assign(new Error("只能处理发给自己的好友申请"), { status: 403 });
  if (request.status !== "pending") throw Object.assign(new Error("该好友申请已处理"), { status: 409 });
  request.status = action === "accept" ? "accepted" : "rejected";
  request.respondedAt = now();
  request.updatedAt = now();
  if (request.status === "accepted") request.threadId = addFriendship(db, request.fromUserId, request.toUserId).id;
  return request;
}

function ensureGroupOwner(thread, userId) {
  if (!thread || thread.type !== "group") throw Object.assign(new Error("群聊不存在"), { status: 404 });
  if (thread.ownerId !== userId) throw Object.assign(new Error("只有群主可以执行该操作"), { status: 403 });
}

function createChatInvite(db, thread, fromUserId, toUserId) {
  if (!thread || thread.type !== "group") throw Object.assign(new Error("群聊不存在"), { status: 404 });
  if (!thread.memberIds.includes(fromUserId)) throw Object.assign(new Error("只有群成员可以邀请好友入群"), { status: 403 });
  if (thread.memberIds.includes(toUserId)) return null;
  if (!areFriends(db, fromUserId, toUserId)) throw Object.assign(new Error("只能邀请自己的好友入群"), { status: 403 });
  let invite = (db.chatInvites || []).find((item) => item.threadId === thread.id && item.toUserId === toUserId && item.status === "pending");
  if (!invite) {
    invite = {
      id: uid("chatInvite"),
      threadId: thread.id,
      groupName: thread.name,
      fromUserId,
      toUserId,
      status: "pending",
      createdAt: now(),
      updatedAt: now()
    };
    db.chatInvites.unshift(invite);
  }
  thread.pendingInviteIds = Array.from(new Set([...(thread.pendingInviteIds || []), toUserId]));
  thread.updatedAt = now();
  return invite;
}

function respondChatInvite(db, inviteId, userId, action) {
  const invite = (db.chatInvites || []).find((item) => item.id === inviteId);
  if (!invite) throw Object.assign(new Error("群聊邀请不存在"), { status: 404 });
  if (invite.toUserId !== userId) throw Object.assign(new Error("只能处理发给自己的群聊邀请"), { status: 403 });
  if (invite.status !== "pending") throw Object.assign(new Error("该群聊邀请已处理"), { status: 409 });
  const thread = db.chatThreads.find((item) => item.id === invite.threadId && item.type === "group");
  if (!thread) throw Object.assign(new Error("群聊不存在"), { status: 404 });
  invite.status = action === "accept" ? "accepted" : "rejected";
  invite.respondedAt = now();
  invite.updatedAt = now();
  thread.pendingInviteIds = (thread.pendingInviteIds || []).filter((id) => id !== userId);
  if (invite.status === "accepted" && !thread.memberIds.includes(userId)) {
    thread.memberIds.push(userId);
    const user = getUser(db, userId);
    addSystemChatMessage(thread, `${user?.name || userId} 已加入群聊`);
  }
  thread.updatedAt = now();
  return { invite, thread };
}

function classTeacherIdsForUser(db, user) {
  if (!user || user.role !== "student") return [];
  const classIds = user.classIds || [];
  return Array.from(new Set((db.classes || [])
    .filter((klass) => classIds.includes(klass.id) || (klass.studentIds || []).includes(user.id))
    .map((klass) => klass.teacherId)
    .filter(Boolean)));
}

function visibleKnowledgeGraphs(db, userId) {
  const user = ensureUser(db, userId);
  if (user.role === "admin") return db.knowledgeGraphs || [];
  const teacherIds = classTeacherIdsForUser(db, user);
  return (db.knowledgeGraphs || []).filter((graph) => (
    graph.ownerId === userId
    || (user.role === "student" && graph.global && teacherIds.includes(graph.ownerId))
  ));
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
  const visibleUserIds = new Set([userId]);
  db.friendships.filter((item) => item.userId === userId).forEach((item) => visibleUserIds.add(item.friendId));
  visibleFriendRequests(db, userId).forEach((item) => {
    visibleUserIds.add(item.fromUserId);
    visibleUserIds.add(item.toUserId);
  });
  visibleChatInvites(db, userId).forEach((item) => {
    visibleUserIds.add(item.fromUserId);
    visibleUserIds.add(item.toUserId);
  });
  db.chatThreads.filter((thread) => thread.memberIds.includes(userId)).forEach((thread) => thread.memberIds.forEach((id) => visibleUserIds.add(id)));
  db.classes
    .filter((item) => item.teacherId === userId || item.studentIds.includes(userId))
    .forEach((klass) => {
      visibleUserIds.add(klass.teacherId);
      klass.studentIds.forEach((id) => visibleUserIds.add(id));
    });
  db.submissions
    .filter((item) => item.studentId === userId || db.homework.some((homework) => homework.id === item.homeworkId && homework.teacherId === userId))
    .forEach((item) => visibleUserIds.add(item.studentId));
  return {
    user: publicUser(user),
    users: (user.role === "admin" ? db.users : db.users.filter((item) => visibleUserIds.has(item.id))).map(publicUser),
    knowledgeGraphs: visibleKnowledgeGraphs(db, userId).map((graph) => enhanceGraphForEducation(graph)),
    conversations: db.conversations.filter((conv) => conv.userId === userId),
    models: db.models.filter((model) => model.ownerId === userId),
    friends: db.friendships.filter((item) => item.userId === userId).map((item) => publicUser(getUser(db, item.friendId))).filter(Boolean),
    friendRequests: visibleFriendRequests(db, userId),
    chatInvites: visibleChatInvites(db, userId),
    chatThreads: db.chatThreads.filter((thread) => thread.memberIds.includes(userId)).map((thread) => publicChatThreadForUser(thread, userId)),
    classes: db.classes.filter((item) => item.teacherId === userId || item.studentIds.includes(userId)),
    homework: db.homework.filter((item) => item.teacherId === userId || classIds.includes(item.classId)),
    submissions: db.submissions.filter((item) => item.studentId === userId || db.homework.some((homework) => homework.id === item.homeworkId && homework.teacherId === userId)),
    courseMaterials: visibleCourseMaterials(db, userId).map(publicCourseMaterial),
    learningProfile: ensureLearningProfile(db, userId),
    wrongNotes: (db.wrongNotes || []).filter((item) => item.userId === userId).slice(0, 60),
    learningAnalytics: learningAnalytics(db, userId),
    agentRuns: (db.agentRuns || []).filter((item) => item.userId === userId).slice(0, 30)
  };
}

async function handleApi(req, res, pathname, searchParams) {
  const method = req.method;
  const db = readDb();

  if (method === "GET" && pathname === "/api/healthz") {
    return send(res, 200, {
      ok: true,
      status: "ok",
      version: process.env.npm_package_version || "1.0.0",
      time: now(),
      storage: fs.existsSync(DB_PATH) ? "json-atomic" : "initializing"
    });
  }

  if (method === "GET" && pathname === "/api/readyz") {
    const checks = {
      dataDirWritable: checkDataDirWritable(),
      runtimeDirWritable: checkRuntimeDirWritable(),
      sessionSecretConfigured: SESSION_SECRET_CONFIGURED,
      cookieSecure: process.env.COOKIE_SECURE === "true",
      storage: fs.existsSync(DB_PATH) ? "json-atomic" : "initializing",
      uploadSessions: uploadSessions.size,
      graphJobs: graphJobs.size
    };
    const warnings = [];
    if (!checks.sessionSecretConfigured) warnings.push("未配置强随机 SESSION_SECRET，仅适合本地开发");
    if (process.env.NODE_ENV === "production" && !checks.cookieSecure) warnings.push("生产环境建议启用 COOKIE_SECURE=true 并使用 HTTPS");
    const ready = checks.dataDirWritable && checks.runtimeDirWritable && (process.env.NODE_ENV !== "production" || (checks.sessionSecretConfigured && checks.cookieSecure));
    return send(res, ready ? 200 : 503, {
      ok: ready,
      status: ready ? "ready" : "not-ready",
      version: process.env.npm_package_version || "1.0.0",
      time: now(),
      checks,
      warnings
    });
  }

  if (method === "POST" && pathname === "/api/auth/register") {
    const body = await readBody(req);
    assertRequired(body, ["name", "password", "role"]);
    const role = String(body.role || "").trim();
    if (!["teacher", "student"].includes(role)) throw Object.assign(new Error("身份必须是 teacher 或 student"), { status: 400 });
    const name = normalizeDisplayName(body.name);
    const password = normalizePasswordInput(body.password);
    const subject = role === "teacher" ? normalizeOptionalProfileField(body.subject, 40) : "";
    const className = role === "student" ? normalizeOptionalProfileField(body.className || body.subject, 60) : "";
    const user = {
      id: generateUserId(db),
      name,
      role,
      passwordHash: hashPassword(password),
      subject,
      className,
      classIds: [],
      avatar: name.slice(0, 1) || "用",
      createdAt: now(),
      lastLoginAt: now(),
      lastLoginIp: requestIp(req),
      failedLoginCount: 0,
      lockUntil: ""
    };
    db.users.push(user);
    recordAudit(db, user, "auth.register", { resourceType: "user", resourceId: user.id }, req);
    recordAudit(db, user, "auth.login", { resourceType: "user", resourceId: user.id, meta: { reason: "register_auto_login" } }, req);
    const state = getRelevantState(db, user.id);
    writeDb(db);
    return send(res, 201, { ok: true, user: publicUser(user), state, message: `注册成功，系统分配 ID：${user.id}` }, { "set-cookie": sessionCookie(user) });
  }

  if (method === "POST" && pathname === "/api/auth/login") {
    const body = await readBody(req);
    assertRequired(body, ["account", "password"]);
    const account = normalizeAccountInput(body.account);
    if (!account) return sendError(res, 400, "账号不能为空");
    const password = String(body.password || "");
    if (password.length > 128) return sendError(res, 400, "密码不能超过 128 位");
    const loginId = extractLoginId(account);
    let user = loginId ? db.users.find((item) => item.id === loginId) : null;
    if (!user) {
      const nameMatches = db.users.filter((item) => item.name === account);
      if (nameMatches.length > 1) {
        recordAudit(db, null, "auth.login_failed", { meta: { account, reason: "duplicate_name" } }, req);
        writeDb(db);
        return sendError(res, 409, "该用户名存在多个账号，请使用系统分配的 8 位 ID 登录");
      }
      user = nameMatches[0] || null;
    }
    if (!user) {
      recordAudit(db, null, "auth.login_failed", { meta: { account, reason: "not_found" } }, req);
      writeDb(db);
      return sendError(res, 401, "账号或密码错误");
    }
    if (user.lockUntil && new Date(user.lockUntil).getTime() > Date.now()) {
      return sendError(res, 429, "登录失败次数过多，请稍后再试");
    }
    if (!verifyPassword(user, password)) {
      user.failedLoginCount = Number(user.failedLoginCount || 0) + 1;
      if (user.failedLoginCount >= LOGIN_MAX_FAILURES) {
        user.lockUntil = new Date(Date.now() + LOGIN_COOLDOWN_MS).toISOString();
      }
      recordAudit(db, user, "auth.login_failed", { resourceType: "user", resourceId: user.id, meta: { failedLoginCount: user.failedLoginCount } }, req);
      writeDb(db);
      return sendError(res, 401, "账号或密码错误");
    }
    migratePasswordIfNeeded(user, password);
    user.failedLoginCount = 0;
    user.lockUntil = "";
    user.lastLoginAt = now();
    user.lastLoginIp = requestIp(req);
    recordAudit(db, user, "auth.login", { resourceType: "user", resourceId: user.id }, req);
    writeDb(db);
    return send(res, 200, { ok: true, user: publicUser(user), state: getRelevantState(db, user.id) }, { "set-cookie": sessionCookie(user) });
  }

  if (method === "POST" && pathname === "/api/auth/logout") {
    const actor = getSessionUser(req, db);
    if (actor) {
      recordAudit(db, actor, "auth.logout", { resourceType: "user", resourceId: actor.id }, req);
      writeDb(db);
    }
    return send(res, 200, { ok: true }, { "set-cookie": clearSessionCookie() });
  }

  if (method === "GET" && pathname === "/api/session") {
    const actor = getSessionUser(req, db);
    if (!actor) return sendError(res, 401, "未登录");
    res.sessionActor = actor;
    return send(res, 200, { ok: true, user: publicUser(actor), state: getRelevantState(db, actor.id) });
  }

  const actor = requireActor(req, db);
  res.sessionActor = actor;

  if (method === "GET" && pathname === "/api/state") {
    return send(res, 200, { ok: true, state: getRelevantState(db, actor.id) });
  }

  if (method === "GET" && pathname === "/api/users/search") {
    const userId = queryUserId(searchParams, actor);
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
    if (actor.role !== "admin" && params.id !== actor.id) return sendError(res, 403, "只能修改自己的个人信息");
    const body = await readBody(req);
    const user = ensureUser(db, params.id);
    ["name", "subject", "className", "email", "phone"].forEach((key) => {
      if (body[key] !== undefined) user[key] = String(body[key]);
    });
    if (body.classIds && Array.isArray(body.classIds)) user.classIds = body.classIds.map(String);
    user.updatedAt = now();
    recordAudit(db, actor, "user.update", { resourceType: "user", resourceId: user.id }, req);
    writeDb(db);
    return send(res, 200, { ok: true, user: publicUser(user) });
  }

  if (method === "GET" && pathname === "/api/graphs") {
    const userId = queryUserId(searchParams, actor);
    const subject = searchParams.get("subject");
    let graphs = visibleKnowledgeGraphs(db, userId);
    if (subject) graphs = graphs.filter((graph) => graph.subject === subject);
    return send(res, 200, { ok: true, graphs: graphs.map((graph) => enhanceGraphForEducation(graph)) });
  }

  if (method === "POST" && pathname === "/api/uploads/start") {
    cleanupUploadSessions();
    const body = await readBody(req);
    assertRequired(body, ["userId", "fileName", "size"]);
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
    recordAudit(db, actor, "upload.start", { resourceType: "upload", resourceId: session.id, meta: { fileName: session.fileName, size } }, req);
    return send(res, 201, { ok: true, upload: publicUploadSession(session) });
  }

  params = routePattern(pathname, "/api/uploads/:id/chunk");
  if (method === "POST" && params) {
    const session = getUploadSession(params.id);
    if (actor.role !== "admin" && session.userId !== actor.id) return sendError(res, 403, "不能上传其他账号的文件");
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
    persistUploadSessions();
    return send(res, 200, { ok: true, upload: publicUploadSession(session) });
  }

  if (method === "POST" && pathname === "/api/graphs/generate-upload") {
    const body = await readBody(req);
    assertRequired(body, ["userId", "uploadId", "subject"]);
    const session = getUploadSession(body.uploadId);
    if (session.userId !== body.userId) return sendError(res, 403, "不能使用其他账号的上传文件");
    if (session.received !== session.size) return sendError(res, 400, "文件尚未上传完成");
    assertStoredUploadSafe(session);
    const subject = normalizeSubject(body.subject);
    const title = body.title || `${subject}知识图谱`;
    const sourceName = body.sourceName || session.fileName;
    const extractor = body.extractor || AI_UNLIMITED_EXTRACTOR;
    const job = createGraphJob({
      userId: body.userId,
      subject,
      title,
      sourceName,
      fileSize: session.size,
      extractor,
      uploadId: session.id
    });
    recordAudit(db, actor, "graph.generate_upload", { resourceType: "graphJob", resourceId: job.id, meta: { subject, title, sourceName } }, req);
    send(res, 202, { ok: true, job: publicGraphJob(job) });
    processGraphGenerationJob(job.id, {
      userId: body.userId,
      subject,
      title,
      sourceName,
      sourceText: requestText(body.sourceText),
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
    if (actor.role !== "admin" && job.meta?.userId !== actor.id) return sendError(res, 403, "无权查看该任务");
    return send(res, 200, { ok: true, job: publicGraphJob(job) });
  }

  params = routePattern(pathname, "/api/graphs/jobs/:id/cancel");
  if (method === "POST" && params) {
    const job = graphJobs.get(params.id);
    if (!job) return notFound(res);
    if (actor.role !== "admin" && job.meta?.userId !== actor.id) return sendError(res, 403, "无权终止该任务");
    const canceled = cancelGraphJob(params.id);
    recordAudit(db, actor, "graph.job_cancel", { resourceType: "graphJob", resourceId: params.id }, req);
    return send(res, 200, { ok: true, job: publicGraphJob(canceled) });
  }

  if (method === "POST" && pathname === "/api/graphs/generate-file") {
    const userId = queryUserId(searchParams, actor);
    const subject = normalizeSubject(searchParams.get("subject"));
    const title = searchParams.get("title") || `${subject}知识图谱`;
    const sourceText = searchParams.get("sourceText") || "";
    const sourceName = searchParams.get("sourceName") || "上传书本";
    const extractor = searchParams.get("extractor") || AI_UNLIMITED_EXTRACTOR;
    assertRequired({ userId, subject }, ["userId", "subject"]);
    const buffer = await readBinaryBody(req, MAX_UPLOAD_SIZE);
    if (!buffer.length) return sendError(res, 400, "上传文件为空");
    const fileType = searchParams.get("fileType") || req.headers["content-type"] || "";
    assertUploadContent({ name: sourceName, type: fileType, buffer: buffer.subarray(0, Math.min(buffer.length, 8192)) });
    const job = createGraphJob({
      userId,
      subject,
      title,
      sourceName,
      fileSize: buffer.length,
      extractor
    });
    recordAudit(db, actor, "graph.generate_file", { resourceType: "graphJob", resourceId: job.id, meta: { subject, title, sourceName } }, req);
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
        type: fileType,
        buffer
      }
    });
    return;
  }

  if (method === "POST" && pathname === "/api/graphs/generate") {
    const body = await readBody(req);
    assertRequired(body, ["userId", "subject"]);
    const uploaded = body.file?.dataUrl ? await extractCourseMaterialUpload(body.file) : { text: "", meta: null };
    const sourceText = [uploaded.text, requestText(body.sourceText)].filter(Boolean).join("\n\n");
    const graph = buildGraphFromText({
      ownerId: body.userId,
      title: body.title,
      subject: body.subject,
      sourceName: body.sourceName || uploaded.meta?.name,
      sourceText,
      extraction: uploaded.meta ? { ...uploaded.meta, agent: body.extractor || "local-pdf-text-agent" } : null
    });
    db.knowledgeGraphs.push(graph);
    recordAudit(db, actor, "graph.generate", { resourceType: "graph", resourceId: graph.id, meta: { subject: graph.subject, title: graph.title } }, req);
    writeDb(db);
    return send(res, 201, { ok: true, graph });
  }

  if (method === "POST" && pathname === "/api/graphs/import") {
    const body = await readBody(req);
    assertRequired(body, ["userId", "graph"]);
    const graph = validateGraph(body.graph, {
      ownerId: body.userId,
      subject: body.subject,
      title: body.title,
      sourceName: body.sourceName
    });
    db.knowledgeGraphs.push(graph);
    recordAudit(db, actor, "graph.import", { resourceType: "graph", resourceId: graph.id, meta: { subject: graph.subject, title: graph.title } }, req);
    writeDb(db);
    return send(res, 201, { ok: true, graph });
  }

  params = routePattern(pathname, "/api/graphs/:id/upload-global");
  if (method === "POST" && params) {
    const body = await readBody(req);
    const graph = db.knowledgeGraphs.find((item) => item.id === params.id);
    if (!graph) return notFound(res);
    if (actor.role !== "admin" && graph.ownerId !== body.userId) return sendError(res, 403, "只能上传自己的图谱");
    graph.global = true;
    graph.updatedAt = now();
    recordAudit(db, actor, "graph.upload_global", { resourceType: "graph", resourceId: graph.id }, req);
    writeDb(db);
    return send(res, 200, { ok: true, graph: enhanceGraphForEducation(graph) });
  }

  params = routePattern(pathname, "/api/graphs/:id");
  if (method === "GET" && params) {
    const graph = db.knowledgeGraphs.find((item) => item.id === params.id);
    if (!graph) return notFound(res);
    if (!visibleKnowledgeGraphs(db, actor.id).some((item) => item.id === graph.id)) return sendError(res, 403, "无权查看该图谱");
    return send(res, 200, { ok: true, graph: enhanceGraphForEducation(graph) });
  }
  if (method === "DELETE" && params) {
    const userId = queryUserId(searchParams, actor);
    const index = db.knowledgeGraphs.findIndex((item) => item.id === params.id);
    if (index < 0) return notFound(res);
    if (actor.role !== "admin" && db.knowledgeGraphs[index].ownerId !== userId) return sendError(res, 403, "只能删除自己的图谱");
    recordAudit(db, actor, "graph.delete", { resourceType: "graph", resourceId: params.id }, req);
    db.knowledgeGraphs.splice(index, 1);
    writeDb(db);
    return send(res, 200, { ok: true });
  }

  if (method === "GET" && pathname === "/api/materials") {
    const userId = queryUserId(searchParams, actor);
    const subject = searchParams.get("subject");
    let materials = visibleCourseMaterials(db, userId);
    if (subject) materials = materials.filter((item) => item.subject === normalizeSubject(subject));
    return send(res, 200, { ok: true, materials: materials.map(publicCourseMaterial) });
  }

  if (method === "POST" && pathname === "/api/materials") {
    const body = await readBody(req);
    assertRequired(body, ["userId", "subject"]);
    const user = ensureUser(db, body.userId);
    if (body.global && user.role !== "teacher" && user.role !== "admin") return sendError(res, 403, "只有教师可以发布学生可检索资料");
    let uploaded = { text: "", meta: null };
    if (body.file?.dataUrl) {
      uploaded = await extractCourseMaterialUpload(body.file);
    }
    const sourceText = [uploaded.text, requestText(body.sourceText)].filter(Boolean).join("\n\n");
    if (!sourceText.trim()) return sendError(res, 400, "没有识别到可入库的课程资料文本，请上传 PDF/Word/PPTX/TXT，扫描版 PDF 会自动尝试 OCR");
    const material = createCourseMaterial({
      ownerId: user.id,
      subject: body.subject,
      title: body.title || body.file?.name || "课程资料",
      sourceName: body.sourceName || body.file?.name || "手动录入",
      type: body.file?.type || "text/plain",
      text: sourceText,
      global: ["teacher", "admin"].includes(user.role) ? Boolean(body.global) : false,
      classId: body.classId
    });
    material.extraction = uploaded.meta ? { ...uploaded.meta, agent: "course-rag-material-agent" } : null;
    db.courseMaterials.unshift(material);
    recordAudit(db, actor, "material.create", { resourceType: "courseMaterial", resourceId: material.id, meta: { title: material.title, subject: material.subject } }, req);
    writeDb(db);
    return send(res, 201, { ok: true, material: publicCourseMaterial(material) });
  }

  if (method === "POST" && pathname === "/api/materials/from-upload") {
    const body = await readBody(req);
    assertRequired(body, ["userId", "uploadId", "subject"]);
    const user = ensureUser(db, body.userId);
    const session = getUploadSession(body.uploadId);
    if (session.userId !== body.userId) return sendError(res, 403, "不能使用其他账号的上传文件");
    if (session.received !== session.size) return sendError(res, 400, "文件尚未上传完成");
    assertStoredUploadSafe(session);
    let uploaded = { text: "", meta: null };
    try {
      uploaded = await extractCourseMaterialUpload({
        name: session.fileName,
        type: session.fileType,
        filePath: session.filePath
      });
      const sourceText = [uploaded.text, requestText(body.sourceText)].filter(Boolean).join("\n\n");
      if (!sourceText.trim()) return sendError(res, 400, "没有识别到可入库的课程资料文本，请上传 PDF/Word/PPTX/TXT，扫描版 PDF 会自动尝试 OCR");
      const material = createCourseMaterial({
        ownerId: user.id,
        subject: body.subject,
        title: body.title || session.fileName || "课程资料",
        sourceName: body.sourceName || session.fileName || "上传资料",
        type: session.fileType || "application/octet-stream",
        text: sourceText,
        global: ["teacher", "admin"].includes(user.role) ? Boolean(body.global) : false,
        classId: body.classId
      });
      material.extraction = uploaded.meta ? { ...uploaded.meta, agent: "course-rag-material-agent" } : null;
      db.courseMaterials.unshift(material);
      recordAudit(db, actor, "material.create_from_upload", { resourceType: "courseMaterial", resourceId: material.id, meta: { title: material.title, subject: material.subject } }, req);
      writeDb(db);
      return send(res, 201, { ok: true, material: publicCourseMaterial(material) });
    } finally {
      cleanupUploadSession(body.uploadId, true);
    }
  }

  params = routePattern(pathname, "/api/materials/:id");
  if (method === "DELETE" && params) {
    const userId = queryUserId(searchParams, actor);
    const index = db.courseMaterials.findIndex((item) => item.id === params.id);
    if (index < 0) return notFound(res);
    if (actor.role !== "admin" && db.courseMaterials[index].ownerId !== userId) return sendError(res, 403, "只能删除自己上传的课程资料");
    recordAudit(db, actor, "material.delete", { resourceType: "courseMaterial", resourceId: params.id }, req);
    db.courseMaterials.splice(index, 1);
    writeDb(db);
    return send(res, 200, { ok: true });
  }

  if (method === "GET" && pathname === "/api/conversations") {
    const userId = queryUserId(searchParams, actor);
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
    recordAudit(db, actor, "conversation.create", { resourceType: "conversation", resourceId: conv.id }, req);
    writeDb(db);
    return send(res, 201, { ok: true, conversation: conv });
  }

  if (method === "POST" && pathname === "/api/wrong-notes") {
    const body = await readBody(req);
    assertRequired(body, ["userId"]);
    const note = addWrongNote(db, body.userId, {
      source: body.source || "对话操作",
      topic: String(body.topic || "待归类").slice(0, 60),
      question: String(body.question || "").slice(0, 500),
      answer: String(body.answer || "").slice(0, 1000),
      analysis: String(body.analysis || "").slice(0, 500),
      recommendation: String(body.recommendation || "").slice(0, 500)
    });
    recordAudit(db, actor, "wrong_note.create", { resourceType: "wrongNote", resourceId: note.id, meta: { topic: note.topic } }, req);
    writeDb(db);
    return send(res, 201, { ok: true, wrongNote: note, learningAnalytics: learningAnalytics(db, body.userId) });
  }

  if (method === "POST" && pathname === "/api/mastery/update") {
    const body = await readBody(req);
    assertRequired(body, ["userId"]);
    const topics = Array.isArray(body.topics) ? body.topics.map(String) : [String(body.topic || "")];
    const delta = Number.isFinite(Number(body.delta)) ? Number(body.delta) : 0.08;
    const profile = updateTopicMastery(db, body.userId, topics, delta, String(body.evidence || "用户在对话中标记掌握"));
    recordAudit(db, actor, "mastery.update", { resourceType: "learningProfile", resourceId: body.userId, meta: { topics } }, req);
    writeDb(db);
    return send(res, 200, { ok: true, profile, learningAnalytics: learningAnalytics(db, body.userId) });
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
    const agentAnswer = buildEducationalAgentAnswer(db, user, body);
    const assistantMessage = {
      id: uid("msg"),
      role: "assistant",
      content: agentAnswer.content,
      citations: agentAnswer.citations,
      confidence: agentAnswer.confidence,
      mode: agentAnswer.mode,
      intent: agentAnswer.intent,
      strategy: agentAnswer.strategy,
      knowledgePoints: agentAnswer.knowledgePoints,
      graphContext: agentAnswer.graphContext,
      learningPanel: agentAnswer.learningPanel,
      actions: agentAnswer.actions,
      retrieved: agentAnswer.retrieved,
      createdAt: now()
    };
    conv.mode = agentAnswer.mode || body.mode || conv.mode;
    conv.messages.push(userMessage, assistantMessage);
    conv.updatedAt = now();
    if (conv.title === "新的对话") conv.title = String(body.prompt).slice(0, 24);
    db.agentRuns = Array.isArray(db.agentRuns) ? db.agentRuns : [];
    db.agentRuns.unshift({
      id: uid("run"),
      userId: user.id,
      conversationId: conv.id,
      mode: conv.mode,
      prompt: String(body.prompt).slice(0, 240),
      confidence: agentAnswer.confidence,
      citations: agentAnswer.citations,
      retrieved: agentAnswer.retrieved,
      intent: agentAnswer.intent,
      strategy: agentAnswer.strategy,
      knowledgePoints: agentAnswer.knowledgePoints,
      graphFocus: agentAnswer.learningPanel?.graphFocus || null,
      tools: agentAnswer.tools || [],
      steps: [
        `意图识别：${agentAnswer.label || agentAnswer.intent || conv.mode}`,
        "上下文补全：课程/章节/知识点/学生画像",
        "课程资料 RAG 检索",
        "知识图谱关联与前置知识查询",
        `教学策略：${agentAnswer.strategy || "课程 RAG 问答"}`,
        "可靠性与引用标注",
        "学习记录与掌握度更新"
      ],
      createdAt: now()
    });
    db.agentRuns = db.agentRuns.slice(0, 200);
    recordAudit(db, actor, "ai.chat", { resourceType: "conversation", resourceId: conv.id, meta: { mode: conv.mode, confidence: agentAnswer.confidence } }, req);
    writeDb(db);
    return send(res, 200, { ok: true, conversation: conv, messages: [userMessage, assistantMessage] });
  }

  params = routePattern(pathname, "/api/conversations/:id");
  if (method === "DELETE" && params) {
    const userId = queryUserId(searchParams, actor);
    const index = db.conversations.findIndex((item) => item.id === params.id && item.userId === userId);
    if (index < 0) return notFound(res);
    recordAudit(db, actor, "conversation.delete", { resourceType: "conversation", resourceId: params.id }, req);
    db.conversations.splice(index, 1);
    writeDb(db);
    return send(res, 200, { ok: true });
  }

  if (method === "GET" && pathname === "/api/models") {
    const userId = queryUserId(searchParams, actor);
    const subject = searchParams.get("subject");
    let models = db.models.filter((item) => item.ownerId === userId);
    if (subject) models = models.filter((item) => item.subject === subject);
    return send(res, 200, { ok: true, models });
  }

  if (method === "POST" && pathname === "/api/models") {
    const body = await readBody(req);
    assertRequired(body, ["userId", "name", "subject"]);
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
      recordAudit(db, actor, "model.update", { resourceType: "model", resourceId: existing.id }, req);
      writeDb(db);
      return send(res, 200, { ok: true, model: existing });
    }
    const model = { id: uid("model"), ...payload, createdAt: now() };
    db.models.unshift(model);
    recordAudit(db, actor, "model.create", { resourceType: "model", resourceId: model.id }, req);
    writeDb(db);
    return send(res, 201, { ok: true, model });
  }

  if (method === "POST" && pathname === "/api/model-code/run") {
    const body = await readBody(req);
    assertRequired(body, ["userId", "code"]);
    const result = await runModelCodeSnippet(body.code);
    recordAudit(db, actor, "model.code_run", {
      resourceType: "modelCode",
      resourceId: "",
      meta: {
        subject: String(body.subject || "机器学习").slice(0, 40),
        title: String(body.title || "自定义代码").slice(0, 80),
        success: result.success,
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        durationMs: result.durationMs
      }
    }, req);
    writeDb(db);
    return send(res, 200, { ok: true, ...result });
  }

  params = routePattern(pathname, "/api/models/:id");
  if (method === "DELETE" && params) {
    const userId = queryUserId(searchParams, actor);
    const index = db.models.findIndex((item) => item.id === params.id && item.ownerId === userId);
    if (index < 0) return notFound(res);
    recordAudit(db, actor, "model.delete", { resourceType: "model", resourceId: params.id }, req);
    db.models.splice(index, 1);
    writeDb(db);
    return send(res, 200, { ok: true });
  }

  if (method === "GET" && pathname === "/api/chat") {
    const userId = queryUserId(searchParams, actor);
    return send(res, 200, {
      ok: true,
      friends: db.friendships.filter((item) => item.userId === userId).map((item) => publicUser(getUser(db, item.friendId))).filter(Boolean),
      friendRequests: visibleFriendRequests(db, userId),
      chatInvites: visibleChatInvites(db, userId),
      threads: db.chatThreads.filter((thread) => thread.memberIds.includes(userId)).map((thread) => publicChatThreadForUser(thread, userId))
    });
  }

  if (method === "POST" && pathname === "/api/friends") {
    const body = await readBody(req);
    assertRequired(body, ["userId", "target"]);
    const resolved = resolveUserByTarget(db, body.target);
    if (resolved.error) throw resolved.error;
    const result = createFriendRequest(db, body.userId, resolved.user.id, body.message);
    recordAudit(db, actor, result.status === "pending" ? "friend.request" : "friend.add", { resourceType: "user", resourceId: resolved.user.id, meta: { status: result.status } }, req);
    writeDb(db);
    return send(res, result.status === "pending" ? 201 : 200, { ok: true, ...result, friend: publicUser(resolved.user) });
  }

  params = routePattern(pathname, "/api/friend-requests/:id/respond");
  if (method === "POST" && params) {
    const body = await readBody(req);
    assertRequired(body, ["userId", "action"]);
    const request = respondFriendRequest(db, params.id, body.userId, body.action === "accept" ? "accept" : "reject");
    recordAudit(db, actor, "friend.request_respond", { resourceType: "friendRequest", resourceId: request.id, meta: { status: request.status } }, req);
    writeDb(db);
    return send(res, 200, { ok: true, request, state: getRelevantState(db, body.userId) });
  }

  params = routePattern(pathname, "/api/friends/:friendId");
  if (method === "DELETE" && params) {
    const userId = queryUserId(searchParams, actor);
    db.friendships = db.friendships.filter((item) => !(item.userId === userId && item.friendId === params.friendId) && !(item.userId === params.friendId && item.friendId === userId));
    db.friendRequests = (db.friendRequests || []).filter((item) => !(
      item.status === "pending"
      && ((item.fromUserId === userId && item.toUserId === params.friendId) || (item.fromUserId === params.friendId && item.toUserId === userId))
    ));
    recordAudit(db, actor, "friend.delete", { resourceType: "user", resourceId: params.friendId }, req);
    writeDb(db);
    return send(res, 200, { ok: true });
  }

  if (method === "POST" && pathname === "/api/chat/groups") {
    const body = await readBody(req);
    assertRequired(body, ["ownerId", "name"]);
    const owner = ensureUser(db, body.ownerId);
    const selectedIds = Array.from(new Set(Array.isArray(body.memberIds) ? body.memberIds.map(String) : []))
      .filter((id) => id !== owner.id && getUser(db, id));
    const thread = {
      id: uid("thread"),
      type: "group",
      name: String(body.name || "新的群聊").trim().slice(0, 40) || "新的群聊",
      ownerId: owner.id,
      adminIds: [owner.id],
      memberIds: [owner.id],
      pendingInviteIds: [],
      messages: [],
      createdAt: now(),
      updatedAt: now()
    };
    addSystemChatMessage(thread, `${owner.name || owner.id} 创建了群聊`);
    db.chatThreads.unshift(thread);
    const invites = [];
    selectedIds.forEach((friendId) => {
      const invite = createChatInvite(db, thread, owner.id, friendId);
      if (invite) invites.push(invite);
    });
    recordAudit(db, actor, "chat.group_create", { resourceType: "chatThread", resourceId: thread.id }, req);
    writeDb(db);
    return send(res, 201, { ok: true, thread, invites });
  }

  params = routePattern(pathname, "/api/chat/groups/:id/invites");
  if (method === "POST" && params) {
    const body = await readBody(req);
    assertRequired(body, ["fromUserId", "memberIds"]);
    const thread = db.chatThreads.find((item) => item.id === params.id && item.type === "group");
    if (!thread) return notFound(res);
    if (!thread.memberIds.includes(body.fromUserId)) return sendError(res, 403, "只有群成员可以邀请好友入群");
    const memberIds = Array.from(new Set(Array.isArray(body.memberIds) ? body.memberIds.map(String) : []));
    const invites = [];
    memberIds.forEach((memberId) => {
      const invite = createChatInvite(db, thread, body.fromUserId, memberId);
      if (invite) invites.push(invite);
    });
    recordAudit(db, actor, "chat.group_invite", { resourceType: "chatThread", resourceId: thread.id, meta: { count: invites.length } }, req);
    writeDb(db);
    return send(res, 201, { ok: true, thread, invites });
  }

  params = routePattern(pathname, "/api/chat/invites/:id/respond");
  if (method === "POST" && params) {
    const body = await readBody(req);
    assertRequired(body, ["userId", "action"]);
    const result = respondChatInvite(db, params.id, body.userId, body.action === "accept" ? "accept" : "reject");
    recordAudit(db, actor, "chat.invite_respond", { resourceType: "chatInvite", resourceId: result.invite.id, meta: { status: result.invite.status } }, req);
    writeDb(db);
    return send(res, 200, { ok: true, ...result, state: getRelevantState(db, body.userId) });
  }

  params = routePattern(pathname, "/api/chat/groups/:id");
  if (method === "DELETE" && params) {
    const body = await readBody(req);
    assertRequired(body, ["userId"]);
    const index = db.chatThreads.findIndex((item) => item.id === params.id && item.type === "group");
    if (index < 0) return notFound(res);
    ensureGroupOwner(db.chatThreads[index], body.userId);
    db.chatInvites = (db.chatInvites || []).filter((invite) => invite.threadId !== params.id);
    recordAudit(db, actor, "chat.group_dissolve", { resourceType: "chatThread", resourceId: params.id }, req);
    db.chatThreads.splice(index, 1);
    writeDb(db);
    return send(res, 200, { ok: true });
  }

  params = routePattern(pathname, "/api/chat/groups/:id/members/:memberId");
  if (method === "DELETE" && params) {
    const body = await readBody(req);
    assertRequired(body, ["userId"]);
    const thread = db.chatThreads.find((item) => item.id === params.id && item.type === "group");
    if (!thread) return notFound(res);
    const removingSelf = body.userId === params.memberId;
    if (!removingSelf) ensureGroupOwner(thread, body.userId);
    if (params.memberId === thread.ownerId) return sendError(res, 400, "群主不能退出，请先解散群聊");
    thread.memberIds = thread.memberIds.filter((id) => id !== params.memberId);
    thread.adminIds = (thread.adminIds || []).filter((id) => id !== params.memberId);
    thread.pendingInviteIds = (thread.pendingInviteIds || []).filter((id) => id !== params.memberId);
    const member = getUser(db, params.memberId);
    addSystemChatMessage(thread, removingSelf ? `${member?.name || params.memberId} 退出了群聊` : `${member?.name || params.memberId} 已被移出群聊`);
    recordAudit(db, actor, removingSelf ? "chat.group_leave" : "chat.group_remove_member", { resourceType: "chatThread", resourceId: thread.id, meta: { memberId: params.memberId } }, req);
    writeDb(db);
    return send(res, 200, { ok: true, thread });
  }

  if (method === "POST" && pathname === "/api/chat/messages") {
    const body = await readBody(req);
    assertRequired(body, ["threadId", "fromUserId", "content"]);
    const thread = db.chatThreads.find((item) => item.id === body.threadId && item.memberIds.includes(body.fromUserId));
    if (!thread) return notFound(res);
    if (thread.type === "direct") {
      const otherId = thread.memberIds.find((id) => id !== body.fromUserId);
      if (!otherId || !areFriends(db, body.fromUserId, otherId)) return sendError(res, 403, "双方成为好友后才能继续私聊");
    }
    const content = String(body.content || "").trim();
    if (!content) return sendError(res, 400, "消息内容不能为空");
    if (content.length > 2000) return sendError(res, 400, "单条消息不能超过 2000 字");
    const message = { id: uid("chat"), fromUserId: body.fromUserId, content, createdAt: now(), deletedFor: [] };
    thread.messages.push(message);
    thread.updatedAt = now();
    recordAudit(db, actor, "chat.message_send", { resourceType: "chatThread", resourceId: thread.id }, req);
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
    recordAudit(db, actor, "chat.message_delete", { resourceType: "chatThread", resourceId: thread.id, meta: { count: body.messageIds.length } }, req);
    writeDb(db);
    return send(res, 200, { ok: true, thread });
  }

  if (method === "GET" && pathname === "/api/classes") {
    const teacherId = actor.role === "teacher" ? actor.id : (actor.role === "admin" ? searchParams.get("teacherId") : "");
    const studentId = actor.role === "student" ? actor.id : (actor.role === "admin" ? searchParams.get("studentId") : "");
    let classes = db.classes;
    if (teacherId) classes = classes.filter((item) => item.teacherId === teacherId);
    if (studentId) classes = classes.filter((item) => item.studentIds.includes(studentId));
    return send(res, 200, { ok: true, classes });
  }

  if (method === "POST" && pathname === "/api/classes") {
    const body = await readBody(req);
    assertRequired(body, ["teacherId", "name", "subject"]);
    const teacher = ensureUser(db, body.teacherId);
    if (!["teacher", "admin"].includes(teacher.role)) return sendError(res, 403, "只有教师可以创建班级");
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
    recordAudit(db, actor, "class.create", { resourceType: "class", resourceId: klass.id, meta: { name: klass.name, subject: klass.subject } }, req);
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
      let user = studentNo ? db.users.find((item) => item.role === "student" && item.id === studentNo) : null;
      if (!user) {
        user = {
          id: studentNo && /^\d{8}$/.test(studentNo) && !db.users.some((item) => item.id === studentNo) ? studentNo : generateUserId(db),
          name: name || `学生${studentNo || db.users.length + 1}`,
          role: "student",
          passwordHash: hashPassword("123456"),
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
    recordAudit(db, actor, "class.import_students", { resourceType: "class", resourceId: klass.id, meta: { count: added.length } }, req);
    writeDb(db);
    return send(res, 200, { ok: true, added, class: klass });
  }

  params = routePattern(pathname, "/api/classes/:id/apply");
  if (method === "POST" && params) {
    const body = await readBody(req);
    assertRequired(body, ["studentId"]);
    requireRole(actor, ["student", "admin"]);
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
    recordAudit(db, actor, "class.apply", { resourceType: "class", resourceId: klass.id }, req);
    writeDb(db);
    return send(res, 200, { ok: true, application, class: klass });
  }

  if (method === "GET" && pathname === "/api/homework") {
    const teacherId = actor.role === "teacher" ? actor.id : (actor.role === "admin" ? searchParams.get("teacherId") : "");
    const studentId = actor.role === "student" ? actor.id : (actor.role === "admin" ? searchParams.get("studentId") : "");
    let homework = db.homework;
    if (teacherId) homework = homework.filter((item) => item.teacherId === teacherId);
    if (studentId) {
      const user = ensureUser(db, studentId);
      const ids = user.classIds || [];
      homework = homework.filter((item) => ids.includes(item.classId));
    }
    const homeworkIds = new Set(homework.map((item) => item.id));
    const submissions = db.submissions.filter((item) => {
      if (!homeworkIds.has(item.homeworkId)) return false;
      if (actor.role === "student") return item.studentId === actor.id;
      if (actor.role === "teacher") return db.homework.some((homeworkItem) => homeworkItem.id === item.homeworkId && homeworkItem.teacherId === actor.id);
      return true;
    });
    return send(res, 200, { ok: true, homework, submissions });
  }

  if (method === "POST" && pathname === "/api/homework") {
    const body = await readBody(req);
    assertRequired(body, ["teacherId", "classId", "title"]);
    requireRole(actor, ["teacher", "admin"]);
    const klass = db.classes.find((item) => item.id === body.classId && item.teacherId === body.teacherId);
    if (!klass) return sendError(res, 404, "班级不存在或无权限");
    const homework = {
      id: uid("homework"),
      teacherId: body.teacherId,
      classId: body.classId,
      title: String(body.title),
      description: String(body.description || ""),
      answer: String(body.answer || ""),
      rubric: parseRubricInput(body.rubric, {
        title: body.title,
        description: body.description,
        answer: body.answer
      }),
      rubricText: rubricToText(parseRubricInput(body.rubric, {
        title: body.title,
        description: body.description,
        answer: body.answer
      })),
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      createdAt: now(),
      updatedAt: now()
    };
    db.homework.unshift(homework);
    recordAudit(db, actor, "homework.create", { resourceType: "homework", resourceId: homework.id, meta: { title: homework.title, classId: homework.classId } }, req);
    writeDb(db);
    return send(res, 201, { ok: true, homework });
  }

  params = routePattern(pathname, "/api/homework/:id");
  if (method === "PUT" && params) {
    const body = await readBody(req);
    const homework = db.homework.find((item) => item.id === params.id);
    if (!homework) return notFound(res);
    if (homework.teacherId !== body.teacherId) return sendError(res, 403, "无权修改该作业");
    if (body.classId) {
      const klass = db.classes.find((item) => item.id === body.classId && item.teacherId === body.teacherId);
      if (!klass) return sendError(res, 404, "班级不存在或无权限");
      homework.classId = body.classId;
    }
    if (body.title !== undefined) homework.title = String(body.title || homework.title);
    if (body.description !== undefined) homework.description = String(body.description || "");
    if (body.answer !== undefined) homework.answer = String(body.answer || "");
    if (body.rubric !== undefined || body.answer !== undefined || body.description !== undefined || body.title !== undefined) {
      homework.rubric = parseRubricInput(body.rubric !== undefined ? body.rubric : homework.rubricText, homework);
      homework.rubricText = rubricToText(homework.rubric);
    }
    if (Array.isArray(body.attachments) && body.attachments.length) homework.attachments = body.attachments;
    homework.updatedAt = now();
    recordAudit(db, actor, "homework.update", { resourceType: "homework", resourceId: homework.id }, req);
    writeDb(db);
    return send(res, 200, { ok: true, homework });
  }

  if (method === "DELETE" && params) {
    const body = await readBody(req);
    const homework = db.homework.find((item) => item.id === params.id);
    if (!homework) return notFound(res);
    if (homework.teacherId !== body.teacherId) return sendError(res, 403, "无权删除该作业");
    recordAudit(db, actor, "homework.delete", { resourceType: "homework", resourceId: homework.id }, req);
    db.homework = db.homework.filter((item) => item.id !== homework.id);
    db.submissions = db.submissions.filter((item) => item.homeworkId !== homework.id);
    writeDb(db);
    return send(res, 200, { ok: true });
  }

  params = routePattern(pathname, "/api/homework/:id/submit");
  if (method === "POST" && params) {
    const body = await readBody(req);
    assertRequired(body, ["studentId"]);
    requireRole(actor, ["student", "admin"]);
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
    ["score", "comment", "feedback", "aiSuggestedScore", "aiComment", "aiGradedAt", "gradedAt", "confirmedAt", "confirmedBy", "gradeType"].forEach((key) => {
      delete submission[key];
    });
    recordAudit(db, actor, "homework.submit", { resourceType: "submission", resourceId: submission.id, meta: { homeworkId: homework.id } }, req);
    writeDb(db);
    return send(res, 201, { ok: true, submission });
  }

  params = routePattern(pathname, "/api/submissions/:id/ai-grade");
  if (method === "POST" && params) {
    const body = await readBody(req);
    requireRole(actor, ["teacher", "admin"]);
    const submission = db.submissions.find((item) => item.id === params.id);
    if (!submission) return notFound(res);
    const homework = db.homework.find((item) => item.id === submission.homeworkId);
    if (!homework || homework.teacherId !== body.teacherId) return sendError(res, 403, "无批改权限");
    const feedback = gradeSubmissionWithFeedback(db, homework, submission);
    submission.aiSuggestedScore = feedback.score;
    submission.status = "review_pending";
    submission.gradeType = "ai_suggestion";
    submission.aiComment = feedback.comment;
    submission.feedback = {
      missing: feedback.missing,
      topics: feedback.topics,
      rubric: feedback.rubric,
      rubricResults: feedback.rubricResults,
      teacherReviewRequired: true,
      reliability: "AI 给出评分建议，最终结果建议由教师确认"
    };
    submission.aiGradedAt = now();
    submission.updatedAt = now();
    recordAudit(db, actor, "submission.ai_grade", { resourceType: "submission", resourceId: submission.id, meta: { suggestedScore: feedback.score, homeworkId: homework.id } }, req);
    writeDb(db);
    return send(res, 200, { ok: true, submission });
  }

  params = routePattern(pathname, "/api/submissions/:id/manual-grade");
  if (method === "POST" && params) {
    const body = await readBody(req);
    requireRole(actor, ["teacher", "admin"]);
    const submission = db.submissions.find((item) => item.id === params.id);
    if (!submission) return notFound(res);
    const homework = db.homework.find((item) => item.id === submission.homeworkId);
    if (!homework || homework.teacherId !== body.teacherId) return sendError(res, 403, "无批改权限");
    const finalScore = Number.isFinite(Number(body.score)) ? Number(body.score) : Number(submission.aiSuggestedScore || 0);
    submission.score = Math.max(0, Math.min(100, Math.round(finalScore)));
    submission.status = "graded";
    submission.gradeType = submission.aiSuggestedScore !== undefined ? "teacher_confirmed" : "manual";
    submission.comment = String(body.comment || "");
    submission.gradedAt = now();
    submission.confirmedAt = now();
    submission.confirmedBy = actor.id;
    submission.updatedAt = now();
    const topics = submission.feedback?.topics?.length ? submission.feedback.topics : inferQuestionTopics(`${homework.title} ${homework.description}`, "");
    updateTopicMastery(db, submission.studentId, topics, submission.score >= 80 ? 0.06 : submission.score >= 60 ? 0.01 : -0.06, `教师确认批改：${homework.title} ${submission.score} 分`);
    const profile = ensureLearningProfile(db, submission.studentId);
    profile.gradedCount = Number(profile.gradedCount || 0) + 1;
    recordLearningActivity(db, submission.studentId, {
      kind: "graded",
      mode: "homework",
      prompt: homework.title,
      topics,
      score: submission.score,
      minutes: 5
    });
    if (submission.score < 75 && topics[0]) {
      addWrongNote(db, submission.studentId, {
        source: `作业：${homework.title}`,
        topic: topics[0],
        question: homework.description,
        answer: submission.answerText,
        analysis: submission.comment || submission.aiComment || "教师确认分数较低，建议回看评分标准。",
        recommendation: "先补齐缺失要点，再生成 2 道同类题练习。"
      });
    }
    if (submission.feedback) {
      submission.feedback.teacherReviewRequired = false;
      submission.feedback.confirmedScore = submission.score;
      submission.feedback.confirmedAt = submission.confirmedAt;
    }
    recordAudit(db, actor, "submission.manual_grade", { resourceType: "submission", resourceId: submission.id, meta: { score: submission.score, homeworkId: homework.id } }, req);
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

function staticHeaders(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const headers = { ...SECURITY_HEADERS, "content-type": contentType(filePath) };
  if (NO_CACHE_STATIC_EXTENSIONS.has(ext)) {
    headers["cache-control"] = "no-store, no-cache, must-revalidate, proxy-revalidate";
    headers["pragma"] = "no-cache";
    headers["expires"] = "0";
  }
  return headers;
}

function serveStatic(req, res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, SECURITY_HEADERS);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      fs.readFile(path.join(PUBLIC_DIR, "index.html"), (fallbackError, fallback) => {
        if (fallbackError) {
          res.writeHead(404, SECURITY_HEADERS);
          res.end("Not found");
        } else {
          res.writeHead(200, staticHeaders(path.join(PUBLIC_DIR, "index.html")));
          res.end(fallback);
        }
      });
      return;
    }
    res.writeHead(200, staticHeaders(filePath));
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
    loadRuntimeState();
    readDb();
    console.log(`智慧教育智能体平台已启动：http://${HOST}:${port}`);
  });
}

listenWithFallback(PORT);
