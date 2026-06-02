const app = document.getElementById("app");
const toast = document.getElementById("toast");
const DEFAULT_GRAPH_EXTRACTOR = "ai-unlimited-pdf-graph-agent";

const state = {
  user: null,
  data: null,
  page: "graph",
  selectedGraphId: null,
  graphSubject: "物理",
  activeConversationId: null,
  aiMode: "explain",
  modelSubject: "物理",
  modelMode: "ideal",
  modelComponents: [],
  selectedComponentId: null,
  loadedModelId: null,
  activeThreadId: null,
  selectedMessages: new Set(),
  selectedClassId: null,
  homeworkModal: null,
  graphViews: {},
  graphNodeModal: null,
  graphJob: null,
  graphJobTimer: null,
  graphDraft: {
    subject: "",
    title: "",
    sourceText: "",
    extractor: DEFAULT_GRAPH_EXTRACTOR
  },
  graphUploadAbort: null,
  graphGenerationCanceled: false,
  searchResults: []
};

const subjects = ["数学", "物理", "化学", "语文", "英语", "生物", "历史", "地理", "政治", "通用"];
const GRAPH_WIDTH = 1340;
const GRAPH_HEIGHT = 1180;
const GRAPH_LAYOUT_VERSION = "graph-layout-v8-elastic-network";
const TREE_LINK_LABELS = new Set(["一级章节", "一级模块", "包含", "细分"]);

const teacherMenus = [
  { key: "graph", icon: "📘", label: "导入书本生成图谱" },
  { key: "ai", icon: "🎓", label: "教学指导（对话）" },
  { key: "history", icon: "💬", label: "历史对话" },
  { key: "models", icon: "🧠", label: "模型显示" },
  { key: "chat", icon: "☁️", label: "聊天信息" },
  { key: "classes", icon: "🏫", label: "班级管理" },
  { key: "homework", icon: "✏️", label: "作业管理" },
  { key: "profile", icon: "ℹ️", label: "个人信息" }
];

const studentMenus = [
  { key: "graph", icon: "📗", label: "知识图谱" },
  { key: "ai", icon: "☁️", label: "发起对话" },
  { key: "history", icon: "📜", label: "历史对话" },
  { key: "models", icon: "🧠", label: "模型显示" },
  { key: "chat", icon: "☁️", label: "聊天信息" },
  { key: "homework", icon: "📥", label: "作业提交" },
  { key: "profile", icon: "ℹ️", label: "个人信息" }
];

const componentPalette = [
  { type: "cart", icon: "▣", label: "小车", subject: "物理", defaults: { mass: "2kg", velocity: "0m/s" } },
  { type: "slope", icon: "╱", label: "斜面", subject: "物理", defaults: { angle: "30°", friction: "0.2" } },
  { type: "spring", icon: "⌁", label: "弹簧", subject: "物理", defaults: { k: "20N/m" } },
  { type: "pulley", icon: "○", label: "滑轮", subject: "物理", defaults: { radius: "0.2m" } },
  { type: "battery", icon: "▥", label: "电源", subject: "物理", defaults: { voltage: "6V" } },
  { type: "resistor", icon: "▱", label: "电阻", subject: "物理", defaults: { resistance: "10Ω" } },
  { type: "lens", icon: "◐", label: "透镜", subject: "物理", defaults: { focal: "10cm" } },
  { type: "axis", icon: "＋", label: "坐标系", subject: "通用", defaults: { scale: "1:1" } },
  { type: "point", icon: "●", label: "质点", subject: "物理", defaults: { position: "(0,0)" } },
  { type: "formula", icon: "ƒ", label: "公式块", subject: "通用", defaults: { formula: "F=ma" } }
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmtTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value) return "0B";
  if (value < 1024) return `${value}B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)}KB`;
  return `${(value / 1024 / 1024).toFixed(1)}MB`;
}

function roleName(role) {
  return role === "teacher" ? "教师" : "学生";
}

function showToast(message, type = "ok") {
  toast.textContent = message;
  toast.className = `toast ${type}`;
  setTimeout(() => toast.classList.add("hidden"), 2600);
}

async function api(path, options = {}) {
  const init = {
    method: options.method || "GET",
    headers: { "content-type": "application/json" }
  };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);
  const res = await fetch(path, init);
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.ok === false) {
    throw new Error(payload.error || `请求失败：${res.status}`);
  }
  return payload;
}

function fileToPayload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type || "application/octet-stream", size: file.size, dataUrl: reader.result });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function fileToText(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => resolve("");
    reader.readAsText(file, "utf-8");
  });
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getCurrentUser() {
  const raw = localStorage.getItem("edu-user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function loadState() {
  if (!state.user) return;
  const payload = await api(`/api/state?userId=${encodeURIComponent(state.user.id)}`);
  state.data = payload.state;
  state.user = payload.state.user;
  localStorage.setItem("edu-user", JSON.stringify(state.user));
  if (!state.selectedClassId && state.data.classes.length) state.selectedClassId = state.data.classes[0].id;
  if (!state.selectedGraphId && state.data.knowledgeGraphs.length) state.selectedGraphId = state.data.knowledgeGraphs[0].id;
  if (!state.activeThreadId && state.data.chatThreads.length) state.activeThreadId = state.data.chatThreads[0].id;
}

async function boot() {
  state.user = getCurrentUser();
  if (!state.user) {
    renderAuth();
    return;
  }
  try {
    await loadState();
    renderShell();
  } catch (error) {
    localStorage.removeItem("edu-user");
    state.user = null;
    showToast(error.message, "error");
    renderAuth();
  }
}

function subjectOptions(selected) {
  return subjects.map((subject) => `<option value="${subject}" ${subject === selected ? "selected" : ""}>${subject}</option>`).join("");
}

function renderAuth() {
  app.innerHTML = `
    <main class="auth-shell">
      <section class="auth-visual">
        <div class="brand-mark">🧠</div>
        <h1>智慧教育智能体平台</h1>
        <p>教师端与学生端共用一套账号体系，注册时选择身份，系统自动分配 8 位 ID。</p>
        <div class="auth-points">
          <span>知识图谱</span>
          <span>AI 对话</span>
          <span>模型构建</span>
          <span>班级作业</span>
        </div>
      </section>
      <section class="auth-panel">
        <div class="tabs">
          <button class="tab active" data-auth-tab="login">登录</button>
          <button class="tab" data-auth-tab="register">注册</button>
        </div>
        <form id="loginForm" class="auth-form">
          <label>账号 ID 或姓名<input name="account" placeholder="示例：20260001 或 黄豆" required /></label>
          <label>密码<input name="password" type="password" placeholder="示例账号密码：123456" required /></label>
          <button class="primary wide" type="submit">进入平台</button>
          <p class="hint">内置教师：20260001 / 黄豆；内置学生：20260002 / 绿豆。</p>
        </form>
        <form id="registerForm" class="auth-form hidden">
          <label>姓名<input name="name" placeholder="请输入姓名" required /></label>
          <label>密码<input name="password" type="password" placeholder="设置登录密码" required /></label>
          <label>身份
            <select name="role">
              <option value="teacher">教师</option>
              <option value="student">学生</option>
            </select>
          </label>
          <label>任教学科 / 初始班级<input name="subject" placeholder="教师填学科，学生可填班级" /></label>
          <button class="primary wide" type="submit">注册并分配 8 位 ID</button>
          <p id="registerResult" class="hint"></p>
        </form>
      </section>
    </main>
  `;

  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-auth-tab]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      document.getElementById("loginForm").classList.toggle("hidden", button.dataset.authTab !== "login");
      document.getElementById("registerForm").classList.toggle("hidden", button.dataset.authTab !== "register");
    });
  });

  document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const payload = await api("/api/auth/login", {
        method: "POST",
        body: { account: form.get("account"), password: form.get("password") }
      });
      state.user = payload.user;
      state.data = payload.state;
      localStorage.setItem("edu-user", JSON.stringify(state.user));
      state.page = "graph";
      renderShell();
      showToast("登录成功");
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  document.getElementById("registerForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const role = form.get("role");
    try {
      const payload = await api("/api/auth/register", {
        method: "POST",
        body: {
          name: form.get("name"),
          password: form.get("password"),
          role,
          subject: role === "teacher" ? form.get("subject") : "",
          className: role === "student" ? form.get("subject") : ""
        }
      });
      document.getElementById("registerResult").textContent = `${payload.message}，请使用该 ID 登录。`;
      event.currentTarget.reset();
      showToast("注册成功");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

function renderShell() {
  const menus = state.user.role === "teacher" ? teacherMenus : studentMenus;
  const classes = state.data?.classes || [];
  app.innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <div class="side-brand">
          <strong>${state.user.role === "teacher" ? "📖 教学中枢" : "📚 学习索引"}</strong>
          <span>${escapeHtml(state.user.name)}（${roleName(state.user.role)}）</span>
          <small>ID：${state.user.id}</small>
        </div>
        <div class="section-label">${state.user.role === "teacher" ? "教师端" : "学生端"}</div>
        <nav class="nav">
          ${menus.map((item) => `
            <button class="nav-item ${state.page === item.key ? "active" : ""}" data-page="${item.key}">
              <span>${item.icon}</span>${item.label}
            </button>
          `).join("")}
        </nav>
        <div class="profile-mini">
          <strong>${state.user.role === "teacher" ? "🏫 我的信息" : "👤 我的信息"}</strong>
          <dl>
            <dt>姓名：</dt><dd>${escapeHtml(state.user.name)}</dd>
            <dt>${state.user.role === "teacher" ? "学科：" : "班级："}</dt><dd>${escapeHtml(state.user.role === "teacher" ? (state.user.subject || "未设置") : (state.user.className || "未加入"))}</dd>
            <dt>${state.user.role === "teacher" ? "班级数：" : "班级数："}</dt><dd>${classes.length || 0}</dd>
          </dl>
        </div>
        <button id="logoutBtn" class="ghost wide">退出登录</button>
      </aside>
      <main class="main">
        <header class="topbar">
          <div>
            <strong>🧠 智慧教育智能体平台</strong>
            <span>${state.user.role === "teacher" ? "面向备课、授课、班级与作业闭环" : "面向学习、练习、模型与作业提交"}</span>
          </div>
        </header>
        <section id="content" class="content"></section>
      </main>
      <div class="floating-tools">
        <button title="刷新数据" id="refreshBtn">↻</button>
        <button title="回到知识图谱" data-page="graph">✦</button>
      </div>
    </div>
  `;
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.page = button.dataset.page;
      state.selectedMessages.clear();
      await loadState();
      renderShell();
    });
  });
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("edu-user");
    Object.assign(state, {
      user: null,
      data: null,
      page: "graph",
      activeConversationId: null,
      activeThreadId: null
    });
    renderAuth();
  });
  document.getElementById("refreshBtn").addEventListener("click", async () => {
    await loadState();
    renderShell();
    showToast("数据已刷新");
  });
  renderContent();
}

function renderContent() {
  const content = document.getElementById("content");
  const pageMap = {
    graph: renderGraphPage,
    ai: renderAiPage,
    history: renderHistoryPage,
    models: renderModelPage,
    chat: renderChatPage,
    classes: renderClassPage,
    homework: state.user.role === "teacher" ? renderTeacherHomeworkPage : renderStudentHomeworkPage,
    profile: renderProfilePage
  };
  const renderer = pageMap[state.page] || renderGraphPage;
  content.innerHTML = renderer();
  bindCurrentPage();
}

function bindCurrentPage() {
  const binders = {
    graph: bindGraphPage,
    ai: bindAiPage,
    history: bindHistoryPage,
    models: bindModelPage,
    chat: bindChatPage,
    classes: bindClassPage,
    homework: state.user.role === "teacher" ? bindTeacherHomeworkPage : bindStudentHomeworkPage,
    profile: bindProfilePage
  };
  (binders[state.page] || bindGraphPage)();
}

function graphListForCurrentRole() {
  let graphs = state.data.knowledgeGraphs || [];
  if (state.user.role === "student") {
    graphs = graphs.filter((graph) => graph.global && (!state.graphSubject || graph.subject === state.graphSubject));
  }
  return graphs;
}

function renderGraphPage() {
  return state.user.role === "teacher" ? renderTeacherGraphPage() : renderStudentGraphPage();
}

function graphCard(graph) {
  const active = state.selectedGraphId === graph.id ? "active" : "";
  return `
    <article class="list-card ${active}" data-select-graph="${graph.id}">
      <div>
        <h3>${escapeHtml(graph.title)}</h3>
        <p>${escapeHtml(graph.subject)} · 节点 ${graph.nodes.length} · 关系 ${graph.links.length}</p>
        <small>${graph.global ? "已上传总图谱" : "账号私有"} · ${fmtTime(graph.createdAt)}</small>
      </div>
      <div class="row-actions">
        <button class="mini" data-export-graph="${graph.id}">导出</button>
        ${graph.ownerId === state.user.id && !graph.global ? `<button class="mini" data-global-graph="${graph.id}">上传总图谱</button>` : ""}
        ${graph.ownerId === state.user.id ? `<button class="mini danger" data-delete-graph="${graph.id}">删除</button>` : ""}
      </div>
    </article>
  `;
}

function renderGraphProgress() {
  const job = state.graphJob || {
    status: "idle",
    stage: "等待开始",
    progress: 0,
    message: "选择 PDF/TXT/EPUB 并点击生成后，这里会显示上传、解析、抽取、生成和保存进度。"
  };
  const statusText = {
    idle: "未开始",
    queued: "排队中",
    running: "处理中",
    complete: "已完成",
    failed: "失败",
    canceled: "已终止"
  }[job.status] || job.status;
  const extraction = job.meta?.extraction;
  const ocrInfo = extraction?.stats?.ocrUsed
    ? `；OCR 页数：${extraction.stats.ocrPages || 0}/${extraction.stats.ocrPlannedPages || extraction.stats.ocrTotalPdfPages || 0}`
    : "";
  const canCancel = ["queued", "running"].includes(job.status);
  return `
    <section class="progress-card ${job.status}">
      <div class="split-head">
        <h3>生成进度</h3>
        <div class="actions compact-actions">
          <span>${statusText}</span>
          ${canCancel ? `<button class="mini danger" type="button" id="cancelGraphJobBtn">终止生成</button>` : ""}
        </div>
      </div>
      <div class="progress-track"><span style="width:${clamp(Number(job.progress || 0), 0, 100)}%"></span></div>
      <div class="progress-meta">
        <strong>${escapeHtml(job.stage || "等待开始")}</strong>
        <span>${clamp(Number(job.progress || 0), 0, 100)}%</span>
      </div>
      <p>${escapeHtml(job.error || job.message || "")}</p>
      ${extraction ? `<small>解析工具：${escapeHtml(extraction.method || extraction.extractor || "PDF/OCR 解析智能体")}；识别字符：${extraction.characters || 0}；文件大小：${formatBytes(extraction.size || extraction.fileSize || 0)}${ocrInfo}</small>` : ""}
    </section>
  `;
}

function renderTeacherGraphPage() {
  const graphs = graphListForCurrentRole();
  const selected = graphs.find((graph) => graph.id === state.selectedGraphId) || graphs[0];
  const draft = state.graphDraft || {};
  return `
    <div class="page-head">
      <div>
        <h2>📘 导入书本 / 知识图谱</h2>
        <p>导入书本生成知识图谱，也可以直接导入图谱 JSON；图谱存储在当前账号下，可导出、删除或上传到总图谱。</p>
      </div>
      <div class="stat-strip">
        <span>${graphs.length}<small>账号可见图谱</small></span>
        <span>${graphs.filter((item) => item.global).length}<small>总图谱</small></span>
      </div>
    </div>
    <div class="grid two">
      <section class="panel">
        <h3>生成图谱</h3>
        <form id="generateGraphForm" class="stack">
          <div class="form-grid">
            <label>学科<input name="subject" value="${escapeHtml(draft.subject || "")}" placeholder="例如：数学、物理、人工智能导论" required /></label>
            <label>图谱名称<input name="title" value="${escapeHtml(draft.title || "")}" placeholder="例如：高一数学选择性必修一知识图谱" /></label>
          </div>
          <label>内容识别工具
            <select name="extractor">
              <option value="ai-unlimited-pdf-graph-agent" ${(draft.extractor || DEFAULT_GRAPH_EXTRACTOR) === "ai-unlimited-pdf-graph-agent" ? "selected" : ""}>AI 自动图谱智能体（不限总文件大小，目录/OCR 融合）</option>
              <option value="advanced-python-pdf-agent" ${draft.extractor === "advanced-python-pdf-agent" ? "selected" : ""}>高级 PDF/OCR 智能体（PyMuPDF/PaddleOCR）</option>
              <option value="local-pdf-text-agent" ${draft.extractor === "local-pdf-text-agent" ? "selected" : ""}>轻量 PDF 文本解析智能体</option>
              <option value="outline-fusion-agent" ${draft.extractor === "outline-fusion-agent" ? "selected" : ""}>目录与补充内容融合工具</option>
            </select>
          </label>
          <label>上传书本（PDF/TXT/EPUB）<input name="book" type="file" accept=".pdf,.txt,.epub,.md" /></label>
          <p class="hint">大 PDF 会自动分块上传；AI 自动图谱智能体不设固定总上传大小，优先读取文本层，扫描版会做有限 OCR 并融合目录/文件名/补充知识点防止崩溃。</p>
          <div class="actions">
            <button class="primary" type="submit">🚀 生成图谱</button>
            <button class="ghost" type="button" id="sampleGraphBtn">生成示例</button>
          </div>
        </form>
        <div id="graphProgressMount">${renderGraphProgress()}</div>
      </section>
      <section class="panel import-graph-panel">
        <h3>直接导入图谱</h3>
        <form id="importGraphForm" class="stack import-graph-form">
          <div class="form-grid">
            <label>学科<input name="subject" placeholder="例如：物理、线性代数、机器学习" /></label>
            <label>图谱名称<input name="title" placeholder="导入图谱名称" /></label>
          </div>
          <label>图谱 JSON 文件<input name="graph" type="file" accept=".json" required /></label>
          <p class="hint">JSON 需要包含 nodes 与 links，例如：{"nodes":[{"id":"n1","label":"力学"}],"links":[]}。</p>
        </form>
        <label class="supplement-field">补充目录或知识点
          <textarea name="sourceText" form="generateGraphForm" rows="6" placeholder="可粘贴目录、章节标题、重点知识点，系统会据此生成节点和关系">${escapeHtml(draft.sourceText || "")}</textarea>
        </label>
        <button class="primary" type="submit" form="importGraphForm">✅ 确认导入</button>
      </section>
    </div>
    <section class="panel">
      <div class="split-head">
        <h3>最近生成的知识图谱</h3>
        <span>${graphs.length ? "滚轮/按钮缩放，拖拽空白区域移动整个图谱，双击节点查看知识点" : "暂无图谱"}</span>
      </div>
      <div class="graph-workspace">
        <div class="graph-list">${graphs.map(graphCard).join("") || emptyBlock("还没有图谱，请先生成或导入。")}</div>
        <div class="graph-canvas">${selected ? renderGraphViewer(selected) : emptyBlock("选择一个图谱后将在这里渲染。")}</div>
      </div>
    </section>
    ${renderGraphNodeModal()}
  `;
}

function renderStudentGraphPage() {
  const graphs = graphListForCurrentRole();
  const selected = graphs.find((graph) => graph.id === state.selectedGraphId) || graphs[0];
  return `
    <div class="page-head">
      <div>
        <h2>📗 学科知识图谱</h2>
        <p>选择学科后，系统会检查数据库中总图谱是否存在对应学科图谱，并渲染可学习的知识网络。</p>
      </div>
      <label class="compact-label">学科<select id="studentGraphSubject">${subjectOptions(state.graphSubject)}</select></label>
    </div>
    <section class="panel">
      <div class="graph-workspace">
        <div class="graph-list">${graphs.map(graphCard).join("") || emptyBlock(`数据库中暂未找到「${escapeHtml(state.graphSubject)}」图谱。`)}</div>
        <div class="graph-canvas">${selected ? renderGraphViewer(selected) : emptyBlock("请选择其他学科查看可用图谱。")}</div>
      </div>
    </section>
    ${renderGraphNodeModal()}
  `;
}

function graphNodeLevel(node, index = 0) {
  if (Number.isFinite(Number(node.level))) return Number(node.level);
  if (index === 0 || node.group === "root") return 0;
  if (node.group === "chapter") return 1;
  if (node.group === "concept" || node.group === "topic") return 2;
  return 3;
}

function graphNodeRadius(node, index) {
  const level = graphNodeLevel(node, index);
  if (level === 0 || node.group === "root") return 52;
  if (level === 1 || node.group === "chapter") return 42;
  if (level === 2) return 34;
  return 28;
}

function graphSiblingSpacing(level) {
  if (level === 1) return 140;
  if (level === 2) return 58;
  return 30;
}

function isTreeLink(link) {
  return TREE_LINK_LABELS.has(String(link?.label || link?.relation || ""));
}

function isComplexGraph(graph) {
  const nodes = graph.nodes || [];
  const maxLevel = nodes.reduce((max, node, index) => Math.max(max, graphNodeLevel(node, index)), 0);
  return nodes.length > 60 || maxLevel >= 3;
}

function graphGroupClass(group) {
  return String(group || "topic").replace(/[^a-zA-Z0-9_-]/g, "") || "topic";
}

function graphLinkPath(source, target) {
  const dx = Math.max(80, Math.abs(target.x - source.x) * 0.45);
  const c1x = source.x + dx;
  const c2x = target.x - dx;
  return `M ${source.x} ${source.y} C ${c1x} ${source.y}, ${c2x} ${target.y}, ${target.x} ${target.y}`;
}

function graphNodeHorizontalPad(node, index = 0) {
  const level = graphNodeLevel(node || {}, index);
  if (!node || level >= 2 || node.group === "detail") return 96;
  return graphNodeRadius(node, index) + 8;
}

function graphRoutedLinkPath(source, target, link, index = 0, sourceNode = null, targetNode = null) {
  const label = String(link?.label || "");
  const treeLink = isTreeLink(link);
  const sourcePad = graphNodeHorizontalPad(sourceNode, 0);
  const targetPad = graphNodeHorizontalPad(targetNode, 0);
  const startX = source.x + (source.x <= target.x ? sourcePad : -sourcePad);
  const endX = target.x + (source.x <= target.x ? -targetPad : targetPad);
  if (treeLink) {
    const midX = (startX + endX) / 2;
    return `M ${startX} ${source.y} C ${midX} ${source.y}, ${midX} ${target.y}, ${endX} ${target.y}`;
  }
  const direction = index % 2 === 0 ? 1 : -1;
  const lift = 70 + (index % 5) * 18;
  const midX = (startX + endX) / 2;
  const midY = Math.min(source.y, target.y) - lift * direction;
  if (/直接访问|响应|缓解|参与|连接/.test(label)) {
    return `M ${startX} ${source.y} Q ${midX} ${midY} ${endX} ${target.y}`;
  }
  return `M ${startX} ${source.y} C ${midX} ${source.y - lift}, ${midX} ${target.y + lift}, ${endX} ${target.y}`;
}

function graphNetworkLinkPath(source, target, link, index = 0, sourceNode = null, targetNode = null, totalNodes = 0) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const unitX = dx / distance;
  const unitY = dy / distance;
  const sourceRadius = graphNetworkRadius(sourceNode || {}, 0, totalNodes) + 8;
  const targetRadius = graphNetworkRadius(targetNode || {}, 0, totalNodes) + 9;
  const startX = source.x + unitX * sourceRadius;
  const startY = source.y + unitY * sourceRadius;
  const endX = target.x - unitX * targetRadius;
  const endY = target.y - unitY * targetRadius;
  if (isTreeLink(link)) return `M ${startX} ${startY} L ${endX} ${endY}`;
  const normalX = -unitY;
  const normalY = unitX;
  const curve = ((index % 5) - 2) * 10 + (index % 2 === 0 ? 7 : -7);
  const midX = (startX + endX) / 2 + normalX * curve;
  const midY = (startY + endY) / 2 + normalY * curve;
  return `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;
}

function graphLinkLabelPoint(source, target, index = 0, treeLink = false) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const ratio = treeLink ? 0.58 : 0.5;
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const offset = treeLink ? ((index % 3) - 1) * 10 : ((index % 5) - 2) * 9;
  return {
    x: source.x + dx * ratio + normalX * offset,
    y: source.y + dy * ratio + normalY * offset
  };
}

function graphVisibleLinkLabel(label) {
  const text = String(label || "关联").trim();
  return text.length > 10 ? `${text.slice(0, 9)}…` : text;
}

function graphLabelLines(label, maxChars = 7, maxLines = 2) {
  const text = String(label || "");
  const lines = [];
  for (let index = 0; index < text.length && lines.length < maxLines; index += maxChars) {
    lines.push(text.slice(index, index + maxChars));
  }
  return lines.length ? lines : [""];
}

function graphInnerLabelLines(label, radius, root = false) {
  const text = String(label || "").replace(/\s+/g, "");
  const maxChars = root ? 6 : radius >= 44 ? 5 : radius >= 36 ? 4 : 3;
  const maxLines = root ? 3 : radius >= 36 ? 3 : 2;
  const capacity = maxChars * maxLines;
  const visible = text.length > capacity ? `${text.slice(0, Math.max(1, capacity - 1))}…` : text;
  const lines = [];
  for (let index = 0; index < visible.length && lines.length < maxLines; index += maxChars) {
    lines.push(visible.slice(index, index + maxChars));
  }
  return lines.length ? lines : [""];
}

function graphParentMap(graph) {
  const nodesById = new Map((graph.nodes || []).map((node, index) => [node.id, { node, index }]));
  const parents = new Map();
  const orderedLinks = (graph.links || []).slice().sort((a, b) => Number(!isTreeLink(a)) - Number(!isTreeLink(b)));
  orderedLinks.forEach((link) => {
    const source = nodesById.get(link.source);
    const target = nodesById.get(link.target);
    if (!source || !target) return;
    if (graphNodeLevel(source.node, source.index) < graphNodeLevel(target.node, target.index) && !parents.has(link.target)) {
      parents.set(link.target, link.source);
    }
  });
  return parents;
}

function graphChildrenMap(parents) {
  const children = new Map();
  parents.forEach((parentId, childId) => {
    if (!children.has(parentId)) children.set(parentId, []);
    children.get(parentId).push(childId);
  });
  return children;
}

function graphCanvasSize(graph) {
  const nodes = graph.nodes || [];
  if (!nodes.length) {
    return { width: GRAPH_WIDTH, height: GRAPH_HEIGHT, pixelHeight: 700, complex: false };
  }
  if (nodes.length > 220) {
    return {
      width: 3400,
      height: 2200,
      pixelHeight: 880,
      complex: true,
      nodeCount: nodes.length
    };
  }
  if (nodes.length > 90) {
    return {
      width: 2800,
      height: 1800,
      pixelHeight: 860,
      complex: true,
      nodeCount: nodes.length
    };
  }
  if (nodes.length > 40) {
    return {
      width: 2200,
      height: 1400,
      pixelHeight: 820,
      complex: true,
      nodeCount: nodes.length
    };
  }
  return {
    width: 1680,
    height: 980,
    pixelHeight: 790,
    complex: true,
    nodeCount: nodes.length
  };
}

function hashText(value) {
  let hash = 2166136261;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function graphNetworkRadius(node, index = 0, totalNodes = 0) {
  const level = graphNodeLevel(node, index);
  const dense = totalNodes > 220;
  const medium = totalNodes > 90;
  if (level === 0 || node.group === "root") return dense ? 58 : medium ? 62 : 66;
  if (level === 1 || node.group === "chapter") return dense ? 42 : medium ? 46 : 50;
  if (level === 2 || node.group === "concept" || node.group === "topic") return dense ? 34 : medium ? 38 : 42;
  return dense ? 30 : medium ? 34 : 36;
}

function clampGraphPoint(point, width, height, padding = 50) {
  point.x = clamp(point.x, padding, width - padding);
  point.y = clamp(point.y, padding, height - padding);
}

function defaultGraphScale(size) {
  if (!size.complex) return 0.72;
  if ((size.nodeCount || 0) > 220) return 0.82;
  if ((size.nodeCount || 0) > 90) return 0.9;
  if ((size.nodeCount || 0) > 40) return 0.98;
  return 1.08;
}

function defaultGraphOffset(size, scale) {
  if (!size.complex) return { x: 0, y: 0 };
  return {
    x: size.width * (1 / scale - 1) / 2,
    y: size.height * (1 / scale - 1) / 2
  };
}

function getComplexGraphPositions(graph, width, height, parents, children) {
  const nodes = graph.nodes || [];
  const totalNodes = nodes.length;
  const byId = new Map(nodes.map((node, index) => [node.id, { node, index }]));
  const linkEntries = (graph.links || [])
    .map((link, index) => ({ link, index, source: byId.get(link.source), target: byId.get(link.target) }))
    .filter((entry) => entry.source && entry.target);
  const positions = {};
  const anchors = {};
  const rootEntry = nodes
    .map((node, index) => ({ node, index }))
    .find((entry) => graphNodeLevel(entry.node, entry.index) === 0 || entry.node.group === "root") || { node: nodes[0], index: 0 };
  const childEntries = (id) => (children.get(id) || [])
    .map((childId) => byId.get(childId))
    .filter(Boolean);
  const chapters = rootEntry.node
    ? childEntries(rootEntry.node.id).filter((entry) => graphNodeLevel(entry.node, entry.index) <= 1)
    : [];
  const chapterEntries = chapters.length
    ? chapters
    : nodes.map((node, index) => ({ node, index })).filter((entry) => graphNodeLevel(entry.node, entry.index) === 1);
  const center = { x: width / 2, y: height / 2 + 8 };
  const chapterRadiusX = Math.max(430, width * 0.34);
  const chapterRadiusY = Math.max(310, height * 0.28);
  const sectionRadius = totalNodes > 90 ? 240 : 175;
  const detailRadius = totalNodes > 90 ? 118 : 88;

  if (rootEntry.node) {
    positions[rootEntry.node.id] = { ...center };
    anchors[rootEntry.node.id] = { ...center };
  }

  chapterEntries.forEach((chapterEntry, chapterIndex) => {
    const chapterAngle = -Math.PI / 2 + (chapterIndex / Math.max(1, chapterEntries.length)) * Math.PI * 2;
    const chapterAnchor = {
      x: center.x + Math.cos(chapterAngle) * chapterRadiusX,
      y: center.y + Math.sin(chapterAngle) * chapterRadiusY
    };
    positions[chapterEntry.node.id] = { ...chapterAnchor };
    anchors[chapterEntry.node.id] = { ...chapterAnchor };
    const sections = childEntries(chapterEntry.node.id).filter((entry) => graphNodeLevel(entry.node, entry.index) === 2);
    const effectiveSections = sections.length ? sections : childEntries(chapterEntry.node.id);

    effectiveSections.forEach((sectionEntry, sectionIndex) => {
      const spread = Math.max(1, effectiveSections.length);
      const localAngle = chapterAngle + ((sectionIndex - (spread - 1) / 2) / Math.max(2, spread)) * 1.6;
      const sectionAnchor = {
        x: chapterAnchor.x + Math.cos(localAngle) * sectionRadius,
        y: chapterAnchor.y + Math.sin(localAngle) * sectionRadius
      };
      positions[sectionEntry.node.id] = { ...sectionAnchor };
      anchors[sectionEntry.node.id] = { ...sectionAnchor };
      const details = childEntries(sectionEntry.node.id);
      details.forEach((detailEntry, detailIndex) => {
        const seed = hashText(detailEntry.node.id);
        const ringCapacity = totalNodes > 90 ? 8 : 7;
        const ring = Math.floor(detailIndex / ringCapacity);
        const ringIndex = detailIndex % ringCapacity;
        const detailAngle = localAngle + (ringIndex / ringCapacity) * Math.PI * 2 + (seed % 29) * 0.018 + ring * 0.23;
        const radius = detailRadius + ring * (totalNodes > 90 ? 66 : 52);
        positions[detailEntry.node.id] = {
          x: sectionAnchor.x + Math.cos(detailAngle) * radius,
          y: sectionAnchor.y + Math.sin(detailAngle) * radius
        };
        anchors[detailEntry.node.id] = { ...positions[detailEntry.node.id] };
      });
    });
  });

  let orphanIndex = 0;
  nodes.forEach((node, index) => {
    if (positions[node.id]) return;
    const seed = hashText(node.id);
    const angle = (orphanIndex / Math.max(1, nodes.length)) * Math.PI * 2 + (seed % 360) * Math.PI / 180;
    const radius = Math.max(width, height) * 0.28 + (seed % 220);
    positions[node.id] = {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius * 0.72
    };
    anchors[node.id] = { ...positions[node.id] };
    orphanIndex += 1;
  });

  nodes.forEach((node) => clampGraphPoint(positions[node.id], width, height));

  const relaxationIterations = totalNodes > 260 ? 70 : totalNodes > 140 ? 110 : 140;
  for (let iteration = 0; iteration < relaxationIterations; iteration += 1) {
    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      const pa = positions[a.id];
      if (!pa) continue;
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        const pb = positions[b.id];
        if (!pb) continue;
        const dx = pb.x - pa.x;
        const dy = pb.y - pa.y;
        const distance = Math.max(0.1, Math.hypot(dx, dy));
        const minDistance = graphNetworkRadius(a, i, totalNodes) + graphNetworkRadius(b, j, totalNodes) + (totalNodes > 90 ? 38 : 30);
        const ux = dx / distance;
        const uy = dy / distance;
        let push = 0;
        if (distance < minDistance) {
          push = (minDistance - distance) * 0.48;
        } else if (distance < minDistance * 1.45) {
          push = (minDistance * 1.45 - distance) * 0.035;
        }
        if (!push) continue;
        pb.x += ux * push;
        pb.y += uy * push;
        pa.x -= ux * push;
        pa.y -= uy * push;
      }
    }
    linkEntries.forEach(({ link, source, target }) => {
      const sourcePosition = positions[source.node.id];
      const targetPosition = positions[target.node.id];
      if (!sourcePosition || !targetPosition) return;
      const dx = targetPosition.x - sourcePosition.x;
      const dy = targetPosition.y - sourcePosition.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const desired = graphNetworkRadius(source.node, source.index, totalNodes)
        + graphNetworkRadius(target.node, target.index, totalNodes)
        + (isTreeLink(link) ? (totalNodes > 90 ? 210 : 155) : (totalNodes > 90 ? 290 : 220));
      const move = clamp((distance - desired) * 0.018, -8, 8);
      const ux = dx / distance;
      const uy = dy / distance;
      const sourceLevel = graphNodeLevel(source.node, source.index);
      const targetLevel = graphNodeLevel(target.node, target.index);
      const sourceWeight = sourceLevel === 0 ? 0.22 : 0.5;
      const targetWeight = targetLevel === 0 ? 0.22 : 0.5;
      sourcePosition.x += ux * move * sourceWeight;
      sourcePosition.y += uy * move * sourceWeight;
      targetPosition.x -= ux * move * targetWeight;
      targetPosition.y -= uy * move * targetWeight;
    });
    nodes.forEach((node) => {
      const position = positions[node.id];
      const anchor = anchors[node.id];
      if (!position || !anchor) return;
      const level = graphNodeLevel(node, byId.get(node.id)?.index || 0);
      const attraction = level === 0 ? 0.08 : level === 1 ? 0.035 : 0.014;
      position.x += (anchor.x - position.x) * attraction;
      position.y += (anchor.y - position.y) * attraction;
      clampGraphPoint(position, width, height, 90);
    });
  }

  return positions;
}

function getGraphView(graph) {
  const size = graphCanvasSize(graph);
  const width = size.width;
  const height = size.height;
  const nodes = graph.nodes || [];
  const signatureParts = nodes.map((node, index) => {
    const storedPosition = size.complex ? "" : `${node.x || ""}:${node.y || ""}`;
    return `${node.id}:${graphNodeLevel(node, index)}:${storedPosition}`;
  });
  const signature = `${GRAPH_LAYOUT_VERSION}:${width}:${height}:${signatureParts.join("|")}`;
  if (!state.graphViews[graph.id] || state.graphViews[graph.id].signature !== signature) {
    const scale = defaultGraphScale(size);
    const offset = defaultGraphOffset(size, scale);
    state.graphViews[graph.id] = { scale, offsetX: offset.x, offsetY: offset.y, positions: {}, signature };
  }
  const view = state.graphViews[graph.id];
  const parents = graphParentMap(graph);
  const children = graphChildrenMap(parents);
  if (size.complex) {
    const layoutPositions = getComplexGraphPositions(graph, width, height, parents, children);
    nodes.forEach((node) => {
      if (!view.positions[node.id] && layoutPositions[node.id]) view.positions[node.id] = layoutPositions[node.id];
    });
    return view;
  }
  const byLevel = new Map();
  nodes.forEach((node, index) => {
    const level = graphNodeLevel(node, index);
    if (!byLevel.has(level)) byLevel.set(level, []);
    byLevel.get(level).push({ node, index });
  });
  const maxLevel = Math.max(1, ...Array.from(byLevel.keys()));

  nodes.forEach((node, index) => {
    if (view.positions[node.id]) return;
    if (Number.isFinite(node.x) && Number.isFinite(node.y)) {
      view.positions[node.id] = { x: node.x, y: node.y };
      return;
    }
    const level = graphNodeLevel(node, index);
    const levelNodes = byLevel.get(level) || [];
    const levelIndex = levelNodes.findIndex((item) => item.node.id === node.id);
    const columnX = level === 0
      ? 96
      : 260 + ((width - 360) / Math.max(1, maxLevel - 1)) * (level - 1);
    let y = height / 2;
    const parentId = parents.get(node.id);
    const parentPosition = parentId ? view.positions[parentId] : null;
    if (level === 0) {
      y = height / 2;
    } else if (level === 1) {
      const step = (height - 160) / Math.max(1, levelNodes.length - 1);
      y = 80 + levelIndex * step;
    } else if (parentPosition) {
      const siblings = levelNodes.filter((item) => parents.get(item.node.id) === parentId);
      const siblingIndex = siblings.findIndex((item) => item.node.id === node.id);
      y = parentPosition.y + (siblingIndex - (siblings.length - 1) / 2) * graphSiblingSpacing(level);
    } else {
      const step = (height - 140) / Math.max(1, levelNodes.length - 1);
      y = 70 + levelIndex * step;
    }
    view.positions[node.id] = { x: columnX, y: clamp(y, 54, height - 54) };
  });
  return view;
}

function renderGraphViewer(graph) {
  return `
    <div class="graph-viewer" data-graph-viewer="${graph.id}">
      <div class="graph-toolbar">
        <button class="mini" data-graph-zoom="out">缩小</button>
        <button class="mini" data-graph-zoom="reset">重置</button>
        <button class="mini" data-graph-zoom="in">放大</button>
        <span>拖拽空白区域移动图谱，拖拽节点调整位置，双击节点查看知识点</span>
      </div>
      ${renderGraphSvg(graph)}
    </div>
  `;
}

function renderGraphSvg(graph) {
  const size = graphCanvasSize(graph);
  const width = size.width;
  const height = size.height;
  const links = graph.links || [];
  const nodes = graph.nodes || [];
  const view = getGraphView(graph);
  const positions = view.positions;
  const nodeEntriesById = new Map(nodes.map((node, index) => [node.id, { node, index }]));
  const renderedLinks = links
    .map((link, index) => ({ link, index }))
    .sort((a, b) => Number(!isTreeLink(a.link)) - Number(!isTreeLink(b.link)));
  return `
    <svg class="graph-svg network" data-graph-id="${graph.id}" viewBox="0 0 ${width} ${height}" style="height:${size.pixelHeight}px; min-height:${size.pixelHeight}px" role="img" aria-label="${escapeHtml(graph.title)}">
      <defs>
        <linearGradient id="nodeGrad" x1="0%" x2="100%">
          <stop offset="0%" stop-color="#247db2"></stop>
          <stop offset="100%" stop-color="#37a38b"></stop>
        </linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#13506f" flood-opacity="0.16"></feDropShadow>
        </filter>
      </defs>
      <g class="graph-viewport" transform="translate(${view.offsetX} ${view.offsetY}) scale(${view.scale})">
        ${renderedLinks.map(({ link, index }) => {
          const s = positions[link.source];
          const t = positions[link.target];
          if (!s || !t) return "";
          const sourceEntry = nodeEntriesById.get(link.source);
          const targetEntry = nodeEntriesById.get(link.target);
          const treeLink = isTreeLink(link);
          const linkPath = graphNetworkLinkPath(s, t, link, index, sourceEntry?.node, targetEntry?.node, nodes.length);
          return `
            <path data-link-index="${index}" data-link-source="${link.source}" data-link-target="${link.target}" d="${linkPath}" class="graph-link halo ${treeLink ? "tree" : "cross"}"></path>
            <path data-link-index="${index}" data-link-source="${link.source}" data-link-target="${link.target}" d="${linkPath}" class="graph-link ${treeLink ? "tree" : "cross"}"></path>
          `;
        }).join("")}
        ${nodes.map((node, index) => {
          const p = positions[node.id] || { x: width / 2, y: height / 2 };
          const root = index === 0 || node.group === "root";
          const level = graphNodeLevel(node, index);
          const radius = size.complex ? graphNetworkRadius(node, index, nodes.length) : graphNodeRadius(node, index);
          const groupClass = graphGroupClass(node.group);
          const label = String(node.label || "");
          const labelLines = graphInnerLabelLines(label, radius, root);
          const lineHeight = root ? 15 : radius >= 42 ? 13 : radius >= 34 ? 11 : 10;
          return `
            <g class="graph-node level-${level} ${groupClass}" data-node-id="${node.id}" transform="translate(${p.x},${p.y})" ${size.complex ? "" : `filter="url(#softShadow)"`}>
              <title>${escapeHtml(label)}</title>
              <circle r="${radius}" class="${root ? "root" : groupClass}"></circle>
              ${labelLines.map((line, lineIndex) => {
                const labelY = (lineIndex - (labelLines.length - 1) / 2) * lineHeight;
                return `<text x="0" y="${labelY}" class="inside label-center ${root ? "root" : ""}">${escapeHtml(line)}</text>`;
              }).join("")}
            </g>
          `;
        }).join("")}
        ${renderedLinks.map(({ link, index }) => {
          const s = positions[link.source];
          const t = positions[link.target];
          if (!s || !t) return "";
          const label = String(link.label || "关联");
          const treeLink = isTreeLink(link);
          const labelPoint = graphLinkLabelPoint(s, t, index, treeLink);
          const visibleLabel = graphVisibleLinkLabel(label);
          return `<text data-link-label="${index}" data-link-source="${link.source}" data-link-target="${link.target}" x="${labelPoint.x}" y="${labelPoint.y}" class="graph-link-label ${treeLink ? "tree" : "cross"}">${escapeHtml(visibleLabel)}</text>`;
        }).join("")}
      </g>
    </svg>
  `;
}

function renderGraphNodeModal() {
  if (!state.graphNodeModal) return "";
  const graph = state.data?.knowledgeGraphs?.find((item) => item.id === state.graphNodeModal.graphId);
  const node = graph?.nodes?.find((item) => item.id === state.graphNodeModal.nodeId);
  if (!graph || !node) return "";
  const context = graphNodeContext(graph, node);
  const points = enrichedNodePoints(graph, node, context);
  const childLabels = context.children.map((item) => item.label).slice(0, 12);
  const relationLines = context.relationLines.slice(0, 10);
  return `
    <div class="modal-backdrop">
      <section class="modal graph-node-modal">
        <button class="modal-close" id="closeGraphNodeModal">×</button>
        <h2>${escapeHtml(node.label)}</h2>
        <p class="hint">${escapeHtml(graph.title)} · ${escapeHtml(graph.subject)}</p>
        ${node.details ? `<p class="answer-box">${escapeHtml(node.details)}</p>` : ""}
        <div class="node-context-grid">
          <article>
            <strong>知识路径</strong>
            <p>${escapeHtml(context.path.map((item) => item.label).join(" / ") || node.label)}</p>
          </article>
          <article>
            <strong>上级节点</strong>
            <p>${escapeHtml(context.parent?.label || "当前为根节点")}</p>
          </article>
          <article>
            <strong>下级节点</strong>
            <p>${escapeHtml(childLabels.length ? childLabels.join("、") : "暂无下级节点，可结合本节点知识点复习。")}</p>
          </article>
          <article>
            <strong>关联数量</strong>
            <p>入边 ${context.incoming.length} 条，出边 ${context.outgoing.length} 条，跨章节 ${context.crossRelations.length} 条。</p>
          </article>
        </div>
        ${relationLines.length ? `
          <div class="node-relations">
            <h3>关系线说明</h3>
            ${relationLines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
          </div>
        ` : ""}
        <h3>知识点详情</h3>
        <div class="knowledge-point-list">
          ${points.map((point, index) => `<article><strong>${index + 1}</strong><p>${escapeHtml(point)}</p></article>`).join("")}
        </div>
      </section>
    </div>
  `;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function applyGraphTransform(svg, graphId) {
  const view = state.graphViews[graphId];
  const viewport = svg.querySelector(".graph-viewport");
  if (view && viewport) viewport.setAttribute("transform", `translate(${view.offsetX} ${view.offsetY}) scale(${view.scale})`);
}

function updateGraphDom(svg, graphId) {
  const view = state.graphViews[graphId];
  if (!view) return;
  const graph = state.data?.knowledgeGraphs?.find((item) => item.id === graphId);
  const graphNodes = graph?.nodes || [];
  const nodeEntriesById = new Map(graphNodes.map((node, index) => [node.id, { node, index }]));
  svg.querySelectorAll(".graph-node").forEach((nodeEl) => {
    const position = view.positions[nodeEl.dataset.nodeId];
    if (position) nodeEl.setAttribute("transform", `translate(${position.x},${position.y})`);
  });
  svg.querySelectorAll(".graph-link").forEach((line) => {
    const source = view.positions[line.dataset.linkSource];
    const target = view.positions[line.dataset.linkTarget];
    if (!source || !target) return;
    const index = Number(line.dataset.linkIndex || 0);
    const link = graph?.links?.[index] || { label: line.dataset.linkLabel || "" };
    const sourceEntry = nodeEntriesById.get(line.dataset.linkSource);
    const targetEntry = nodeEntriesById.get(line.dataset.linkTarget);
    line.setAttribute("d", graphNetworkLinkPath(source, target, link, index, sourceEntry?.node, targetEntry?.node, graphNodes.length));
  });
  svg.querySelectorAll(".graph-link-label").forEach((label) => {
    const source = view.positions[label.dataset.linkSource];
    const target = view.positions[label.dataset.linkTarget];
    if (!source || !target) return;
    const index = Number(label.dataset.linkLabel || 0);
    const link = graph?.links?.[index] || {};
    const point = graphLinkLabelPoint(source, target, index, isTreeLink(link));
    label.setAttribute("x", point.x);
    label.setAttribute("y", point.y);
  });
}

function uniqueTexts(items) {
  const seen = new Set();
  return items
    .map((item) => String(item || "").trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

function graphNodeContext(graph, node) {
  const nodesById = new Map((graph.nodes || []).map((item) => [item.id, item]));
  const parents = graphParentMap(graph);
  const children = graphChildrenMap(parents);
  const path = [];
  let currentId = node.id;
  const guard = new Set();
  while (currentId && !guard.has(currentId)) {
    guard.add(currentId);
    const current = nodesById.get(currentId);
    if (current) path.unshift(current);
    currentId = parents.get(currentId);
  }
  const childNodes = (children.get(node.id) || []).map((id) => nodesById.get(id)).filter(Boolean);
  const incoming = (graph.links || []).filter((link) => link.target === node.id);
  const outgoing = (graph.links || []).filter((link) => link.source === node.id);
  const crossRelations = incoming.concat(outgoing).filter((link) => !isTreeLink(link));
  const relationLines = incoming.concat(outgoing).map((link) => {
    const source = nodesById.get(link.source)?.label || link.source;
    const target = nodesById.get(link.target)?.label || link.target;
    return `${source} -> ${target}：${link.label || "关联"}`;
  });
  return {
    path,
    parent: path.length > 1 ? path[path.length - 2] : null,
    children: childNodes,
    incoming,
    outgoing,
    crossRelations,
    relationLines
  };
}

function enrichedNodePoints(graph, node, context) {
  const label = String(node.label || "该节点");
  const parentLabel = context.parent?.label || graph.subject || "当前图谱";
  const childLabels = context.children.map((item) => item.label).slice(0, 8);
  const relationSummary = context.relationLines.slice(0, 5).join("；");
  const generated = [
    context.path.length ? `知识路径：${context.path.map((item) => item.label).join(" / ")}。` : "",
    `学习定位：「${label}」属于「${parentLabel}」模块，复习时先明确它解决的问题，再看它与相邻节点的关系。`,
    childLabels.length ? `下级知识点：${childLabels.join("、")}。这些节点可作为展开复习和出题的直接入口。` : `该节点是当前分支的末级知识点，适合用定义、步骤、适用条件和典型题型四个角度复习。`,
    relationSummary ? `图谱关系：${relationSummary}。` : "",
    `掌握要求：能用自己的话解释「${label}」，能说明它和「${parentLabel}」的联系，并能举出一个教材或试题中的应用场景。`,
    `易错提醒：不要只记节点名称，要同时记录前提条件、数据流或控制流方向，以及它对性能、存储或执行过程的影响。`
  ];
  return uniqueTexts(generated.concat(node.knowledgePoints || [])).slice(0, 12);
}

function bindInteractiveGraph() {
  const svg = document.querySelector(".graph-svg");
  if (!svg) return;
  const graphId = svg.dataset.graphId;
  const graph = state.data.knowledgeGraphs.find((item) => item.id === graphId);
  if (!graph) return;
  const size = graphCanvasSize(graph);
  getGraphView(graph);

  document.querySelectorAll("[data-graph-zoom]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = state.graphViews[graphId];
      if (button.dataset.graphZoom === "in") view.scale = clamp(view.scale + 0.15, 0.35, 2.8);
      if (button.dataset.graphZoom === "out") view.scale = clamp(view.scale - 0.15, 0.35, 2.8);
      if (button.dataset.graphZoom === "reset") {
        view.scale = defaultGraphScale(size);
        const offset = defaultGraphOffset(size, view.scale);
        view.offsetX = offset.x;
        view.offsetY = offset.y;
        view.positions = {};
        getGraphView(graph);
        updateGraphDom(svg, graphId);
      }
      applyGraphTransform(svg, graphId);
    });
  });

  svg.addEventListener("wheel", (event) => {
    event.preventDefault();
    const view = state.graphViews[graphId];
    view.scale = clamp(view.scale + (event.deltaY < 0 ? 0.08 : -0.08), 0.35, 2.8);
    applyGraphTransform(svg, graphId);
  }, { passive: false });

  let dragged = null;
  let panning = null;
  svg.querySelectorAll(".graph-node").forEach((nodeEl) => {
    nodeEl.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      state.graphNodeModal = { graphId, nodeId: nodeEl.dataset.nodeId };
      renderContent();
    });
    nodeEl.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const view = state.graphViews[graphId];
      const start = view.positions[nodeEl.dataset.nodeId];
      dragged = {
        nodeId: nodeEl.dataset.nodeId,
        x: event.clientX,
        y: event.clientY,
        startX: start.x,
        startY: start.y,
        width: rect.width,
        height: rect.height
      };
      nodeEl.classList.add("dragging");
      nodeEl.setPointerCapture?.(event.pointerId);
    });
  });

  svg.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest(".graph-node")) return;
    event.preventDefault();
    const rect = svg.getBoundingClientRect();
    const view = state.graphViews[graphId];
    panning = {
      x: event.clientX,
      y: event.clientY,
      startOffsetX: view.offsetX,
      startOffsetY: view.offsetY,
      width: rect.width,
      height: rect.height
    };
    svg.classList.add("panning");
    svg.setPointerCapture?.(event.pointerId);
  });

  window.addEventListener("pointermove", (event) => {
    if (panning) {
      const view = state.graphViews[graphId];
      const dx = ((event.clientX - panning.x) * size.width) / panning.width / view.scale;
      const dy = ((event.clientY - panning.y) * size.height) / panning.height / view.scale;
      view.offsetX = panning.startOffsetX + dx;
      view.offsetY = panning.startOffsetY + dy;
      applyGraphTransform(svg, graphId);
      return;
    }
    if (!dragged) return;
    const view = state.graphViews[graphId];
    const dx = ((event.clientX - dragged.x) * size.width) / dragged.width / view.scale;
    const dy = ((event.clientY - dragged.y) * size.height) / dragged.height / view.scale;
    view.positions[dragged.nodeId] = {
      x: clamp(dragged.startX + dx, 90, size.width - 90),
      y: clamp(dragged.startY + dy, 90, size.height - 90)
    };
    updateGraphDom(svg, graphId);
  });

  window.addEventListener("pointerup", () => {
    if (panning) {
      svg.classList.remove("panning");
      panning = null;
    }
    if (!dragged) return;
    svg.querySelector(`[data-node-id="${CSS.escape(dragged.nodeId)}"]`)?.classList.remove("dragging");
    dragged = null;
  });
}

function stopGraphJobPolling() {
  if (state.graphJobTimer) clearTimeout(state.graphJobTimer);
  state.graphJobTimer = null;
}

function emptyGraphDraft() {
  return {
    subject: "",
    title: "",
    sourceText: "",
    extractor: DEFAULT_GRAPH_EXTRACTOR
  };
}

function captureGraphDraft(form) {
  const data = new FormData(form);
  const sourceTextControl = document.querySelector('textarea[name="sourceText"][form="generateGraphForm"]');
  state.graphDraft = {
    subject: String(data.get("subject") || ""),
    title: String(data.get("title") || ""),
    sourceText: String(data.get("sourceText") || sourceTextControl?.value || ""),
    extractor: String(data.get("extractor") || DEFAULT_GRAPH_EXTRACTOR)
  };
}

function clearGraphForms() {
  state.graphDraft = emptyGraphDraft();
  document.getElementById("generateGraphForm")?.reset();
  document.getElementById("importGraphForm")?.reset();
  const sourceText = document.querySelector('textarea[name="sourceText"][form="generateGraphForm"]');
  if (sourceText) sourceText.value = "";
}

function bindGraphProgressControls() {
  document.getElementById("cancelGraphJobBtn")?.addEventListener("click", cancelCurrentGraphGeneration);
}

function refreshGraphProgress() {
  if (state.page !== "graph") return;
  const mount = document.getElementById("graphProgressMount");
  if (!mount) {
    renderContent();
    return;
  }
  mount.innerHTML = renderGraphProgress();
  bindGraphProgressControls();
}

function graphCancelError() {
  return Object.assign(new Error("图谱生成已终止"), { canceled: true });
}

async function cancelCurrentGraphGeneration() {
  state.graphGenerationCanceled = true;
  stopGraphJobPolling();
  if (state.graphUploadAbort) state.graphUploadAbort.abort();
  const jobId = state.graphJob?.id;
  if (jobId && ["queued", "running"].includes(state.graphJob.status)) {
    try {
      const payload = await api(`/api/graphs/jobs/${jobId}/cancel`, { method: "POST", body: { userId: state.user.id } });
      state.graphJob = payload.job;
    } catch (error) {
      state.graphJob = {
        ...(state.graphJob || {}),
        status: "canceled",
        stage: "已终止",
        progress: Number(state.graphJob?.progress || 0),
        message: "已终止生成，当前表单内容已清空"
      };
    }
  } else {
    state.graphJob = {
      ...(state.graphJob || {}),
      status: "canceled",
      stage: "已终止",
      progress: Number(state.graphJob?.progress || 0),
      message: "已终止生成，当前表单内容已清空"
    };
  }
  state.graphUploadAbort = null;
  clearGraphForms();
  renderContent();
  showToast("已终止图谱生成");
}

async function pollGraphJob(jobId) {
  stopGraphJobPolling();
  const tick = async () => {
    try {
      const payload = await api(`/api/graphs/jobs/${jobId}`);
      state.graphJob = payload.job;
      if (payload.job.status === "complete") {
        state.selectedGraphId = payload.job.graphId;
        clearGraphForms();
        await loadState();
        renderShell();
        showToast("知识图谱已生成");
        return;
      }
      if (payload.job.status === "canceled") {
        clearGraphForms();
        refreshGraphProgress();
        showToast("已终止图谱生成");
        return;
      }
      if (payload.job.status === "failed") {
        refreshGraphProgress();
        showToast(payload.job.error || "图谱生成失败", "error");
        return;
      }
      refreshGraphProgress();
      state.graphJobTimer = setTimeout(tick, 700);
    } catch (error) {
      showToast(error.message, "error");
    }
  };
  state.graphJobTimer = setTimeout(tick, 500);
}

async function generateGraphFromUploadedFile({ file, subject, title, sourceText, sourceName, extractor }) {
  const chunkSize = 6 * 1024 * 1024;
  state.graphGenerationCanceled = false;
  state.graphUploadAbort = new AbortController();
  state.graphJob = {
    status: "running",
    stage: "上传文件",
    progress: 4,
    message: `准备分块上传 ${file.name}（${formatBytes(file.size)}），大文件请保持页面打开。`,
    meta: { sourceName: file.name, fileSize: file.size, extractor }
  };
  refreshGraphProgress();

  let started = null;
  try {
    started = await api("/api/uploads/start", {
      method: "POST",
      body: {
        userId: state.user.id,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        size: file.size
      }
    });

    const totalChunks = Math.ceil(file.size / chunkSize);
    let uploadedBytes = 0;
    for (let index = 0; index < totalChunks; index += 1) {
      if (state.graphGenerationCanceled) throw graphCancelError();
      const start = index * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const chunk = file.slice(start, end);
      const response = await fetch(`/api/uploads/${started.upload.id}/chunk?index=${index}&offset=${uploadedBytes}`, {
        method: "POST",
        headers: { "content-type": "application/octet-stream" },
        body: chunk,
        signal: state.graphUploadAbort.signal
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) throw new Error(payload.error || `第 ${index + 1} 个分块上传失败`);
      uploadedBytes = payload.upload.received;
      state.graphJob = {
        status: "running",
        stage: "上传文件",
        progress: Math.min(32, 4 + Math.floor((uploadedBytes / file.size) * 28)),
        message: `已上传 ${index + 1}/${totalChunks} 个分块，${formatBytes(uploadedBytes)} / ${formatBytes(file.size)}。`,
        meta: { sourceName: file.name, fileSize: file.size, extractor }
      };
      refreshGraphProgress();
    }

    if (state.graphGenerationCanceled) throw graphCancelError();
    state.graphJob = {
      status: "queued",
      stage: "等待解析",
      progress: 34,
      message: "文件上传完成，正在启动 PDF 智能体解析任务。",
      meta: { sourceName: file.name, fileSize: file.size, extractor }
    };
    refreshGraphProgress();

    const payload = await api("/api/graphs/generate-upload", {
      method: "POST",
      body: {
        userId: state.user.id,
        uploadId: started.upload.id,
        subject,
        title,
        sourceText,
        sourceName,
        extractor
      }
    });
    state.graphJob = payload.job;
    refreshGraphProgress();
    await pollGraphJob(payload.job.id);
  } catch (error) {
    if (error.name === "AbortError" || error.canceled || state.graphGenerationCanceled) throw graphCancelError();
    throw error;
  } finally {
    state.graphUploadAbort = null;
  }
}

function bindGraphPage() {
  bindInteractiveGraph();
  bindGraphProgressControls();
  const generateForm = document.getElementById("generateGraphForm");
  if (generateForm) {
    const syncDraft = () => captureGraphDraft(generateForm);
    generateForm.querySelectorAll("input, select").forEach((control) => {
      control.addEventListener("input", syncDraft);
      control.addEventListener("change", syncDraft);
    });
    document.querySelector('textarea[name="sourceText"][form="generateGraphForm"]')?.addEventListener("input", syncDraft);
  }
  document.getElementById("closeGraphNodeModal")?.addEventListener("click", () => {
    state.graphNodeModal = null;
    renderContent();
  });

  document.querySelectorAll("[data-select-graph]").forEach((card) => {
    card.addEventListener("click", () => {
      state.selectedGraphId = card.dataset.selectGraph;
      renderContent();
    });
    card.addEventListener("dblclick", () => {
      document.querySelector(".graph-canvas")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  document.querySelectorAll("[data-export-graph]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const graph = state.data.knowledgeGraphs.find((item) => item.id === button.dataset.exportGraph);
      if (graph) downloadJson(`${graph.title}.json`, graph);
    });
  });

  document.querySelectorAll("[data-delete-graph]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (!confirm("确认删除该图谱？")) return;
      try {
        await api(`/api/graphs/${button.dataset.deleteGraph}?userId=${state.user.id}`, { method: "DELETE" });
        state.selectedGraphId = null;
        await loadState();
        renderShell();
        showToast("图谱已删除");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });

  document.querySelectorAll("[data-global-graph]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      try {
        await api(`/api/graphs/${button.dataset.globalGraph}/upload-global`, { method: "POST", body: { userId: state.user.id } });
        await loadState();
        renderShell();
        showToast("已上传到总图谱");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });

  document.getElementById("studentGraphSubject")?.addEventListener("change", (event) => {
    state.graphSubject = event.target.value;
    state.selectedGraphId = null;
    renderContent();
  });

  document.getElementById("sampleGraphBtn")?.addEventListener("click", async () => {
    try {
      await api("/api/graphs/generate", {
        method: "POST",
        body: {
          userId: state.user.id,
          subject: state.user.subject || "物理",
          title: `${state.user.subject || "物理"}课堂示例知识图谱`,
          sourceText: "概念定义 核心公式 例题拆解 易错点 实验探究 综合应用"
        }
      });
      await loadState();
      clearGraphForms();
      renderShell();
      showToast("示例图谱已生成");
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  document.getElementById("generateGraphForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    captureGraphDraft(event.currentTarget);
    const form = new FormData(event.currentTarget);
    const file = form.get("book");
    let sourceText = String(state.graphDraft.sourceText || "");
    let sourceName = "";
    const extractor = String(form.get("extractor") || DEFAULT_GRAPH_EXTRACTOR);
    if (file && file.name) {
      sourceName = file.name;
    }
    const subject = String(form.get("subject") || "").trim();
    if (!subject) return showToast("请先输入学科名称", "error");
    const title = String(form.get("title") || `${subject}知识图谱`).trim();
    try {
      state.graphGenerationCanceled = false;
      if (file && file.name) {
        await generateGraphFromUploadedFile({
          file,
          subject,
          title,
          sourceText,
          sourceName,
          extractor
        });
        return;
      }
      state.graphJob = {
        status: "running",
        stage: "抽取知识点",
        progress: 45,
        message: "正在根据补充目录或知识点生成图谱"
      };
      refreshGraphProgress();
      const payload = await api("/api/graphs/generate", {
        method: "POST",
        body: {
          userId: state.user.id,
          subject,
          title,
          sourceName,
          sourceText,
          extractor
        }
      });
      state.graphJob = {
        status: "complete",
        stage: "生成完成",
        progress: 100,
        message: `图谱已生成：${payload.graph.nodes.length} 个节点，${payload.graph.links.length} 条关系`,
        graphId: payload.graph.id
      };
      state.selectedGraphId = payload.graph.id;
      clearGraphForms();
      await loadState();
      renderShell();
      showToast("知识图谱已生成");
    } catch (error) {
      if (error.canceled || state.graphGenerationCanceled) {
        state.graphJob = {
          ...(state.graphJob || {}),
          status: "canceled",
          stage: "已终止",
          progress: Number(state.graphJob?.progress || 0),
          message: "已终止生成，当前表单内容已清空"
        };
        clearGraphForms();
        renderContent();
        showToast("已终止图谱生成");
        return;
      }
      showToast(error.message, "error");
    }
  });

  document.getElementById("importGraphForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("graph");
    try {
      const text = await fileToText(file);
      const graph = JSON.parse(text);
      const subject = String(form.get("subject") || graph.subject || "通用").trim();
      const payload = await api("/api/graphs/import", {
        method: "POST",
        body: {
          userId: state.user.id,
          subject,
          title: form.get("title"),
          sourceName: file.name,
          graph
        }
      });
      state.selectedGraphId = payload.graph.id;
      clearGraphForms();
      await loadState();
      renderShell();
      showToast("图谱导入成功");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

function renderAiPage() {
  const isTeacher = state.user.role === "teacher";
  const conversations = state.data.conversations || [];
  const active = conversations.find((conv) => conv.id === state.activeConversationId) || conversations[0];
  if (active && !state.activeConversationId) state.activeConversationId = active.id;
  const modeItems = isTeacher
    ? [
      { key: "explain", label: "讲解策略" },
      { key: "questions", label: "知识点出题" },
      { key: "plan", label: "教学方案" }
    ]
    : [
      { key: "explain", label: "问题解答" },
      { key: "questions", label: "知识点出题" },
      { key: "plan", label: "学习方向" }
    ];
  return `
    <div class="page-head">
      <div>
        <h2>${isTeacher ? "✨ 教学指导" : "☁️ 发起对话"}</h2>
        <p>${isTeacher ? "根据教师提问生成讲解策略、练习题和教学方案，并自动写入历史对话。" : "根据学生提问答疑、出题并规划学习方向，对话可在历史中回看。"} </p>
      </div>
      <button id="newConversationBtn" class="primary">新建对话</button>
    </div>
    <div class="chat-layout">
      <aside class="conversation-list">
        ${conversations.map((conv) => `
          <button class="${active?.id === conv.id ? "active" : ""}" data-conversation="${conv.id}">
            <strong>${escapeHtml(conv.title || "新的对话")}</strong>
            <span>${fmtTime(conv.updatedAt)}</span>
          </button>
        `).join("") || emptyBlock("暂无历史对话")}
      </aside>
      <section class="panel chat-panel">
        <div class="segmented">
          ${modeItems.map((item) => `<button class="${state.aiMode === item.key ? "active" : ""}" data-ai-mode="${item.key}">${item.label}</button>`).join("")}
        </div>
        <div class="message-stream" id="aiMessages">
          ${(active?.messages || []).map((message) => `
            <div class="bubble ${message.role}">
              <span>${message.role === "assistant" ? "AI" : "我"}</span>
              <p>${escapeHtml(message.content)}</p>
            </div>
          `).join("") || `<div class="bubble assistant"><span>AI</span><p>${isTeacher ? "输入知识点或课堂问题，我会生成可执行的教学建议。" : "输入你的学习问题，我会给出分步骤指导。"}</p></div>`}
        </div>
        <form id="aiForm" class="composer">
          <input name="prompt" placeholder="${isTeacher ? "例如：牛顿第二定律如何讲得更容易理解" : "例如：我不会判断运动学题该用哪个公式"}" />
          <button class="primary" type="submit">发送</button>
        </form>
      </section>
    </div>
  `;
}

function bindAiPage() {
  document.querySelectorAll("[data-ai-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.aiMode = button.dataset.aiMode;
      renderContent();
    });
  });
  document.querySelectorAll("[data-conversation]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeConversationId = button.dataset.conversation;
      renderContent();
    });
  });
  document.getElementById("newConversationBtn")?.addEventListener("click", async () => {
    try {
      const payload = await api("/api/conversations", {
        method: "POST",
        body: { userId: state.user.id, mode: state.aiMode, title: "新的对话" }
      });
      state.activeConversationId = payload.conversation.id;
      await loadState();
      renderShell();
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  const stream = document.getElementById("aiMessages");
  if (stream) stream.scrollTop = stream.scrollHeight;
  document.getElementById("aiForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const prompt = String(form.get("prompt") || "").trim();
    if (!prompt) return;
    try {
      const payload = await api("/api/ai/chat", {
        method: "POST",
        body: {
          userId: state.user.id,
          conversationId: state.activeConversationId,
          mode: state.aiMode,
          prompt
        }
      });
      state.activeConversationId = payload.conversation.id;
      await loadState();
      renderShell();
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

function renderHistoryPage() {
  const conversations = state.data.conversations || [];
  const active = conversations.find((conv) => conv.id === state.activeConversationId) || conversations[0];
  return `
    <div class="page-head">
      <div>
        <h2>💬 历史对话</h2>
        <p>所有教学指导和学习对话都会按账号保存，新建对话后也可以在这里回看和继续。</p>
      </div>
    </div>
    <div class="chat-layout">
      <aside class="conversation-list">
        ${conversations.map((conv) => `
          <button class="${active?.id === conv.id ? "active" : ""}" data-history-conversation="${conv.id}">
            <strong>${escapeHtml(conv.title || "新的对话")}</strong>
            <span>${fmtTime(conv.updatedAt)} · ${escapeHtml(conv.mode)}</span>
          </button>
        `).join("") || emptyBlock("暂无历史对话")}
      </aside>
      <section class="panel chat-panel">
        ${active ? `
          <div class="split-head">
            <h3>${escapeHtml(active.title || "新的对话")}</h3>
            <div class="actions">
              <button class="primary" id="continueConversationBtn">继续对话</button>
              <button class="danger" id="deleteConversationBtn">删除</button>
            </div>
          </div>
          <div class="message-stream">
            ${active.messages.map((message) => `
              <div class="bubble ${message.role}">
                <span>${message.role === "assistant" ? "AI" : "我"}</span>
                <p>${escapeHtml(message.content)}</p>
              </div>
            `).join("")}
          </div>
        ` : emptyBlock("选择一条历史对话查看详情。")}
      </section>
    </div>
  `;
}

function bindHistoryPage() {
  document.querySelectorAll("[data-history-conversation]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeConversationId = button.dataset.historyConversation;
      renderContent();
    });
  });
  document.getElementById("continueConversationBtn")?.addEventListener("click", () => {
    state.page = "ai";
    renderShell();
  });
  document.getElementById("deleteConversationBtn")?.addEventListener("click", async () => {
    if (!state.activeConversationId || !confirm("确认删除这条对话？")) return;
    try {
      await api(`/api/conversations/${state.activeConversationId}?userId=${state.user.id}`, { method: "DELETE" });
      state.activeConversationId = null;
      await loadState();
      renderShell();
      showToast("历史对话已删除");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

function renderModelPage() {
  const models = (state.data.models || []).filter((model) => model.subject === state.modelSubject);
  const selected = state.modelComponents.find((item) => item.id === state.selectedComponentId);
  return `
    <div class="page-head">
      <div>
        <h2>🧠 模型显示</h2>
        <p>选择学科后拖拉组件模拟真实或理想状态，模型可保存、下载或从账号删除。</p>
      </div>
      <div class="inline-controls">
        <label>学科<select id="modelSubject">${subjectOptions(state.modelSubject)}</select></label>
        <div class="segmented compact">
          <button class="${state.modelMode === "ideal" ? "active" : ""}" data-model-mode="ideal">理想状态</button>
          <button class="${state.modelMode === "real" ? "active" : ""}" data-model-mode="real">真实状态</button>
        </div>
      </div>
    </div>
    <div class="model-layout">
      <section class="panel palette-panel">
        <h3>组件库</h3>
        <div class="palette">
          ${componentPalette.map((item) => `
            <button draggable="true" class="palette-item" data-component-type="${item.type}" title="拖入画布">
              <span>${item.icon}</span>${item.label}
            </button>
          `).join("")}
        </div>
        <form id="saveModelForm" class="stack">
          <label>模型名称<input name="name" value="${escapeHtml(models.find((model) => model.id === state.loadedModelId)?.name || "")}" placeholder="例如：斜面小车运动模型" /></label>
          <label>说明<textarea name="notes" rows="3" placeholder="记录参数、题目来源或使用场景"></textarea></label>
          <button class="primary" type="submit">保存模型</button>
          <button class="ghost" type="button" id="downloadDraftModel">下载当前模型</button>
          <button class="ghost" type="button" id="clearModelCanvas">清空画布</button>
        </form>
      </section>
      <section class="panel model-canvas-panel">
        <div class="split-head">
          <h3>${escapeHtml(state.modelSubject)}模型画布 · ${state.modelMode === "ideal" ? "理想状态" : "真实状态"}</h3>
          <span>将左侧组件拖到画布中，可继续拖动调整位置。</span>
        </div>
        <div id="modelCanvas" class="model-canvas">
          <div class="axis-line x"></div>
          <div class="axis-line y"></div>
          ${state.modelComponents.map((item) => renderModelComponent(item)).join("")}
        </div>
        <div class="inspector">
          ${selected ? `
            <strong>当前组件：${escapeHtml(selected.label)}</strong>
            <div class="property-grid">
              ${Object.entries(selected.props || {}).map(([key, value]) => `
                <label>${escapeHtml(key)}<input data-prop-key="${escapeHtml(key)}" value="${escapeHtml(value)}" /></label>
              `).join("")}
            </div>
            <button class="danger" id="deleteComponentBtn">删除组件</button>
          ` : `<span>选中组件后可编辑参数。</span>`}
        </div>
      </section>
      <section class="panel saved-models">
        <h3>已保存模型</h3>
        <div class="saved-list">
          ${models.map((model) => `
            <article class="list-card">
              <div>
                <h3>${escapeHtml(model.name)}</h3>
                <p>${escapeHtml(model.mode === "real" ? "真实状态" : "理想状态")} · ${model.components.length} 个组件</p>
                <small>${fmtTime(model.updatedAt)}</small>
              </div>
              <div class="row-actions">
                <button class="mini" data-load-model="${model.id}">载入</button>
                <button class="mini" data-download-model="${model.id}">下载</button>
                <button class="mini danger" data-delete-model="${model.id}">删除</button>
              </div>
            </article>
          `).join("") || emptyBlock("当前学科还没有保存模型。")}
        </div>
      </section>
    </div>
  `;
}

function renderModelComponent(item) {
  return `
    <button class="model-node ${state.selectedComponentId === item.id ? "active" : ""}" style="left:${item.x}%; top:${item.y}%;" data-node-id="${item.id}" title="${escapeHtml(item.label)}">
      <span>${escapeHtml(item.icon)}</span>
      <small>${escapeHtml(item.label)}</small>
    </button>
  `;
}

function bindModelPage() {
  document.getElementById("modelSubject")?.addEventListener("change", (event) => {
    state.modelSubject = event.target.value;
    state.modelComponents = [];
    state.selectedComponentId = null;
    state.loadedModelId = null;
    renderContent();
  });
  document.querySelectorAll("[data-model-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.modelMode = button.dataset.modelMode;
      renderContent();
    });
  });
  document.querySelectorAll("[data-component-type]").forEach((button) => {
    button.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", button.dataset.componentType);
    });
  });
  const canvas = document.getElementById("modelCanvas");
  canvas?.addEventListener("dragover", (event) => event.preventDefault());
  canvas?.addEventListener("drop", (event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData("text/plain");
    const meta = componentPalette.find((item) => item.type === type);
    if (!meta) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(4, Math.min(92, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(8, Math.min(88, ((event.clientY - rect.top) / rect.height) * 100));
    const component = {
      id: `cmp_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      type: meta.type,
      icon: meta.icon,
      label: meta.label,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      props: { ...meta.defaults }
    };
    state.modelComponents.push(component);
    state.selectedComponentId = component.id;
    renderContent();
  });
  document.querySelectorAll("[data-node-id]").forEach((node) => {
    node.addEventListener("click", () => {
      state.selectedComponentId = node.dataset.nodeId;
      renderContent();
    });
    node.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      state.selectedComponentId = node.dataset.nodeId;
      const target = state.modelComponents.find((item) => item.id === node.dataset.nodeId);
      const rect = canvas.getBoundingClientRect();
      const move = (moveEvent) => {
        const x = Math.max(4, Math.min(92, ((moveEvent.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(8, Math.min(88, ((moveEvent.clientY - rect.top) / rect.height) * 100));
        target.x = Number(x.toFixed(2));
        target.y = Number(y.toFixed(2));
        node.style.left = `${target.x}%`;
        node.style.top = `${target.y}%`;
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        renderContent();
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    });
  });
  document.querySelectorAll("[data-prop-key]").forEach((input) => {
    input.addEventListener("change", () => {
      const selected = state.modelComponents.find((item) => item.id === state.selectedComponentId);
      if (selected) selected.props[input.dataset.propKey] = input.value;
    });
  });
  document.getElementById("deleteComponentBtn")?.addEventListener("click", () => {
    state.modelComponents = state.modelComponents.filter((item) => item.id !== state.selectedComponentId);
    state.selectedComponentId = null;
    renderContent();
  });
  document.getElementById("clearModelCanvas")?.addEventListener("click", () => {
    state.modelComponents = [];
    state.selectedComponentId = null;
    state.loadedModelId = null;
    renderContent();
  });
  document.getElementById("downloadDraftModel")?.addEventListener("click", () => {
    downloadJson(`${state.modelSubject}-模型草稿.json`, {
      name: "未命名模型",
      subject: state.modelSubject,
      mode: state.modelMode,
      components: state.modelComponents
    });
  });
  document.getElementById("saveModelForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    if (!name) return showToast("请填写模型名称", "error");
    try {
      const payload = await api("/api/models", {
        method: "POST",
        body: {
          id: state.loadedModelId,
          userId: state.user.id,
          name,
          subject: state.modelSubject,
          mode: state.modelMode,
          components: state.modelComponents,
          notes: form.get("notes")
        }
      });
      state.loadedModelId = payload.model.id;
      await loadState();
      renderShell();
      showToast("模型已保存");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.querySelectorAll("[data-load-model]").forEach((button) => {
    button.addEventListener("click", () => {
      const model = state.data.models.find((item) => item.id === button.dataset.loadModel);
      if (!model) return;
      state.loadedModelId = model.id;
      state.modelSubject = model.subject;
      state.modelMode = model.mode;
      state.modelComponents = JSON.parse(JSON.stringify(model.components || []));
      state.selectedComponentId = null;
      renderContent();
    });
  });
  document.querySelectorAll("[data-download-model]").forEach((button) => {
    button.addEventListener("click", () => {
      const model = state.data.models.find((item) => item.id === button.dataset.downloadModel);
      if (model) downloadJson(`${model.name}.json`, model);
    });
  });
  document.querySelectorAll("[data-delete-model]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("确认从当前账号删除该模型？")) return;
      try {
        await api(`/api/models/${button.dataset.deleteModel}?userId=${state.user.id}`, { method: "DELETE" });
        if (state.loadedModelId === button.dataset.deleteModel) state.loadedModelId = null;
        await loadState();
        renderShell();
        showToast("模型已删除");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
}

function renderChatPage() {
  const threads = state.data.chatThreads || [];
  const active = threads.find((thread) => thread.id === state.activeThreadId) || threads[0];
  const friends = state.data.friends || [];
  if (active && !state.activeThreadId) state.activeThreadId = active.id;
  return `
    <div class="page-head">
      <div>
        <h2>☁️ 聊天信息</h2>
        <p>可以按学生或老师的 ID、姓名添加好友，发起私聊或群聊，并删除选中的聊天记录。</p>
      </div>
    </div>
    <div class="chat-layout wide">
      <aside class="panel contact-panel">
        <h3>添加好友</h3>
        <form id="addFriendForm" class="inline-form">
          <input name="target" placeholder="输入 ID 或姓名" />
          <button class="primary" type="submit">添加</button>
        </form>
        <form id="searchUserForm" class="inline-form">
          <input name="query" placeholder="搜索用户" />
          <button class="ghost" type="submit">搜索</button>
        </form>
        <div class="search-results">
          ${state.searchResults.map((user) => `
            <button data-add-result="${user.id}">${escapeHtml(user.name)} · ${user.id} · ${roleName(user.role)}</button>
          `).join("")}
        </div>
        <h3>好友</h3>
        <div class="contact-list">
          ${friends.map((friend) => `
            <div class="contact-row">
              <button data-open-friend="${friend.id}">${escapeHtml(friend.name)}<span>${friend.id}</span></button>
              <button class="icon-danger" data-delete-friend="${friend.id}" title="删除好友">×</button>
            </div>
          `).join("") || emptyBlock("暂无好友")}
        </div>
        <h3>创建群聊</h3>
        <form id="groupForm" class="stack">
          <input name="name" placeholder="群聊名称" />
          <div class="check-list">
            ${friends.map((friend) => `<label><input type="checkbox" name="member" value="${friend.id}" />${escapeHtml(friend.name)}</label>`).join("") || `<span class="hint">添加好友后可创建群聊</span>`}
          </div>
          <button class="primary" type="submit">创建群聊</button>
        </form>
      </aside>
      <aside class="conversation-list">
        ${threads.map((thread) => `
          <button class="${active?.id === thread.id ? "active" : ""}" data-thread="${thread.id}">
            <strong>${escapeHtml(thread.name)}</strong>
            <span>${thread.type === "group" ? "群聊" : "私聊"} · ${thread.messages.length} 条</span>
          </button>
        `).join("") || emptyBlock("暂无聊天")}
      </aside>
      <section class="panel chat-panel">
        ${active ? `
          <div class="split-head">
            <h3>${escapeHtml(active.name)}</h3>
            <button class="danger" id="deleteSelectedMessages">删除选中记录</button>
          </div>
          <div class="message-stream">
            ${active.messages.map((message) => {
              const from = state.data.users.find((user) => user.id === message.fromUserId);
              const mine = message.fromUserId === state.user.id;
              return `
                <label class="chat-message ${mine ? "mine" : ""}">
                  <input type="checkbox" data-message-check="${message.id}" ${state.selectedMessages.has(message.id) ? "checked" : ""} />
                  <span>${escapeHtml(from?.name || message.fromUserId)}</span>
                  <p>${escapeHtml(message.content)}</p>
                </label>
              `;
            }).join("") || `<div class="bubble assistant"><span>系统</span><p>还没有消息。</p></div>`}
          </div>
          <form id="chatForm" class="composer">
            <input name="content" placeholder="输入聊天内容" />
            <button class="primary" type="submit">发送</button>
          </form>
        ` : emptyBlock("添加好友或创建群聊后即可开始聊天。")}
      </section>
    </div>
  `;
}

function bindChatPage() {
  document.getElementById("addFriendForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/friends", { method: "POST", body: { userId: state.user.id, target: form.get("target") } });
      await loadState();
      renderShell();
      showToast("好友已添加");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.getElementById("searchUserForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const payload = await api(`/api/users/search?userId=${state.user.id}&query=${encodeURIComponent(form.get("query") || "")}`);
      state.searchResults = payload.users;
      renderContent();
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.querySelectorAll("[data-add-result]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await api("/api/friends", { method: "POST", body: { userId: state.user.id, target: button.dataset.addResult } });
        state.searchResults = [];
        await loadState();
        renderShell();
        showToast("好友已添加");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
  document.querySelectorAll("[data-open-friend]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await api("/api/friends", { method: "POST", body: { userId: state.user.id, target: button.dataset.openFriend } });
        await loadState();
        const thread = state.data.chatThreads.find((item) => item.type === "direct" && item.memberIds.includes(button.dataset.openFriend));
        if (thread) state.activeThreadId = thread.id;
        renderShell();
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
  document.querySelectorAll("[data-delete-friend]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("确认删除该好友？聊天线程会保留，但好友关系会解除。")) return;
      try {
        await api(`/api/friends/${button.dataset.deleteFriend}?userId=${state.user.id}`, { method: "DELETE" });
        await loadState();
        renderShell();
        showToast("好友已删除");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
  document.querySelectorAll("[data-thread]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeThreadId = button.dataset.thread;
      state.selectedMessages.clear();
      renderContent();
    });
  });
  document.querySelectorAll("[data-message-check]").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) state.selectedMessages.add(input.dataset.messageCheck);
      else state.selectedMessages.delete(input.dataset.messageCheck);
    });
  });
  document.getElementById("chatForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const content = String(form.get("content") || "").trim();
    if (!content) return;
    try {
      await api("/api/chat/messages", {
        method: "POST",
        body: { threadId: state.activeThreadId, fromUserId: state.user.id, content }
      });
      await loadState();
      renderShell();
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.getElementById("deleteSelectedMessages")?.addEventListener("click", async () => {
    if (!state.selectedMessages.size) return showToast("请先选择要删除的记录", "error");
    try {
      await api("/api/chat/messages", {
        method: "DELETE",
        body: { threadId: state.activeThreadId, userId: state.user.id, messageIds: Array.from(state.selectedMessages) }
      });
      state.selectedMessages.clear();
      await loadState();
      renderShell();
      showToast("已删除选中的聊天记录");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.getElementById("groupForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const memberIds = form.getAll("member");
    try {
      const payload = await api("/api/chat/groups", {
        method: "POST",
        body: { ownerId: state.user.id, name: form.get("name") || "新的群聊", memberIds }
      });
      state.activeThreadId = payload.thread.id;
      await loadState();
      renderShell();
      showToast("群聊已创建");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

function renderClassPage() {
  if (state.user.role !== "teacher") return emptyBlock("学生端不显示班级管理。");
  const classes = state.data.classes || [];
  const active = classes.find((klass) => klass.id === state.selectedClassId) || classes[0];
  if (active && !state.selectedClassId) state.selectedClassId = active.id;
  const students = active ? active.studentIds.map((id) => state.data.users.find((user) => user.id === id)).filter(Boolean) : [];
  return `
    <div class="page-head">
      <div>
        <h2>🏫 班级管理</h2>
        <p>教师可按学科创建多个班级，导入学生信息并处理学生申请；名单匹配会自动通过，不匹配则添加到班级。</p>
      </div>
    </div>
    <div class="grid two">
      <section class="panel">
        <h3>创建班级</h3>
        <form id="createClassForm" class="stack">
          <div class="form-grid">
            <label>班级名称<input name="name" placeholder="例如：高一 3 班" /></label>
            <label>学科<select name="subject">${subjectOptions(state.user.subject || "物理")}</select></label>
          </div>
          <button class="primary" type="submit">创建班级</button>
        </form>
        <div class="class-tabs">
          ${classes.map((klass) => `<button class="${active?.id === klass.id ? "active" : ""}" data-class="${klass.id}">${escapeHtml(klass.name)}<span>${escapeHtml(klass.subject)}</span></button>`).join("") || emptyBlock("暂无班级")}
        </div>
      </section>
      <section class="panel">
        <h3>导入学生信息</h3>
        ${active ? `
          <form id="importStudentsForm" class="stack">
            <p class="hint">每行一名学生，格式：姓名,8位ID。没有账号的学生会创建占位账号，默认密码 123456。</p>
            <textarea name="students" rows="7" placeholder="张三,20261234&#10;李四,20262345"></textarea>
            <button class="primary" type="submit">导入到 ${escapeHtml(active.name)}</button>
          </form>
        ` : emptyBlock("请先创建或选择班级。")}
      </section>
    </div>
    <section class="panel">
      ${active ? `
        <div class="split-head">
          <h3>${escapeHtml(active.name)} · ${escapeHtml(active.subject)}</h3>
          <span>邀请码：${escapeHtml(active.inviteCode)} · 学生 ${students.length} 人</span>
        </div>
        <div class="grid two">
          <div>
            <h3>学生名单</h3>
            <div class="table-list">
              ${students.map((student) => `<div><span>${escapeHtml(student.name)}</span><span>${student.id}</span><span>${escapeHtml(student.className || active.name)}</span></div>`).join("") || emptyBlock("暂无学生")}
            </div>
          </div>
          <div>
            <h3>申请记录</h3>
            <div class="table-list">
              ${(active.applications || []).map((item) => `<div><span>${escapeHtml(item.studentName)}</span><span>${escapeHtml(item.status)}</span><span>${escapeHtml(item.reason)}</span></div>`).join("") || emptyBlock("暂无申请")}
            </div>
          </div>
        </div>
      ` : emptyBlock("请选择班级。")}
    </section>
  `;
}

function bindClassPage() {
  document.getElementById("createClassForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const payload = await api("/api/classes", {
        method: "POST",
        body: { teacherId: state.user.id, name: form.get("name"), subject: form.get("subject") }
      });
      state.selectedClassId = payload.class.id;
      await loadState();
      renderShell();
      showToast("班级已创建");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.querySelectorAll("[data-class]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedClassId = button.dataset.class;
      renderContent();
    });
  });
  document.getElementById("importStudentsForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rows = String(form.get("students") || "").split(/\r?\n/).map((line) => {
      const [name, id] = line.split(/[,，\s]+/).map((item) => item?.trim());
      return { name, id };
    }).filter((row) => row.name || row.id);
    try {
      const payload = await api(`/api/classes/${state.selectedClassId}/import-students`, {
        method: "POST",
        body: { teacherId: state.user.id, students: rows }
      });
      await loadState();
      renderShell();
      showToast(`已导入 ${payload.added.length} 名学生`);
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

function renderTeacherHomeworkPage() {
  const classes = state.data.classes || [];
  const activeClassId = state.selectedClassId || classes[0]?.id || "";
  const homework = (state.data.homework || []).filter((item) => !activeClassId || item.classId === activeClassId);
  const submissions = state.data.submissions || [];
  return `
    <div class="page-head">
      <div>
        <h2>✏️ 作业管理</h2>
        <p>教师可布置文字、图片、视频作业和参考答案，学生提交后支持 AI 批改与手动批改。</p>
      </div>
    </div>
    <div class="grid two">
      <section class="panel">
        <h3>布置作业</h3>
        <form id="createHomeworkForm" class="stack">
          <label>班级<select name="classId">${classes.map((klass) => `<option value="${klass.id}" ${klass.id === activeClassId ? "selected" : ""}>${escapeHtml(klass.name)} · ${escapeHtml(klass.subject)}</option>`).join("")}</select></label>
          <label>标题<input name="title" placeholder="作业标题" /></label>
          <label>作业内容<textarea name="description" rows="4" placeholder="可填写文字说明"></textarea></label>
          <label>上传作业图片/视频<input name="attachments" type="file" multiple accept="image/*,video/*" /></label>
          <label>参考答案<textarea name="answer" rows="4" placeholder="用于 AI 批改匹配"></textarea></label>
          <button class="primary" type="submit">发布作业</button>
        </form>
      </section>
      <section class="panel">
        <div class="split-head">
          <h3>已发布作业</h3>
          <label class="compact-label">班级<select id="homeworkClassSelect">${classes.map((klass) => `<option value="${klass.id}" ${klass.id === activeClassId ? "selected" : ""}>${escapeHtml(klass.name)}</option>`).join("")}</select></label>
        </div>
        <div class="saved-list">
          ${homework.map((item) => `
            <article class="list-card">
              <div>
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.description).slice(0, 80) || "无文字说明"}</p>
                <small>${fmtTime(item.createdAt)} · 提交 ${submissions.filter((sub) => sub.homeworkId === item.id).length} 份</small>
              </div>
            </article>
          `).join("") || emptyBlock("该班级暂无作业")}
        </div>
      </section>
    </div>
    <section class="panel">
      <h3>提交与批改</h3>
      <div class="submission-grid">
        ${homework.flatMap((item) => submissions.filter((sub) => sub.homeworkId === item.id).map((sub) => renderSubmissionCard(item, sub))).join("") || emptyBlock("暂无学生提交。")}
      </div>
    </section>
    ${state.homeworkModal ? renderSubmissionModal() : ""}
  `;
}

function renderSubmissionCard(homework, submission) {
  const student = state.data.users.find((user) => user.id === submission.studentId);
  return `
    <article class="submission-card">
      <h3>${escapeHtml(homework.title)}</h3>
      <p>${escapeHtml(student?.name || submission.studentId)} · ${submission.status === "graded" ? `已批改 ${submission.score} 分` : "待批改"}</p>
      <small>${fmtTime(submission.updatedAt)}</small>
      <div class="actions">
        <button class="mini" data-view-submission="${submission.id}">查看/手动批改</button>
        <button class="mini primary" data-ai-grade="${submission.id}">AI 批改</button>
      </div>
    </article>
  `;
}

function renderSubmissionModal() {
  const submission = state.data.submissions.find((item) => item.id === state.homeworkModal);
  if (!submission) return "";
  const homework = state.data.homework.find((item) => item.id === submission.homeworkId);
  const student = state.data.users.find((user) => user.id === submission.studentId);
  return `
    <div class="modal-backdrop">
      <section class="modal large">
        <button class="modal-close" id="closeSubmissionModal">×</button>
        <h2>手动批改 · ${escapeHtml(homework?.title || "")}</h2>
        <div class="review-layout">
          <div>
            <h3>学生答案</h3>
            <p class="answer-box">${escapeHtml(submission.answerText || "未填写文字答案")}</p>
            ${renderAttachments(submission.attachments)}
          </div>
          <form id="manualGradeForm" class="stack">
            <p>学生：${escapeHtml(student?.name || submission.studentId)}</p>
            <label>分数<input name="score" type="number" min="0" max="100" value="${submission.score ?? ""}" /></label>
            <label>评语<textarea name="comment" rows="5">${escapeHtml(submission.comment || "")}</textarea></label>
            <button class="primary" type="submit">保存手动批改</button>
          </form>
        </div>
      </section>
    </div>
  `;
}

function bindTeacherHomeworkPage() {
  document.getElementById("homeworkClassSelect")?.addEventListener("change", (event) => {
    state.selectedClassId = event.target.value;
    renderContent();
  });
  document.getElementById("createHomeworkForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const files = form.getAll("attachments").filter((file) => file && file.name);
    try {
      const attachments = await Promise.all(files.map(fileToPayload));
      const payload = await api("/api/homework", {
        method: "POST",
        body: {
          teacherId: state.user.id,
          classId: form.get("classId"),
          title: form.get("title"),
          description: form.get("description"),
          answer: form.get("answer"),
          attachments
        }
      });
      state.selectedClassId = payload.homework.classId;
      await loadState();
      renderShell();
      showToast("作业已发布");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.querySelectorAll("[data-ai-grade]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await api(`/api/submissions/${button.dataset.aiGrade}/ai-grade`, { method: "POST", body: { teacherId: state.user.id } });
        await loadState();
        renderShell();
        showToast("AI 批改完成");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
  document.querySelectorAll("[data-view-submission]").forEach((button) => {
    button.addEventListener("click", () => {
      state.homeworkModal = button.dataset.viewSubmission;
      renderContent();
    });
  });
  document.getElementById("closeSubmissionModal")?.addEventListener("click", () => {
    state.homeworkModal = null;
    renderContent();
  });
  document.getElementById("manualGradeForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api(`/api/submissions/${state.homeworkModal}/manual-grade`, {
        method: "POST",
        body: { teacherId: state.user.id, score: form.get("score"), comment: form.get("comment") }
      });
      state.homeworkModal = null;
      await loadState();
      renderShell();
      showToast("手动批改已保存");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

function renderStudentHomeworkPage() {
  const homework = state.data.homework || [];
  const submissions = state.data.submissions || [];
  return `
    <div class="page-head">
      <div>
        <h2>📥 作业提交</h2>
        <p>这里会显示所在班级老师发布的作业，可提交文字、图片或视频答案；老师批改后显示分数。</p>
      </div>
    </div>
    <section class="homework-list">
      ${homework.map((item) => {
        const klass = state.data.classes.find((classItem) => classItem.id === item.classId);
        const submission = submissions.find((sub) => sub.homeworkId === item.id && sub.studentId === state.user.id);
        return `
          <article class="panel homework-card">
            <div class="split-head">
              <div>
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(klass?.name || "")} · ${fmtTime(item.createdAt)}</p>
              </div>
              <strong class="score-badge ${submission?.status === "graded" ? "done" : ""}">${submission?.status === "graded" ? `${submission.score} 分` : (submission ? "待批改" : "未提交")}</strong>
            </div>
            <p>${escapeHtml(item.description)}</p>
            ${renderAttachments(item.attachments)}
            ${submission?.comment ? `<p class="feedback">评语：${escapeHtml(submission.comment)}</p>` : ""}
            <form class="submitHomeworkForm stack" data-homework-id="${item.id}">
              <label>文字答案<textarea name="answerText" rows="4">${escapeHtml(submission?.answerText || "")}</textarea></label>
              <label>上传图片/视频答案<input name="attachments" type="file" accept="image/*,video/*" multiple /></label>
              <button class="primary" type="submit">${submission ? "更新提交" : "提交作业"}</button>
            </form>
          </article>
        `;
      }).join("") || emptyBlock("当前班级还没有老师发布作业。")}
    </section>
  `;
}

function bindStudentHomeworkPage() {
  document.querySelectorAll(".submitHomeworkForm").forEach((formEl) => {
    formEl.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const files = form.getAll("attachments").filter((file) => file && file.name);
      try {
        const attachments = await Promise.all(files.map(fileToPayload));
        await api(`/api/homework/${event.currentTarget.dataset.homeworkId}/submit`, {
          method: "POST",
          body: { studentId: state.user.id, answerText: form.get("answerText"), attachments }
        });
        await loadState();
        renderShell();
        showToast("作业已提交");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
}

function renderProfilePage() {
  const isStudent = state.user.role === "student";
  return `
    <div class="page-head">
      <div>
        <h2>ℹ️ 个人信息</h2>
        <p>维护账号信息。用户 ID 为系统自动分配的 8 位编号，用于添加好友、加入班级和关联作业。</p>
      </div>
    </div>
    <div class="grid two">
      <section class="panel">
        <h3>账号资料</h3>
        <form id="profileForm" class="stack">
          <label>8 位 ID<input value="${state.user.id}" disabled /></label>
          <label>身份<input value="${roleName(state.user.role)}" disabled /></label>
          <label>姓名<input name="name" value="${escapeHtml(state.user.name)}" /></label>
          <label>${isStudent ? "班级" : "学科"}<input name="${isStudent ? "className" : "subject"}" value="${escapeHtml(isStudent ? (state.user.className || "") : (state.user.subject || ""))}" /></label>
          <label>邮箱<input name="email" value="${escapeHtml(state.user.email || "")}" /></label>
          <label>电话<input name="phone" value="${escapeHtml(state.user.phone || "")}" /></label>
          <button class="primary" type="submit">保存资料</button>
        </form>
      </section>
      <section class="panel">
        <h3>${isStudent ? "加入班级" : "账号能力"}</h3>
        ${isStudent ? `
          <form id="joinClassForm" class="stack">
            <label>班级邀请码或班级 ID<input name="classCode" placeholder="向老师获取班级邀请码" /></label>
            <button class="primary" type="submit">申请加入</button>
          </form>
          <div class="table-list">
            ${(state.data.classes || []).map((klass) => `<div><span>${escapeHtml(klass.name)}</span><span>${escapeHtml(klass.subject)}</span><span>${escapeHtml(klass.inviteCode)}</span></div>`).join("") || emptyBlock("尚未加入班级")}
          </div>
        ` : `
          <div class="capability-grid">
            <span>创建多学科班级</span>
            <span>导入学生名单</span>
            <span>发布多媒体作业</span>
            <span>AI/手动批改</span>
            <span>上传总知识图谱</span>
            <span>保存学科模型</span>
          </div>
        `}
      </section>
    </div>
  `;
}

function bindProfilePage() {
  document.getElementById("profileForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone")
    };
    if (state.user.role === "student") body.className = form.get("className");
    else body.subject = form.get("subject");
    try {
      const payload = await api(`/api/users/${state.user.id}`, { method: "PUT", body });
      state.user = payload.user;
      await loadState();
      renderShell();
      showToast("资料已保存");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.getElementById("joinClassForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const payload = await api(`/api/classes/${encodeURIComponent(form.get("classCode"))}/apply`, {
        method: "POST",
        body: { studentId: state.user.id }
      });
      await loadState();
      renderShell();
      showToast(payload.application.reason);
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

function renderAttachments(attachments = []) {
  if (!attachments.length) return "";
  return `
    <div class="attachments">
      ${attachments.map((file) => {
        if (String(file.type).startsWith("image/")) return `<img src="${file.dataUrl}" alt="${escapeHtml(file.name)}" />`;
        if (String(file.type).startsWith("video/")) return `<video src="${file.dataUrl}" controls></video>`;
        return `<a href="${file.dataUrl}" download="${escapeHtml(file.name)}">${escapeHtml(file.name)}</a>`;
      }).join("")}
    </div>
  `;
}

function emptyBlock(message) {
  return `<div class="empty">${message}</div>`;
}

boot();
