const app = document.getElementById("app");
const toast = document.getElementById("toast");
const DEFAULT_GRAPH_EXTRACTOR = "ai-unlimited-pdf-graph-agent";

const state = {
  user: null,
  data: null,
  page: "ai",
  learningPathTab: "library",
  navOpen: false,
  navCollapsed: false,
  subjectDefaultsInitialized: false,
  selectedGraphId: null,
  graphSubject: "",
  graphTab: "library",
  studentGraphTab: "library",
  knowledgeTest: {
    subject: "",
    materialId: "",
    quizId: "",
    questions: [],
    currentIndex: 0,
    answer: "",
    result: null,
    attempts: [],
    summary: null,
    sourceNotice: "",
    sourceMaterials: [],
    phase: "diagnostic",
    previousAccuracy: 0
  },
  graphJobs: [],
  activeConversationId: null,
  aiHistoryOpen: false,
  studentAiRailOpen: true,
  aiMode: "qa",
  aiTaskKey: "qa",
  aiTeacherTask: "lesson_plan",
  aiSubject: "",
  aiChapter: "",
  aiKnowledgePoint: "",
  aiClassId: "",
  classLearningOpen: false,
  classAnalytics: null,
  classAnalyticsLoadingFor: "",
  classAnalyticsError: "",
  classAnalyticsErrorFor: "",
  classAnalyticsStudentId: "",
  classStudentAnalytics: null,
  aiMaterialId: "",
  aiGraphId: "",
  aiGraphNodeId: "",
  aiHomeworkId: "",
  aiSubmissionId: "",
  aiAnswerDepth: "layered",
  aiStudentAnswer: "",
  pendingAiPrompt: "",
  aiContextEditorOpen: false,
  aiInsightTab: "workflow",
  cycleSettingsOpen: false,
  cycleViewMode: "",
  cycleWizardStep: 0,
  activeThreadId: null,
  selectedMessages: new Set(),
  selectedClassId: null,
  classManageOpen: false,
  classTool: null,
  classLearningView: "topic",
  interventionErrorTag: "",
  interventionTierOverrides: {},
  homeworkModal: null,
  homeworkDetailId: null,
  teacherHomeworkDetailId: null,
  teacherHomeworkPendingId: null,
  materialDetailId: null,
  materialSyncId: null,
  materialSearch: "",
  materialSubjectFilter: "",
  materialUploadOpen: false,
  materialRagQuestion: "",
  materialRagResult: null,
  partnerGraphs: null,
  partnerSnapshot: null,
  partnerGraphId: "",
  partnerChapterId: "",
  partnerNodeId: "",
  partnerQuiz: null,
  partnerResult: null,
  partnerSubmitting: false,
  partnerRouteOpen: true,
  partnerSummaryOpen: true,
  settingsEditOpen: false,
  settingsJoinOpen: false,
  settingsClassesOpen: false,
  settingsTeacherClassesOpen: false,
  chatTool: null,
  adminExport: null,
  adminModelConfig: null,
  adminOverview: null,
  adminSection: "users",
  adminQuery: "",
  adminSelectedRecord: null,
  graphViews: {},
  graphNodeModal: null,
  graphSyncModal: null,
  graphLayer: "overview",
  graphFocusNodeId: null,
  graphSelectedNodeId: null,
  graphSearch: "",
  graphNodeFilter: "all",
  graphDetailOpen: true,
  graphMaximized: false,
  graphRelationFilters: ["contains", "prerequisite", "misconception"],
  graphJob: null,
  graphJobTimer: null,
  graphDraft: {
    subject: "",
    title: "",
    sourceText: "",
    extractor: DEFAULT_GRAPH_EXTRACTOR
  },
  conversationContextMenu: null,
  graphUploadAbort: null,
  graphGenerationCanceled: false,
  searchResults: []
};

const subjects = ["数学", "物理", "化学", "生物", "机器学习", "语文", "英语", "历史", "地理", "政治", "通用"];
const AI_MODE_OPTIONS = [
  { key: "qa", label: "问答", title: "问答模式", hint: "基于课程资料回答问题" },
  { key: "explain", label: "讲解", title: "讲解模式", hint: "分层解释概念和例子" },
  { key: "guided", label: "引导", title: "引导模式", hint: "逐步提示，不直接代做" },
  { key: "practice", label: "练习", title: "练习模式", hint: "生成题目、测验和解析" },
  { key: "grade", label: "批改", title: "批改模式", hint: "检查答案并诊断错因" },
  { key: "plan", label: "规划", title: "规划模式", hint: "制定复习路径和计划" }
];
const STUDENT_AI_TASK_MODES = [
  { key: "concept", workflowType: "knowledge_qa", label: "概念理解", mode: "explain", depth: "layered", hint: "分层解释、生活类比、反例与关联知识点", promptPlaceholder: "输入想理解的机器学习概念，例如：为什么逻辑回归要使用交叉熵损失？" },
  { key: "derivation", label: "公式推导", mode: "explain", depth: "full", hint: "推导步骤、符号说明与易错点检查", promptPlaceholder: "输入需要推导的公式，例如：请帮我检查逻辑回归梯度下降的推导。" },
  { key: "code", label: "代码实验", mode: "guided", depth: "layered", hint: "定位报错、解释参数、提示修改而非代做", promptPlaceholder: "说明实验目标或报错现象，并粘贴相关代码，例如：LogisticRegression 收敛警告如何排查？" },
  { key: "diagnosis", workflowType: "misconception_classification", label: "错因诊断", mode: "grade", depth: "layered", hint: "提交题目与作答，定位错因、证据与补救任务", promptPlaceholder: "写出题目、你的答案和解题思路；AI 将基于这段作答进行诊断。" },
  { key: "review", workflowType: "personalized_path", label: "考前巩固", mode: "plan", depth: "layered", hint: "按薄弱点安排优先级、时间、题目与资源", promptPlaceholder: "例如：根据我的薄弱点安排今晚 90 分钟的逻辑回归复习任务。" }
];
const AI_DEPTH_OPTIONS = [
  { key: "brief", label: "简洁" },
  { key: "layered", label: "分层" },
  { key: "full", label: "完整" },
  { key: "exam", label: "考试版" }
];
const ML_DIAGNOSIS_WORKFLOW_INFO = {
  name: "管理员配置模型驱动的学习诊断助手",
  version: "1.0.0",
  source: "管理员模型配置",
  steps: [
    "开始：接收问题、上下文、学习目标和可选学生答案",
    "输入清洗与任务识别_代码节点：规范问题并识别问答/诊断模式",
    "课程知识库检索_RAG：检索教师端课程资料",
    "错因知识库检索_RAG：检索错因、题库和评分标准",
    "RAG片段去重与证据整理_代码节点：合并可追溯证据",
    "朴素贝叶斯知识点分类_代码节点：定位知识点",
    "掌握度评分_代码节点：计算掌握度并更新画像",
    "LLM标准解释节点：生成标准解释",
    "条件分支_问答或诊断：区分知识问答和学习诊断",
    "LLM诊断反馈节点：生成错因反馈和修正建议",
    "输出结构化JSON_代码节点：返回答案、引用和后续问题",
    "项目数据库同步_HTTP节点：同步会话、错题和掌握度",
    "结束：完成本轮响应"
  ]
};
const GRAPH_WIDTH = 1340;
const GRAPH_HEIGHT = 1180;
const GRAPH_LAYOUT_VERSION = "graph-layout-v11-outline-materials";
const COURSE_MATERIAL_ACCEPT = ".pdf,.txt,.md,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.json,.epub,text/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const TREE_LINK_LABELS = new Set(["一级章节", "一级模块", "包含", "细分"]);
const EDUCATION_RELATION_LABELS = {
  contains: "层级包含",
  prerequisite: "前置依赖",
  dependency: "强依赖",
  misconception: "易混淆/迷思概念",
  "cross-link": "横向关联",
  assessment: "考察属性",
  examines: "考查",
  resource: "教学资源",
  review: "推荐复习",
  competency: "核心素养",
  semantic: "语义关联"
};
const GRAPH_LAYER_OPTIONS = [
  { key: "overview", label: "课程总览" },
  { key: "relation", label: "知识关系" },
  { key: "diagnosis", label: "学习诊断" }
];
const GRAPH_RELATION_FILTERS = [
  { key: "contains", label: "包含" },
  { key: "prerequisite", label: "前置" },
  { key: "misconception", label: "易混淆" },
  { key: "exam", label: "考点" },
  { key: "resource", label: "资料" },
  { key: "review", label: "路径" }
];
const GRAPH_NODE_FILTERS = [
  { key: "all", label: "我的路径" },
  { key: "weak", label: "当前薄弱" },
  { key: "mastered", label: "已掌握" },
  { key: "misconception", label: "误区节点" },
  { key: "exercise", label: "验证任务" },
  { key: "resource", label: "有资料" }
];

const ML_GRAPH_MODULES = [
  { key: "foundation", label: "机器学习基础", short: "任务、数据与泛化", terms: ["监督学习", "无监督学习", "训练集", "测试集", "特征", "标签", "偏差", "方差", "泛化"] },
  { key: "preprocess", label: "数据预处理", short: "清洗、缩放与划分", terms: ["缺失值", "标准化", "归一化", "特征选择", "训练验证测试", "特征工程"] },
  { key: "regression", label: "回归模型", short: "线性回归与优化", terms: ["线性回归", "最小二乘", "梯度下降", "正则化", "回归评价", "均方误差"] },
  { key: "classification", label: "分类模型", short: "分类算法与混淆矩阵", terms: ["逻辑回归", "KNN", "近邻", "朴素贝叶斯", "决策树", "支持向量机", "SVM", "混淆矩阵"] },
  { key: "evaluation", label: "模型评估与优化", short: "泛化、指标与调参", terms: ["交叉验证", "过拟合", "欠拟合", "学习率", "超参数", "ROC", "AUC", "Precision", "Recall", "F1"] },
  { key: "clustering", label: "聚类与综合应用", short: "聚类、降维与建模流程", terms: ["K-Means", "K-means", "聚类", "降维", "PCA", "聚类指标", "项目建模"] }
];

const ICON_PATHS = {
  home: `<path d="m3 10 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>`,
  bot: `<rect x="5" y="8" width="14" height="10" rx="3"/><path d="M12 4v4"/><path d="M8 12h.01"/><path d="M16 12h.01"/><path d="M9 16h6"/>`,
  sparkles: `<path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7Z"/><path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8Z"/><path d="m5 15 .8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8Z"/>`,
  network: `<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M8 7 11 16"/><path d="m16 7-3 9"/><path d="M8 6h8"/>`,
  files: `<path d="M14 2H6a2 2 0 0 0-2 2v14"/><path d="M14 2v6h6"/><path d="M20 8v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6"/>`,
  clipboard: `<path d="M9 4h6l1 2h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2Z"/><path d="M9 4a3 3 0 0 1 6 0"/><path d="m9 14 2 2 4-5"/>`,
  users: `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>`,
  message: `<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>`,
  user: `<circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/>`,
  menu: `<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>`,
  chevronLeft: `<path d="m15 18-6-6 6-6"/>`,
  chevronRight: `<path d="m9 18 6-6-6-6"/>`,
  logout: `<path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M21 19V5a2 2 0 0 0-2-2h-6"/>`,
  refresh: `<path d="M21 12a9 9 0 0 1-15.3 6.4"/><path d="M3 12A9 9 0 0 1 18.3 5.6"/><path d="M18 2v4h-4"/><path d="M6 22v-4h4"/>`,
  lab: `<path d="M10 2v6l-5.5 9.5A3 3 0 0 0 7 22h10a3 3 0 0 0 2.5-4.5L14 8V2"/><path d="M8 2h8"/><path d="M7 16h10"/>`,
  school: `<path d="m3 10 9-6 9 6-9 6Z"/><path d="M5 12v5c2 2 12 2 14 0v-5"/><path d="M12 16v5"/>`,
  admin: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>`,
  search: `<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>`,
  chevronDown: `<path d="m6 9 6 6 6-6"/>`,
  maximize: `<path d="M8 3H3v5"/><path d="M21 8V3h-5"/><path d="M3 16v5h5"/><path d="M16 21h5v-5"/>`,
  minimize: `<path d="M8 3v5H3"/><path d="M16 3v5h5"/><path d="M8 21v-5H3"/><path d="M16 21v-5h5"/>`,
  zoomIn: `<circle cx="11" cy="11" r="7"/><path d="M11 8v6"/><path d="M8 11h6"/><path d="m20 20-3.5-3.5"/>`,
  zoomOut: `<circle cx="11" cy="11" r="7"/><path d="M8 11h6"/><path d="m20 20-3.5-3.5"/>`,
  image: `<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="m21 15-5-5L5 19"/>`,
  target: `<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M2 12h4"/><path d="M18 12h4"/>`,
  branch: `<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M8 6h8"/><path d="M7 8l4 8"/><path d="m17 8-4 8"/>`,
  columns: `<rect x="3" y="4" width="7" height="16" rx="1"/><rect x="14" y="4" width="7" height="16" rx="1"/>`,
  atom: `<circle cx="12" cy="12" r="1.5"/><path d="M19 12c0 2.8-3.1 5-7 5s-7-2.2-7-5 3.1-5 7-5 7 2.2 7 5Z"/><path d="M15.5 18.1c-2.4 1.4-5.7-.3-7.6-3.7S6.4 7.1 8.8 5.7s5.7.3 7.6 3.7 1.5 7.3-.9 8.7Z"/><path d="M8.5 18.1c2.4 1.4 5.7-.3 7.6-3.7s1.5-7.3-.9-8.7-5.7.3-7.6 3.7-1.5 7.3.9 8.7Z"/>`
};

function iconSvg(name, label = "") {
  const path = ICON_PATHS[name] || ICON_PATHS.home;
  const title = label ? `<title>${escapeHtml(label)}</title>` : "";
  return `<svg class="app-icon" viewBox="0 0 24 24" aria-hidden="${label ? "false" : "true"}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${title}${path}</svg>`;
}

const CASE_NAME = "知学伴";
const CASE_TAGLINE = "面向机器学习课程的 AI 学习诊断与个性化干预智能体";
const PROJECT_TITLE = "知学伴 - 智能学习诊断、知识图谱与个性化成长平台";

const teacherMenus = [
  { key: "ai", icon: "bot", label: "教学助手" },
  { key: "classes", icon: "users", label: "班级学情" },
  { key: "graph", icon: "network", label: "知识图谱" },
  { key: "homework", icon: "clipboard", label: "作业管理" },
  { key: "learning-path", icon: "branch", label: "学习路径" },
  { key: "materials", icon: "files", label: "课程资料" },
  { key: "chat", icon: "message", label: "站内信息" },
  { key: "settings", icon: "admin", label: "设置" }
];

const adminMenus = [
  { key: "admin", icon: "admin", label: "项目总览", section: "管理" },
  { key: "admin-api", icon: "bot", label: "配置 API", section: "管理" }
];

const studentMenus = [
  { key: "ai", icon: "bot", label: "学习助手" },
  { key: "partner", icon: "school", label: "学习伙伴" },
  { key: "graph", icon: "network", label: "知识图谱" },
  { key: "homework", icon: "clipboard", label: "个性化练习" },
  { key: "portfolio", icon: "target", label: "学习记录" },
  { key: "chat", icon: "message", label: "站内信息" },
  { key: "settings", icon: "admin", label: "设置" }
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeMultiline(value) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function compactText(value, maxLength = 90) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
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
  return role === "admin" ? "管理员" : role === "teacher" ? "教师" : "学生";
}

function isTeacherLike() {
  return state.user?.role === "teacher" || state.user?.role === "admin";
}

function defaultPageForRole(role = state.user?.role) {
  if (role === "admin") return "admin";
  return "ai";
}

function allVisibleGraphs() {
  return state.data?.knowledgeGraphs || [];
}

function isLearningPathResource(graph) {
  if (!graph) return false;
  const resourceType = String(graph.resourceType || "").toLowerCase();
  if (resourceType === "learning-path") return true;
  if (resourceType === "knowledge-graph") return false;
  const method = String(graph.extraction?.method || graph.extraction?.agent || "").toLowerCase();
  if (method.includes("learning-path") || method.includes("学习路径")) return true;
  return /学习路径/.test(String(graph.title || "")) && !/知识图谱/.test(String(graph.title || ""));
}

function allVisibleLearningPaths() {
  return state.data?.learningPaths || (state.data?.knowledgeGraphs || []).filter(isLearningPathResource);
}

function findGraphResource(id) {
  return [...(state.data?.knowledgeGraphs || []), ...allVisibleLearningPaths()].find((item) => item.id === id) || null;
}

function allVisibleMaterials() {
  return state.data?.courseMaterials || [];
}

function latestByTime(items = []) {
  return [...items].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
}

function preferredSubject() {
  const userSubject = state.user?.subject && subjects.includes(state.user.subject) ? state.user.subject : state.user?.subject;
  if (state.user?.role === "teacher" && userSubject) return userSubject;
  const graphSubject = latestByTime(allVisibleGraphs()).find((item) => item.subject)?.subject;
  if (state.user?.role === "student" && graphSubject) return graphSubject;
  const materialSubject = latestByTime(allVisibleMaterials()).find((item) => item.subject)?.subject;
  return userSubject || materialSubject || graphSubject || "通用";
}

function studentClassSummary(classes = state.data?.classes || []) {
  const names = Array.isArray(classes) ? classes.map((item) => item?.name).filter(Boolean) : [];
  if (!names.length) return state.user?.className || "未加入班级";
  const compactNames = names.slice(0, 2).map((name) => compactText(name, 10));
  return names.length > compactNames.length
    ? `已加入 ${compactNames.join("、")} 等 ${names.length} 个班级`
    : `已加入 ${compactNames.join("、")}`;
}

function activeLearningClass() {
  const classId = String(state.user?.learningClassId || "");
  return (state.data?.classes || []).find((klass) => klass.id === classId) || null;
}

function learningResourceEmptyMessage(contentLabel) {
  const klass = activeLearningClass();
  if (!klass) return "请先在学生基本信息中选择正在学习的班级。";
  if (!(state.data?.courseMaterials || []).length) return `老师未上传资料。${klass.name}的教师尚未提供可用于学习的课程资料。`;
  return `老师尚未发布${contentLabel}。`;
}

function studentGraphSubjects() {
  return Array.from(new Set(allVisibleGraphs().filter((graph) => graph.global).map((graph) => graph.subject).filter(Boolean)));
}

function materialSubjects() {
  return Array.from(new Set(allVisibleMaterials().map((item) => item.subject).filter(Boolean)));
}

function knowledgeTestSubjects() {
  const activeClass = activeLearningClass();
  const classSubjects = state.user?.role === "student" ? [activeClass?.subject].filter(Boolean) : [];
  const scopedMaterialSubjects = state.user?.role === "student"
    ? allVisibleMaterials().map((material) => material.subject).filter(Boolean)
    : materialSubjects();
  const userSubject = state.user?.subject ? [state.user.subject] : [];
  return Array.from(new Set(userSubject.concat(classSubjects, scopedMaterialSubjects, subjects).filter(Boolean)));
}

function knowledgeTestMaterialsForSubject(subject) {
  const target = normalizeSubjectLabel(subject || preferredSubject());
  const materials = latestByTime(allVisibleMaterials()).filter((material) => !target || material.subject === target);
  if (state.user?.role !== "student") return materials;
  return materials;
}

function normalizeSubjectLabel(value) {
  return String(value || "").trim() || "通用";
}

function subjectSelectOptions(selected = "", values = subjects, includeAll = false, allLabel = "全部") {
  const merged = Array.from(new Set((values || []).filter(Boolean).concat(subjects)));
  const options = includeAll ? [`<option value="" ${!selected ? "selected" : ""}>${escapeHtml(allLabel)}</option>`] : [];
  return options.concat(merged.map((subject) => `<option value="${escapeHtml(subject)}" ${subject === selected ? "selected" : ""}>${escapeHtml(subject)}</option>`)).join("");
}

function reconcileSubjectDefaults() {
  const fallback = preferredSubject();
  const graphSubjects = state.user?.role === "student" ? studentGraphSubjects() : Array.from(new Set(allVisibleGraphs().map((graph) => graph.subject).filter(Boolean)));
  const currentStudentGraphMatches = state.user?.role !== "student"
    || !state.graphSubject
    || allVisibleGraphs().some((graph) => graph.global && graph.subject === state.graphSubject);
  if (state.user?.role === "student") {
    if (!state.subjectDefaultsInitialized || !currentStudentGraphMatches) {
      state.graphSubject = "";
    }
  } else if (!state.subjectDefaultsInitialized || !state.graphSubject) {
    state.graphSubject = graphSubjects[0] || fallback;
  }
  if (!state.subjectDefaultsInitialized || !state.aiSubject) {
    state.aiSubject = fallback;
  }
  if (!state.graphDraft.subject) {
    state.graphDraft.subject = fallback;
  }
  state.subjectDefaultsInitialized = true;
}

function menuForCurrentUser() {
  if (state.user?.role === "admin") return adminMenus;
  const menus = isTeacherLike() ? teacherMenus : studentMenus;
  return menus.filter((item) => !item.adminOnly || state.user?.role === "admin");
}

function currentPageTitle() {
  const menu = menuForCurrentUser().find((item) => item.key === state.page);
  if (menu) return menu.label;
  return state.page === "admin" ? "项目总览" : state.page === "admin-api" ? "配置 API" : "AI 助教";
}

function renderAiConversationActions() {
  return `
    <div class="ai-conversation-actions">
      <button id="newConversationBtn" class="primary" type="button">新建对话</button>
      <button id="aiHistoryToggle" class="ai-history-toggle" type="button" aria-label="查看历史问答记录" aria-expanded="${state.aiHistoryOpen}">
        ${iconSvg("chevronDown", "历史问答")}
      </button>
      ${renderAiHistoryMenu()}
    </div>
  `;
}

function renderLearningPartnerHeaderActions() {
  const graphs = Array.isArray(state.partnerGraphs) ? state.partnerGraphs : [];
  const snapshot = state.partnerSnapshot;
  if (!snapshot?.graph || !graphs.length) return "";
  return `<label class="partner-graph-select"><span>学习路径</span><select data-partner-graph>${graphs.map((graph) => `<option value="${escapeHtml(graph.id)}" ${graph.id === snapshot.graph.id ? "selected" : ""}>${escapeHtml(graph.title)} · ${escapeHtml(graph.subject)}</option>`).join("")}</select></label>`;
}

function renderStudentGraphHeaderActions() {
  const graphs = graphListForCurrentRole();
  const selectedId = state.selectedGraphId || graphs.find(isMachineLearningGraph)?.id || graphs[0]?.id || "";
  if (!graphs.length) return "";
  return `<label class="student-graph-select"><span>知识图谱</span><select id="studentGraphSelect" aria-label="选择知识图谱">${graphs.map((graph) => `<option value="${escapeHtml(graph.id)}" ${graph.id === selectedId ? "selected" : ""}>${escapeHtml(graph.title)}${graph.subject ? ` · ${escapeHtml(graph.subject)}` : ""}</option>`).join("")}</select></label>`;
}

function renderChatHeaderActions() {
  const incomingCount = chatPendingCount();
  return `
    <div class="chat-top-actions">
      <button class="chat-top-button ${incomingCount ? "has-dot" : ""}" type="button" data-chat-tool="pending">待处理${incomingCount ? `<span>${incomingCount}</span>` : ""}</button>
      <button class="chat-top-button" type="button" data-chat-tool="contacts">通讯录</button>
      <button class="primary" type="button" data-chat-tool="friend">添加好友</button>
      <button class="mini" type="button" data-chat-tool="group">创建群聊</button>
    </div>
  `;
}

function renderPageHeader() {
  const pageTitle = currentPageTitle();
  const actions = state.page === "ai"
    ? renderAiConversationActions()
    : state.page === "partner"
      ? renderLearningPartnerHeaderActions()
      : state.page === "graph" && state.user?.role === "student"
        ? renderStudentGraphHeaderActions()
      : state.page === "portfolio"
        ? renderPortfolioExportActions()
        : state.page === "chat"
          ? renderChatHeaderActions()
          : "";
  return `<header class="nav-page-header${actions ? " has-actions" : ""}"><h2 class="nav-page-title">${escapeHtml(pageTitle)}</h2>${actions ? `<div class="nav-page-header-actions">${actions}</div>` : ""}</header>`;
}

function showToast(message, type = "ok") {
  toast.textContent = message;
  toast.className = `toast ${type}`;
  setTimeout(() => toast.classList.add("hidden"), 2600);
}

function authRoleExtraCopy(role) {
  return role === "student"
    ? {
      label: "初始班级或邀请码（选填）",
      placeholder: "可留空，之后在设置中申请加入"
    }
    : {
      label: "任教学科（选填）",
      placeholder: "例如：数学、物理、机器学习"
    };
}

function setAuthSubmitting(form, submitting, busyText) {
  const button = form?.querySelector('button[type="submit"]');
  if (!button) return;
  if (submitting) {
    button.dataset.idleText = button.textContent;
    button.textContent = busyText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.idleText || button.textContent;
    button.disabled = false;
  }
}

function setButtonBusy(button, submitting, busyText = "处理中...") {
  if (!button) return;
  if (submitting) {
    button.dataset.idleText = button.textContent;
    button.textContent = busyText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.idleText || button.textContent;
    button.disabled = false;
  }
}

async function api(path, options = {}) {
  const init = {
    method: options.method || "GET",
    headers: { "content-type": "application/json" },
    credentials: "same-origin"
  };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);
  const res = await fetch(path, init);
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.ok === false) {
    throw Object.assign(new Error(payload.error || `请求失败：${res.status}`), { status: res.status });
  }
  return payload;
}

async function apiStream(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    credentials: "same-origin",
    body: JSON.stringify(options.body || {})
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw Object.assign(new Error(payload.error || `请求失败：${response.status}`), { status: response.status });
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("浏览器不支持流式响应");
  const decoder = new TextDecoder();
  let buffer = "";
  let complete = null;
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";
    for (const event of events) {
      const dataLine = event.split("\n").find((line) => line.startsWith("data: "));
      if (!dataLine) continue;
      const data = JSON.parse(dataLine.slice(6));
      if (event.startsWith("event: error")) throw new Error(data.error || "流式请求失败");
      if (event.startsWith("event: complete")) complete = data;
    }
    if (done) break;
  }
  if (!complete) throw new Error("流式响应未返回完整结果");
  return complete;
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

function downloadText(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadBase64File(filename, base64, type = "application/octet-stream") {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type });
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

function teacherSelectedClassStorageKey() {
  return state.user?.role === "teacher" && state.user.id
    ? `edu-teacher-selected-class:${state.user.id}`
    : "";
}

function restoreTeacherSelectedClass() {
  const key = teacherSelectedClassStorageKey();
  const classId = key ? localStorage.getItem(key) : "";
  if (!classId) return;
  if (state.data?.classes.some((klass) => klass.id === classId)) {
    state.selectedClassId = classId;
  } else {
    localStorage.removeItem(key);
  }
}

function rememberTeacherSelectedClass(classId) {
  const key = teacherSelectedClassStorageKey();
  if (!key) return;
  if (classId) localStorage.setItem(key, classId);
  else localStorage.removeItem(key);
}

function resetSessionSelectionState() {
  stopGraphJobPolling();
  if (state.graphUploadAbort) {
    try {
      state.graphUploadAbort.abort();
    } catch {}
  }
  state.selectedGraphId = null;
  state.selectedClassId = null;
  state.classManageOpen = false;
  state.classTool = null;
  state.classLearningOpen = false;
  state.classAnalytics = null;
  state.classAnalyticsLoadingFor = "";
  state.classAnalyticsError = "";
  state.classAnalyticsErrorFor = "";
  state.classAnalyticsStudentId = "";
  state.classStudentAnalytics = null;
  state.activeConversationId = null;
  state.activeThreadId = null;
  state.homeworkModal = null;
  state.homeworkDetailId = null;
  state.teacherHomeworkDetailId = null;
  state.teacherHomeworkPendingId = null;
  state.materialDetailId = null;
  state.materialSyncId = null;
  state.partnerGraphs = null;
  state.partnerSnapshot = null;
  state.partnerGraphId = "";
  state.partnerChapterId = "";
  state.partnerNodeId = "";
  state.partnerQuiz = null;
  state.partnerResult = null;
  state.partnerSubmitting = false;
  state.graphViews = {};
  state.graphNodeModal = null;
  state.studentGraphTab = "library";
  state.knowledgeTest = {
    subject: "",
    materialId: "",
    quizId: "",
    questions: [],
    currentIndex: 0,
    answer: "",
    result: null,
    attempts: [],
    summary: null,
    sourceNotice: "",
    sourceMaterials: []
  };
  state.graphFocusNodeId = null;
  state.graphSelectedNodeId = null;
  state.graphSearch = "";
  state.graphMaximized = false;
  state.graphJob = null;
  state.conversationContextMenu = null;
  state.graphUploadAbort = null;
  state.graphGenerationCanceled = false;
  state.settingsEditOpen = false;
  state.settingsJoinOpen = false;
  state.settingsClassesOpen = false;
  state.settingsTeacherClassesOpen = false;
  state.selectedMessages.clear();
  state.searchResults = [];
  state.subjectDefaultsInitialized = false;
  state.navOpen = false;
}

async function loadState() {
  if (!state.user) return;
  const payload = await api("/api/state");
  state.data = payload.state;
  state.user = payload.state.user;
  localStorage.setItem("edu-user", JSON.stringify(state.user));
  reconcileSubjectDefaults();
  if (state.selectedClassId && !state.data.classes.some((klass) => klass.id === state.selectedClassId)) state.selectedClassId = null;
  if (!state.selectedClassId) restoreTeacherSelectedClass();
  if (!state.selectedClassId) state.classManageOpen = false;
  const visibleGraphs = graphListForCurrentRole();
  if (state.selectedGraphId && !visibleGraphs.some((graph) => graph.id === state.selectedGraphId)) {
    state.selectedGraphId = null;
    state.graphMaximized = false;
  }
  if (state.materialDetailId && !state.data.courseMaterials?.some((material) => material.id === state.materialDetailId)) state.materialDetailId = null;
  if (!state.materialDetailId && state.data.courseMaterials?.length) state.materialDetailId = state.data.courseMaterials[0].id;
  if (state.activeThreadId && !state.data.chatThreads.some((thread) => thread.id === state.activeThreadId)) state.activeThreadId = null;
  if (!state.activeThreadId && state.data.chatThreads.length) state.activeThreadId = state.data.chatThreads[0].id;
}

async function boot() {
  state.user = getCurrentUser();
  if (!state.user) {
    try {
      const payload = await api("/api/session");
      state.user = payload.user;
      state.data = payload.state;
      resetSessionSelectionState();
      localStorage.setItem("edu-user", JSON.stringify(state.user));
      renderShell();
    } catch {
      renderAuth();
    }
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

function renderSidebarConversations() {
  const conversations = (state.data?.conversations || []).slice(0, 80);
  return `
    <div class="nav-conversation-wrap">
      <div class="nav-conversation-head">
        <div class="nav-subtitle">历史对话</div>
        <button class="mini" type="button" id="newConversationSidebarBtn">新建</button>
      </div>
      <div class="nav-conversation-list">
        ${conversations.map((conv) => `
          <button class="${state.activeConversationId === conv.id ? "active" : ""}" data-sidebar-conversation="${conv.id}" title="点击打开，右键删除">
            <strong>${escapeHtml(conv.title || "新的对话")}</strong>
            <span>${fmtTime(conv.updatedAt)} · ${escapeHtml(aiModeLabel(conv.mode || "qa"))}</span>
          </button>
        `).join("") || `<p class="nav-empty">暂无历史对话</p>`}
      </div>
    </div>
  `;
}

function renderConversationContextMenu() {
  if (!state.conversationContextMenu) return "";
  const conv = (state.data?.conversations || []).find((item) => item.id === state.conversationContextMenu.id);
  if (!conv) return "";
  return `
    <div class="context-menu conversation-context-menu" style="left:${state.conversationContextMenu.x}px; top:${state.conversationContextMenu.y}px">
      <button data-context-delete-conversation="${conv.id}">删除</button>
    </div>
  `;
}

function renderNavSections(menus) {
  return menus.map((item) => `
    <button class="nav-item ${state.page === item.key ? "active" : ""}" data-page="${item.key}" title="${escapeHtml(item.label)}">
      <span>${iconSvg(item.icon, item.label)}</span>${escapeHtml(item.label)}
    </button>
  `).join("");
}

function renderSidebarToggle() {
  const label = state.navCollapsed ? "展开侧边导航" : "收起侧边导航";
  return `
    <button class="sidebar-toggle" type="button" id="sidebarToggleBtn" aria-label="${label}" aria-expanded="${!state.navCollapsed}" title="${label}">
      ${iconSvg(state.navCollapsed ? "chevronRight" : "chevronLeft", label)}
    </button>
  `;
}

function renderSidebarBasicInfo({ isAdmin, teacherSide, classes }) {
  if (isAdmin) return "";
  const title = teacherSide ? "教师基本信息" : "学生基本信息";
  const rows = teacherSide
    ? [
      ["姓名", state.user.name],
      ["工号", state.user.id],
      ["身份", "教师"],
      ["任教学科", state.user.subject || preferredSubject() || "未设置"]
    ]
    : [
      ["姓名", state.user.name],
      ["学号", state.user.id],
      ["身份", "学生"],
      ["所在班级", studentClassSummary(classes)]
    ];
  const learningClassId = String(state.user?.learningClassId || "");
  const learningClassName = (classes || []).find((klass) => klass.id === learningClassId)?.name || "未选班级";
  const learningClassOptions = [`<option value="" ${!learningClassId ? "selected" : ""}>未选班级</option>`]
    .concat((classes || []).map((klass) => `<option value="${escapeHtml(klass.id)}" ${klass.id === learningClassId ? "selected" : ""}>${escapeHtml(klass.name)}</option>`))
    .join("");
  const managedClassId = String(state.selectedClassId || "");
  const managedClassName = (classes || []).find((klass) => klass.id === managedClassId)?.name || "暂无班级";
  const managedClassOptions = [`<option value="" ${!managedClassId ? "selected" : ""}>暂无班级</option>`]
    .concat((classes || []).map((klass) => `<option value="${escapeHtml(klass.id)}" ${klass.id === managedClassId ? "selected" : ""}>${escapeHtml(klass.name)}</option>`))
    .join("");
  return `
    <section class="side-basic-info" aria-label="${title}">
      <div class="side-basic-heading">
        <span>${iconSvg("user", title)}</span>
        <strong>${title}</strong>
        ${renderSidebarToggle()}
      </div>
      <dl>
        ${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd title="${escapeHtml(value)}">${escapeHtml(value)}</dd></div>`).join("")}
        ${teacherSide
          ? `<div><dt>所在班级</dt><dd><select data-teacher-class-select aria-label="选择要管理的班级" title="${escapeHtml(managedClassName)}" ${(classes || []).length ? "" : "disabled"}>${managedClassOptions}</select></dd></div>`
          : `<div><dt>正在学习</dt><dd><select data-learning-class-select aria-label="正在学习的班级" title="${escapeHtml(learningClassName)}">${learningClassOptions}</select></dd></div>`}
      </dl>
    </section>
  `;
}

function renderBottomNav(menus) {
  const quickKeys = state.user?.role === "student"
    ? ["home", "ai", "partner", "graph", "homework"]
    : ["ai", "graph", "homework", "chat"];
  const items = quickKeys.map((key) => menus.find((item) => item.key === key)).filter(Boolean);
  if (!items.length) return "";
  return `
    <nav class="bottom-nav" aria-label="手机端高频入口">
      ${items.map((item) => `
        <button class="${state.page === item.key ? "active" : ""}" data-page="${item.key}" title="${escapeHtml(item.label)}">
          ${iconSvg(item.icon, item.label)}
          <span>${escapeHtml(item.key === "homework" ? "练习" : item.key === "graph" ? "图谱" : item.key === "chat" ? "消息" : item.key === "portfolio" ? "档案" : item.key === "partner" ? "伙伴" : item.key === "home" ? "首页" : item.label.replace(" 助教", ""))}</span>
        </button>
      `).join("")}
    </nav>
  `;
}

function renderAuth() {
  app.innerHTML = `
    <main class="auth-shell">
      <section class="auth-visual">
        <div class="brand-mark">🧠</div>
        <h1>${CASE_NAME}</h1>
        <p>${CASE_TAGLINE}。服务某高校人工智能/计算机专业机器学习课程，围绕“诊断—纠错—练习—复测”形成学习闭环。</p>
        <div class="auth-points">
          <span>找出薄弱知识点</span>
          <span>解释每道错题原因</span>
          <span>生成个性化练习</span>
          <span>帮助教师分层干预</span>
        </div>
      </section>
      <section class="auth-panel">
        <div class="tabs">
          <button class="tab active" data-auth-tab="login">登录</button>
          <button class="tab" data-auth-tab="register">注册</button>
        </div>
        <form id="loginForm" class="auth-form">
          <label>账号 ID 或姓名<input name="account" autocomplete="username" placeholder="建议使用 8 位 ID，重名用户必须用 ID" required /></label>
          <label>密码<input name="password" type="password" autocomplete="current-password" placeholder="请输入账号密码" required /></label>
          <button class="primary wide" type="submit">进入学习案例</button>
          <p class="hint">2 天内刷新页面会自动保持登录。用户名允许重复，系统分配的 8 位 ID 永远唯一。</p>
          <p class="hint">忘记密码或需要开通学校账号时，请联系平台管理员重置。</p>
        </form>
        <form id="registerForm" class="auth-form hidden">
          <label>姓名<input name="name" autocomplete="name" maxlength="30" placeholder="姓名可重复，登录以 8 位 ID 为准" required /></label>
          <label>密码<input name="password" type="password" autocomplete="new-password" minlength="6" maxlength="128" placeholder="至少 6 位" required /></label>
          <label>确认密码<input name="confirmPassword" type="password" autocomplete="new-password" minlength="6" maxlength="128" placeholder="再次输入密码" required /></label>
          <label>身份
            <select name="role">
              <option value="teacher">教师</option>
              <option value="student">学生</option>
            </select>
          </label>
          <label id="registerExtraLabel">任教学科（选填）<input name="extra" placeholder="例如：数学、物理、机器学习" /></label>
          <button class="primary wide" type="submit">注册并开始诊断</button>
          <p id="registerResult" class="auth-result hidden"></p>
          <p class="hint">注册后系统会自动分配 8 位 ID 并直接登录，请记住侧边栏显示的 ID。</p>
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

  const roleSelect = document.querySelector('#registerForm select[name="role"]');
  const extraLabel = document.getElementById("registerExtraLabel");
  const updateRegisterExtraField = () => {
    const copy = authRoleExtraCopy(roleSelect?.value || "teacher");
    if (!extraLabel) return;
    const input = extraLabel.querySelector("input");
    extraLabel.firstChild.textContent = copy.label;
    if (input) input.placeholder = copy.placeholder;
  };
  roleSelect?.addEventListener("change", updateRegisterExtraField);
  updateRegisterExtraField();

  document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    setAuthSubmitting(formEl, true, "登录中...");
    try {
      const payload = await api("/api/auth/login", {
        method: "POST",
        body: { account: form.get("account"), password: form.get("password") }
      });
      state.user = payload.user;
      state.data = payload.state;
      resetSessionSelectionState();
      localStorage.setItem("edu-user", JSON.stringify(state.user));
      state.page = defaultPageForRole(state.user.role);
      renderShell();
      showToast("登录成功");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      if (formEl.isConnected) setAuthSubmitting(formEl, false);
    }
  });

  document.getElementById("registerForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const role = form.get("role");
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    const extra = String(form.get("extra") || "");
    if (password !== confirmPassword) {
      showToast("两次输入的密码不一致", "error");
      return;
    }
    setAuthSubmitting(formEl, true, "注册中...");
    try {
      const payload = await api("/api/auth/register", {
        method: "POST",
        body: {
          name: form.get("name"),
          password,
          role,
          subject: role === "teacher" ? extra : "",
          className: role === "student" ? extra : ""
        }
      });
      state.user = payload.user;
      state.data = payload.state;
      resetSessionSelectionState();
      localStorage.setItem("edu-user", JSON.stringify(state.user));
      state.page = defaultPageForRole(state.user.role);
      renderShell();
      showToast(`注册成功，ID：${payload.user.id}`);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      if (formEl.isConnected) setAuthSubmitting(formEl, false);
    }
  });
}

function renderShell() {
  const isAdmin = state.user?.role === "admin";
  const teacherSide = state.user?.role === "teacher";
  const menus = menuForCurrentUser();
  const classes = state.data?.classes || [];
  const identity = isAdmin
    ? "系统管理"
    : teacherSide
    ? (state.user.subject || preferredSubject() || "未设置学科")
    : studentClassSummary(classes);
  const sidebarBasicInfo = renderSidebarBasicInfo({ isAdmin, teacherSide, classes });
  if (state.page === "history") state.page = "ai";
  app.innerHTML = `
    <div class="layout ${state.navOpen ? "drawer-open" : ""} ${state.navCollapsed ? "nav-collapsed" : ""}">
      <header class="project-header">
        <div class="project-header-brand">
          <span class="project-brand-mark">${iconSvg("school", CASE_NAME)}</span>
          <strong>${CASE_NAME}</strong>
          <span class="project-header-separator">--</span>
          <span class="project-header-tagline">智慧教育智能体平台</span>
        </div>
        <div class="project-header-actions">
          <span>${escapeHtml(state.user.name)} · ${roleName(state.user.role)}</span>
          <button class="mini side-action-button" type="button" id="headerRefreshBtn" title="刷新数据">${iconSvg("refresh", "刷新")}</button>
        </div>
      </header>
      <header class="mobile-topbar">
        <div class="mobile-brand">
          <span class="project-brand-mark">${iconSvg("school", CASE_NAME)}</span>
          <strong>${CASE_NAME}</strong>
          <span class="mobile-brand-separator">--</span>
          <span class="mobile-brand-tagline">智慧教育智能体平台</span>
        </div>
        <button type="button" id="mobileMenuBtn" title="打开菜单">${iconSvg("menu", "菜单")}</button>
      </header>
      <div class="drawer-backdrop" id="drawerBackdrop"></div>
      <aside class="sidebar">
        <div class="sidebar-top">
          ${sidebarBasicInfo || renderSidebarToggle()}
        </div>
        <nav class="nav" aria-label="${isAdmin ? "管理员" : teacherSide ? "教师" : "学生"}导航">
          ${renderNavSections(menus)}
        </nav>
        <button id="logoutBtn" class="ghost wide" title="退出登录">${iconSvg("logout", "退出登录")}<span>退出登录</span></button>
      </aside>
      <main class="main">
        <section id="content" class="content"></section>
      </main>
      ${renderBottomNav(menus)}
      ${renderConversationContextMenu()}
    </div>
  `;
  document.getElementById("mobileMenuBtn")?.addEventListener("click", () => {
    state.navOpen = !state.navOpen;
    renderShell();
  });
  document.getElementById("drawerBackdrop")?.addEventListener("click", () => {
    state.navOpen = false;
    renderShell();
  });
  document.getElementById("sidebarToggleBtn")?.addEventListener("click", () => {
    state.navCollapsed = !state.navCollapsed;
    renderShell();
  });
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.page = button.dataset.page;
      state.settingsEditOpen = false;
      state.settingsJoinOpen = false;
      state.settingsClassesOpen = false;
      state.settingsTeacherClassesOpen = false;
      state.navOpen = false;
      state.selectedMessages.clear();
      await loadState();
      renderShell();
    });
  });
  document.querySelector("[data-learning-class-select]")?.addEventListener("change", async (event) => {
    try {
      const payload = await api("/api/student/learning-class", {
        method: "PUT",
        body: { classId: event.currentTarget.value }
      });
      state.user = payload.user;
      state.data = payload.state;
      state.selectedGraphId = null;
      state.graphFocusNodeId = null;
      state.graphSelectedNodeId = null;
      state.partnerGraphs = null;
      state.partnerSnapshot = null;
      state.partnerGraphId = "";
      state.partnerChapterId = "";
      state.partnerNodeId = "";
      state.partnerQuiz = null;
      state.partnerResult = null;
      state.knowledgeTest = { ...state.knowledgeTest, materialId: "", quizId: "", questions: [], currentIndex: 0, answer: "", result: null, attempts: [], summary: null, sourceNotice: "", sourceMaterials: [] };
      localStorage.setItem("edu-user", JSON.stringify(state.user));
      renderShell();
      showToast(state.user.learningClassId ? "已切换学习班级" : "已取消学习班级，班级学习资料已隐藏");
    } catch (error) {
      showToast(error.message, "error");
      await loadState();
      renderShell();
    }
  });
  document.querySelector("[data-teacher-class-select]")?.addEventListener("change", (event) => {
    state.selectedClassId = event.currentTarget.value || null;
    rememberTeacherSelectedClass(state.selectedClassId);
    state.classManageOpen = Boolean(state.selectedClassId);
    state.selectedGraphId = null;
    state.materialDetailId = null;
    state.teacherHomeworkDetailId = null;
    state.teacherHomeworkPendingId = null;
    state.homeworkModal = null;
    state.classLearningOpen = false;
    state.classAnalytics = null;
    state.classStudentAnalytics = null;
    state.page = "classes";
    state.navOpen = false;
    renderShell();
  });
  document.querySelectorAll("[data-sidebar-conversation]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.activeConversationId = button.dataset.sidebarConversation;
      const conv = (state.data?.conversations || []).find((item) => item.id === state.activeConversationId);
      if (conv?.mode) state.aiMode = normalizeAiModeClient(conv.mode);
      state.page = "ai";
      state.conversationContextMenu = null;
      await loadState();
      renderShell();
    });
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      state.conversationContextMenu = {
        id: button.dataset.sidebarConversation,
        x: Math.min(event.clientX, window.innerWidth - 130),
        y: Math.min(event.clientY, window.innerHeight - 60)
      };
      renderShell();
    });
  });
  document.getElementById("newConversationSidebarBtn")?.addEventListener("click", async (event) => {
    event.stopPropagation();
    try {
      const payload = await api("/api/conversations", {
        method: "POST",
        body: { userId: state.user.id, mode: "qa", title: "新的对话" }
      });
      state.page = "ai";
      state.activeConversationId = payload.conversation.id;
      state.aiMode = "qa";
      state.conversationContextMenu = null;
      await loadState();
      renderShell();
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.querySelector("[data-context-delete-conversation]")?.addEventListener("click", async (event) => {
    const conversationId = event.currentTarget.dataset.contextDeleteConversation;
    try {
      await api(`/api/conversations/${conversationId}?userId=${state.user.id}`, { method: "DELETE" });
      if (state.activeConversationId === conversationId) state.activeConversationId = null;
      state.conversationContextMenu = null;
      await loadState();
      renderShell();
      showToast("历史对话已删除");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.addEventListener("click", (event) => {
    if (!state.conversationContextMenu || event.target.closest(".conversation-context-menu")) return;
    state.conversationContextMenu = null;
    renderShell();
  }, { once: true });
  document.getElementById("logoutBtn").addEventListener("click", () => {
    api("/api/auth/logout", { method: "POST", body: {} }).catch(() => null).finally(() => {
      localStorage.removeItem("edu-user");
      Object.assign(state, {
        user: null,
        data: null,
        page: "ai",
        activeConversationId: null,
        activeThreadId: null,
        navOpen: false,
        subjectDefaultsInitialized: false
      });
      resetSessionSelectionState();
      renderAuth();
    });
  });
  document.getElementById("refreshBtn")?.addEventListener("click", async () => {
    await loadState();
    renderShell();
    showToast("数据已刷新");
  });
  document.getElementById("headerRefreshBtn")?.addEventListener("click", async () => {
    await loadState();
    renderShell();
    showToast("数据已刷新");
  });
  renderContent();
}

function renderContent() {
  const content = document.getElementById("content");
  if (state.page === "history") state.page = "ai";
  if (state.page === "home") state.page = defaultPageForRole();
  if (state.user?.role === "admin" && !["admin", "admin-api"].includes(state.page)) state.page = "admin";
  if (!menuForCurrentUser().some((item) => item.key === state.page)) state.page = defaultPageForRole();
  if (state.page !== "graph") state.graphMaximized = false;
  const main = document.querySelector(".main");
  main?.classList.toggle("ai-main", state.page === "ai");
  document.body?.classList.toggle("graph-page-maximized", state.page === "graph" && state.graphMaximized);
  const contentClasses = ["content"];
  if (state.page === "ai") contentClasses.push("ai-content");
  if (state.page === "graph") contentClasses.push("graph-content");
  if (state.page === "graph" && state.user?.role === "student") contentClasses.push("student-graph-content");
  if (state.page === "materials") contentClasses.push("materials-content");
  if (state.page === "partner") contentClasses.push("partner-content");
  if (state.page === "homework") contentClasses.push("homework-content");
  if (state.page === "chat") contentClasses.push("chat-content");
  if (state.page === "settings") contentClasses.push("settings-content");
  if (state.page === "classes") contentClasses.push("class-content");
  if (state.page === "learning-path") contentClasses.push("learning-path-content");
  if (["admin", "admin-api"].includes(state.page)) contentClasses.push("admin-content");
  content.className = contentClasses.join(" ");
  const pageMap = {
    graph: renderGraphPage,
    ai: renderAiPage,
    partner: renderLearningPartnerPage,
    materials: renderMaterialsPage,
    portfolio: renderStudentPortfolioPage,
    chat: renderChatPage,
    classes: renderClassLearningPage,
    "learning-path": renderTeacherLearningPathPage,
    admin: renderAdminPage,
    "admin-api": renderAdminApiPage,
    homework: isTeacherLike() ? renderTeacherHomeworkPage : renderStudentHomeworkPage,
    settings: renderSettingsPage
  };
  const renderer = pageMap[state.page] || renderAiPage;
  const pageMarkup = renderer();
  const pageShell = state.page === "graph" && state.user?.role === "student" ? "graph-student" : state.page;
  content.innerHTML = `<section class="nav-page-shell nav-page-shell--${pageShell}">${renderPageHeader()}<div class="nav-page-body nav-page-body--${state.page}">${pageMarkup}</div></section>`;
  bindCurrentPage();
}

function bindCurrentPage() {
  const binders = {
    graph: bindGraphPage,
    ai: bindAiPage,
    partner: bindLearningPartnerPage,
    materials: bindMaterialsPage,
    portfolio: bindStudentPortfolioPage,
    chat: bindChatPage,
    classes: bindClassPage,
    "learning-path": bindLearningPathPage,
    admin: bindAdminPage,
    "admin-api": bindAdminApiPage,
    homework: isTeacherLike() ? bindTeacherHomeworkPage : bindStudentHomeworkPage,
    settings: bindSettingsPage
  };
  (binders[state.page] || bindAiPage)();
}

function bindLearningPathPage() {
  bindGraphPage();
  document.querySelectorAll("[data-learning-path-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.learningPathTab = button.dataset.learningPathTab || "library";
      state.selectedGraphId = null;
      renderContent();
    });
  });
}

function learningPartnerStatusLabel(status) {
  return { locked: "待解锁", available: "可学习", learning: "学习中", completed: "已完成" }[status] || "待开始";
}

function applyLearningPartnerSnapshot(payload) {
  state.partnerSnapshot = { graph: payload.graph, nodes: payload.nodes || [], chapters: payload.chapters || [], summary: payload.summary || {} };
  state.partnerGraphId = payload.graph?.id || "";
  const nodes = state.partnerSnapshot.nodes;
  const chapters = state.partnerSnapshot.chapters;
  if (!chapters.some((chapter) => chapter.id === state.partnerChapterId && chapter.status !== "locked")) {
    state.partnerChapterId = chapters.find((chapter) => chapter.status === "available")?.id || chapters.filter((chapter) => chapter.status === "completed").at(-1)?.id || chapters[0]?.id || "";
  }
  const chapterNodes = nodes.filter((node) => node.chapterId === state.partnerChapterId);
  if (!chapterNodes.some((node) => node.id === state.partnerNodeId)) {
    state.partnerNodeId = chapterNodes.find((node) => node.status === "learning")?.id || chapterNodes.find((node) => node.status === "available")?.id || chapterNodes[0]?.id || "";
  }
  state.partnerGraphs = (state.partnerGraphs || []).map((graph) => graph.id === state.partnerGraphId ? { ...graph, summary: payload.summary || graph.summary } : graph);
}

async function loadLearningPartnerSnapshot(graphId) {
  const payload = await api(`/api/learning-partner/graphs/${encodeURIComponent(graphId)}`);
  applyLearningPartnerSnapshot(payload);
}

function renderPartnerPanelToggle(panel, open) {
  const isRoute = panel === "route";
  const label = open
    ? `收起${isRoute ? "学习节点" : "学习进度"}`
    : `展开${isRoute ? "学习节点" : "学习进度"}`;
  const icon = open
    ? (isRoute ? "chevronLeft" : "chevronRight")
    : (isRoute ? "chevronRight" : "chevronLeft");
  return `<button class="partner-panel-toggle" type="button" data-partner-panel-toggle="${panel}" aria-label="${label}" aria-expanded="${open}" title="${label}">${iconSvg(icon, label)}</button>`;
}

function renderLearningPartnerPage() {
  const activeClass = activeLearningClass();
  if (!activeClass) {
    return `<section class="partner-page"><div class="empty-state"><p>请先在左侧“正在学习”中选择班级。选择后可查看该班级已发布的学习路径并开始学习。</p></div></section>`;
  }
  if (!Array.isArray(state.partnerGraphs)) {
    return `<section class="partner-page"><p class="hint">正在加载本班已发布的学习路径...</p></section>`;
  }
  if (!state.partnerGraphs.length) {
    return `<section class="partner-page"><div class="empty-state"><p>${escapeHtml(`${activeClass.name}暂未同步已发布的学习路径。`)}</p></div></section>`;
  }
  const snapshot = state.partnerSnapshot;
  if (!snapshot || snapshot.graph?.id !== state.partnerGraphId) {
    return `<section class="partner-page"><p class="hint">正在加载节点进度...</p></section>`;
  }
  const nodes = snapshot.nodes || [];
  const chapters = snapshot.chapters || [];
  const chapter = chapters.find((item) => item.id === state.partnerChapterId) || chapters[0];
  const chapterNodes = nodes.filter((item) => item.chapterId === chapter?.id);
  const node = chapterNodes.find((item) => item.id === state.partnerNodeId) || chapterNodes[0];
  const quiz = state.partnerQuiz?.nodeId === node?.id ? state.partnerQuiz : null;
  const result = state.partnerResult?.nodeId === node?.id ? state.partnerResult : null;
  return `
    <section class="partner-page">
      <section class="partner-workspace ${state.partnerRouteOpen ? "" : "partner-route-collapsed"} ${state.partnerSummaryOpen ? "" : "partner-summary-collapsed"}">
        <aside class="panel partner-route ${state.partnerRouteOpen ? "" : "is-collapsed"}" aria-label="知识节点路线">
          ${state.partnerRouteOpen ? `
            <div class="partner-summary-head partner-node-head"><strong>学习节点</strong>${renderPartnerPanelToggle("route", true)}</div>
            <label class="partner-chapter-select">学习章节<select data-partner-chapter>${chapters.map((item, index) => `<option value="${escapeHtml(item.id)}" ${item.id === chapter?.id ? "selected" : ""} ${item.status === "locked" ? "disabled" : ""}>第 ${index + 1} 章 · ${escapeHtml(item.label)}${item.status === "completed" ? "（已通过）" : item.status === "locked" ? "（待解锁）" : ""}</option>`).join("")}</select></label>
            <ol class="partner-node-list">
              ${chapterNodes.map((item, index) => `<li class="${item.status} ${item.id === node?.id ? "current" : ""}"><button type="button" ${item.status === "locked" ? "disabled" : `data-partner-node="${escapeHtml(item.id)}"`}><b>${index + 1}</b><span><strong>${escapeHtml(item.label)}</strong><small>${learningPartnerStatusLabel(item.status)}${item.score == null ? "" : ` · ${item.score} 分`}</small></span></button></li>`).join("")}
            </ol>
          ` : `<div class="partner-collapsed-control">${renderPartnerPanelToggle("route", false)}</div>`}
        </aside>
        <main class="panel partner-node-panel">
          ${node ? `
            <div class="partner-node-kicker"><span>${learningPartnerStatusLabel(node.status)}</span><small>${node.attempts ? `已测评 ${node.attempts} 次` : "尚未测评"}</small></div>
            <h3>${escapeHtml(node.label)}</h3>
            <p class="partner-node-summary">${escapeHtml(node.details || node.learningGoal)}</p>
            <section class="partner-node-section"><strong>教材讲解</strong><p>${escapeHtml(node.explanation || node.learningGoal)}</p></section>
            ${node.sourceAnchors?.length ? `<section class="partner-node-section"><strong>教材依据</strong><ul>${node.sourceAnchors.map((item) => `<li>${escapeHtml(`${item.sourceName || "课程资料"} · ${item.chapter || ""} · 第 ${item.page || "-"} 页：${item.quote || ""}`)}</li>`).join("")}</ul></section>` : ""}
            <section class="partner-node-section"><strong>学习目标</strong><p>${escapeHtml(node.learningGoal)}</p></section>
            <section class="partner-node-section"><strong>前置知识</strong><p>${escapeHtml(node.prerequisiteLabels.join("、") || "无，当前节点可直接开始学习。")}</p></section>
            ${node.resources.length ? `<section class="partner-node-section"><strong>建议学习材料</strong><ul>${node.resources.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>` : ""}
            ${node.diagnosticQuestions.length ? `<section class="partner-node-section"><strong>自检提示</strong><ul>${node.diagnosticQuestions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>` : ""}
            <section class="partner-node-action">
              <span>${escapeHtml(node.masteryStandard)}</span>
              ${node.status === "available" ? `<button class="primary" type="button" data-partner-start="${escapeHtml(node.id)}">开始学习</button>` : `<button class="primary" type="button" data-partner-quiz="${escapeHtml(node.id)}">生成 3 题节点测评</button>`}
            </section>
            ${quiz ? `<form class="partner-quiz" data-partner-quiz-form data-node-id="${escapeHtml(node.id)}" data-quiz-id="${escapeHtml(quiz.id)}"><div class="partner-quiz-head"><strong>节点测评</strong><span>完成全部 3 题后提交，70 分通过。</span></div>${quiz.questions.map((question, index) => `<label><strong>${index + 1}. ${escapeHtml(question.prompt)}</strong><small>${escapeHtml(question.rubric || "结合节点内容作答。")}</small><textarea name="answer-${escapeHtml(question.id)}" rows="4" placeholder="写出你的分析、依据与结论" required ${state.partnerSubmitting ? "disabled" : ""}></textarea></label>`).join("")}<button class="primary" type="submit" ${state.partnerSubmitting ? "disabled" : ""}>${state.partnerSubmitting ? "正在提交..." : "提交节点测评"}</button></form>` : ""}
            ${result ? `<section class="partner-result ${result.passed ? "passed" : "needs-review"}"><strong>${result.passed ? `通过：${result.score} 分` : `本次 ${result.score} 分`}</strong><p>${escapeHtml(result.feedback)}</p></section>` : ""}
          ` : ""}
        </main>
        <aside class="panel partner-summary-panel ${state.partnerSummaryOpen ? "" : "is-collapsed"}">
          ${state.partnerSummaryOpen ? `
            <div class="partner-summary-head"><span class="cockpit-section-label">学习进度</span>${renderPartnerPanelToggle("summary", true)}</div>
            <strong class="partner-progress-number">${snapshot.summary.progress || 0}%</strong>
            <div class="partner-progress-track"><i style="width:${Math.max(0, Math.min(100, Number(snapshot.summary.progress || 0)))}%"></i></div>
            <p>已完成 ${snapshot.summary.completed || 0} 个节点；当前为第 ${Math.max(1, chapters.findIndex((item) => item.id === chapter?.id) + 1)} 章，共 ${chapters.length} 章。</p>
            <section><strong>通过规则</strong><p>完成当前节点的 3 道测评题，累计得分达到 70 分。</p></section>
            <section><strong>章节规则</strong><p>完成当前章节全部节点后，下一章自动开放；章内节点仍按前置依赖依次解锁。</p></section>
          ` : `<div class="partner-collapsed-control">${renderPartnerPanelToggle("summary", false)}</div>`}
        </aside>
      </section>
    </section>
  `;
}

function bindLearningPartnerPage() {
  if (!activeLearningClass()) return;
  if (!Array.isArray(state.partnerGraphs)) {
    api("/api/learning-partner/graphs")
      .then(async (payload) => {
        state.partnerGraphs = payload.graphs || [];
        state.partnerGraphId = state.partnerGraphs.some((graph) => graph.id === state.partnerGraphId) ? state.partnerGraphId : state.partnerGraphs[0]?.id || "";
        if (state.partnerGraphId) await loadLearningPartnerSnapshot(state.partnerGraphId);
        renderContent();
      })
      .catch((error) => showToast(error.message, "error"));
    return;
  }
  if (state.partnerGraphId && (!state.partnerSnapshot || state.partnerSnapshot.graph?.id !== state.partnerGraphId)) {
    loadLearningPartnerSnapshot(state.partnerGraphId).then(renderContent).catch((error) => showToast(error.message, "error"));
    return;
  }
  document.querySelectorAll("[data-partner-panel-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.partnerPanelToggle === "route") state.partnerRouteOpen = !state.partnerRouteOpen;
      if (button.dataset.partnerPanelToggle === "summary") state.partnerSummaryOpen = !state.partnerSummaryOpen;
      renderContent();
    });
  });
  document.querySelector("[data-partner-graph]")?.addEventListener("change", (event) => {
    state.partnerGraphId = event.currentTarget.value;
    state.partnerSnapshot = null;
    state.partnerChapterId = "";
    state.partnerNodeId = "";
    state.partnerQuiz = null;
    state.partnerResult = null;
    renderContent();
  });
  document.querySelector("[data-partner-chapter]")?.addEventListener("change", (event) => {
    state.partnerChapterId = event.currentTarget.value;
    state.partnerNodeId = "";
    state.partnerQuiz = null;
    state.partnerResult = null;
    applyLearningPartnerSnapshot(snapshot);
    renderContent();
  });
  document.querySelectorAll("[data-partner-node]").forEach((button) => button.addEventListener("click", () => {
    state.partnerNodeId = button.dataset.partnerNode || "";
    state.partnerQuiz = null;
    state.partnerResult = null;
    renderContent();
  }));
  document.querySelector("[data-partner-start]")?.addEventListener("click", async (event) => {
    try {
      const payload = await api(`/api/learning-partner/graphs/${encodeURIComponent(state.partnerGraphId)}/nodes/${encodeURIComponent(event.currentTarget.dataset.partnerStart)}/start`, { method: "POST" });
      applyLearningPartnerSnapshot(payload);
      await loadState();
      renderContent();
      showToast("已开始当前知识节点");
    } catch (error) { showToast(error.message, "error"); }
  });
  document.querySelector("[data-partner-quiz]")?.addEventListener("click", async (event) => {
    try {
      const payload = await api(`/api/learning-partner/graphs/${encodeURIComponent(state.partnerGraphId)}/nodes/${encodeURIComponent(event.currentTarget.dataset.partnerQuiz)}/quiz`, { method: "POST" });
      state.partnerQuiz = payload.quiz;
      state.partnerResult = null;
      state.partnerSubmitting = false;
      await loadState();
      renderContent();
    } catch (error) { showToast(error.message, "error"); }
  });
  document.querySelector("[data-partner-quiz-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (state.partnerSubmitting) return;
    const quizForm = event.currentTarget;
    const nodeId = quizForm.dataset.nodeId;
    const quizId = quizForm.dataset.quizId;
    const form = new FormData(quizForm);
    const answers = (state.partnerQuiz?.questions || []).map((question) => ({ questionId: question.id, answer: String(form.get(`answer-${question.id}`) || "").trim() }));
    if (answers.some((item) => !item.answer)) return showToast("请完成全部测评题", "error");
    try {
      state.partnerSubmitting = true;
      renderContent();
      const payload = await api(`/api/learning-partner/graphs/${encodeURIComponent(state.partnerGraphId)}/nodes/${encodeURIComponent(nodeId)}/submit`, { method: "POST", body: { quizId, answers } });
      applyLearningPartnerSnapshot(payload);
      state.partnerQuiz = null;
      state.partnerResult = { nodeId, ...payload.result };
      state.partnerSubmitting = false;
      await loadState();
      renderContent();
      showToast(payload.result.passed ? "节点已通过，后续节点已解锁" : "未达到通过线，请复习后重新测评", payload.result.passed ? "success" : "error");
    } catch (error) {
      state.partnerSubmitting = false;
      if (error.status === 404) {
        state.partnerQuiz = null;
        loadLearningPartnerSnapshot(state.partnerGraphId).then(renderContent).catch(() => renderContent());
        showToast("该测评已失效，请重新生成后提交。", "error");
        return;
      }
      renderContent();
      showToast(error.message, "error");
    }
  });
}

function renderDashboardStat(label, value, hint = "") {
  return `
    <article class="dashboard-stat">
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(label)}</span>
      ${hint ? `<small>${escapeHtml(hint)}</small>` : ""}
    </article>
  `;
}

function renderDashboardAction(page, title, description, primary = false) {
  return `
    <button class="dashboard-action ${primary ? "primary-action" : ""}" data-dashboard-page="${page}">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(description)}</span>
    </button>
  `;
}

function renderDashboardEmpty(message, page, label) {
  return `
    <div class="dashboard-empty">
      <p>${escapeHtml(message)}</p>
      <button class="mini primary" data-dashboard-page="${page}">${escapeHtml(label)}</button>
    </div>
  `;
}

function teacherDashboardData() {
  const classes = state.data.classes || [];
  const homework = state.data.homework || [];
  const submissions = state.data.submissions || [];
  const materials = state.data.courseMaterials || [];
  const graphs = state.data.knowledgeGraphs || [];
  const conversations = state.data.conversations || [];
  const studentIds = new Set(classes.flatMap((klass) => klass.studentIds || []));
  const pendingReview = submissions.filter((item) => item.status !== "graded").length;
  const reviewPending = submissions.filter((item) => item.status === "review_pending").length;
  const submitted = submissions.length;
  const expected = homework.reduce((sum, item) => {
    const klass = classes.find((classItem) => classItem.id === item.classId);
    return sum + (klass?.studentIds?.length || 0);
  }, 0);
  const unsubmitted = Math.max(0, expected - submitted);
  const recentApplications = classes.flatMap((klass) => (klass.applications || []).map((app) => ({ ...app, className: klass.name })))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const recentQuestions = conversations
    .flatMap((conv) => (conv.messages || []).filter((msg) => msg.role === "user").map((msg) => ({ ...msg, title: conv.title, mode: conv.mode })))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return { classes, homework, submissions, materials, graphs, conversations, studentIds, pendingReview, reviewPending, unsubmitted, recentApplications, recentQuestions };
}

function renderTeacherHomePage() {
  const data = teacherDashboardData();
  const recentMaterials = data.materials.slice(0, 4);
  const recentHomework = data.homework.slice(0, 4);
  return `
    <div class="workbench-page teacher-home-workbench">
    <section class="workbench-title">
      <div>
        <h2>机器学习课程学情工作台</h2>
        <p>围绕某高校班级的“薄弱点—错因—练习”闭环，帮助教师及时完成分层干预。</p>
      </div>
      <div class="actions compact-actions">
        <button class="primary" data-dashboard-page="materials">上传资料</button>
        <button class="mini" data-dashboard-page="homework">发布作业</button>
        <button class="mini" data-dashboard-page="graph">知识图谱</button>
      </div>
    </section>
    <section class="dashboard-stats compact">
      ${renderDashboardStat("待确认批改", data.pendingReview, data.reviewPending ? `${data.reviewPending} 份已有 AI 建议` : "等待学生提交或教师确认")}
      ${renderDashboardStat("未提交作业", data.unsubmitted, "按当前班级作业估算")}
      ${renderDashboardStat("班级学生", data.studentIds.size, `${data.classes.length} 个班级`)}
      ${renderDashboardStat("课程资料", data.materials.length, `${data.graphs.length} 个知识图谱`)}
    </section>
    <div class="home-workbench-grid teacher">
      <section class="panel dashboard-card home-priority-card">
        <div class="split-head">
          <h3>今日待办</h3>
          <button class="mini" data-dashboard-page="homework">处理</button>
        </div>
        <div class="dashboard-list">
          ${data.pendingReview ? `<article><strong>${data.pendingReview} 份提交需要处理</strong><span>进入作业管理，可生成 AI 建议或确认最终成绩。</span></article>` : ""}
          ${data.unsubmitted ? `<article><strong>${data.unsubmitted} 人次尚未提交</strong><span>可在作业详情中查看提交情况并提醒学生。</span></article>` : ""}
          ${data.recentApplications[0] ? data.recentApplications.slice(0, 3).map((item) => `<article><strong>${escapeHtml(item.studentName)} 加入 ${escapeHtml(item.className)}</strong><span>${escapeHtml(item.reason || item.status)} · ${fmtTime(item.createdAt)}</span></article>`).join("") : ""}
          ${!data.pendingReview && !data.unsubmitted && !data.recentApplications.length ? renderDashboardEmpty("暂无待办。可以先上传资料、生成图谱或发布第一份作业。", "materials", "上传资料") : ""}
        </div>
      </section>
      <section class="panel dashboard-card">
        <div class="split-head">
          <h3>课程资产</h3>
          <button class="mini" data-dashboard-page="materials">管理资料</button>
        </div>
        <div class="dashboard-list">
          ${recentMaterials.map((item) => `<article><strong>${escapeHtml(item.title || item.name || "课程资料")}</strong><span>${escapeHtml(item.subject || "通用")} · ${fmtTime(item.createdAt || item.updatedAt)}</span></article>`).join("") || renderDashboardEmpty("还没有课程资料。先上传一份课件或教材，系统才能做资料问答和图谱生成。", "materials", "上传第一份资料")}
        </div>
      </section>
      <section class="panel dashboard-card">
        <div class="split-head">
          <h3>最近作业</h3>
          <button class="mini" data-dashboard-page="homework">进入作业</button>
        </div>
        <div class="dashboard-list">
          ${recentHomework.map((item) => `<article><strong>${escapeHtml(item.title)}</strong><span>${fmtTime(item.createdAt)} · ${escapeHtml(compactText(item.description || "无文字说明", 42))}</span></article>`).join("") || renderDashboardEmpty("还没有发布作业。发布作业后，学生提交、AI 建议和教师确认会形成闭环。", "homework", "发布第一份作业")}
        </div>
      </section>
      <section class="panel dashboard-card home-wide-card">
        <div class="split-head">
          <h3>最近高频问题</h3>
          <button class="mini" data-dashboard-page="ai">打开对话</button>
        </div>
        <div class="dashboard-list compact">
          ${data.recentQuestions.slice(0, 5).map((item) => `<article><strong>${escapeHtml(compactText(item.content || "", 70))}</strong><span>${escapeHtml(aiModeLabel(item.mode || "qa"))} · ${fmtTime(item.createdAt)}</span></article>`).join("") || renderDashboardEmpty("还没有教学对话记录。可以从教学指导开始一次课程资料问答或教学设计。", "ai", "发起教学对话")}
        </div>
      </section>
    </div>
    </div>
  `;
}

function renderTeacherSetupChecklist(data) {
  const items = [
    { done: data.materials.length > 0, page: "materials", title: "上传资料", hint: data.materials.length ? `${data.materials.length} 份资料可用` : "先入库教材、课件或讲义" },
    { done: data.graphs.length > 0, page: "graph", title: "生成图谱", hint: data.graphs.length ? `${data.graphs.length} 个图谱` : "从资料或目录生成知识网络" },
    { done: data.classes.length > 0, page: "classes", title: "创建班级", hint: data.classes.length ? `${data.classes.length} 个班级` : "创建班级并获得邀请码" },
    { done: data.homework.length > 0, page: "homework", title: "发布作业", hint: data.homework.length ? `${data.homework.length} 份作业` : "班级创建后发布第一份作业" }
  ];
  return `
    <section class="panel setup-checklist">
      <div class="split-head">
        <h3>初始化清单</h3>
        <span>${items.filter((item) => item.done).length}/${items.length} 已完成</span>
      </div>
      <div class="setup-steps">
        ${items.map((item, index) => `
          <button type="button" class="${item.done ? "done" : ""}" data-dashboard-page="${item.page}">
            <strong>${index + 1}. ${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.hint)}</span>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function currentStudentPortfolio() {
  const fallback = {
    summary: { student: state.user || {}, subject: preferredSubject(), averageMastery: null, latestActivity: "" },
    learningCycle: {
      title: "机器学习第 5-6 章，4 周学习周期",
      subject: preferredSubject(),
      goals: ["理解 KNN、逻辑回归、SVM 等核心算法"],
      currentStage: { activeLabel: "前测诊断", progress: 0, stages: [] },
      evidenceCounts: {},
      evidenceRequirements: { aiDialogues: 3, knowledgeTests: 2, reflections: 1, learningOutputs: 1, wrongFixes: 1 },
      tasks: [],
      rangeText: "第 1 周 到 第 4 周",
      requiredEvidenceText: "至少 3 次 AI 对话、2 次测试、1 份反思、1 个学习产出"
    },
    timeline: [],
    masteryComparison: [],
    aiSupportRecords: [],
    works: [],
    misconceptionTrajectory: [],
    reflections: state.data?.studentReflections || [],
    reflectionExcerpts: [],
    corrections: [],
    aiReviews: state.data?.aiAnswerReviews || [],
    nodeAnnotations: state.data?.studentNodeAnnotations || [],
    collaboration: {},
    ethics: { settings: state.data?.studentEthicsSettings || {} },
    innovation: {
      title: "证据驱动的 AI 学习闭环",
      thesis: "AI 支持诊断、路径推荐、证据记录和反思引导，学生保留自主判断。",
      loop: ["前测诊断", "学习目标设定", "AI + 知识图谱学习", "节点练习/作业", "错因修正", "后测与反思"],
      positioning: "创新点应表述为学习方式、评价方式和 AI 使用方式的改变，而不是技术组件堆叠。",
      points: [
        { title: "证据驱动的 AI 自主学习闭环", summary: "完成诊断、学习、测试、修正、反思、再诊断的完整周期。", evidence: [], evaluationValue: "支撑学习过程记录。" },
        { title: "知识图谱驱动的个性化学习路径", summary: "围绕具体知识节点推荐学习路径。", evidence: [], evaluationValue: "支撑个性化学习。" },
        { title: "AI 诊断与学生反思结合的元认知培养", summary: "推动学生从获得答案转向管理自己的学习。", evidence: [], evaluationValue: "支撑个人反思。" },
        { title: "学生参与校验 AI 的批判性学习机制", summary: "学生纠正定位、评价可靠性、查看引用来源。", evidence: [], evaluationValue: "支撑规范使用 AI。" },
        { title: "自动生成学习证据档案", summary: "自动组织对话、测试、错题、图谱、反思和成果。", evidence: [], evaluationValue: "支撑学习评价和案例申报。" }
      ],
      differentiators: []
    },
    graphRagProfileCoupling: {},
    declarationEvidencePack: {},
    showcase: {}
  };
  return state.data?.studentPortfolio || fallback;
}

function portfolioEvidenceCount(key) {
  const counts = currentStudentPortfolio().learningCycle?.evidenceCounts || {};
  return Number(counts[key] || 0);
}

function renderStageStrip(stage = {}) {
  const stages = Array.isArray(stage.stages) ? stage.stages : [];
  if (!stages.length) return "";
  return `
    <div class="cycle-stage-strip">
      ${stages.map((item) => `
        <span class="${item.done ? "done" : item.key === stage.activeKey ? "active" : ""}">
          <b></b>${escapeHtml(item.label)}
        </span>
      `).join("")}
    </div>
  `;
}

function renderEvidenceMiniStats(counts = {}) {
  const items = [
    ["AI 对话", counts.aiDialogues || 0],
    ["知识测试", counts.knowledgeTests || 0],
    ["掌握变化", counts.masteryChanges || 0],
    ["错题", counts.wrongNotes || 0],
    ["反思", counts.reflections || 0],
    ["AI 审辩", counts.aiReviews || 0],
    ["作业成果", Number(counts.homeworkOutputs || 0)]
  ];
  return `
    <div class="evidence-mini-stats">
      ${items.map(([label, value]) => `<span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(label)}</small></span>`).join("")}
    </div>
  `;
}

function cycleTaskStatusClass(task = {}) {
  return `status-${String(task.statusKey || (task.done ? "done" : "not_started")).replace(/_/g, "-")}`;
}

function renderCycleTaskTracker(cycle = {}, limit = 7, readOnly = false) {
  const tasks = Array.isArray(cycle.tasks) ? cycle.tasks.slice(0, limit) : [];
  return `
    <div class="cycle-task-tracker">
      ${tasks.map((task) => `
        <article class="${task.done ? "done" : "pending"} ${cycleTaskStatusClass(task)}">
          <div>
            <strong>${escapeHtml(task.label || task.shortLabel || "学习任务")}</strong>
            <span>${escapeHtml(task.evidence || "")}</span>
            <small>${escapeHtml(task.evidenceType || "学习证据")} · ${escapeHtml(task.gap || task.statusText || "")}</small>
          </div>
          <b>${escapeHtml(task.statusLabel || task.statusText || `${task.value || 0}/${task.target || 1}`)}</b>
          ${readOnly ? "" : `
            <select class="cycle-task-status-select" data-cycle-task-status="${escapeHtml(task.key)}" aria-label="更新任务状态">
              ${[
                ["not_started", "未开始"],
                ["in_progress", "进行中"],
                ["submitted", "已提交"],
                ["archived", "已入档"],
                ["needs_reflection", "需反思"],
                ["done", "已完成"]
              ].map(([value, label]) => `<option value="${value}" ${task.statusKey === value ? "selected" : ""}>${label}</option>`).join("")}
            </select>
          `}
        </article>
      `).join("") || emptyBlock("暂无周期任务。保存一个学习周期后会自动生成前测、AI 学习、测试、错因、反思、后测和产出任务。")}
    </div>
  `;
}

function renderLearningCycleEditor(cycle = {}) {
  const req = cycle.evidenceRequirements || {};
  const templates = Array.isArray(cycle.templateLibrary) ? cycle.templateLibrary : [];
  const weeklyPlanText = (cycle.weeklyPlan || []).map((item) => {
    const tasks = Array.isArray(item.tasks) && item.tasks.length ? `：${item.tasks.join("；")}` : "";
    return `${item.week || ""}${item.title ? `：${item.title}` : ""}${tasks}`;
  }).join("\n");
  return `
    <section class="panel cycle-editor ${state.cycleSettingsOpen ? "open" : "closed"}">
      <div class="split-head">
        <div>
          <h3>设置周期</h3>
          <p class="hint">学生可以使用模板，也可以按自己的薄弱点自定义本轮学习周期。</p>
        </div>
        <button class="mini" type="button" data-cycle-settings-toggle>${state.cycleSettingsOpen ? "收起" : "打开设置"}</button>
      </div>
      ${state.cycleSettingsOpen ? `
      <form class="cycle-editor-form" data-learning-cycle-form>
        <input type="hidden" name="id" value="${escapeHtml(cycle.virtual ? "" : cycle.id || "")}" />
        <div class="form-grid two">
          <label>选择周期模板
            <select name="templateKey" data-cycle-template-select>
              <option value="">学生自定义周期</option>
              ${templates.map((template) => `<option value="${escapeHtml(template.key)}" ${cycle.templateKey === template.key ? "selected" : ""}>${escapeHtml(template.name || template.title)}</option>`).join("")}
            </select>
          </label>
          <label>查看方式
            <select name="viewMode" data-cycle-view-mode-select>
              <option value="stage" ${(cycle.viewMode || state.cycleViewMode) !== "week" ? "selected" : ""}>按闭环阶段看</option>
              <option value="week" ${(cycle.viewMode || state.cycleViewMode) === "week" ? "selected" : ""}>按周看</option>
            </select>
          </label>
        </div>
        <label>周期名称<input name="title" value="${escapeHtml(cycle.title || "")}" placeholder="机器学习 KNN 与逻辑回归专题学习" /></label>
        <div class="form-grid two">
          <label>学科/专题<input name="subject" value="${escapeHtml(cycle.subject || preferredSubject())}" /></label>
          <label>时间范围<input name="range" value="${escapeHtml(cycle.rangeText || "第 1 周 到 第 4 周")}" placeholder="第 1 周 到 第 4 周" /></label>
        </div>
        <label>学习目标<textarea name="goals" rows="3" placeholder="每行一个目标">${escapeHtml((cycle.goals || []).join("\n"))}</textarea></label>
        <label>核心图谱节点<textarea name="focusNodes" rows="2" placeholder="例如：KNN、距离度量、K 值选择、逻辑回归">${escapeHtml((cycle.focusNodes || []).join("\n"))}</textarea></label>
        <div class="form-grid two">
          <label>推荐测试节点<textarea name="recommendedTestNodes" rows="2" placeholder="每行一个测试节点">${escapeHtml((cycle.recommendedTestNodes || []).join("\n"))}</textarea></label>
          <label>周计划<textarea name="weeklyPlan" rows="4" placeholder="第 1 周：前测诊断：完成 KNN 前测；标注薄弱节点">${escapeHtml(weeklyPlanText)}</textarea></label>
        </div>
        <div class="cycle-requirements-grid">
          <label>AI 对话<input name="aiDialogues" type="number" min="0" max="20" value="${Number(req.aiDialogues ?? 3)}" /></label>
          <label>测试次数<input name="knowledgeTests" type="number" min="0" max="20" value="${Number(req.knowledgeTests ?? 2)}" /></label>
          <label>反思份数<input name="reflections" type="number" min="0" max="20" value="${Number(req.reflections ?? 1)}" /></label>
          <label>学习产出<input name="learningOutputs" type="number" min="0" max="20" value="${Number(req.learningOutputs ?? 1)}" /></label>
        </div>
        <p class="hint">证据要求会用于首页进度、学习档案和参赛展示页，不会覆盖已有学习记录。</p>
        <div class="actions compact-actions">
          <button class="primary" type="submit">保存学习周期</button>
          <button class="mini" type="button" data-cycle-ai-suggest>AI 生成周期建议</button>
        </div>
      </form>
      ` : ""}
    </section>
  `;
}

function renderCycleGapList(cycle = {}) {
  const gaps = Array.isArray(cycle.evidenceGaps) ? cycle.evidenceGaps : [];
  const shown = gaps.slice(0, 5);
  return `
    <div class="cycle-gap-list">
      ${shown.map((item) => `
        <button type="button" data-dashboard-page="${escapeHtml(item.page || "portfolio")}">
          <strong>${escapeHtml(item.gap || item.label)}</strong>
          <span>${escapeHtml(item.nextAction || item.evidenceType || "")}</span>
        </button>
      `).join("") || `<article class="cycle-gap-done"><strong>证据链已完整</strong><span>可以进入学习档案生成周期完成报告和匿名申报包。</span></article>`}
    </div>
  `;
}

function renderCyclePlanView(cycle = {}) {
  const mode = state.cycleViewMode || cycle.viewMode || "stage";
  const tasks = Array.isArray(cycle.tasks) ? cycle.tasks : [];
  const weeks = Array.isArray(cycle.weeklyPlan) ? cycle.weeklyPlan : [];
  return `
    <section class="panel dashboard-card cycle-plan-card">
      <div class="split-head">
        <div>
          <h3>${mode === "week" ? "周视图" : "闭环阶段视图"}</h3>
          <p class="hint">${mode === "week" ? "按实施周期展示每周任务，适合参赛录屏说明完整实施过程。" : "按前测、AI 学习、测试、修正、反思、后测展示证据链。"}</p>
        </div>
        <div class="segmented-control cycle-view-toggle">
          <button type="button" class="${mode !== "week" ? "active" : ""}" data-cycle-view-mode="stage">阶段</button>
          <button type="button" class="${mode === "week" ? "active" : ""}" data-cycle-view-mode="week">周</button>
        </div>
      </div>
      ${mode === "week" ? `
        <div class="cycle-week-list">
          ${weeks.map((week) => `
            <article>
              <strong>${escapeHtml(week.week || "本周")}</strong>
              <span>${escapeHtml(week.title || "")}</span>
              <ul>${(week.tasks || []).map((task) => `<li>${escapeHtml(task)}</li>`).join("")}</ul>
            </article>
          `).join("") || emptyBlock("暂无周计划。打开“设置周期”后可以选择模板或自定义每周任务。")}
        </div>
      ` : `
        <div class="cycle-stage-list">
          ${tasks.slice(0, 6).map((task, index) => `
            <article class="${cycleTaskStatusClass(task)}">
              <b>${index + 1}</b>
              <div>
                <strong>${escapeHtml(task.label || task.shortLabel)}</strong>
                <span>${escapeHtml(task.evidenceType || "")} · ${escapeHtml(task.statusLabel || "")}</span>
                <p>${escapeHtml(task.nextAction || task.evidence || "")}</p>
              </div>
            </article>
          `).join("")}
        </div>
      `}
    </section>
  `;
}

function renderCycleCompletionCard(cycle = {}) {
  const report = cycle.completionReport || {};
  return `
    <section class="panel dashboard-card cycle-completion-card">
      <div class="split-head">
        <div>
          <h3>学习周期完成报告</h3>
          <p class="hint">${escapeHtml(report.statusText || "周期达到 100% 后自动生成。")}</p>
        </div>
        <button class="mini" type="button" data-dashboard-page="portfolio">查看档案</button>
      </div>
      <div class="cycle-report-summary">
        <strong>${escapeHtml(report.ready ? (report.title || "周期完成报告") : "待生成")}</strong>
        <p>${escapeHtml(report.summary || "完成前测、AI 学习、知识测试、错因修正、反思、后测和学习产出后自动生成。")}</p>
      </div>
      ${report.ready ? `<div class="cycle-report-chips">
        <span>${Number(report.masteryChange?.improvedTopics || 0)} 个知识点提升</span>
        <span>${Number(report.misconceptionChange?.wrongNotes || 0)} 条错因记录</span>
        <span>${Number(report.citationSummary?.count || 0)} 条引用来源</span>
      </div>` : ""}
    </section>
  `;
}

function renderLearningCycleWizard(cycle = {}, portfolio = currentStudentPortfolio()) {
  const counts = cycle.evidenceCounts || {};
  const tasks = Array.isArray(cycle.tasks) ? cycle.tasks : [];
  const task = (key) => tasks.find((item) => item.key === key) || {};
  const hasPlan = !cycle.virtual && (cycle.goals || []).length > 0 && ((cycle.focusNodes || []).length || (cycle.recommendedTestNodes || []).length);
  const steps = [
    { key: 1, label: "课程与主题", short: "选择", done: hasPlan, task: task("goals"), next: "选择课程、知识主题并保存本轮目标" },
    { key: 2, label: "完成前测", short: "前测", done: Number(counts.knowledgeTests || 0) >= 1, task: task("pretest"), next: "独立完成一次前测，留下原始掌握度与误区" },
    { key: 3, label: "AI 诊断与路径", short: "诊断", done: Number(counts.aiDialogues || 0) > 0 && (Number(counts.nodeAnnotations || 0) + Number(counts.learningCards || 0) > 0), task: task("aiGraph"), next: "带着原始答案向 AI 追问，再打开图谱路径" },
    { key: 4, label: "补救练习与订正", short: "补救", done: Number(counts.wrongNotes || 0) + Number(counts.corrections || 0) >= Math.max(1, Number(cycle.evidenceRequirements?.wrongFixes || 1)), task: task("wrongFix"), next: "完成变式练习，写下错因与修正后的理解" },
    { key: 5, label: "后测、反思与作品", short: "收束", done: Number(counts.knowledgeTests || 0) >= 2 && Number(counts.reflections || 0) > 0 && Number(counts.learningOutputs || 0) > 0, task: task("postReflection"), next: "完成后测，提交反思和一个可展示的学习作品" }
  ];
  const firstIncomplete = steps.findIndex((item) => !item.done);
  const activeIndex = Math.max(1, Math.min(5, Number(state.cycleWizardStep || (firstIncomplete === -1 ? 5 : firstIncomplete + 1))));
  const active = steps[activeIndex - 1];
  const evidence = [
    `已产生：${Number(counts.knowledgeTests || 0)} 次测试`,
    `${Number(counts.aiDialogues || 0)} 次 AI 对话`,
    `${Number(counts.wrongNotes || 0) + Number(counts.corrections || 0)} 条订正`,
    `${Number(counts.reflections || 0)} 份反思`,
    `${Number(counts.learningOutputs || 0)} 个作品`
  ];
  const missing = active.done ? "本阶段完成，可进入下一步。" : (active.task.gap || active.next);
  const action = activeIndex === 1 ? `<button class="primary" type="button" data-cycle-settings-open>选择课程与主题</button>` : `<button class="primary" type="button" data-dashboard-page="${escapeHtml(active.task.page || (activeIndex === 3 ? "ai" : "portfolio"))}">${escapeHtml(activeIndex === 2 ? "开始前测" : activeIndex === 3 ? "开始 AI 诊断" : activeIndex === 4 ? "进入订正" : "完成后测与反思")}</button>`;
  return `
    <section class="panel cycle-wizard" aria-label="学习周期五步向导">
      <div class="cycle-wizard-head">
        <div><span class="cycle-eyebrow">LEARNING CYCLE WIZARD</span><h2>一步一步完成本轮学习</h2><p>${escapeHtml(cycle.title || "还没有学习周期")} · 当前阶段：<strong>${escapeHtml(active.label)}</strong></p></div>
        <span class="cycle-wizard-progress">${steps.filter((item) => item.done).length}/5 完成</span>
      </div>
      <nav class="cycle-wizard-steps" aria-label="学习周期阶段">
        ${steps.map((item) => `<button type="button" class="${item.key === activeIndex ? "active" : ""} ${item.done ? "done" : ""}" data-cycle-wizard-step="${item.key}"><b>${item.done ? "✓" : item.key}</b><span>${item.label}</span></button>`).join("")}
      </nav>
      <div class="cycle-wizard-body">
        <div class="cycle-wizard-main"><span class="cockpit-section-label">第 ${activeIndex} 步 · ${active.label}</span><h3>${escapeHtml(active.done ? "这一阶段已完成" : active.next)}</h3><p class="cycle-wizard-condition"><strong>完成条件：</strong>${escapeHtml(active.task.evidence || (activeIndex === 1 ? "保存课程、知识主题和至少一个学习目标" : active.next))}</p>${action}<button class="mini" type="button" data-cycle-wizard-next ${activeIndex >= 5 ? "disabled" : ""}>${active.done && activeIndex < 5 ? "进入下一步" : "稍后继续"}</button></div>
        <aside class="cycle-wizard-aside"><div><strong>已产生的证据</strong>${evidence.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div><div class="cycle-wizard-missing"><strong>还缺什么</strong><span>${escapeHtml(missing)}</span></div></aside>
      </div>
    </section>
  `;
}

function renderAnswerFirstCard(cycle = {}) {
  const topic = (cycle.focusNodes || [])[0] || (cycle.recommendedTestNodes || [])[0] || "KNN";
  return `
    <section class="panel dashboard-card answer-first-card">
      <div class="split-head">
        <div>
          <h3>先作答再求助</h3>
          <p class="hint">先保留原始理解，再让 AI 基于你的答案诊断误区，避免直接要答案。</p>
        </div>
        <span>入档为 AI 诊断证据</span>
      </div>
      <form class="answer-first-form" data-answer-first-form>
        <label>知识点<input name="knowledgePoint" value="${escapeHtml(topic)}" /></label>
        <label>我的原始理解<textarea name="studentAnswer" rows="4" required placeholder="先写你自己的解释、解题思路或不确定点"></textarea></label>
        <button class="primary" type="submit">让 AI 诊断</button>
      </form>
    </section>
  `;
}

function renderPortfolioExportActions(compact = false) {
  const anonymousDefault = currentStudentPortfolio().ethics?.settings?.anonymousExportDefault || state.data?.studentEthicsSettings?.anonymousExportDefault;
  return `
    <div class="actions compact-actions portfolio-export-actions ${compact ? "compact" : ""}">
      <button class="primary" type="button" data-portfolio-export="html">导出档案</button>
      <button class="mini" type="button" data-portfolio-export="pdf">PDF</button>
      <button class="mini" type="button" data-portfolio-export="csv">CSV</button>
      <button class="mini" type="button" data-portfolio-export="json">JSON</button>
      <button class="mini" type="button" data-portfolio-export="application">申报素材</button>
      <button class="mini" type="button" data-portfolio-export="script">视频脚本</button>
      <label class="check-line export-anonymous"><input type="checkbox" data-portfolio-anonymous ${anonymousDefault ? "checked" : ""} />匿名</label>
    </div>
  `;
}

function renderPortfolioTimelineList(items = [], limit = 6) {
  const shown = items.slice(0, limit);
  return `
    <div class="portfolio-timeline-list">
      ${shown.map((item) => `
        <article>
          <time>${escapeHtml(fmtTime(item.time))}</time>
          <div>
            <strong>${escapeHtml(item.title || item.type || "学习事件")}</strong>
            <span>${escapeHtml(item.type || "")}${item.score ? ` · ${escapeHtml(item.score)}` : ""}${item.source ? ` · ${escapeHtml(item.source)}` : ""}</span>
            ${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ""}
          </div>
        </article>
      `).join("") || emptyBlock("暂无学习事件。完成 AI 对话、知识测试、作业或反思后会形成时间线。")}
    </div>
  `;
}

function renderMasteryComparisonRows(rows = [], limit = 8) {
  const shown = rows.slice(0, limit);
  return `
    <div class="portfolio-table-list mastery-comparison-list">
      ${shown.map((item) => `
        <article>
          <strong>${escapeHtml(item.topic)}</strong>
          <span>前测 ${escapeHtml(item.startText)} · 当前 ${escapeHtml(item.currentText)} · ${escapeHtml(item.changeText)}</span>
          <div class="mastery-meter small"><span style="width:${item.current === null || item.current === undefined ? 0 : clamp(Number(item.current || 0), 0, 1) * 100}%"></span></div>
        </article>
      `).join("") || emptyBlock("暂无前后测对比。完成知识测试或 AI 诊断后会显示每个知识点的变化。")}
    </div>
  `;
}

function renderInnovationLoopCard(portfolio = currentStudentPortfolio()) {
  const innovation = portfolio.innovation || {};
  const loop = Array.isArray(innovation.loop) ? innovation.loop : [];
  const points = Array.isArray(innovation.points) ? innovation.points : [];
  return `
    <section class="panel innovation-loop-card">
      <div class="split-head">
        <div>
          <h3>${escapeHtml(innovation.title || "证据驱动的 AI 学习闭环")}</h3>
          <p class="hint">${escapeHtml(innovation.thesis || "AI 支持诊断、推荐、证据记录和反思引导，学生保留自主判断。")}</p>
          ${innovation.positioning ? `<p class="hint innovation-positioning">${escapeHtml(innovation.positioning)}</p>` : ""}
        </div>
      </div>
      <div class="innovation-loop-strip">
        ${loop.map((item, index) => `<span><b>${index + 1}</b>${escapeHtml(item)}</span>`).join("")}
      </div>
      ${points.length ? `
        <div class="innovation-point-grid">
          ${points.slice(0, 5).map((point, index) => `
            <article>
              <span>${index + 1}</span>
              <div>
                <strong>${escapeHtml(point.title || "")}</strong>
                <p>${escapeHtml(point.summary || "")}</p>
                ${(point.evidence || []).length ? `<small>证据：${escapeHtml((point.evidence || []).join("；"))}</small>` : ""}
                ${point.evaluationValue ? `<em>${escapeHtml(point.evaluationValue)}</em>` : ""}
              </div>
            </article>
          `).join("")}
        </div>
      ` : (innovation.differentiators || []).length ? `
        <div class="innovation-point-list">
          ${innovation.differentiators.slice(0, 5).map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
        </div>
      ` : ""}
    </section>
  `;
}

function renderGraphRagProfileCard(portfolio = currentStudentPortfolio()) {
  const item = portfolio.graphRagProfileCoupling || {};
  const path = Array.isArray(item.recommendedPath) ? item.recommendedPath : [];
  return `
    <section class="panel portfolio-section graph-profile-card">
      <div class="split-head">
        <div>
          <h3>${escapeHtml(item.title || "GraphRAG + 学习画像")}</h3>
          <p class="hint">${escapeHtml(item.description || "AI 回答绑定课程资料和图谱节点，学习行为回写画像并影响推荐路径。")}</p>
        </div>
        <span>${Number(item.ragCitationCount || 0)} 引用</span>
      </div>
      <div class="graph-profile-stats">
        <span><strong>${Number(item.graphEvidenceCount || 0)}</strong><small>图谱证据</small></span>
        <span><strong>${Number(item.profileEvidenceCount || 0)}</strong><small>画像证据</small></span>
        <span><strong>${(item.weakDrivenTopics || []).length}</strong><small>画像驱动弱点</small></span>
      </div>
      <div class="portfolio-card-list">
        ${path.slice(0, 6).map((step) => `
          <article class="graph-path-explain-card">
            <strong>${escapeHtml(step.topic)}</strong>
            <span>${escapeHtml(step.current === null || step.current === undefined ? "未诊断" : percentText(step.current))} · ${escapeHtml(step.action || "")}</span>
            <p><b>为什么先学：</b>${escapeHtml(step.why || "由学习画像和当前薄弱节点推荐。")}</p>
            <p><b>错因关系：</b>${escapeHtml(step.misconceptionRelation || "暂无显式错因，建议用前测验证。")}</p>
            <p><b>前置知识：</b>${escapeHtml((step.prerequisites || []).join("、") || "本章基础概念")}</p>
            <p><b>验证任务：</b>${escapeHtml(step.verification || "完成一道同知识点变式题。")}</p>
            <p><b>未掌握下一步：</b>${escapeHtml(step.fallback || "回到前置节点补学。")}</p>
          </article>
        `).join("") || emptyBlock("暂无画像驱动推荐。完成诊断后会显示图谱路径。")}
      </div>
    </section>
  `;
}

function renderDeclarationEvidencePack(pack = {}) {
  const chart = Array.isArray(pack.masteryChart) ? pack.masteryChart : [];
  const eventCounts = Object.entries(pack.eventTypeCounts || {}).slice(0, 8);
  const innovationPoints = Array.isArray(pack.innovationPoints) ? pack.innovationPoints : [];
  const applicationSections = Array.isArray(pack.applicationSections) ? pack.applicationSections : [];
  const videoScript = Array.isArray(pack.videoScriptOutline) ? pack.videoScriptOutline : [];
  return `
    <section class="panel portfolio-section declaration-pack-card portfolio-wide">
      <div class="split-head">
        <div>
          <h3>${escapeHtml(pack.title || "自动生成申报证据包")}</h3>
          <p class="hint">${escapeHtml(pack.anonymization || "可导出匿名版，隐藏学生身份并保留证据摘要。")}</p>
        </div>
        <strong>${pack.ready ? "已生成" : "待形成"}</strong>
      </div>
      <div class="declaration-grid">
        <div class="declaration-chart">
          <h4>掌握度变化图</h4>
          ${chart.slice(0, 8).map((item) => `
            <article>
              <span>${escapeHtml(compactText(item.topic, 18))}</span>
              <div><i style="width:${clamp(Number(item.start || 0), 0, 1) * 100}%"></i><b style="width:${clamp(Number(item.current || 0), 0, 1) * 100}%"></b></div>
              <em>${escapeHtml(item.changeText || "")}</em>
            </article>
          `).join("") || emptyBlock("暂无掌握度图表数据。")}
        </div>
        <div class="declaration-events">
          <h4>过程记录分布</h4>
          ${eventCounts.map(([label, count]) => `<p><strong>${escapeHtml(label)}</strong><span>${escapeHtml(count)}</span></p>`).join("") || emptyBlock("暂无事件分布。")}
        </div>
      </div>
      <div class="declaration-materials">
        ${(pack.exportMaterials || []).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
      ${applicationSections.length ? `
        <div class="declaration-application-sections">
          <h4>申报页固定结构</h4>
          ${applicationSections.map((item, index) => `
            <article>
              <b>${index + 1}</b>
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <p>${escapeHtml(item.summary || "")}</p>
                ${(item.evidence || []).length ? `<small>${escapeHtml((item.evidence || []).join("；"))}</small>` : ""}
              </div>
            </article>
          `).join("")}
        </div>
      ` : ""}
      ${videoScript.length ? `
        <div class="video-script-preview">
          <h4>3-5 分钟视频脚本提纲</h4>
          ${videoScript.slice(0, 4).map((item) => `<p><strong>${escapeHtml(item.time)} ${escapeHtml(item.shot)}</strong><span>${escapeHtml(item.narration || "")}</span></p>`).join("")}
        </div>
      ` : ""}
      ${innovationPoints.length ? `
        <div class="declaration-innovation-points">
          <h4>申报创新点对应</h4>
          ${innovationPoints.slice(0, 5).map((item) => `<article><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.summary)}</p><small>${escapeHtml((item.evidence || []).join("；"))}</small></article>`).join("")}
        </div>
      ` : ""}
    </section>
  `;
}

function renderLearningEffectPanel(panel = {}, compact = false) {
  const metrics = Array.isArray(panel.metrics) ? panel.metrics : [];
  const Tag = compact ? "div" : "section";
  return `
    <${Tag} class="${compact ? "" : "panel portfolio-section"} learning-effect-panel ${compact ? "compact-effect-panel" : "portfolio-wide"}">
      <div class="split-head">
        <div>
          <h3>${escapeHtml(panel.title || "前后对比学习成效")}</h3>
          <p>${escapeHtml(panel.summary || "完成前测、后测和反思后，这里会自动汇总学习增益。")}</p>
        </div>
        <strong>${escapeHtml(panel.learningGainText || "待形成")}</strong>
      </div>
      <div class="effect-metric-grid">
        ${metrics.map((metric) => `
          <article>
            <strong>${escapeHtml(metric.label)}</strong>
            <div class="effect-before-after">
              <span><small>前</small>${escapeHtml(metric.before || "待形成")}</span>
              <span><small>后</small>${escapeHtml(metric.after || "待形成")}</span>
            </div>
            <p>${escapeHtml(metric.change || "")}</p>
            <em>${escapeHtml(metric.evidence || metric.source || "")}</em>
          </article>
        `).join("") || emptyBlock("暂无成效数据。完成前测、练习、错因修正和后测后会形成。")}
      </div>
      ${(panel.evidenceSources || []).length ? `<div class="effect-source-strip">${panel.evidenceSources.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}
    </${Tag}>
  `;
}

function renderCollaborationEvidencePanel(collaboration = {}) {
  const group = collaboration.groupSpace || {};
  const roles = Array.isArray(group.roles) ? group.roles : [];
  const questions = Array.isArray(group.questionPool) ? group.questionPool : [];
  const timeline = Array.isArray(group.timeline) ? group.timeline : [];
  return `
    <section class="panel portfolio-section collaboration-evidence-panel">
      <div class="split-head">
        <div>
          <h3>群体协作学习</h3>
          <p>${escapeHtml(collaboration.contributionHint || "可作为轻量小组空间，记录问题池、分工、AI 摘要和贡献证据。")}</p>
        </div>
        <strong>${Number(collaboration.chatThreads || 0)} 组</strong>
      </div>
      <div class="collab-grid">
        <article><strong>共建知识图谱</strong><p>${escapeHtml(group.graphCoBuild || "可从图谱标注和学习卡片沉淀贡献。")}</p></article>
        <article><strong>小组问题池</strong><p>${escapeHtml(questions.slice(0, 4).join("；") || "暂无问题池，可从错题和 AI 追问生成。")}</p></article>
        <article><strong>AI 讨论摘要</strong><p>${escapeHtml(group.aiDiscussionSummary || "暂无讨论摘要。")}</p></article>
        <article><strong>同伴互评</strong><p>${escapeHtml(group.peerReview || "可在作业或项目提交后补充同伴互评。")}</p></article>
      </div>
      <div class="collab-role-list">
        ${roles.map((item) => `<span><strong>${escapeHtml(item.role)}</strong>${escapeHtml(item.evidence || "")}</span>`).join("")}
      </div>
      ${timeline.length ? `<div class="portfolio-timeline-list collab-timeline">${timeline.map((item) => `<article><time>${escapeHtml(fmtTime(item.time))}</time><div><strong>${escapeHtml(item.title || "协作事件")}</strong><p>${escapeHtml(item.summary || "")}</p></div></article>`).join("")}</div>` : ""}
    </section>
  `;
}

function aiReviewTypeLabel(type = "") {
  return {
    accepted: "我采纳",
    partial_accept: "我部分采纳",
    challenge: "我质疑",
    ai_error: "我发现 AI 错误",
    citation_needed: "需要资料引用验证",
    topic_error: "知识点定位错误",
    unclear_explanation: "解释不清",
    citation_issue: "引用不准",
    over_helping: "过度代答"
  }[String(type || "")] || type || "AI 审辩";
}

function renderAiReviewList(reviews = []) {
  return `
    <div class="portfolio-card-list ai-review-list">
      ${reviews.slice(0, 8).map((item) => `
        <article>
          <strong>${escapeHtml(item.topic || item.reviewType || "AI 审辩记录")}</strong>
          <span>${escapeHtml(fmtTime(item.createdAt))} · ${escapeHtml(aiReviewTypeLabel(item.reviewType))} · ${item.trustScore === null || item.trustScore === undefined ? "未评分" : percentText(item.trustScore)}</span>
          <p>${escapeHtml(item.finalJudgment || item.comment || item.studentAction || "学生已记录对 AI 回答的判断。")}</p>
          ${item.verificationNeed ? `<small>${escapeHtml(item.verificationNeed)}</small>` : ""}
        </article>
      `).join("") || emptyBlock("暂无 AI 审辩记录。可在 AI 侧栏标记定位错误、解释不清或引用不准。")}
    </div>
  `;
}

function renderStructuredReflectionForm(context = {}) {
  const subject = context.subject || currentStudentPortfolio().summary?.subject || preferredSubject();
  const topic = context.knowledgePoint || context.topic || "";
  return `
    <form class="reflection-form stack" data-reflection-form>
      <input type="hidden" name="contextType" value="${escapeHtml(context.contextType || "learning")}" />
      <input type="hidden" name="contextId" value="${escapeHtml(context.contextId || "")}" />
      <input type="hidden" name="contextTitle" value="${escapeHtml(context.contextTitle || "")}" />
      <input type="hidden" name="subject" value="${escapeHtml(subject)}" />
      <label>知识点<input name="knowledgePoint" value="${escapeHtml(topic)}" placeholder="例如：K 近邻、逻辑回归、支持向量机" /></label>
      <label>我原来的理解是什么？<textarea name="originalUnderstanding" rows="2" required placeholder="写下自己的原始理解或解题思路"></textarea></label>
      <label>AI 帮我发现了什么问题？<textarea name="aiDiscovery" rows="2" required placeholder="记录 AI 指出的误区、证据或追问"></textarea></label>
      <label>我是否同意 AI 的解释？<textarea name="aiAgreement" rows="2" placeholder="写下同意、部分同意或不同意的理由"></textarea></label>
      <label>我修改了哪些知识点或学习策略？<textarea name="strategyChange" rows="2" required placeholder="记录修正后的理解和学习策略变化"></textarea></label>
      <label>我还不确定什么？<textarea name="uncertainty" rows="2" placeholder="记录仍需验证的问题"></textarea></label>
      <label>哪些地方 AI 没帮上忙？<textarea name="aiLimitation" rows="2" placeholder="记录 AI 没有解释清楚、引用不足或需要人工判断的地方"></textarea></label>
      <label>下一次学习计划是什么？<textarea name="nextPlan" rows="2" required placeholder="写下一步测试、复习或实验计划"></textarea></label>
      <label>我如何避免过度依赖 AI？<textarea name="antiOverreliance" rows="2" placeholder="例如：先作答、查引用、做验证题、保留最终判断"></textarea></label>
      <label>AI 使用边界<input name="aiUseBoundary" value="AI 用于提示、引用和诊断；最终理解、作答和反思由学生确认。" /></label>
      <button class="primary" type="submit">保存反思</button>
    </form>
  `;
}

function renderStudentHomePage() {
  const portfolio = currentStudentPortfolio();
  const cycle = portfolio.learningCycle || {};
  const counts = cycle.evidenceCounts || {};
  const homework = state.data.homework || [];
  const submissions = state.data.submissions || [];
  const submittedIds = new Set(submissions.filter((item) => item.studentId === state.user.id).map((item) => item.homeworkId));
  const pendingHomework = homework.filter((item) => !submittedIds.has(item.id));
  const masteryRows = portfolio.masteryComparison || [];
  const weakTopics = masteryRows.filter((item) => Number(item.current || 0) < 0.58).slice(0, 4);
  const masteredTopics = masteryRows.filter((item) => Number(item.current || 0) >= 0.78);
  const consolidatingTopics = masteryRows.filter((item) => Number(item.current || 0) >= 0.58 && Number(item.current || 0) < 0.78);
  const riskTopics = weakTopics.length ? weakTopics : (portfolio.misconceptionTrajectory || []).slice(0, 2);
  const nextTask = cycle.nextTask || (cycle.tasks || []).find((task) => !task.done) || {};
  const stageProgress = Number(cycle.currentStage?.progress || 0);
  const stageLabel = cycle.currentStage?.activeLabel || "概念辨析与损失函数";
  const focusTopic = cycle.focusNodes?.[0] || weakTopics[0]?.topic || "逻辑回归与损失函数";
  const primaryRiskTopic = riskTopics[0]?.topic || "过拟合与欠拟合区分";
  const effectPanel = portfolio.effectPanel || {};
  const effectMetrics = Array.isArray(effectPanel.metrics) ? effectPanel.metrics : [];
  const scoreMetric = effectMetrics.find((item) => /测|分|得分/.test(item.label || "")) || effectMetrics[0] || {};
  const growthDrivers = effectMetrics.slice(0, 3).map((item) => item.label).filter(Boolean);
  const evidenceItems = [
    { label: "诊断", value: counts.knowledgeTests || 0 },
    { label: "订正", value: counts.wrongNotes || counts.wrongFixes || portfolio.corrections?.length || 0 },
    { label: "AI 对话", value: counts.aiDialogues || 0 },
    { label: "实验作品", value: counts.learningOutputs || portfolio.works?.length || 0 },
    { label: "反思", value: counts.reflections || portfolio.reflections?.length || 0 }
  ];
  const recommendationSteps = [
    { title: "概念辨析", detail: "先完成“交叉熵损失”概念辨析题", page: "graph" },
    { title: "微课回看", detail: "再观看“梯度下降更新过程”微课", page: "graph" }
  ];
  if (!state.cycleViewMode) state.cycleViewMode = cycle.viewMode || "stage";
  return `
    <div class="workbench-page student-home-workbench learning-cycle-home ml-cockpit-home">
      <section class="ml-cockpit-heading">
        <div>
          <span class="cycle-eyebrow">${CASE_TAGLINE}</span>
          <h2>你好，${escapeHtml(state.user?.name || "同学")}。先找出薄弱点，再练到会。</h2>
          <p>本案例只聚焦三件事：定位知识薄弱点、解释错题原因、生成下一步个性化练习。</p>
          <p class="theme-anchor">以 AI 伦理守边界、以学术诚信留证据、以成长性评价看见进步。</p>
        </div>
        <button class="mini" type="button" data-cycle-settings-open>调整学习周期</button>
      </section>

      ${renderLearningCycleWizard(cycle, portfolio)}

      <section class="ml-cockpit-top-grid">
        <article class="panel ml-current-task-card">
          <div class="cockpit-card-kicker"><span>我现在学什么</span><span>${escapeHtml(cycle.rangeText || "本周学习任务")}</span></div>
          <h3>正在攻克：${escapeHtml(focusTopic)}</h3>
          <p>${escapeHtml((cycle.goals || []).join("；") || "理解逻辑回归的分类边界，能解释损失函数并完成一次代码验证。")}</p>
          <div class="ml-task-meta"><span>当前阶段：${escapeHtml(stageLabel)}</span><span>预计 35 分钟</span></div>
          <div class="ml-progress-row"><div><i style="width:${Math.max(4, Math.min(stageProgress, 100))}%"></i></div><strong>${stageProgress}%</strong></div>
          <button class="primary" type="button" data-dashboard-page="${escapeHtml(nextTask.page || "graph")}">继续学习</button>
        </article>
        <article class="panel ml-diagnosis-card">
          <div class="cockpit-card-kicker"><span>我卡在哪里</span><span>诊断驱动</span></div>
          <h3>学习诊断摘要</h3>
          <p>点击任一状态，定位到知识图谱的对应节点。</p>
          <div class="ml-diagnosis-summary">
            <button type="button" data-cockpit-graph-filter="mastered"><strong>${masteredTopics.length}</strong><span>已掌握</span></button>
            <button type="button" data-cockpit-graph-filter="weak"><strong>${consolidatingTopics.length}</strong><span>待巩固</span></button>
            <button type="button" class="risk" data-cockpit-graph-filter="misconception"><strong>${riskTopics.length}</strong><span>存在错因风险</span></button>
          </div>
          <p class="ml-risk-copy">优先处理：${escapeHtml(primaryRiskTopic)}</p>
        </article>
      </section>

      <section class="ml-cockpit-mid-grid">
        <article class="panel ml-recommendation-card">
          <div class="split-head"><div><span class="cockpit-section-label">下一步做什么</span><h3>今日个性化建议</h3></div><button class="mini" data-dashboard-page="ai">让 AI 诊断</button></div>
          <ol class="ml-recommendation-list">
            ${recommendationSteps.map((item, index) => `<li><b>${index + 1}</b><button type="button" data-dashboard-page="${item.page}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></button></li>`).join("")}
          </ol>
        </article>
        <article class="panel ml-growth-card">
          <div class="split-head"><div><span class="cockpit-section-label">学习成效</span><h3>前测 / 后测成长</h3></div><strong class="ml-growth-rate">${escapeHtml(effectPanel.learningGainText || "持续积累中")}</strong></div>
          <div class="ml-score-strip">
            <span><small>前测分</small><b>${escapeHtml(scoreMetric.before || "待测")}</b></span>
            <span><small>当前分</small><b>${escapeHtml(scoreMetric.after || (portfolio.summary?.averageMastery !== null && portfolio.summary?.averageMastery !== undefined ? percentText(portfolio.summary.averageMastery) : "待测"))}</b></span>
            <span><small>后测分</small><b>${escapeHtml(effectPanel.postScore || "待后测")}</b></span>
          </div>
          <p>成长来自：${escapeHtml(growthDrivers.join("、") || "完成前测、概念订正与针对性练习后自动归因")}</p>
        </article>
      </section>

      <section class="ml-cockpit-bottom-grid">
        <article class="panel ml-misconception-card">
          <div class="split-head"><div><span class="cockpit-section-label">错因追踪</span><h3>先修正，再进入下一模块</h3></div><button class="mini" data-cockpit-graph-filter="misconception">查看节点</button></div>
          <p>你在“${escapeHtml(primaryRiskTopic)}”中连续出现概念混淆，建议完成 2 道变式题后再进入模型评估模块。</p>
          <div class="ml-correction-tags"><span>错因：概念边界混淆</span><span>建议：变式练习 x2</span></div>
        </article>
        <article class="panel ml-evidence-card">
          <div class="split-head"><div><span class="cockpit-section-label">学习证据</span><h3>每一步都可追溯</h3></div><button class="mini" data-dashboard-page="portfolio">进入档案</button></div>
          <div class="ml-evidence-counts">${evidenceItems.map((item) => `<button type="button" data-dashboard-page="portfolio"><strong>${item.value}</strong><span>${escapeHtml(item.label)}</span></button>`).join("")}</div>
        </article>
      </section>

      <details class="secondary-content disclosure-panel" ${state.cycleSettingsOpen ? "open" : ""}>
        <summary>查看本轮完整计划与证据任务</summary>
        <div class="disclosure-body">
          ${renderLearningCycleEditor(cycle)}
          <div class="cycle-dashboard-grid">
      <section class="panel dashboard-card cycle-task-card">
        <div class="split-head">
          <h3>周期任务追踪</h3>
          <button class="mini" data-dashboard-page="graph">进入图谱</button>
        </div>
        <div class="cycle-task-list">
          ${(cycle.tasks || []).filter((task) => !task.done).slice(0, 4).map((task, index) => `<button type="button" data-dashboard-page="${escapeHtml(task.page || "portfolio")}"><b>${index + 1}</b><span><strong>${escapeHtml(task.label)}</strong><small>${escapeHtml(task.statusLabel || "")} · ${escapeHtml(task.evidenceType || "")} · ${escapeHtml(task.gap || "")}</small>${escapeHtml(task.nextAction || task.evidence || "")}</span></button>`).join("") || `<button type="button" data-dashboard-page="graph"><b>1</b><span><strong>进入知识图谱</strong><small>定位薄弱节点并完成本轮诊断任务</small></span></button>`}
        </div>
      </section>
      <section class="panel dashboard-card cycle-activity-card">
        <div class="split-head">
          <h3>当前学习活动</h3>
          <button class="mini" data-dashboard-page="ai">问 AI</button>
        </div>
        <div class="cycle-action-grid">
          ${renderDashboardAction("ai", "AI 对话", "先作答，再让 AI 诊断理解缺口", true)}
          ${renderDashboardAction("graph", "图谱节点学习", "按掌握状态复习并完成节点验证")}
          ${renderDashboardAction("graph", "知识测试", "生成题目、作答、诊断、反思、入档")}
        </div>
      </section>
      <section class="panel dashboard-card cycle-feedback-card">
        <div class="split-head">
          <h3>证据与反馈</h3>
          <button class="mini" data-dashboard-page="portfolio">学习档案</button>
        </div>
        <div class="dashboard-list">
          ${weakTopics.map((item) => `<article><strong>${escapeHtml(item.topic)}</strong><span>当前 ${escapeHtml(item.currentText)} · ${escapeHtml(item.changeText)} · 需要巩固</span></article>`).join("") || `<article><strong>暂无薄弱点</strong><span>完成前测、AI 诊断或作业批改后会显示。</span></article>`}
          ${(portfolio.corrections || []).slice(0, 2).map((item) => `<article><strong>已纠正：${escapeHtml(item.correctedTopic)}</strong><span>原识别 ${escapeHtml(item.fromTopic || "未记录")} · ${fmtTime(item.createdAt)}</span></article>`).join("")}
        </div>
      </section>
      ${renderAnswerFirstCard(cycle)}
      ${renderCyclePlanView(cycle)}
      ${renderCycleCompletionCard(cycle)}
      <section class="panel dashboard-card cycle-timeline-card">
        <div class="split-head">
          <h3>学习时间线</h3>
          <button class="mini" data-dashboard-page="portfolio">查看完整档案</button>
        </div>
        ${renderPortfolioTimelineList(portfolio.timeline || [], 5)}
      </section>
      <section class="panel dashboard-card cycle-task-progress-card">
        <div class="split-head">
          <h3>周期任务追踪</h3>
          <span>${Number(cycle.currentStage?.progress || 0)}%</span>
        </div>
        ${renderCycleTaskTracker(cycle, 6)}
      </section>
      <section class="panel dashboard-card cycle-reflection-card">
        <div class="split-head">
          <h3>待完成反思</h3>
          <span>${counts.reflections || 0} 条已入档</span>
        </div>
        ${renderStructuredReflectionForm({ contextType: "cycle", contextTitle: cycle.title || "学习周期", subject: cycle.subject || preferredSubject() })}
      </section>
          </div>
        </div>
      </details>
    </div>
  `;
}

function renderAiSupportRecords(records = []) {
  return `
    <div class="portfolio-card-list">
      ${records.slice(0, 8).map((item) => `
        <article>
          <strong>${escapeHtml(item.topic || "AI 支持")}</strong>
          <span>${escapeHtml(fmtTime(item.time))} · ${escapeHtml(item.confidence || "置信度待确认")}</span>
          <p>${escapeHtml(item.prompt || item.help || "")}</p>
          ${item.citations?.length ? `<small>引用：${escapeHtml(item.citations.join("、"))}</small>` : `<small>暂无引用或等待工作流返回引用。</small>`}
        </article>
      `).join("") || emptyBlock("暂无 AI 支持记录。完成一次 AI 对话后会显示帮助方式、引用资料和采纳记录。")}
    </div>
  `;
}

function renderWorkEvidence(works = []) {
  return `
    <div class="portfolio-card-list">
      ${works.slice(0, 10).map((item) => `
        <article>
          <strong>${escapeHtml(item.title || "作品证据")}</strong>
          <span>${escapeHtml(item.type || "")} · ${escapeHtml(fmtTime(item.time))} · ${escapeHtml([item.status, item.score].filter(Boolean).join(" · "))}</span>
          <p>${escapeHtml(item.summary || "已作为学习产出入档。")}</p>
        </article>
      `).join("") || emptyBlock("暂无作品证据。提交作业、上传项目报告或保存模型实验后会显示。")}
    </div>
  `;
}

function renderNodeAnnotationEvidence(items = []) {
  return `
    <div class="portfolio-card-list node-annotation-evidence">
      ${items.slice(0, 10).map((item) => `
        <article>
          <strong>${escapeHtml(item.nodeLabel || "图谱节点")}</strong>
          <span>${escapeHtml(item.graphTitle || "知识图谱")} · ${escapeHtml(item.statusLabel || "")}${item.favorite ? " · 已收藏" : ""}${item.fromAiAnswer ? " · AI 学习卡片" : ""}</span>
          <p>${escapeHtml(item.explanation || item.evidenceTitle || "学生已把该节点作为学习证据入档。")}</p>
        </article>
      `).join("") || emptyBlock("暂无图谱建构证据。进入知识图谱节点后，可收藏、标注掌握状态、写自己的解释，并把 AI 回答转成学习卡片。")}
    </div>
  `;
}

function renderMisconceptionTrajectory(items = []) {
  return `
    <div class="portfolio-card-list misconception-list">
      ${items.slice(0, 8).map((item) => `
        <article>
          <strong>${escapeHtml(item.topic)}</strong>
          <p><b>原理解：</b>${escapeHtml(item.before || "待补充")}</p>
          <p><b>问题：</b>${escapeHtml(item.issue || "待补充")}</p>
          <p><b>修正：</b>${escapeHtml(item.after || "待补充")}</p>
        </article>
      `).join("") || emptyBlock("暂无错因变化。错题本、AI 诊断和反思会共同形成修正轨迹。")}
    </div>
  `;
}

function renderReflectionList(reflections = []) {
  return `
    <div class="portfolio-card-list reflection-list">
      ${reflections.slice(0, 10).map((item) => `
        <article>
          <strong>${escapeHtml(item.knowledgePoint || item.contextTitle || "学习反思")}</strong>
          <span>${escapeHtml(fmtTime(item.createdAt))} · ${escapeHtml(item.contextType || "learning")}</span>
          <p><b>原理解：</b>${escapeHtml(item.originalUnderstanding || "未填写")}</p>
          <p><b>AI 发现：</b>${escapeHtml(item.aiDiscovery || "未填写")}</p>
          <p><b>我的判断：</b>${escapeHtml(item.aiAgreement || "未填写")}</p>
          <p><b>策略变化：</b>${escapeHtml(item.strategyChange || "未填写")}</p>
          <p><b>AI 局限：</b>${escapeHtml(item.aiLimitation || "未填写")}</p>
          <p><b>下一步：</b>${escapeHtml(item.nextPlan || "未填写")}</p>
          <p><b>避免依赖：</b>${escapeHtml(item.antiOverreliance || item.aiUseBoundary || "未填写")}</p>
        </article>
      `).join("") || emptyBlock("暂无结构化反思。保存一次反思后会显示学习策略变化和 AI 使用边界。")}
    </div>
  `;
}

function renderEthicsSettingsPanel(portfolio = currentStudentPortfolio()) {
  const settings = {
    aiUseDisclosure: true,
    citationRequired: true,
    uncertaintyNotice: true,
    dataConsent: true,
    anonymousExportDefault: true,
    requireOriginalAnswerFirst: true,
    allowTeacherPrivateConversationAccess: false,
    aiFinalAnswerBlocked: true,
    ...(portfolio.ethics?.settings || state.data?.studentEthicsSettings || {})
  };
  const checked = (key) => settings[key] ? "checked" : "";
  return `
    <section class="panel portfolio-section portfolio-wide ethics-settings-panel">
      <div class="split-head">
        <div>
          <h3>AI 使用规范与学术诚信</h3>
          <p class="hint">把 AI 辅助、引用、隐私授权和先作答再求助前台化，避免参赛评审误解为 AI 代学。</p>
        </div>
      </div>
      <form class="ethics-settings-form" data-ethics-settings-form>
        <label class="check-line"><input type="checkbox" name="aiUseDisclosure" ${checked("aiUseDisclosure")} />展示 AI 使用声明</label>
        <label class="check-line"><input type="checkbox" name="citationRequired" ${checked("citationRequired")} />AI 回答强制记录引用来源</label>
        <label class="check-line"><input type="checkbox" name="uncertaintyNotice" ${checked("uncertaintyNotice")} />低置信度和不确定性提示</label>
        <label class="check-line"><input type="checkbox" name="dataConsent" ${checked("dataConsent")} />授权本学习周期数据进入个人档案</label>
        <label class="check-line"><input type="checkbox" name="anonymousExportDefault" ${checked("anonymousExportDefault")} />默认匿名导出</label>
        <label class="check-line"><input type="checkbox" name="requireOriginalAnswerFirst" ${checked("requireOriginalAnswerFirst")} />先作答再求助</label>
        <label class="check-line"><input type="checkbox" name="aiFinalAnswerBlocked" ${checked("aiFinalAnswerBlocked")} />AI 内容不直接作为最终答案</label>
        <label class="check-line"><input type="checkbox" name="allowTeacherPrivateConversationAccess" ${checked("allowTeacherPrivateConversationAccess")} />允许教师查看私密对话全文</label>
        <button class="primary" type="submit">保存规范设置</button>
      </form>
      <details class="privacy-request-box">
        <summary>个人学习数据管理</summary>
        <form data-data-deletion-request-form>
          <label>清理范围<input name="scopes" value="learningEvents,studentReflections,aiAnswerReviews,studentNodeAnnotations" /></label>
          <label>原因说明<input name="reason" placeholder="例如：本轮演示结束后申请清理个人学习记录" /></label>
          <button class="danger" type="submit">提交删除申请</button>
        </form>
        <div class="portfolio-card-list compact">
          ${(state.data?.studentDataDeletionRequests || []).slice(0, 3).map((item) => `<article><strong>${escapeHtml(item.status || "requested")}</strong><span>${escapeHtml(fmtTime(item.createdAt))}</span><p>${escapeHtml((item.scopes || []).join("、"))}</p></article>`).join("") || `<p class="hint">暂无删除申请。为防止误删，系统先记录申请并进入审计日志。</p>`}
        </div>
      </details>
    </section>
  `;
}

function renderGrowthEvidencePack(portfolio) {
  const cycle = portfolio.learningCycle || {};
  const counts = cycle.evidenceCounts || {};
  const comparison = portfolio.masteryComparison || [];
  const first = comparison.slice().sort((a, b) => String(a.firstAt || a.lastAt || "").localeCompare(String(b.firstAt || b.lastAt || "")))[0] || {};
  const weak = comparison.filter((item) => Number(item.current || 0) < 0.58).slice(0, 3);
  const effect = portfolio.effectPanel || {};
  const evidenceSections = [
    { key: "start", label: "学习起点", icon: "01", title: "我从哪里出发", summary: `前测 ${first.startText || "待形成"} · 初始掌握度 ${first.startText || percentText(portfolio.summary?.averageMastery || 0) || "待诊断"}`, items: [weak.length ? `初始薄弱点：${weak.map((item) => item.topic).join("、")}` : "初始薄弱点将在前测后自动归档", `前测知识点：${comparison.length || "待形成"} 个`] },
    { key: "process", label: "过程证据", icon: "02", title: "我怎样学习", summary: "AI 诊断、学习路径和练习过程均可追溯", items: [`AI 诊断/对话：${counts.aiDialogues || 0} 次`, `知识测试：${counts.knowledgeTests || 0} 次`, `订正记录：${counts.corrections || counts.wrongNotes || 0} 条`] },
    { key: "misconception", label: "错因轨迹", icon: "03", title: "我如何修正", summary: `${(portfolio.misconceptionTrajectory || []).length} 条错因记录，显示干预与复测结果`, items: (portfolio.misconceptionTrajectory || []).slice(0, 2).map((item) => `${item.topic}：${item.currentStatus || "持续追踪"}`) },
    { key: "outcome", label: "成果证据", icon: "04", title: "我学会了什么", summary: `掌握度提升 ${effect.learningGainText || "持续积累中"}`, items: [`后测成绩：${effect.postScore || "待后测"}`, `作业/作品：${counts.learningOutputs || 0} 件`, `能力变化：${effect.masteryImproved || 0} 个知识点改善`] },
    { key: "reflection", label: "学习反思", icon: "05", title: "我怎样理解并迁移", summary: `${counts.reflections || 0} 份结构化反思`, items: ["原来怎么想 → 为什么错 → 如何修正 → 如何迁移", ...(portfolio.reflectionExcerpts || []).slice(0, 1).map((item) => item.text)] },
    { key: "teacher", label: "教师评价", icon: "06", title: "教师如何确认成长", summary: `${(portfolio.teacherEvaluations || []).length} 条教师反馈`, items: (portfolio.teacherEvaluations || []).slice(0, 2).map((item) => item.comment || item.summary || "教师已查看学习过程") }
  ];
  return `
    <section class="panel growth-evidence-pack">
      <div class="growth-pack-head"><div><span class="cycle-eyebrow">LEARNING GROWTH EVIDENCE PACK</span><h2>我的学习成长证据包</h2><p>把学习起点、学习过程、错因修正、成果变化、个人反思和教师确认组织成一份可导出的成长证据。</p></div><strong>${Number(cycle.currentStage?.progress || 0)}%<small>学习周期完成度</small></strong></div>
      <div class="growth-pack-grid">
        ${evidenceSections.map((item) => `<article class="growth-pack-card evidence-${item.key}"><div class="growth-pack-card-top"><span>${item.icon}</span><b>${item.label}</b></div><h3>${item.title}</h3><p>${escapeHtml(item.summary)}</p><ul>${item.items.map((line) => `<li>${escapeHtml(line || "待补充")}</li>`).join("")}</ul></article>`).join("")}
      </div>
    </section>
  `;
}

function renderMisconceptionEvidenceCards(items = []) {
  return `<div class="misconception-evidence-grid">${items.slice(0, 6).map((item) => `
    <article class="misconception-evidence-card"><div class="split-head"><h3>${escapeHtml(item.topic || "待归类错因")}</h3><span class="${item.currentStatus === "已消除" ? "status-good" : "status-risk"}">${escapeHtml(item.currentStatus || "追踪中")}</span></div>
    <dl><div><dt>首次发现</dt><dd>${escapeHtml(item.firstFound || fmtTime(item.time) || "待记录")}</dd></div><div><dt>AI 诊断</dt><dd>${escapeHtml(item.issue || "指标概念混淆")}</dd></div><div><dt>干预方式</dt><dd>${escapeHtml(item.intervention || "概念对比微课 + 变式题")}</dd></div><div><dt>复测结果</dt><dd>${escapeHtml(item.retestResult || "待复测")}</dd></div></dl><p class="misconception-transfer"><b>迁移提示：</b>${escapeHtml(item.transfer || "完成新场景变式题，验证是否能迁移。")}</p></article>
  `).join("") || emptyBlock("暂无错因轨迹。完成前测、诊断或订正后会生成单个错因追踪卡。")}</div>`;
}

function renderStudentPortfolioPage() {
  if (state.user.role !== "student") return emptyBlock("学习档案仅面向学生账号。");
  const portfolio = currentStudentPortfolio();
  const cycle = portfolio.learningCycle || {};
  const counts = cycle.evidenceCounts || {};
  return `
    <div class="portfolio-page-shell">
      ${renderGrowthEvidencePack(portfolio)}
      <section class="panel portfolio-section portfolio-wide misconception-tracking-section">
        <div class="split-head"><div><h3>单个错因追踪</h3><p class="hint">从首次发现到复测消除，保留每一次干预如何改变理解的证据。</p></div><span>${(portfolio.misconceptionTrajectory || []).length} 条</span></div>
        ${renderMisconceptionEvidenceCards(portfolio.misconceptionTrajectory || [])}
      </section>
      <section class="panel portfolio-cycle-panel">
        <div class="split-head">
          <div>
            <h3>学习闭环证据链</h3>
            <p class="hint">前测诊断、AI 学习、知识测试、错因修正、反思总结和后测都记录为可导出的学习证据。</p>
          </div>
          <strong>${Number(cycle.currentStage?.progress || 0)}%</strong>
        </div>
        ${renderStageStrip(cycle.currentStage)}
        ${renderEvidenceMiniStats(counts)}
        ${renderCycleTaskTracker(cycle, 6)}
        ${renderLearningCycleEditor(cycle)}
      </section>
      <details class="secondary-content disclosure-panel portfolio-more-panel">
        <summary>查看完整学习档案与管理工具</summary>
        <div class="disclosure-body">
          ${renderInnovationLoopCard(portfolio)}
          <div class="portfolio-grid">
        ${renderGraphRagProfileCard(portfolio)}
        ${renderLearningEffectPanel(portfolio.effectPanel || {})}
        ${renderDeclarationEvidencePack(portfolio.declarationEvidencePack || {})}
        <section class="panel portfolio-section portfolio-wide">
          <div class="split-head">
            <h3>学习时间线</h3>
            <span>${(portfolio.timeline || []).length} 条</span>
          </div>
          ${renderPortfolioTimelineList(portfolio.timeline || [], 14)}
        </section>
        <section class="panel portfolio-section">
          <div class="split-head">
            <h3>前测/后测对比</h3>
            <span>${(portfolio.masteryComparison || []).length} 个知识点</span>
          </div>
          ${renderMasteryComparisonRows(portfolio.masteryComparison || [], 10)}
        </section>
        <section class="panel portfolio-section">
          <div class="split-head">
            <h3>AI 支持记录</h3>
            <span>${(portfolio.aiSupportRecords || []).length} 条</span>
          </div>
          ${renderAiSupportRecords(portfolio.aiSupportRecords || [])}
        </section>
        <section class="panel portfolio-section">
          <div class="split-head">
            <h3>AI 审辩记录</h3>
            <span>${(portfolio.aiReviews || []).length} 条</span>
          </div>
          ${renderAiReviewList(portfolio.aiReviews || [])}
        </section>
        <section class="panel portfolio-section">
          <div class="split-head">
            <h3>作品证据</h3>
            <span>${(portfolio.works || []).length} 条</span>
          </div>
          ${renderWorkEvidence(portfolio.works || [])}
        </section>
        <section class="panel portfolio-section">
          <div class="split-head">
            <h3>图谱建构证据</h3>
            <span>${(portfolio.nodeAnnotations || []).length} 条</span>
          </div>
          ${renderNodeAnnotationEvidence(portfolio.nodeAnnotations || [])}
        </section>
        ${renderCollaborationEvidencePanel(portfolio.collaboration || {})}
        <section class="panel portfolio-section">
          <div class="split-head">
            <h3>错因变化</h3>
            <span>${(portfolio.misconceptionTrajectory || []).length} 条</span>
          </div>
          ${renderMisconceptionTrajectory(portfolio.misconceptionTrajectory || [])}
        </section>
        <section class="panel portfolio-section portfolio-wide">
          <div class="split-head">
            <h3>个人反思</h3>
            <span>${(portfolio.reflections || []).length} 条</span>
          </div>
          ${renderReflectionList(portfolio.reflections || [])}
        </section>
        <section class="panel portfolio-section portfolio-wide">
          <div class="split-head">
            <h3>新增结构化反思</h3>
            <span>直接作为参赛材料</span>
          </div>
          ${renderStructuredReflectionForm({ contextType: "portfolio", contextTitle: "学习档案", subject: portfolio.summary?.subject || preferredSubject() })}
        </section>
        ${renderEthicsSettingsPanel(portfolio)}
      </div>
    </div>
  `;
}

function bindStudentPortfolioPage() {
  bindDashboardPageLinks();
  bindPortfolioExportActions();
  bindLearningCycleForms();
  bindReflectionForms();
  bindEthicsSettingsForms();
}

function renderCaseShowcasePage() {
  if (state.user.role !== "student") return emptyBlock("学习周期申报页当前面向学生学习案例。");
  const portfolio = currentStudentPortfolio();
  const showcase = portfolio.showcase || {};
  const effect = showcase.effect || {};
  const cycle = portfolio.learningCycle || {};
  const pack = portfolio.declarationEvidencePack || {};
  const sections = Array.isArray(pack.applicationSections) && pack.applicationSections.length ? pack.applicationSections : [
    { title: "学习问题", summary: showcase.background || "", evidence: [] },
    { title: "AI介入方案", summary: showcase.intervention || "", evidence: [] },
    { title: "完整学习周期", summary: `${cycle.title || "学习周期"}；${cycle.rangeText || ""}`, evidence: (cycle.tasks || []).map((task) => `${task.label}：${task.statusText || task.statusLabel}`) },
    { title: "成效数据", summary: portfolio.effectPanel?.summary || "", evidence: [] },
    { title: "个人反思", summary: (portfolio.reflectionExcerpts || [])[0]?.text || "", evidence: [] },
    { title: "推广价值", summary: showcase.transfer || "", evidence: [] },
    { title: "伦理规范", summary: portfolio.ethics?.aiStatement || "", evidence: [] }
  ];
  return `
    <div class="showcase-page-shell">
      <section class="showcase-hero panel">
        <div>
          <span class="cycle-eyebrow">学习周期申报页</span>
          <h2>${escapeHtml(cycle.title || "AI 支持的学习闭环案例")}</h2>
          <p>${escapeHtml(showcase.background || "学生围绕一个完整学习周期形成学习过程、成效证据和个人反思。")}</p>
          ${renderStageStrip(cycle.currentStage)}
        </div>
        <aside>
          ${renderPortfolioExportActions(true)}
        </aside>
      </section>
      <section class="dashboard-stats compact showcase-stats">
        ${renderDashboardStat("学习事件", effect.evidenceEvents || 0, "全周期过程记录")}
        ${renderDashboardStat("前后测知识点", effect.prePostTopics || 0, `${effect.masteryImproved || 0} 个提升`)}
        ${renderDashboardStat("错题/反思", Number(effect.wrongNotes || 0) + Number(effect.reflections || 0), "元认知证据")}
        ${renderDashboardStat("AI 证据", portfolio.aiSupportRecords?.length || 0, "引用与诊断记录")}
      </section>
      <section class="showcase-application-flow">
        ${sections.map((item, index) => `
          <article class="panel showcase-section-card">
            <b>${index + 1}</b>
            <div>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.summary || "")}</p>
              ${(item.evidence || []).length ? `<div class="showcase-evidence-tags">${(item.evidence || []).slice(0, 6).map((evidence) => `<span>${escapeHtml(evidence)}</span>`).join("")}</div>` : ""}
              ${item.title === "完整学习周期" ? renderCycleTaskTracker(cycle, 6, true) : ""}
              ${item.title === "成效数据" ? renderLearningEffectPanel(portfolio.effectPanel || {}, true) : ""}
              ${item.title === "个人反思" ? `<div class="portfolio-card-list">${(portfolio.reflectionExcerpts || []).slice(0, 5).map((reflection) => `<article><strong>${escapeHtml(reflection.topic || "反思")}</strong><span>${escapeHtml(fmtTime(reflection.time))}</span><p>${escapeHtml(reflection.text || "")}</p></article>`).join("") || emptyBlock("暂无反思摘录。")}</div>` : ""}
            </div>
          </article>
        `).join("")}
      </section>
      <div class="showcase-grid">
        ${renderGraphRagProfileCard(portfolio)}
        ${renderDeclarationEvidencePack(pack)}
        ${renderCollaborationEvidencePanel(portfolio.collaboration || {})}
          </div>
        </div>
      </details>
    </div>
  `;
}

function bindCaseShowcasePage() {
  bindDashboardPageLinks();
  bindPortfolioExportActions();
}

function renderHomePage() {
  return isTeacherLike() ? renderTeacherHomePage() : renderStudentHomePage();
}

function bindHomePage() {
  bindDashboardPageLinks();
  bindPortfolioExportActions();
  bindLearningCycleForms();
  bindReflectionForms();
  document.querySelectorAll("[data-cockpit-graph-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.page = "graph";
      state.graphNodeFilter = button.dataset.cockpitGraphFilter || "all";
      state.graphLayer = state.graphNodeFilter === "all" ? "overview" : "diagnosis";
      renderShell();
    });
  });
}

function bindDashboardPageLinks() {
  document.querySelectorAll("[data-dashboard-page]").forEach((button) => {
    button.addEventListener("click", () => {
      state.page = button.dataset.dashboardPage;
      renderShell();
    });
  });
}

async function downloadStudentPortfolio(format, anonymous = false) {
  const printWindow = format === "pdf" ? window.open("", "_blank", "noopener,noreferrer") : null;
  let payload;
  try {
    const query = new URLSearchParams({ format });
    if (anonymous) query.set("anonymous", "1");
    payload = await api(`/api/student/portfolio/export?${query.toString()}`);
  } catch (error) {
    if (printWindow) printWindow.close();
    throw error;
  }
  if (payload.portfolio) state.data.studentPortfolio = payload.portfolio;
  if (payload.format === "pdf") {
    const blob = new Blob([payload.content], { type: payload.mime || "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    if (printWindow) printWindow.location.href = url;
    else window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 15000);
    showToast("已打开学习档案 PDF 打印页");
    return;
  }
  downloadText(payload.fileName, payload.content, payload.mime || "text/plain;charset=utf-8");
  showToast(`已导出 ${payload.fileName}`);
}

function bindPortfolioExportActions() {
  document.querySelectorAll("[data-portfolio-export]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const scope = button.closest(".portfolio-export-actions") || document;
        const anonymous = Boolean(scope.querySelector("[data-portfolio-anonymous]")?.checked);
        await downloadStudentPortfolio(button.dataset.portfolioExport, anonymous);
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
}

function bindLearningCycleForms() {
  const cycle = currentStudentPortfolio().learningCycle || {};
  const templates = Array.isArray(cycle.templateLibrary) ? cycle.templateLibrary : [];
  const lines = (value) => Array.isArray(value) ? value.join("\n") : String(value || "");
  const weeklyLines = (items = []) => (items || []).map((item) => {
    const tasks = Array.isArray(item.tasks) && item.tasks.length ? `：${item.tasks.join("；")}` : "";
    return `${item.week || ""}${item.title ? `：${item.title}` : ""}${tasks}`;
  }).join("\n");
  document.querySelectorAll("[data-cycle-wizard-step]").forEach((button) => {
    button.addEventListener("click", () => {
      state.cycleWizardStep = Number(button.dataset.cycleWizardStep || 1);
      renderContent();
    });
  });
  document.querySelector("[data-cycle-wizard-next]")?.addEventListener("click", () => {
    state.cycleWizardStep = Math.min(5, Number(state.cycleWizardStep || 1) + 1);
    renderContent();
  });
  const fillCycleForm = (form, item = {}) => {
    if (!form || !item) return;
    const setValue = (name, value) => {
      const control = form.querySelector(`[name="${name}"]`);
      if (control) control.value = value ?? "";
    };
    setValue("templateKey", item.templateKey || item.key || "");
    setValue("title", item.title || "");
    setValue("subject", item.subject || preferredSubject());
    setValue("range", [item.startLabel || "第 1 周", item.endLabel || "第 4 周"].filter(Boolean).join(" 到 "));
    setValue("goals", lines(item.goals || []));
    setValue("focusNodes", lines(item.focusNodes || []));
    setValue("recommendedTestNodes", lines(item.recommendedTestNodes || []));
    setValue("weeklyPlan", weeklyLines(item.weeklyPlan || []));
    const req = item.evidenceRequirements || {};
    setValue("aiDialogues", Number(req.aiDialogues ?? 3));
    setValue("knowledgeTests", Number(req.knowledgeTests ?? 2));
    setValue("reflections", Number(req.reflections ?? 1));
    setValue("learningOutputs", Number(req.learningOutputs ?? 1));
  };

  document.querySelectorAll("[data-cycle-settings-toggle], [data-cycle-settings-open]").forEach((button) => {
    button.addEventListener("click", () => {
      state.cycleSettingsOpen = button.hasAttribute("data-cycle-settings-open") ? true : !state.cycleSettingsOpen;
      renderContent();
    });
  });

  document.querySelectorAll("[data-cycle-view-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.cycleViewMode = button.dataset.cycleViewMode || "stage";
      renderContent();
    });
  });

  document.querySelectorAll("[data-learning-cycle-form]").forEach((form) => {
    form.querySelector("[data-cycle-template-select]")?.addEventListener("change", (event) => {
      const selected = templates.find((template) => template.key === event.currentTarget.value);
      if (selected) fillCycleForm(form, selected);
    });

    form.querySelector("[data-cycle-ai-suggest]")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const raw = Object.fromEntries(new FormData(form).entries());
      setButtonBusy(button, true, "生成中...");
      try {
        const payload = await api("/api/student/learning-cycle/suggest", {
          method: "POST",
          body: {
            userId: state.user.id,
            templateKey: raw.templateKey,
            focusNodes: raw.focusNodes,
            startLabel: String(raw.range || "").split(/到|至|-|—/)[0] || "第 1 周",
            endLabel: String(raw.range || "").split(/到|至|-|—/)[1] || "第 4 周"
          }
        });
        fillCycleForm(form, payload.suggestion || {});
        showToast("已根据学习画像生成周期建议，请确认后保存");
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        setButtonBusy(button, false);
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const raw = Object.fromEntries(new FormData(form).entries());
      const rangeParts = String(raw.range || "").split(/到|至|-|—/).map((item) => item.trim()).filter(Boolean);
      const button = form.querySelector('button[type="submit"]');
      setButtonBusy(button, true, "保存中...");
      try {
        const payload = await api("/api/student/learning-cycle", {
          method: "POST",
          body: {
            userId: state.user.id,
            id: raw.id,
            title: raw.title,
            subject: raw.subject,
            startLabel: rangeParts[0] || "第 1 周",
            endLabel: rangeParts[1] || "第 4 周",
            goals: raw.goals,
            templateKey: raw.templateKey,
            focusNodes: raw.focusNodes,
            weeklyPlan: raw.weeklyPlan,
            recommendedTestNodes: raw.recommendedTestNodes,
            viewMode: raw.viewMode || state.cycleViewMode || "stage",
            evidenceRequirements: {
              aiDialogues: Number(raw.aiDialogues || 0),
              knowledgeTests: Number(raw.knowledgeTests || 0),
              reflections: Number(raw.reflections || 0),
              learningOutputs: Number(raw.learningOutputs || 0),
              wrongFixes: 1
            }
          }
        });
        if (payload.portfolio) state.data.studentPortfolio = payload.portfolio;
        await loadState();
        renderShell();
        showToast("学习周期已保存");
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        setButtonBusy(button, false);
      }
    });
  });

  document.querySelectorAll("[data-cycle-task-status]").forEach((control) => {
    control.addEventListener("change", async () => {
      const cycle = currentStudentPortfolio().learningCycle || {};
      control.disabled = true;
      try {
        const payload = await api("/api/student/learning-cycle/tasks", {
          method: "POST",
          body: {
            userId: state.user.id,
            cycleId: cycle.virtual ? "" : cycle.id,
            subject: cycle.subject || preferredSubject(),
            taskKey: control.dataset.cycleTaskStatus,
            status: control.value,
            done: ["archived", "done"].includes(control.value),
            note: "学生手动更新周期任务状态"
          }
        });
        if (payload.portfolio) state.data.studentPortfolio = payload.portfolio;
        await loadState();
        renderShell();
        showToast("周期任务状态已更新");
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        control.disabled = false;
      }
    });
  });

  document.querySelectorAll("[data-answer-first-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const raw = Object.fromEntries(new FormData(form).entries());
      const studentAnswer = String(raw.studentAnswer || "").trim();
      const knowledgePoint = String(raw.knowledgePoint || "").trim() || (cycle.focusNodes || [])[0] || "当前知识点";
      if (!studentAnswer) return showToast("请先写下自己的原始理解", "error");
      const button = form.querySelector('button[type="submit"]');
      setButtonBusy(button, true, "诊断中...");
      try {
        const prompt = `请只基于我的原始理解诊断「${knowledgePoint}」的理解缺口，不要直接替我完成最终答案。请指出正确点、误区、需要验证的问题、引用依据和下一步测试建议。`;
        const payload = await api("/api/ai/chat", {
          method: "POST",
          body: {
            userId: state.user.id,
            conversationId: state.activeConversationId,
            mode: "grade",
            subject: cycle.subject || preferredSubject() || "机器学习",
            knowledgePoint,
            answerDepth: state.aiAnswerDepth || "layered",
            prompt,
            studentAnswer
          }
        });
        state.activeConversationId = payload.conversation?.id || state.activeConversationId;
        state.aiKnowledgePoint = knowledgePoint;
        state.aiStudentAnswer = "";
        state.page = "ai";
        await loadState();
        renderShell();
        showToast("AI 已基于原始答案完成诊断");
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        setButtonBusy(button, false);
      }
    });
  });
}

function bindEthicsSettingsForms() {
  document.querySelectorAll("[data-ethics-settings-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const checkboxValue = (name) => Boolean(form.querySelector(`input[name="${name}"]`)?.checked);
      const button = form.querySelector('button[type="submit"]');
      setButtonBusy(button, true, "保存中...");
      try {
        const payload = await api("/api/student/ethics-settings", {
          method: "POST",
          body: {
            userId: state.user.id,
            aiUseDisclosure: checkboxValue("aiUseDisclosure"),
            citationRequired: checkboxValue("citationRequired"),
            uncertaintyNotice: checkboxValue("uncertaintyNotice"),
            dataConsent: checkboxValue("dataConsent"),
            anonymousExportDefault: checkboxValue("anonymousExportDefault"),
            requireOriginalAnswerFirst: checkboxValue("requireOriginalAnswerFirst"),
            allowTeacherPrivateConversationAccess: checkboxValue("allowTeacherPrivateConversationAccess"),
            aiFinalAnswerBlocked: checkboxValue("aiFinalAnswerBlocked")
          }
        });
        if (payload.settings) state.data.studentEthicsSettings = payload.settings;
        if (payload.portfolio) state.data.studentPortfolio = payload.portfolio;
        await loadState();
        renderShell();
        showToast("AI 使用规范已保存");
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        setButtonBusy(button, false);
      }
    });
  });

  document.querySelectorAll("[data-data-deletion-request-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const raw = Object.fromEntries(new FormData(form).entries());
      const button = form.querySelector('button[type="submit"]');
      setButtonBusy(button, true, "提交中...");
      try {
        const payload = await api("/api/student/data-deletion-requests", {
          method: "POST",
          body: { userId: state.user.id, scopes: raw.scopes, reason: raw.reason }
        });
        if (payload.requests) state.data.studentDataDeletionRequests = payload.requests;
        if (payload.portfolio) state.data.studentPortfolio = payload.portfolio;
        await loadState();
        renderShell();
        showToast("删除申请已记录");
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        setButtonBusy(button, false);
      }
    });
  });
}

function bindNodeAnnotationForms() {
  document.querySelectorAll("[data-node-annotation-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const button = form.querySelector('button[type="submit"]');
      setButtonBusy(button, true, "保存中...");
      try {
        const payload = await api("/api/student/node-annotations", {
          method: "POST",
          body: {
            userId: state.user.id,
            ...data,
            favorite: Boolean(form.querySelector('input[name="favorite"]')?.checked),
            fromAiAnswer: Boolean(form.querySelector('input[name="fromAiAnswer"]')?.checked)
          }
        });
        if (payload.annotation) {
          const existing = (state.data.studentNodeAnnotations || []).filter((item) => item.id !== payload.annotation.id);
          state.data.studentNodeAnnotations = [payload.annotation, ...existing];
        }
        if (payload.portfolio) state.data.studentPortfolio = payload.portfolio;
        if (payload.learningAnalytics) state.data.learningAnalytics = payload.learningAnalytics;
        await loadState();
        renderShell();
        showToast("节点证据已保存到学习档案");
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        setButtonBusy(button, false);
      }
    });
  });
}

function bindReflectionForms() {
  document.querySelectorAll("[data-reflection-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const button = form.querySelector('button[type="submit"]');
      setButtonBusy(button, true, "保存中...");
      try {
        const payload = await api("/api/student/reflections", {
          method: "POST",
          body: { userId: state.user.id, ...data }
        });
        if (payload.portfolio) state.data.studentPortfolio = payload.portfolio;
        if (payload.learningAnalytics) state.data.learningAnalytics = payload.learningAnalytics;
        await loadState();
        renderShell();
        showToast("反思已保存到学习档案");
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        setButtonBusy(button, false);
      }
    });
  });
}

function bindKnowledgeCorrectionForms() {
  document.querySelectorAll("[data-topic-correction-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const button = form.querySelector('button[type="submit"]');
      setButtonBusy(button, true, "归档中...");
      try {
        const payload = await api("/api/student/knowledge-corrections", {
          method: "POST",
          body: {
            userId: state.user.id,
            subject: state.aiSubject || preferredSubject(),
            ...data
          }
        });
        if (payload.portfolio) state.data.studentPortfolio = payload.portfolio;
        if (payload.learningAnalytics) state.data.learningAnalytics = payload.learningAnalytics;
        await loadState();
        renderShell();
        showToast("知识点纠正已重新归档");
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        setButtonBusy(button, false);
      }
    });
  });
}

function bindAiReviewForms() {
  document.querySelectorAll("[data-ai-review-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const raw = Object.fromEntries(new FormData(form).entries());
      const button = form.querySelector('button[type="submit"]');
      setButtonBusy(button, true, "保存中...");
      try {
        const issueTags = [raw.reviewType].filter(Boolean);
        const payload = await api("/api/student/ai-answer-reviews", {
          method: "POST",
          body: {
            userId: state.user.id,
            ...raw,
            accepted: raw.reviewType === "accepted" || raw.reviewType === "partial_accept",
            issueTags
          }
        });
        if (payload.portfolio) state.data.studentPortfolio = payload.portfolio;
        if (payload.learningAnalytics) state.data.learningAnalytics = payload.learningAnalytics;
        await loadState();
        renderShell();
        showToast("AI 审辩记录已入档");
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        setButtonBusy(button, false);
      }
    });
  });
}

function graphListForCurrentRole() {
  let graphs = (state.data.knowledgeGraphs || []).filter((graph) => !isLearningPathResource(graph));
  if (state.user.role === "student") {
    graphs = graphs.filter((graph) => graph.global && (!state.graphSubject || graph.subject === state.graphSubject));
  } else if (state.user.role === "teacher") {
    const classId = String(state.selectedClassId || "");
    graphs = graphs.filter((graph) => {
      const syncedClassIds = Array.isArray(graph.syncedClassIds) ? graph.syncedClassIds : [];
      const graphClassId = String(graph.classId || "");
      return classId
        ? (syncedClassIds.length ? syncedClassIds.includes(classId) : graphClassId === classId)
        : true;
    });
  }
  return graphs;
}

function isMachineLearningGraph(graph) {
  return Boolean(graph && /机器学习|machine learning|动手学机器学习|ML/i.test(`${graph.subject || ""} ${graph.title || ""} ${graph.sourceName || ""}`));
}

function machineLearningGraph(graphs = graphListForCurrentRole()) {
  return graphs.find(isMachineLearningGraph) || null;
}

function machineLearningNodeText(node) {
  return [node?.label, node?.details, node?.misconception, node?.ontology?.layer, node?.ontology?.type, ...(node?.tags || []), ...(node?.knowledgePoints || [])].join(" ");
}

function machineLearningModuleMatches(node, module) {
  const text = machineLearningNodeText(node);
  return module.terms.some((term) => text.toLowerCase().includes(term.toLowerCase()));
}

function machineLearningModuleStats(graph, module) {
  const nodes = (graph?.nodes || []).filter((node) => machineLearningModuleMatches(node, module));
  const values = nodes.map(graphMasteryValue).filter((value) => Number.isFinite(value));
  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const risk = nodes.filter((node) => {
    const value = graphMasteryValue(node);
    return graphNodeHasWeakness(node) || (Number.isFinite(value) && value < 0.45);
  }).length;
  return { nodes, count: nodes.length, average, risk, mastered: nodes.filter((node) => Number(graphMasteryValue(node)) >= 0.78).length };
}

function renderMachineLearningModuleMap(graph) {
  if (!graph) return "";
  const selectedLabel = graphSelectedNode(graph)?.label || "逻辑回归";
  return `
    <section class="ml-graph-focus-header">
      <div class="ml-graph-focus-copy">
        <span class="cycle-eyebrow">《机器学习》课程专属图谱</span>
        <h2>知识图谱</h2>
        <p>以《动手学机器学习》章节为主线，查看知识节点、前置依赖、掌握度与错因关系。</p>
      </div>
      <div class="ml-graph-path-callout">
        <span>当前推荐路径</span>
        <strong>${escapeHtml(selectedLabel)} → 前置辨析 → 变式验证</strong>
        <small>不是固定章节顺序，而是根据你的学习证据动态调整。</small>
      </div>
    </section>
    <div class="ml-graph-quickbar"><span><b>${(graph.nodes || []).length}</b> 个知识节点</span><span><b>${(graph.links || []).length}</b> 条学习关系</span><span><b>18</b> 个教材章节</span><span>来源：${escapeHtml(graph.sourceName || "《动手学机器学习》")}</span><button type="button" class="mini primary" data-graph-node-filter="weak">优先看薄弱点</button></div>
    <section class="ml-module-map" aria-label="机器学习六大模块">
      ${ML_GRAPH_MODULES.map((module, index) => {
        const stats = machineLearningModuleStats(graph, module);
        const averageText = stats.average === null ? "待诊断" : `${Math.round(stats.average * 100)}%`;
        return `<button type="button" class="ml-module-card module-${module.key}" data-ml-module="${module.key}">
          <span class="ml-module-index">0${index + 1}</span>
          <span><strong>${escapeHtml(module.label)}</strong><small>${escapeHtml(module.short)}</small></span>
          <em>${averageText}</em>
          <small>${stats.count} 个节点 · ${stats.risk ? `${stats.risk} 个高风险` : "暂无高风险"}</small>
        </button>`;
      }).join("")}
    </section>
  `;
}

function renderStudentGraphPathSummary(graph) {
  if (!graph) return "";
  const candidates = ML_GRAPH_MODULES.flatMap((module) => machineLearningModuleStats(graph, module).nodes.map((node) => ({ node, module })))
    .map(({ node, module }) => ({ node, module, mastery: graphMasteryValue(node) }))
    .filter(({ mastery }) => !Number.isFinite(mastery) || mastery < 0.58)
    .sort((a, b) => (Number.isFinite(a.mastery) ? a.mastery : 0) - (Number.isFinite(b.mastery) ? b.mastery : 0));
  const target = candidates[0];
  if (!target) return `<section class="ml-shortest-path"><strong>最短补弱路径</strong><p>当前节点均有较好掌握记录，建议进入后测验证迁移应用。</p></section>`;
  const context = graphNodeContext(graph, target.node);
  const weakPrerequisite = graphWeaknessAttribution(graph, target.node)[0];
  return `<section class="ml-shortest-path">
    <div><span>个性化路径引擎</span><strong>最短补弱路径</strong></div>
    <p>优先处理「${escapeHtml(weakPrerequisite?.label || target.node.label)}」，再回到「${escapeHtml(target.node.label)}」完成变式验证。</p>
    <small>推荐原因：当前掌握度 ${escapeHtml(Number.isFinite(target.mastery) ? percentText(target.mastery) : "暂无记录")}，${weakPrerequisite ? `其前置节点「${escapeHtml(weakPrerequisite.label)}」仍是主要阻塞。` : "该节点是当前路径上的低掌握入口。"}</small>
    <button class="mini primary" type="button" data-ml-focus-node="${escapeHtml(weakPrerequisite?.id || target.node.id)}">查看路径节点</button>
  </section>`;
}

function renderGraphPage() {
  return isTeacherLike() ? renderTeacherGraphPage() : renderStudentGraphPage();
}

function graphCard(graph) {
  const active = state.selectedGraphId === graph.id ? "active" : "";
  const graphRagReady = graph.meta?.graphRagReady || graph.meta?.graphRag?.ready;
  const layerCount = Array.isArray(graph.meta?.ontologyLayers) ? graph.meta.ontologyLayers.length : 0;
  const relationTypes = Array.isArray(graph.meta?.semanticRelations) ? graph.meta.semanticRelations.length : new Set((graph.links || []).map((link) => link.type || link.label)).size;
  const assessableNodes = (graph.nodes || []).filter((node) => node.isAssessable);
  const completeNodes = assessableNodes.filter((node) => node.explanation && node.sourceAnchors?.length && node.assessmentSpec?.objectives?.length && node.assessmentSpec?.rubric?.length);
  if (state.user?.role === "student") {
    const stats = graphAnalytics(graph);
    return `
      <article class="list-card student-graph-card ${active}" data-select-graph="${graph.id}">
        <div>
          <h3>${escapeHtml(graph.title)}</h3>
          <p>${escapeHtml(graph.subject)} · ${stats.masteryEntries || 0} 个真实掌握记录 · ${stats.weakCount || 0} 个薄弱点</p>
          <div class="graph-badges">
            <span class="graph-badge mastered">已掌握 ${stats.masteredCount || 0}</span>
            <span class="graph-badge warning">待巩固 ${stats.weakCount || 0}</span>
            <span class="graph-badge">未开始 ${Math.max(0, (graph.nodes || []).length - Number(stats.masteryEntries || 0))}</span>
          </div>
          <small>点击进入后可查看“我如何学会它”的证据、反思和推荐测试。</small>
        </div>
        <div class="row-actions">
          <button class="mini" data-dashboard-page="portfolio">学习档案</button>
        </div>
      </article>
    `;
  }
  return `
    <article class="list-card ${active}" data-select-graph="${graph.id}">
      <div>
        <h3>${escapeHtml(graph.title)}</h3>
        <p>${escapeHtml(graph.subject)} · 节点 ${graph.nodes.length} · 关系 ${graph.links.length}</p>
        <div class="graph-badges">
          ${graphRagReady ? `<span class="graph-badge ready">GraphRAG</span>` : ""}
          <span class="graph-badge">${layerCount || 5} 维教育图谱</span>
          <span class="graph-badge">${relationTypes || 1} 类语义关系</span>
        </div>
        <small>${graph.publishStatus === "published" ? `已发布 · v${graph.version || "1"}` : `待发布 · ${completeNodes.length}/${assessableNodes.length} 个原子节点已完成校验`} · ${fmtTime(graph.createdAt)}</small>
      </div>
      <div class="row-actions">
        <div class="graph-card-sync-actions">
          <button class="mini" data-export-graph="${graph.id}">导出</button>
          ${graph.ownerId === state.user.id ? `<button class="mini" data-sync-graph="${graph.id}">同步</button>` : ""}
        </div>
        ${graph.ownerId === state.user.id && graph.publishStatus !== "published" ? `<button class="mini primary" data-publish-graph="${graph.id}">校验并发布</button>` : ""}
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
    message: ""
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
      ${job.error || job.message ? `<p>${escapeHtml(job.error || job.message || "")}</p>` : ""}
      ${extraction ? `<small>解析工具：${escapeHtml(extraction.method || extraction.extractor || "PDF/OCR 解析智能体")}；识别字符：${extraction.characters || 0}；文件大小：${formatBytes(extraction.size || extraction.fileSize || 0)}${ocrInfo}</small>` : ""}
    </section>
  `;
}

function graphJobStatusLabel(status) {
  return {
    idle: "未开始",
    queued: "排队中",
    running: "正在生成",
    complete: "已完成",
    failed: "失败",
    canceled: "已取消"
  }[status] || status || "未知";
}

function graphJobDuration(job) {
  const start = new Date(job.createdAt || 0).getTime();
  const end = new Date(job.updatedAt || job.createdAt || 0).getTime();
  if (!start || !end || end < start) return "耗时待计算";
  const seconds = Math.max(1, Math.round((end - start) / 1000));
  if (seconds < 60) return `${seconds} 秒`;
  return `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;
}

function renderGraphTaskCenter() {
  const jobs = [];
  if (state.graphJob?.id) jobs.push(state.graphJob);
  (state.graphJobs || []).forEach((job) => {
    if (!jobs.some((item) => item.id === job.id)) jobs.push(job);
  });
  const sorted = latestByTime(jobs).slice(0, 8);
  if (!sorted.length) return emptyBlock("暂无图谱生成任务。上传教材生成后，这里会显示进度、失败原因、OCR 状态和来源文件。");
  return `
    <div class="graph-job-list">
      ${sorted.map((job) => {
        const extraction = job.meta?.extraction || {};
        const ocr = extraction.stats?.ocrUsed
          ? `OCR ${extraction.stats.ocrPages || 0}/${extraction.stats.ocrPlannedPages || extraction.stats.ocrTotalPdfPages || 0} 页`
          : "OCR 未触发或未返回";
        const canCancel = ["queued", "running"].includes(job.status);
        return `
          <article class="graph-job-card ${escapeHtml(job.status || "")}">
            <div>
              <strong>${escapeHtml(job.meta?.title || job.meta?.sourceName || "图谱生成任务")}</strong>
              <span>${escapeHtml(graphJobStatusLabel(job.status))} · ${clamp(Number(job.progress || 0), 0, 100)}% · ${graphJobDuration(job)}</span>
              <small>${escapeHtml(job.meta?.subject || "通用")} · ${escapeHtml(job.meta?.sourceName || "手动内容")} · ${ocr}</small>
              ${job.error ? `<p>${escapeHtml(job.error)}</p>` : job.message ? `<p>${escapeHtml(job.message)}</p>` : ""}
            </div>
            <div class="row-actions">
              ${job.graphId ? `<button class="mini" type="button" data-open-job-graph="${job.graphId}">打开图谱</button>` : ""}
              ${canCancel ? `<button class="mini danger" type="button" data-cancel-graph-job="${job.id}">取消</button>` : ""}
              ${job.status === "failed" ? `<button class="mini" type="button" data-retry-graph-job="${job.id}">重试</button>` : ""}
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderTeacherGraphPage() {
  const graphs = graphListForCurrentRole();
  const selected = graphs.find((graph) => graph.id === state.selectedGraphId) || null;
  if (selected) return renderGraphDetailShell(graphs, selected, "teacher");
  const draft = state.graphDraft || {};
  const tab = state.graphTab || "library";
  return `
    <section class="panel graph-product-shell">
      <div class="split-head graph-product-head">
        <div>
          <p class="hint">按“查看已有图谱 -> 生成图谱 -> 导入图谱”组织主流程，详情区保留章节树、画布、节点详情和学习诊断。</p>
        </div>
      </div>
      <div class="graph-library-toolbar">
        <div class="product-tabs">
          ${[
            ["library", "图谱库"],
            ["generate", "生成图谱"],
            ["import", "导入图谱"]
          ].map(([key, label]) => `<button type="button" class="${tab === key ? "active" : ""}" data-graph-tab="${key}">${label}</button>`).join("")}
        </div>
        ${tab === "library" ? `
          <form id="graphLibrarySearchForm" class="graph-search graph-library-search">
            <input name="query" value="${escapeHtml(state.graphSearch || "")}" placeholder="搜索图谱名称或学科" />
            <button class="mini" type="submit">搜索</button>
          </form>
        ` : ""}
      </div>
      ${tab === "generate" ? renderTeacherGraphGenerateTab(draft) : tab === "import" ? renderTeacherGraphImportTab() : renderTeacherGraphLibraryTab(graphs, selected)}
    </section>
    ${renderGraphNodeModal()}
    ${renderGraphSyncModal()}
  `;
}

function renderGraphSyncModal() {
  const graphId = state.graphSyncModal?.graphId;
  const graph = (state.data?.knowledgeGraphs || []).find((item) => item.id === graphId);
  if (!graph || state.user?.role !== "teacher") return "";
  const classes = (state.data?.classes || []).filter((klass) => klass.teacherId === state.user.id);
  const selectedIds = new Set(Array.isArray(graph.syncedClassIds)
    ? graph.syncedClassIds
    : (graph.classId ? [graph.classId] : []));
  return `
    <div class="modal-backdrop">
      <section class="modal compact-modal graph-sync-modal">
        <button class="modal-close" type="button" id="closeGraphSyncModal">×</button>
        <h2>同步知识图谱</h2>
        <p class="graph-sync-hint">${escapeHtml(graph.title)}。同步后，所选班级中正在学习该班级的学生即可查看和使用图谱。</p>
        <form id="graphSyncForm" class="stack" data-graph-id="${escapeHtml(graph.id)}">
          <div class="graph-sync-class-list">
            ${classes.map((klass) => `
              <label>
                <input type="checkbox" name="classIds" value="${escapeHtml(klass.id)}" ${selectedIds.has(klass.id) ? "checked" : ""} />
                <span><strong>${escapeHtml(klass.name)}</strong><small>${escapeHtml(klass.subject || "未设置学科")} · ${(klass.studentIds || []).length} 名学生</small></span>
              </label>
            `).join("") || `<p class="graph-sync-hint">暂无可同步的班级，请先在班级学情中创建班级。</p>`}
          </div>
          <div class="actions">
            <button class="primary" type="submit" ${classes.length ? "" : "disabled"}>确认同步</button>
            <button class="mini" type="button" id="cancelGraphSync">取消</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderLearningPathSyncModal() {
  const pathId = state.learningPathSyncModal?.pathId;
  const path = allVisibleLearningPaths().find((item) => item.id === pathId);
  if (!path || state.user?.role !== "teacher") return "";
  const classes = (state.data?.classes || []).filter((klass) => klass.teacherId === state.user.id);
  const selectedIds = new Set(Array.isArray(path.syncedClassIds) ? path.syncedClassIds : (path.classId ? [path.classId] : []));
  return `
    <div class="modal-backdrop">
      <section class="modal compact-modal graph-sync-modal">
        <button class="modal-close" type="button" id="closeLearningPathSyncModal">×</button>
        <h2>同步学习路径</h2>
        <p class="graph-sync-hint">${escapeHtml(path.title)}。同步后，所选班级中的学生可以按该路径顺序学习和完成验证任务。</p>
        <form id="learningPathSyncForm" class="stack" data-path-id="${escapeHtml(path.id)}">
          <div class="graph-sync-class-list">
            ${classes.map((klass) => `
              <label>
                <input type="checkbox" name="classIds" value="${escapeHtml(klass.id)}" ${selectedIds.has(klass.id) ? "checked" : ""} />
                <span><strong>${escapeHtml(klass.name)}</strong><small>${escapeHtml(klass.subject || "未设置学科")} · ${(klass.studentIds || []).length} 名学生</small></span>
              </label>
            `).join("") || `<p class="graph-sync-hint">暂无可同步的班级，请先在班级学情中创建班级。</p>`}
          </div>
          <div class="actions"><button class="primary" type="submit" ${classes.length ? "" : "disabled"}>确认同步</button><button class="mini" type="button" id="cancelLearningPathSync">取消</button></div>
        </form>
      </section>
    </div>
  `;
}

function renderTeacherGraphLibraryTab(graphs, selected) {
  const query = String(state.graphSearch || "").trim();
  const list = query ? graphs.filter((graph) => `${graph.title} ${graph.subject}`.includes(query)) : graphs;
  const cards = list.map(graphCard).join("") || emptyBlock("还没有图谱。可切换到“生成图谱”或“导入图谱”开始。");
  if (!selected) {
    return `
      <div class="graph-library-layout graph-library-only">
        <section class="graph-library-list graph-library-picker">
          <div class="graph-list compact">${cards}</div>
        </section>
      </div>
    `;
  }
  return `
    <div class="graph-library-layout">
      <aside class="graph-library-list graph-library-detail-list">
        <div class="graph-detail-toolbar">
          <button class="mini" type="button" id="graphBackToLibrary">返回图谱列表</button>
          <span>${escapeHtml(selected.title)}</span>
        </div>
        <div class="graph-list compact">${cards}</div>
      </aside>
      <section class="graph-detail-workspace">
        ${selected ? renderGraphLearningWorkspace(graphs, selected, "teacher", false) : emptyBlock("选择一个图谱后进入详情。")}
      </section>
    </div>
  `;
}

function renderTeacherGraphGenerateTab(draft) {
  return `
    <div class="grid two graph-form-grid">
      <section class="panel graph-form-card">
        <h3>生成图谱</h3>
        <form id="generateGraphForm" class="stack">
          <div class="form-grid">
            <label>学科<input name="subject" value="${escapeHtml(draft.subject || preferredSubject())}" placeholder="例如：机器学习、操作系统、人工智能导论" required /></label>
            <label>图谱名称<input name="title" value="${escapeHtml(draft.title || "")}" placeholder="例如：机器学习课程知识图谱" /></label>
          </div>
          <label>内容识别工具
            <select name="extractor">
              <option value="ai-unlimited-pdf-graph-agent" ${(draft.extractor || DEFAULT_GRAPH_EXTRACTOR) === "ai-unlimited-pdf-graph-agent" ? "selected" : ""}>AI 自动图谱智能体（不限总文件大小，目录/OCR 融合）</option>
              <option value="advanced-python-pdf-agent" ${draft.extractor === "advanced-python-pdf-agent" ? "selected" : ""}>高级 PDF/OCR 智能体（PyMuPDF/PaddleOCR）</option>
              <option value="local-pdf-text-agent" ${draft.extractor === "local-pdf-text-agent" ? "selected" : ""}>轻量 PDF 文本解析智能体</option>
              <option value="outline-fusion-agent" ${draft.extractor === "outline-fusion-agent" ? "selected" : ""}>目录与补充内容融合工具</option>
            </select>
          </label>
          <label>上传教材（可多选 PDF/TXT/EPUB/MD）<input name="book" type="file" accept=".pdf,.txt,.epub,.md" multiple /></label>
          <label class="supplement-field">补充目录或知识点
            <textarea name="sourceText" form="generateGraphForm" rows="7" placeholder="可粘贴目录、章节标题、重点知识点，系统会据此生成节点和关系">${escapeHtml(draft.sourceText || "")}</textarea>
          </label>
          <div class="actions">
            <button class="primary" type="submit">生成图谱</button>
            <button class="ghost" type="button" id="sampleGraphBtn">生成示例</button>
          </div>
        </form>
        <div id="graphProgressMount">${renderGraphProgress()}</div>
      </section>
      <section class="panel graph-task-panel">
        <div class="split-head">
          <h3>任务中心</h3>
          <button class="mini" type="button" id="refreshGraphJobs">刷新</button>
        </div>
        <div id="graphTaskCenter">${renderGraphTaskCenter()}</div>
      </section>
    </div>
  `;
}

function renderTeacherGraphImportTab() {
  return `
    <div class="grid two graph-form-grid">
      <section class="panel import-graph-panel graph-form-card">
        <h3>导入图谱</h3>
        <form id="importGraphForm" class="stack import-graph-form">
          <div class="form-grid">
            <label>学科<input name="subject" value="${escapeHtml(preferredSubject())}" placeholder="例如：机器学习、线性代数" /></label>
            <label>图谱名称<input name="title" placeholder="导入图谱名称" /></label>
          </div>
          <label>图谱 JSON 文件<input name="graph" type="file" accept=".json" required /></label>
          <label>补充目录或校验备注<textarea name="sourceText" rows="7" placeholder="可记录目录来源、缺失章节、待补节点或校验结论"></textarea></label>
          <button class="primary" type="submit">确认导入并校验</button>
        </form>
      </section>
      <section class="panel graph-import-check">
        <h3>校验结果</h3>
        <div class="detail-card">
          <strong>导入前检查</strong>
          <p>系统会读取 JSON 中的 subject、title、nodes、links 字段；导入后可在图谱库中查看节点数量、关系类型和章节树。</p>
        </div>
        <div class="detail-card">
          <strong>建议补充</strong>
          <p>若原始 JSON 没有目录层级，建议在备注中写清章节结构，导入后再通过“生成图谱”补齐目录节点。</p>
        </div>
      </section>
    </div>
  `;
}

function renderStudentGraphPage() {
  const graphs = graphListForCurrentRole();
  const selected = graphs.find((graph) => graph.id === state.selectedGraphId) || machineLearningGraph(graphs) || graphs[0] || null;
  if (selected) return renderGraphDetailShell(graphs, selected, "student");
  return `
    <section class="panel student-graph-full student-graph-home">
      <div class="graph-only-empty-head"><p>${escapeHtml(learningResourceEmptyMessage("知识图谱"))}</p></div>
      ${renderStudentGraphLibraryTab(graphs)}
    </section>
    ${renderGraphNodeModal()}
  `;
}

function renderGraphDetailShell(graphs, selected, mode = "teacher") {
  const stats = graphAnalytics(selected);
  const detailOpen = Boolean(graphExplicitSelectedNode(selected));
  const shellClass = state.graphMaximized ? "graph-maximized" : "";
  return `
    <section class="panel graph-detail-shell graph-dashboard-shell graph-atlas-shell graph-focus-shell ${mode === "student" ? "student-graph-only-shell" : ""} ${detailOpen ? "detail-open" : "detail-collapsed"} ${mode === "student" ? "student-graph-detail-shell" : "teacher-graph-detail-shell"} ${shellClass}" data-graph-atlas-shell="${escapeHtml(selected.id)}">
      ${mode === "teacher" ? renderTeacherMlGraphEditor(selected) : ""}
      ${mode === "teacher" ? renderGraphAtlasNav(selected) : ""}
      <div class="graph-atlas-main">
        ${mode === "teacher" ? renderGraphAtlasFilterbar(selected, stats) : ""}
        <div class="graph-atlas-workbench">
          ${mode === "student" ? `
            <aside class="student-graph-info-rail" aria-label="图谱学习概览">
              <div class="graph-atlas-stat-stack">
                ${renderGraphAtlasStats(selected, mode, stats)}
              </div>
              ${renderGraphAtlasLegend()}
            </aside>
          ` : `
            <aside class="graph-atlas-stat-stack">
              ${renderGraphAtlasStats(selected, mode, stats)}
            </aside>
          `}
          <div class="graph-atlas-stage">
            <div class="graph-canvas">${renderGraphViewer(selected, mode === "teacher")}</div>
          </div>
          ${mode === "teacher" ? renderGraphAtlasModePanel() : ""}
          ${mode === "teacher" ? renderGraphAtlasLegend() : ""}
        </div>
      </div>
      ${mode === "teacher" ? renderGraphAtlasFooter(selected) : ""}
    </section>
    ${renderGraphNodeModal()}
  `;
}

function renderGraphAtlasNav(graph) {
  const items = ["导学", "教材", "教学目标", "知识图谱", "目录", "FAQ", "学习资料", "测验", "作业", "项目"];
  return `
    <nav class="graph-atlas-nav" aria-label="知识图谱导航">
      <div class="graph-atlas-nav-scroll">
        ${items.map((item) => `<button type="button" class="${item === "知识图谱" ? "active" : ""}">${escapeHtml(item)}</button>`).join("")}
      </div>
      <div class="graph-atlas-title">
        <span>${escapeHtml(compactText(graph.title || "知识图谱", 28))}</span>
        <button class="mini" type="button" id="graphBackToLibrary">图谱库</button>
      </div>
    </nav>
  `;
}

function renderGraphAtlasFilterbar(graph, stats) {
  const filterSet = graphFilterSet();
  const searchValue = escapeHtml(state.graphSearch || "");
  const filterButtons = state.user?.role === "student"
    ? [
      { label: "我的路径", key: "all" },
      { label: "当前薄弱", key: "weak" },
      { label: "已掌握", key: "mastered" },
      { label: "误区节点", key: "misconception" },
      { label: "验证任务", key: "exercise" }
    ]
    : [
      { label: "分类", key: "all" },
      { label: "难易度", key: "weak" },
      { label: "掌握度", key: "mastered" },
      { label: "学习进度", key: "resource" },
      { label: "达成状态", key: "core" }
    ];
  return `
    <div class="graph-atlas-filterbar">
      <form id="graphSearchForm" class="graph-atlas-search">
        <input name="query" value="${searchValue}" placeholder="请输入关键字" />
        <span class="graph-atlas-search-separator"></span>
        <button type="submit" title="搜索">${iconSvg("search", "搜索")}</button>
      </form>
      <div class="graph-atlas-filters">
        ${filterButtons.map((item) => `
          <button type="button" class="${(state.graphNodeFilter || "all") === item.key ? "active" : ""}" data-graph-node-filter="${item.key}">
            ${escapeHtml(item.label)} ${iconSvg("chevronDown", item.label)}
          </button>
        `).join("")}
        <button type="button" class="more" data-graph-relation="resource" aria-pressed="${filterSet.has("resource") ? "true" : "false"}">
          更多筛选 ${iconSvg("chevronDown", "更多筛选")}
        </button>
      </div>
      <div class="graph-atlas-current-count">当前节点知识点数： <strong>${stats.visibleNodes}/${stats.totalNodes}</strong></div>
      <button class="graph-atlas-layout-btn" type="button" data-graph-layer="${state.graphLayer === "overview" ? "relation" : "overview"}">
        ${iconSvg("refresh", "布局切换")} 布局切换
      </button>
    </div>
  `;
}

function renderGraphAtlasStats(graph, mode = "teacher", stats = graphAnalytics(graph)) {
  const completionText = `${Math.round(stats.completion * 100)}%`;
  const masteryText = `${Math.round(stats.averageMastery * 100)}%`;
  const hasMastery = stats.masteryEntries > 0;
  const cards = [
    { icon: "book", label: "知识点总数", value: stats.totalNodes, suffix: "", meta: "" },
    { icon: "complete", label: "学习完成率", value: completionText, suffix: "", meta: hasMastery ? `${stats.masteredCount} 个已掌握` : "--" },
    { icon: "target", label: "学习达成率", value: masteryText, suffix: "", meta: hasMastery ? `${stats.masteryEntries} 个真实记录` : "--" }
  ];
  return cards.map((card) => `
    <article class="graph-atlas-stat-card ${card.icon}">
      <span class="graph-atlas-stat-icon"></span>
      <div>
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(String(card.value))}${card.suffix ? `<small>${escapeHtml(card.suffix)}</small>` : ""}</strong>
        <em>${escapeHtml(card.meta || "")}</em>
      </div>
    </article>
  `).join("");
}

function renderGraphAtlasModePanel() {
  const layer = state.graphLayer || "overview";
  const modeButtons = [
    { key: "overview", label: "重力模式" },
    { key: "relation", label: "中心模式" }
  ];
  return `
    <aside class="graph-atlas-mode-panel">
      <div class="graph-atlas-layout-modes">
        ${modeButtons.map((item) => `<button type="button" class="${layer === item.key ? "active" : ""}" data-graph-layer="${item.key}">${escapeHtml(item.label)}</button>`).join("")}
      </div>
      <div class="graph-atlas-view-modes">
        <button type="button" class="${layer !== "diagnosis" ? "active" : ""}" data-graph-layer="relation">${iconSvg("atom", "图谱模式")} 图谱模式</button>
        <button type="button" data-graph-layer="overview">${iconSvg("columns", "导图模式")} 导图模式</button>
        <button type="button" data-graph-layer="diagnosis">${iconSvg("branch", "大纲模式")} 大纲模式</button>
      </div>
    </aside>
  `;
}

function renderGraphAtlasLegend() {
  const items = state.user?.role === "student"
    ? [
      { tone: "mastery-high", label: "已掌握" },
      { tone: "mastery-mid", label: "待巩固" },
      { tone: "mastery-low", label: "薄弱点" },
      { tone: "learning", label: "正在学习" },
      { tone: "not-started", label: "未开始" }
    ]
    : [
      { tone: "root", label: "根节点" },
      { tone: "unit-1", label: "一级知识单元" },
      { tone: "unit-2", label: "二级知识单元" },
      { tone: "point-1", label: "一级知识点" },
      { tone: "point-2", label: "二级知识点" }
    ];
  return `
    <aside class="graph-atlas-legend">
      ${items.map((item) => `<div><span class="legend-dot ${item.tone}"></span>${escapeHtml(item.label)}</div>`).join("")}
    </aside>
  `;
}

function graphAtlasTagStats(graph) {
  const nodes = graph?.nodes || [];
  const includesText = (node, pattern) => [
    node.label,
    node.details,
    node.misconception,
    node.ontology?.layer,
    node.ontology?.type,
    node.cognitive?.objective,
    ...(Array.isArray(node.tags) ? node.tags : []),
    ...(Array.isArray(node.knowledgePoints) ? node.knowledgePoints : [])
  ].join(" ");
  const count = (fn) => nodes.reduce((sum, node, index) => sum + (fn(node, index) ? 1 : 0), 0);
  return {
    important: count((node, index) => graphNodeImportanceScore(node, index) >= 38 || /重点|核心|关键/.test(includesText(node))),
    difficult: count((node) => graphNodeHasWeakness(node) || /难点|困难|复杂/.test(includesText(node))),
    exam: count((node) => /考点|考试|测验|题型|题目/.test(includesText(node))),
    selfStudy: count((node) => /自学|自主/.test(includesText(node))),
    thinking: count((node) => /思政|价值|素养/.test(includesText(node))),
    fivePoint: count((node) => /五新|新课标|新教材|新技术|新方法|新评价/.test(includesText(node))),
    skill: count((node) => /技能|能力|实践|操作/.test(includesText(node))),
    experiment: count((node) => graphHasExercise(node) || /实验|实训|实践/.test(includesText(node))),
    custom: count((node) => /自定义|custom/.test(includesText(node)))
  };
}

function renderGraphAtlasFooter(graph) {
  const tagStats = graphAtlasTagStats(graph);
  const relations = [
    { key: "prerequisite", label: "前修" },
    { key: "contains", label: "包含" },
    { key: "sequence", label: "顺序" },
    { key: "semantic", label: "相关" },
    { key: "custom", label: "自定义" }
  ];
  const filterSet = graphFilterSet();
  const tags = [
    ["重点", tagStats.important],
    ["难点", tagStats.difficult],
    ["考点", tagStats.exam],
    ["自学", tagStats.selfStudy],
    ["思政点", tagStats.thinking],
    ["五新点", tagStats.fivePoint],
    ["技能点", tagStats.skill],
    ["实验/实践/实训", tagStats.experiment],
    ["自定义", tagStats.custom]
  ];
  return `
    <footer class="graph-atlas-footer">
      <div class="graph-atlas-relations">
        <span>关系：</span>
        ${relations.map((item) => `<button type="button" class="${filterSet.has(item.key) ? "active" : ""}" data-graph-relation="${item.key}">${escapeHtml(item.label)}</button>`).join("")}
      </div>
      <div class="graph-atlas-tags">
        <span>标签：</span>
        ${tags.map(([label, value]) => `<span>${escapeHtml(label)}： <strong>${Number(value || 0)}</strong></span>`).join("")}
      </div>
    </footer>
  `;
}

function renderGraphDashboardStats(graph, mode = "teacher") {
  const stats = graphAnalytics(graph);
  const averageText = `${Math.round(stats.averageMastery * 100)}%`;
  const completionText = `${Math.round(stats.completion * 100)}%`;
  const classLabel = mode === "teacher" ? "班级平均掌握率" : "个人掌握率";
  const completionLabel = mode === "teacher" ? "班级平均完成率" : "学习完成率";
  const cards = [
    { key: "all", tone: "blue", label: "知识点总数", value: stats.totalNodes, sub: `${stats.visibleNodes} 个当前显示` },
    { key: "mastered", tone: "green", label: classLabel, value: averageText, sub: `${stats.masteryEntries || 0} 个节点有真实记录` },
    { key: "weak", tone: "red", label: "薄弱点", value: stats.weakCount, sub: `${completionLabel} ${completionText}` },
    { key: "resource", tone: "violet", label: "资料覆盖", value: stats.resourceCount, sub: `${stats.exerciseCount} 个节点关联练习` }
  ];
  return `
    <div class="graph-dashboard-stats">
      ${cards.map((card) => `
        <button class="graph-stat-card tone-${card.tone} ${state.graphNodeFilter === card.key ? "active" : ""}" type="button" data-graph-node-filter="${card.key}">
          <span class="graph-stat-icon">${escapeHtml(card.label.slice(0, 1))}</span>
          <span>
            <small>${escapeHtml(card.label)}</small>
            <strong>${escapeHtml(String(card.value))}</strong>
            <em>${escapeHtml(card.sub)}</em>
          </span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderStudentGraphLibraryTab(graphs) {
  const emptyMessage = graphs.length ? "" : learningResourceEmptyMessage("知识图谱");
  return `
    <div class="graph-library-layout graph-library-only student-graph-picker">
      <section class="graph-library-list graph-library-picker">
        <div class="student-graph-picker-head">
          <label class="compact-label">学科<select id="studentGraphSubject">${subjectSelectOptions(state.graphSubject, studentGraphSubjects(), true, "全部图谱")}</select></label>
          <div class="inline-stats">
            <span>${graphs.length}<small>可见图谱</small></span>
          </div>
        </div>
        <div class="graph-list compact">${graphs.map(graphCard).join("") || emptyBlock(emptyMessage)}</div>
      </section>
    </div>
  `;
}

function renderStudentKnowledgeTestTab() {
  const test = state.knowledgeTest || {};
  const phase = ["diagnostic", "remedial", "verify"].includes(test.phase) ? test.phase : "diagnostic";
  const testSubjects = knowledgeTestSubjects();
  const selectedSubject = normalizeSubjectLabel(test.subject || testSubjects[0] || preferredSubject());
  const materials = knowledgeTestMaterialsForSubject(selectedSubject);
  const selectedMaterialId = materials.some((item) => item.id === test.materialId) ? test.materialId : "";
  const currentIndex = clamp(Number(test.currentIndex || 0), 0, Math.max(0, (test.questions || []).length - 1));
  const question = (test.questions || [])[currentIndex] || null;
  const attempts = Array.isArray(test.attempts) ? test.attempts : [];
  const summary = test.summary || test.result?.overall || null;
  const answeredQuestionIds = new Set(attempts.map((item) => item.questionId).filter(Boolean));
  const sourceMaterials = Array.isArray(test.sourceMaterials) ? test.sourceMaterials : [];
  const phaseMeta = {
    diagnostic: { label: "诊断性练习", hint: "前测 / 章节前测 / 知识点微测，先定位掌握度与错因。" },
    remedial: { label: "补救性练习", hint: "根据错因生成最多 4 道同类辨析与变式迁移题。" },
    verify: { label: "验证性练习", hint: "完成补救后，用新题验证错因是否真正消除。" }
  }[phase];
  const currentQuestionNode = question?.nodeId ? (state.data?.knowledgeGraphs || []).flatMap((graph) => graph.nodes || []).find((node) => node.id === question.nodeId) : null;
  const latestAccuracy = Number(test.result?.accuracy || test.previousAccuracy || 0);
  const comparisonNote = phase === "verify" ? "本阶段使用不同题面与新场景，难度保持在中高，专门验证迁移理解。" : phase === "diagnostic" ? "前测将作为同一知识点的基线，后测会使用不同版本题目进行对比。" : "补救题围绕同一知识点和错因标签生成。";
  return `
    <div class="diagnostic-practice-shell">
      <section class="practice-stage-header">
        <div>
          <span class="cycle-eyebrow">机器学习知识测评</span>
          <h2>诊断练习 → 补救练习 → 验证练习</h2>
          <p>每道题都绑定知识图谱节点，答题结果会更新学习画像，并决定下一步干预。</p>
        </div>
        <div class="practice-profile-snapshot">
          <strong>${summary ? `${Number(summary.accuracy || 0)}%` : "待诊断"}</strong>
          <span>${summary ? `${Number(summary.answered || 0)}/${Number(summary.total || (test.questions || []).length)} 题已完成` : "完成前测后生成画像"}</span>
        </div>
      </section>
      <nav class="practice-stage-tabs" aria-label="练习阶段">
        ${Object.entries(phaseMeta ? { diagnostic: phaseMeta, remedial: { label: "补救性练习", hint: "根据错因生成最多 4 道同类辨析与变式迁移题。" }, verify: { label: "验证性练习", hint: "完成补救后，用新题验证错因是否真正消除。" } } : {}).map(([key, item]) => `<button type="button" class="${phase === key ? "active" : ""}" data-practice-phase="${key}"><strong>${item.label}</strong><span>${item.hint}</span></button>`).join("")}
      </nav>
      <section class="practice-stage-intro"><strong>${phaseMeta.label}</strong><span>${phaseMeta.hint}</span><em>最多 3–5 题</em><small>${comparisonNote}</small></section>
      <div class="knowledge-test-layout">
      <section class="knowledge-test-setup">
        <form id="knowledgeTestSetupForm" class="knowledge-test-form">
          <label>学科
            <select name="subject" id="knowledgeTestSubjectSelect">
              ${subjectSelectOptions(selectedSubject, testSubjects, false)}
            </select>
          </label>
          <label>课程资料
            <select name="materialId" id="knowledgeTestMaterialSelect">
              <option value="">该学科全部可见资料</option>
              ${materials.map((item) => `<option value="${escapeHtml(item.id)}" ${selectedMaterialId === item.id ? "selected" : ""}>${escapeHtml(item.title)}</option>`).join("")}
            </select>
          </label>
          <input type="hidden" name="phase" value="${phase}" />
          <button class="primary" type="submit" ${materials.length ? "" : "disabled"}>生成${phaseMeta.label}</button>
        </form>
        ${test.sourceNotice ? `<p class="knowledge-source-notice">${escapeHtml(test.sourceNotice)}</p>` : ""}
        ${sourceMaterials.length ? `
          <div class="knowledge-source-strip">
            ${sourceMaterials.slice(0, 4).map((item) => `<span>${escapeHtml(item.title || item.sourceName || "课程资料")}</span>`).join("")}
          </div>
        ` : ""}
      </section>
      <section class="knowledge-test-workspace">
        ${question ? `
          <article class="knowledge-question-card">
            <div class="split-head">
              <h3>${escapeHtml(question.topic || selectedSubject || "知识测试")}</h3>
              <strong>${currentIndex + 1}/${(test.questions || []).length}${answeredQuestionIds.has(question.id) ? " · 已答" : ""}</strong>
            </div>
            <div class="practice-question-tags"><span>${escapeHtml(question.type || "开放题")}</span><span>版本：${escapeHtml(question.version || "v1")}</span><span>难度：${escapeHtml(question.difficulty || "中")}</span><span>知识点：${escapeHtml(question.knowledgePoint || question.topic || "待绑定")}</span></div>
            <p>${escapeHtml(question.prompt)}</p>
            <div class="knowledge-question-meta">
              <span>来源：${escapeHtml(question.source || question.sourceTitle || "课程资料")}</span>
              ${(question.misconceptionTags || []).length ? `<span>错因：${escapeHtml(question.misconceptionTags.join("、"))}</span>` : ""}
              ${question.sourceChapter ? `<span>${escapeHtml(question.sourceChapter)}</span>` : ""}
              <span>${escapeHtml(question.rubric || "按资料依据、关键点和表达完整度评分")}</span>
            </div>
            ${question.sourceQuote ? `<blockquote>${escapeHtml(question.sourceQuote)}</blockquote>` : ""}
            <form id="knowledgeTestAnswerForm" class="stack">
              <textarea name="answer" rows="7" placeholder="输入你的回答，可以多次修改后重新提交">${escapeHtml(test.answer || "")}</textarea>
              <button class="primary" type="submit">提交本次回答</button>
            </form>
            ${test.result ? `
              <div class="knowledge-test-result ${test.result.errorEliminated === true ? "improved" : ""}">
                <strong>本题 ${Number(test.result.accuracy || 0)}% · ${escapeHtml(test.result.masteryLevel || "")}</strong>
                <p>${escapeHtml(test.result.feedback || "")}</p>
                <div class="mastery-meter"><span style="width:${clamp(Number(test.result.accuracy || 0), 0, 100)}%"></span></div>
                ${(test.result.matched || []).length ? `<p class="knowledge-test-detail">已覆盖：${escapeHtml((test.result.matched || []).slice(0, 8).join("、"))}</p>` : ""}
                ${(test.result.missing || []).length ? `<p class="knowledge-test-detail">待补充：${escapeHtml((test.result.missing || []).slice(0, 8).join("、"))}</p>` : ""}
                <p class="knowledge-test-detail"><strong>理解判定：</strong>${Number(test.result.accuracy || 0) >= 70 && (test.result.missing || []).length <= 2 ? "能解释关键依据，倾向于真正理解" : "暂不能仅凭分数确认理解，需完成不同题面变式验证"}</p>
                <p class="practice-improvement-status">${phase === "verify" ? (test.result.errorEliminated ? "错因已消除：可以进入下一知识点。" : "错因尚未消除：建议更换干预方式，先看微课或询问 AI。") : "答题结果已写入学习画像，可查看错因并生成补救题。"}</p>
                <div class="practice-answer-actions">
                  <button type="button" class="mini" data-test-action="analysis">查看错因分析</button>
                  <button type="button" class="mini" data-test-action="archive">加入订正档案</button>
                  <button type="button" class="mini primary" data-test-action="variant">生成一道变式题</button>
                </div>
                <div class="practice-analysis-panel" data-practice-analysis hidden><b>诊断提示</b><p>${escapeHtml((test.result.missing || []).length ? `当前主要缺口：${(test.result.missing || []).slice(0, 4).join("、")}` : "当前没有明显缺口，建议用新场景验证迁移能力。")}</p><p>下一步干预：${phase === "verify" && !test.result.errorEliminated ? "微课 + AI 引导或教师答疑" : "同类辨析题 + 变式迁移题"}</p></div>
              </div>
              <details class="reflection-inline-card knowledge-reflection-card" open>
                <summary>写本题反思并入档</summary>
                ${renderStructuredReflectionForm({
                  contextType: "knowledge_test",
                  contextId: question.id || test.quizId || "",
                  contextTitle: question.prompt || "知识测试",
                  subject: selectedSubject,
                  knowledgePoint: test.result.topic || question.topic || selectedSubject
                })}
              </details>
            ` : ""}
            <div class="knowledge-test-actions">
              <button class="mini" type="button" id="knowledgeTestRetry">再次回答</button>
              <button class="mini" type="button" id="knowledgeTestNext">下一题</button>
              ${phase === "diagnostic" ? `<button class="mini primary" type="button" data-practice-next-phase="remedial">进入补救练习</button>` : ""}
              ${phase === "remedial" ? `<button class="mini primary" type="button" data-practice-next-phase="verify">完成补救，开始验证</button>` : ""}
            </div>
          </article>
          <aside class="knowledge-attempts">
            <h3>学习画像</h3>
            ${summary ? `
              <div class="knowledge-summary-card">
                <strong>${Number(summary.accuracy || 0)}%</strong>
                <span>${escapeHtml(summary.masteryLevel || "待诊断")} · 已答 ${Number(summary.answered || 0)}/${Number(summary.total || (test.questions || []).length)}</span>
                <div class="mastery-meter small"><span style="width:${clamp(Number(summary.accuracy || 0), 0, 100)}%"></span></div>
              </div>
            ` : `<p class="knowledge-test-detail">提交答案后按整套题累计正确率判断掌握程度。</p>`}
            <h3>回答记录</h3>
            <div class="saved-list">
              ${attempts.map((item) => `
                <article class="list-card">
                  <div>
                    <h3>${escapeHtml(item.topic || "知识点")}</h3>
                  <p>第 ${Number(item.order || 0) || "-"} 题 · ${Number(item.accuracy || 0)}% · ${escapeHtml(item.masteryLevel || "")}</p><small>版本 ${escapeHtml(item.version || "v1")} · 难度 ${escapeHtml(item.difficulty || "中")} · 用时 ${item.durationMs ? `${Math.round(item.durationMs / 1000)} 秒` : "未记录"}</small><small>错因标签：${escapeHtml((item.misconceptionTags || []).join("、") || "待诊断")}</small>
                  </div>
                </article>
              `).join("") || emptyBlock("提交答案后显示记录。")}
            </div>
          </aside>
        ` : `
          <div class="knowledge-test-flow-empty">
            <div>
              <h3>${materials.length ? "生成一次可入档的知识测试" : `当前「${escapeHtml(selectedSubject)}」暂无可出题资料`}</h3>
              <p>${materials.length ? "本次测试会记录为学习证据：生成题目、独立作答、AI 诊断、错因修正、写反思，然后进入学习档案。" : "请老师先上传并开放课程资料，或切换到已有资料的学科。"}</p>
            </div>
            <ol>
              <li><strong>生成题目</strong><span>按学科和课程资料抽取 10-15 道核心题</span></li>
              <li><strong>自主作答</strong><span>保留学生原始理解，避免直接要答案</span></li>
              <li><strong>AI 诊断</strong><span>给出掌握度、缺失点和引用依据</span></li>
              <li><strong>错因修正</strong><span>把误区转入错题/错因轨迹</span></li>
              <li><strong>写反思</strong><span>记录策略变化和下一步计划</span></li>
              <li><strong>进入档案</strong><span>形成前测/后测对比和导出材料</span></li>
            </ol>
          </div>
        `}
      </section>
      </div>
    </div>
  `;
}

function renderTeacherMlGraphEditor(graph) {
  if (!isMachineLearningGraph(graph)) return "";
  const node = graphSelectedNode(graph) || graph.nodes?.[0];
  if (!node) return "";
  const lines = (value) => Array.isArray(value) ? value.join("\n") : String(value || "");
  const relationLinks = (graph.links || []).filter((link) => ["prerequisite", "misconception"].includes(graphRelationKey(link)));
  return `<section class="panel ml-graph-editor">
    <div class="split-head"><div><span class="cycle-eyebrow">TEACHER KNOWLEDGE DESIGNER</span><h2>机器学习知识图谱编辑器</h2><p class="hint">编辑「${escapeHtml(node.label)}」的学习目标、错因诊断和干预资源，让图谱表达学生为什么会学错。</p></div><span class="graph-badge ready">${graph.nodes.length} 个节点 · ${relationLinks.length} 条关键关系</span></div>
    <form class="ml-graph-node-form" data-ml-graph-node-form data-graph-id="${escapeHtml(graph.id)}" data-node-id="${escapeHtml(node.id)}">
      <div class="form-grid"><label>知识点名称<input name="label" value="${escapeHtml(node.label)}" /></label><label>所属模块<input name="group" value="${escapeHtml(node.group || "分类模型")}" /></label></div>
      <label>前置知识（每行一个）<textarea name="prerequisites" rows="2">${escapeHtml(lines(node.prerequisites || []))}</textarea></label>
      <label>学习目标<textarea name="learningGoal" rows="2" placeholder="能解释、能推导、能应用什么？">${escapeHtml(node.learningGoal || node.details || "")}</textarea></label>
      <label>常见错因（每行一个）<textarea name="misconceptions" rows="2" placeholder="例如：将 Precision 与 Recall 的适用场景混淆">${escapeHtml(lines(node.misconceptions || (node.misconception ? [node.misconception] : [])))}</textarea></label>
      <div class="form-grid"><label>诊断题（每行一个）<textarea name="diagnosticQuestions" rows="3">${escapeHtml(lines(node.diagnosticQuestions || ["概念辨析题", "公式推导题", "代码阅读题"]))}</textarea></label><label>补救资源（每行一个）<textarea name="remediationResources" rows="3">${escapeHtml(lines(node.remediationResources || ["概念对比微课", "教材重点页", "代码实验"]))}</textarea></label></div>
      <div class="form-grid"><label>验证题（每行一个）<textarea name="verificationQuestions" rows="3">${escapeHtml(lines(node.verificationQuestions || ["变式题", "真实场景题"]))}</textarea></label><label>掌握标准<textarea name="masteryStandard" rows="3">${escapeHtml(node.masteryStandard || "连续两次变式题正确且能解释原因")}</textarea></label></div>
      <button class="primary" type="submit">保存节点教学配置</button>
    </form>
    <div class="ml-relation-editor"><div class="split-head"><div><h3>语义关系</h3><span class="hint">前置依赖用于路径规划，易混淆关系用于错因诊断。</span></div></div>
      <div class="ml-relation-list">${relationLinks.map((link) => `<span class="relation-chip ${graphRelationKey(link)}">${escapeHtml((graph.nodes.find((item) => item.id === link.source)?.label || link.source))} ${graphRelationKey(link) === "prerequisite" ? "→" : "↔"} ${escapeHtml(graph.nodes.find((item) => item.id === link.target)?.label || link.target)} · ${escapeHtml(link.label || "")}</span>`).join("") || `<span class="hint">暂无前置依赖或易混淆关系。</span>`}</div>
      <form class="ml-relation-form" data-ml-relation-form data-graph-id="${escapeHtml(graph.id)}"><select name="source">${graph.nodes.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`).join("")}</select><select name="type"><option value="prerequisite">前置依赖</option><option value="misconception">易混淆关系</option></select><select name="target">${graph.nodes.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === node.id ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select><button class="mini" type="submit">添加关系</button></form>
    </div>
  </section>`;
}

function renderGraphLearningWorkspace(graphs, selected, mode = "teacher", includeList = true, showControlPanel = includeList) {
  const detailOpen = Boolean(graphExplicitSelectedNode(selected));
  return `
    <div class="graph-workspace graph-learning-workspace ${showControlPanel ? "" : "graph-no-control"} ${includeList ? "" : "graph-dashboard-workspace"} ${detailOpen ? "detail-open" : "detail-collapsed"}">
      ${showControlPanel ? renderGraphControlPanel(graphs, selected, mode, includeList) : ""}
      <div class="graph-canvas">${selected ? renderGraphViewer(selected) : emptyBlock(mode === "student" ? "请选择其他学科查看可用图谱。" : "选择一个图谱后将在这里渲染。")}</div>
      ${detailOpen ? renderGraphDetailPanel(selected, mode) : ""}
    </div>
  `;
}

function renderGraphControlPanel(graphs, graph, mode = "teacher", includeList = true) {
  const filterSet = graphFilterSet();
  const layer = state.graphLayer || "overview";
  const stats = graph ? graphAnalytics(graph) : null;
  const matches = graph ? graphSearchMatches(graph, state.graphSearch, 8) : [];
  const topNodes = graph ? graphTopNodes(graph, 8) : [];
  return `
    <aside class="graph-control-panel">
      ${mode === "student" ? `
        <section class="graph-control-block compact-subject">
          <strong>课程</strong>
          <span class="ml-graph-course-lock">机器学习 · 六模块</span>
        </section>
      ` : ""}
      <section class="graph-control-block">
        <strong>图谱模式</strong>
        <div class="graph-layer-tabs">
          ${GRAPH_LAYER_OPTIONS.map((item) => `
            <button type="button" class="${layer === item.key ? "active" : ""}" data-graph-layer="${item.key}">${item.label}</button>
          `).join("")}
        </div>
      </section>
      <section class="graph-control-block">
        <strong>搜索定位</strong>
        <form id="graphSearchForm" class="graph-search">
          <input name="query" value="${escapeHtml(state.graphSearch || "")}" placeholder="输入知识点名称" />
          <button class="mini" type="submit">定位</button>
        </form>
        ${matches.length ? `
          <div class="graph-result-list">
            ${matches.map(({ node, index }) => `
              <button type="button" data-graph-focus-node="${escapeHtml(node.id)}">
                <span>${escapeHtml(node.label)}</span>
                <small>${escapeHtml(node.ontology?.layer || graphNodeVisualClass(node, index))}</small>
              </button>
            `).join("")}
          </div>
        ` : state.graphSearch ? `<p class="hint">未找到匹配节点，可换用章节或简称搜索。</p>` : ""}
      </section>
      <section class="graph-control-block">
        <strong>节点筛选</strong>
        <div class="graph-node-filter-tabs">
          ${GRAPH_NODE_FILTERS.map((item) => `
            <button type="button" class="${(state.graphNodeFilter || "all") === item.key ? "active" : ""}" data-graph-node-filter="${item.key}">${item.label}</button>
          `).join("")}
        </div>
        ${stats ? `<p class="hint">当前显示 ${stats.visibleNodes}/${stats.totalNodes} 个节点，隐藏 ${stats.hiddenNodes} 个低优先级节点。</p>` : ""}
      </section>
      <section class="graph-control-block">
        <strong>关系筛选</strong>
        <div class="graph-filter-list">
          ${GRAPH_RELATION_FILTERS.map((item) => `
            <label><input type="checkbox" data-graph-relation="${item.key}" ${filterSet.has(item.key) ? "checked" : ""} />${item.label}</label>
          `).join("")}
        </div>
      </section>
      <section class="graph-control-block">
        <strong>课程章节树</strong>
        ${graph ? renderGraphChapterTree(graph) : emptyBlock(mode === "student" ? `数据库中暂未找到「${escapeHtml(state.graphSubject)}」图谱。` : "还没有图谱，请先生成或导入。")}
      </section>
      ${topNodes.length ? `
        <section class="graph-control-block">
          <strong>${mode === "teacher" ? "教学关注 TOP8" : "推荐关注 TOP8"}</strong>
          <div class="graph-hot-list">
            ${topNodes.map(({ node, score }, index) => `
              <button type="button" data-graph-focus-node="${escapeHtml(node.id)}">
                <b>${index + 1}</b>
                <span>${escapeHtml(node.label)}</span>
                <small>${Math.round(score)}</small>
              </button>
            `).join("")}
          </div>
        </section>
      ` : ""}
      ${includeList ? `<section class="graph-control-block">
        <strong>图谱列表</strong>
        <div class="graph-list compact">${graphs.map(graphCard).join("") || emptyBlock(mode === "student" ? `数据库中暂未找到「${escapeHtml(state.graphSubject)}」图谱。` : "还没有图谱，请先生成或导入。")}</div>
      </section>` : ""}
    </aside>
  `;
}

function renderGraphChapterTree(graph) {
  const nodes = graph.nodes || [];
  if (!nodes.length) return emptyBlock("当前图谱没有节点。");
  const parents = graphParentMap(graph);
  const children = graphChildrenMap(parents);
  const root = nodes[0];
  const chapters = nodes
    .map((node, index) => ({ node, index }))
    .filter((entry) => graphNodeLevel(entry.node, entry.index) <= 1)
    .slice(0, 36);
  const selectedId = state.graphFocusNodeId || state.graphSelectedNodeId || root?.id;
  return `
    <div class="chapter-tree">
      ${chapters.map(({ node, index }) => {
        const childCount = (children.get(node.id) || []).length;
        return `
          <button type="button" class="chapter-tree-item level-${graphNodeLevel(node, index)} ${selectedId === node.id ? "active" : ""}" data-graph-focus-node="${node.id}">
            <span>${escapeHtml(node.label)}</span>
            <small>${childCount ? `${childCount} 个下级` : graphNodeLevel(node, index) === 0 ? "课程根" : "末级"}</small>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderStudentNodeAnnotationForm(graph, node) {
  const annotation = studentNodeAnnotationFor(graph.id, node.id, node.label) || {};
  const status = annotation.status || "learning";
  const selected = (value) => status === value ? "selected" : "";
  return `
    <form class="node-annotation-form" data-node-annotation-form>
      <input type="hidden" name="graphId" value="${escapeHtml(graph.id)}" />
      <input type="hidden" name="nodeId" value="${escapeHtml(node.id)}" />
      <input type="hidden" name="graphTitle" value="${escapeHtml(graph.title)}" />
      <input type="hidden" name="subject" value="${escapeHtml(graph.subject || preferredSubject())}" />
      <input type="hidden" name="nodeLabel" value="${escapeHtml(node.label)}" />
      <label class="check-line"><input type="checkbox" name="favorite" value="1" ${annotation.favorite ? "checked" : ""} />收藏该节点</label>
      <label>我的状态
        <select name="status">
          <option value="learning" ${selected("learning")}>正在学习</option>
          <option value="mastered" ${selected("mastered")}>已掌握</option>
          <option value="uncertain" ${selected("uncertain")}>不确定</option>
          <option value="weak" ${selected("weak")}>易错/薄弱</option>
          <option value="not_started" ${selected("not_started")}>未开始</option>
        </select>
      </label>
      <label>我的理解<textarea name="explanation" rows="3" placeholder="用自己的话解释该节点，或记录仍不确定的问题">${escapeHtml(annotation.explanation || "")}</textarea></label>
      <div class="form-grid two">
        <label>证据类型
          <select name="evidenceType">
            ${["note", "code", "homework", "screenshot", "concept-map", "project"].map((item) => `<option value="${item}" ${annotation.evidenceType === item ? "selected" : ""}>${escapeHtml({ note: "笔记", code: "代码实验", homework: "作业", screenshot: "截图", "concept-map": "概念图", project: "项目报告" }[item])}</option>`).join("")}
          </select>
        </label>
        <label>证据标题<input name="evidenceTitle" value="${escapeHtml(annotation.evidenceTitle || "")}" placeholder="例如：KNN 距离度量实验笔记" /></label>
      </div>
      <label>证据链接/说明<input name="evidenceUrl" value="${escapeHtml(annotation.evidenceUrl || "")}" placeholder="可填本地文件名、报告标题或外部链接" /></label>
      <label class="check-line"><input type="checkbox" name="fromAiAnswer" value="1" ${annotation.fromAiAnswer ? "checked" : ""} />把本节点解释作为 AI 回答学习卡片入档</label>
      <button class="primary" type="submit">保存节点证据</button>
    </form>
  `;
}

function renderGraphDetailPanel(graph, mode = "teacher") {
  if (!graph) {
    return `<aside class="graph-detail-panel">${emptyBlock("选择图谱后显示节点详情。")}</aside>`;
  }
  const node = graphSelectedNode(graph);
  if (!node) return `<aside class="graph-detail-panel">${emptyBlock("当前图谱没有可查看的节点。")}</aside>`;
  const context = graphNodeContext(graph, node);
  const points = uniqueTexts([
    node.details,
    ...(node.knowledgePoints || []),
    node.cognitive?.objective,
    Array.isArray(node.competencies) && node.competencies.length ? `核心素养：${node.competencies.join("、")}` : "",
    node.assessment?.examFrequency ? `考察属性：考频${node.assessment.examFrequency}，难度${node.assessment.difficulty ?? "未标注"}，区分度${node.assessment.discrimination ?? "未标注"}` : ""
  ].filter(Boolean)).slice(0, 5);
  const learner = realLearnerState(node);
  const mastery = Number(learner.mastery);
  const masteryWidth = Number.isFinite(mastery) ? clamp(mastery, 0, 1) * 100 : 0;
  const detailCards = [];
  const pushDetailCard = (title, body) => {
    if (!String(body || "").trim()) return;
    detailCards.push(`<section class="detail-card"><strong>${escapeHtml(title)}</strong>${body}</section>`);
  };
  if (Number.isFinite(mastery) || learner.evidence) {
    pushDetailCard("掌握度与诊断", `
      ${Number.isFinite(mastery) ? `<div class="mastery-meter"><span style="width:${masteryWidth}%"></span></div>` : ""}
      ${learner.evidence ? `<p>${escapeHtml(learner.evidence)}</p>` : ""}
    `);
  } else {
    pushDetailCard("掌握度与诊断", `<p>暂无基于问答或教师确认批改的真实学习记录。</p>`);
  }
  if (points.length) {
    pushDetailCard("知识点解释", points.map((point) => `<p>${escapeHtml(point)}</p>`).join(""));
  }
  if (mode === "student") {
    const portfolio = currentStudentPortfolio();
    const label = String(node.label || "");
    const comparison = (portfolio.masteryComparison || []).find((item) => item.topic === label || item.topic.includes(label) || label.includes(item.topic));
    const relatedTimeline = (portfolio.timeline || []).filter((item) => `${item.title} ${item.summary}`.includes(label)).slice(0, 4);
    const relatedReflections = (portfolio.reflections || []).filter((item) => `${item.knowledgePoint} ${item.contextTitle} ${item.originalUnderstanding} ${item.aiDiscovery} ${item.strategyChange}`.includes(label)).slice(0, 3);
    const misconception = (node.misconceptions || []).slice(0, 4);
    const recentMisconceptions = (portfolio.misconceptionTrajectory || [])
      .filter((item) => `${item.topic || ""} ${item.before || ""} ${item.issue || ""} ${item.after || ""}`.includes(label))
      .slice(0, 3);
    const prerequisiteNodes = (context.incoming || [])
      .filter((link) => graphRelationKey(link) === "prerequisite" || graphRelationKey(link) === "dependency")
      .map((link) => (graph.nodes || []).find((item) => item.id === link.source))
      .filter(Boolean)
      .slice(0, 5);
    const blockedPrerequisites = prerequisiteNodes.filter((item) => {
      const value = graphMasteryValue(item);
      return graphNodeHasWeakness(item) || !Number.isFinite(value) || value < 0.58;
    });
    const resources = Array.isArray(node.resources) ? node.resources.slice(0, 3) : [];
    const objective = node.cognitive?.objective || node.objective || `能够解释「${label}」的核心概念、适用条件，并完成一个迁移任务。`;
    pushDetailCard("学习目标", `<p>${escapeHtml(objective)}</p>`);
    pushDetailCard("前置知识与阻塞", prerequisiteNodes.length
      ? `<p>${escapeHtml(prerequisiteNodes.map((item) => item.label).join("、"))}</p>${blockedPrerequisites.length ? `<p class="graph-blocked-warning">先补：${escapeHtml(blockedPrerequisites.map((item) => `${item.label}（${percentText(graphMasteryValue(item))}）`).join("、"))}</p>` : `<p class="graph-prereq-ready">前置节点已有可用掌握记录。</p>`}`
      : `<p>暂无显式前置依赖，建议先完成一次概念辨析。</p>`);
    pushDetailCard("常见错因", misconception.length ? misconception.map((item) => `<p>${escapeHtml(item)}</p>`).join("") : `<p>把逻辑回归误认为回归问题；认为准确率高就一定模型好；把标准化和归一化混为一谈。</p>`);
    pushDetailCard("我的最近错因", recentMisconceptions.length ? recentMisconceptions.map((item) => `<p><b>${escapeHtml(item.issue || "待修正")}</b>：${escapeHtml(item.before || item.after || "已记录一条错因轨迹")}</p>`).join("") : `<p>暂无该节点的个人错因记录。完成 AI 诊断或节点测试后会自动归档。</p>`);
    pushDetailCard("推荐资料", resources.length ? resources.map((item) => `<p>${escapeHtml(item.title || item.name || item.label || "课程资料")}</p>`).join("") : `<p>进入课程资料或关联图谱节点查看可用微课与例题。</p>`);
    pushDetailCard("学习操作", `
      <div class="graph-student-actions">
        <button type="button" class="mini primary" data-graph-node-action="explain">进入 AI 助教</button>
        <button type="button" class="mini" data-graph-node-action="exercise">生成练习</button>
        <button type="button" class="mini" data-graph-node-action="path">查看错因轨迹</button>
      </div>
    `);
    pushDetailCard("我的学习状态", `
      <p>${comparison ? `我学过该节点：前测 ${escapeHtml(comparison.startText)}，当前 ${escapeHtml(comparison.currentText)}，变化 ${escapeHtml(comparison.changeText)}。` : "我还没有形成该节点的真实测试或诊断记录。"}</p>
      ${relatedTimeline[0] ? `<p>最近证据：${escapeHtml(relatedTimeline[0].type)} · ${escapeHtml(fmtTime(relatedTimeline[0].time))} · ${escapeHtml(relatedTimeline[0].summary || relatedTimeline[0].title)}</p>` : ""}
    `);
    pushDetailCard("学习路径解释", renderGraphLearningPathExplanation(graph, node, context));
    pushDetailCard("我的笔记/反思", relatedReflections.length
      ? relatedReflections.map((item) => `<p>${escapeHtml(item.strategyChange || item.aiDiscovery || item.nextPlan || item.originalUnderstanding)}</p>`).join("")
      : `<p>暂无该节点反思。可在学习档案中新增结构化反思。</p>`);
    pushDetailCard("我的节点证据", renderStudentNodeAnnotationForm(graph, node));
  }
  return `
    <aside class="graph-detail-panel">
      <div class="detail-head">
        <h3>${escapeHtml(node.label)}</h3>
        <strong>${escapeHtml((context.path || []).map((item) => item.label).join(" / ") || graph.title)}</strong>
      </div>
      <div class="node-chip-row">
        <span class="node-chip">${escapeHtml(node.ontology?.layer || "知识点")}</span>
        <span class="node-chip">${escapeHtml(node.cognitive?.bloom || "理解")}</span>
        ${learner.status || Number.isFinite(mastery) ? `<span class="node-chip ${graphNodeHasWeakness(node) ? "" : "strong"}">${escapeHtml(learner.status || "掌握度")} ${percentText(learner.mastery)}</span>` : ""}
      </div>
      ${detailCards.join("") || `<section class="detail-card"><strong>知识点解释</strong><p>${escapeHtml(node.label)}：当前节点只有基础图谱信息，暂无补充解释。</p></section>`}
    </aside>
  `;
}

function renderGraphLegend() {
  return `
    <section class="graph-legend">
      <strong>图例</strong>
      ${state.user?.role === "student" ? `
        <div><span class="legend-dot mastery-high"></span>已掌握</div>
        <div><span class="legend-dot mastery-mid"></span>待巩固</div>
        <div><span class="legend-dot mastery-low"></span>高风险</div>
        <div><span class="legend-dot learning"></span>正在学习</div>
        <div><span class="legend-dot not-started"></span>未开始</div>
      ` : `
        <div><span class="legend-dot concept"></span>概念</div>
        <div><span class="legend-dot method"></span>方法/算法</div>
        <div><span class="legend-dot formula"></span>公式</div>
        <div><span class="legend-dot misconception"></span>易错点</div>
      `}
      <div><span class="legend-line prerequisite"></span>前置依赖</div>
      <div><span class="legend-line misconception"></span>易混淆</div>
    </section>
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
  return String(link?.type || "") === "contains" || TREE_LINK_LABELS.has(String(link?.label || link?.relation || ""));
}

function isComplexGraph(graph) {
  const nodes = graph.nodes || [];
  const maxLevel = nodes.reduce((max, node, index) => Math.max(max, graphNodeLevel(node, index)), 0);
  return nodes.length > 60 || maxLevel >= 3;
}

function graphGroupClass(group) {
  return String(group || "topic").replace(/[^a-zA-Z0-9_-]/g, "") || "topic";
}

function educationRelationLabel(link) {
  const type = String(link?.type || "");
  return link?.typeLabel || EDUCATION_RELATION_LABELS[type] || EDUCATION_RELATION_LABELS.semantic;
}

function graphSafeDomId(value) {
  return String(value || "graph").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function graphRelationKey(link) {
  if (isTreeLink(link)) return "contains";
  const type = String(link?.type || "").toLowerCase();
  const label = String(link?.label || link?.relation || link?.typeLabel || "");
  if (type.includes("prerequisite") || /前置|递进|支撑|先学|基础/.test(label)) return "prerequisite";
  if (type.includes("dependency") || /依赖|强依赖/.test(label)) return "dependency";
  if (type.includes("misconception") || /易混|迷思|混淆|误区/.test(label)) return "misconception";
  if (type.includes("assessment") || type.includes("exam") || /考点|考查|题型|题目/.test(label)) return "exam";
  if (type.includes("resource") || /资料|来源|引用|课件|教材/.test(label)) return "resource";
  if (type.includes("review") || /复习|推荐|路径/.test(label)) return "review";
  if (type.includes("cross")) return "cross-link";
  return type || "semantic";
}

function graphRelationClass(link) {
  return graphRelationKey(link).replace(/[^a-zA-Z0-9_-]/g, "-");
}

function graphFilterSet() {
  const filters = Array.isArray(state.graphRelationFilters) ? state.graphRelationFilters : [];
  return new Set(filters.length ? filters : ["contains", "prerequisite"]);
}

function graphRelationAllowed(link, layer = state.graphLayer) {
  const key = graphRelationKey(link);
  if (layer === "overview") return key === "contains" || key === "prerequisite";
  if (layer === "diagnosis") return ["contains", "prerequisite", "review", "exam", "misconception"].includes(key);
  const filters = graphFilterSet();
  if (key === "dependency") return filters.has("prerequisite");
  if (key === "assessment" || key === "examines") return filters.has("exam");
  return filters.has(key) || key === "contains";
}

function graphNodeVisualClass(node, index = 0) {
  if (index === 0 || node?.group === "root") return "root";
  if (node?.group === "chapter") return "chapter";
  const type = String(node?.ontology?.type || node?.type || node?.group || "").toLowerCase();
  const label = String(node?.label || "");
  if (/formula|公式/.test(type) || /公式/.test(label)) return "formula";
  if (/question|exercise|problem|exam|题/.test(type) || /题|练习|测试/.test(label)) return "question";
  if (/resource|source|document|资料|来源/.test(type)) return "resource";
  if (/misconception|mistake|易错|混淆/.test(type) || /易错|混淆|误区/.test(label)) return "misconception";
  if (/method|algorithm|方法|算法/.test(type) || /算法|方法|流程/.test(label)) return "method";
  if (node?.group === "concept") return "concept";
  return graphGroupClass(node?.group);
}

function graphNodeImportanceScore(node, index = 0) {
  const level = graphNodeLevel(node, index);
  const frequency = String(node?.assessment?.examFrequency || "");
  const frequencyScore = frequency.includes("高") ? 16 : frequency.includes("中") ? 9 : frequency.includes("低") ? 3 : 0;
  const importance = Number(node?.importance ?? node?.assessment?.importance ?? node?.learnerState?.weight);
  const childCount = Number(node?.childCount || 0);
  return (4 - Math.min(level, 3)) * 18 + (Number.isFinite(importance) ? importance * 4 : 0) + frequencyScore + childCount;
}

function isRealLearnerState(learner) {
  if (!learner || typeof learner !== "object") return false;
  const evidenceText = Array.isArray(learner.evidence)
    ? learner.evidence.map((item) => item?.text || item).join(" ")
    : String(learner.evidence || "");
  if (!evidenceText.trim()) return false;
  return !/模拟|可接入|后续|节点层级|待真实诊断|暂无基于/.test(evidenceText);
}

function studentNodeAnnotationFor(graphId = "", nodeId = "", nodeLabel = "") {
  return (state.data?.studentNodeAnnotations || []).find((item) => (
    (!graphId || item.graphId === graphId)
    && (item.nodeId === nodeId || (nodeLabel && item.nodeLabel === nodeLabel))
  )) || null;
}

function annotationLearnerState(annotation) {
  if (!annotation) return {};
  const score = {
    mastered: 0.86,
    uncertain: 0.55,
    weak: 0.32,
    learning: 0.62,
    not_started: 0.18
  }[annotation.status];
  return {
    mastery: Number.isFinite(score) ? score : undefined,
    status: annotation.statusLabel || "",
    evidence: annotation.explanation || annotation.evidenceTitle || "学生主动图谱标注"
  };
}

function realLearnerState(node) {
  const base = isRealLearnerState(node?.learnerState) ? node.learnerState : {};
  if (state.user?.role !== "student") return base;
  if (node?.studentLearnerState) return node.studentLearnerState;
  const annotation = studentNodeAnnotationFor(node?.personalGraphId || "", node?.id || "", node?.label || "");
  return annotation ? annotationLearnerState(annotation) : {};
}

function graphNodeHasWeakness(node) {
  const learner = realLearnerState(node);
  const status = String(learner.status || "");
  const mastery = Number(learner.mastery);
  return status.includes("未") || status.includes("薄弱") || (Number.isFinite(mastery) && mastery < 0.45);
}

function graphNodeBadges(node) {
  const badges = [];
  if ((node?.resources || []).length || Number(node?.sourceCount || 0) > 0) badges.push("文");
  if (Number(node?.questionCount || node?.assessment?.questionCount || 0) > 0 || /题|练习/.test(String(node?.label || ""))) badges.push("题");
  if (Number(node?.mistakeCount || node?.assessment?.mistakeCount || 0) > 0 || graphNodeHasWeakness(node)) badges.push("错");
  return badges.slice(0, 3);
}

function graphMasteryValue(node) {
  const mastery = Number(realLearnerState(node).mastery);
  return Number.isFinite(mastery) ? clamp(mastery, 0, 1) : null;
}

function graphHasResource(node) {
  return (Array.isArray(node?.resources) && node.resources.length > 0) || Number(node?.sourceCount || 0) > 0;
}

function graphHasExercise(node) {
  return Number(node?.questionCount || node?.assessment?.questionCount || 0) > 0 || /题|练习|测验|作业/.test(String(node?.label || ""));
}

function graphNodeMatchesDashboardFilter(node, index = 0, filter = state.graphNodeFilter) {
  const key = String(filter || "all");
  if (key === "all") return true;
  const mastery = graphMasteryValue(node);
  if (key === "weak") return graphNodeHasWeakness(node) || (Number.isFinite(mastery) && mastery < 0.58);
  if (key === "mastered") return Number.isFinite(mastery) && mastery >= 0.78;
  if (key === "misconception") return graphNodeVisualClass(node, index) === "misconception" || /易错|混淆|误区|错因/.test(String(node?.label || node?.details || node?.misconception || ""));
  if (key === "core") return graphNodeLevel(node, index) <= 1 || graphNodeImportanceScore(node, index) >= 58;
  if (key === "resource") return graphHasResource(node);
  if (key === "exercise") return graphHasExercise(node);
  return true;
}

function graphSearchMatches(graph, query = state.graphSearch, limit = 10) {
  const clean = String(query || "").trim();
  if (!clean || !graph) return [];
  return (graph.nodes || [])
    .map((node, index) => ({ node, index, score: graphNodeImportanceScore(node, index) }))
    .filter((entry) => graphTextMatchesNode(entry.node, clean))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function graphTopNodes(graph, limit = 10) {
  if (!graph) return [];
  const parents = graphParentMap(graph);
  const children = graphChildrenMap(parents);
  return (graph.nodes || [])
    .map((node, index) => ({
      node,
      index,
      score: graphNodeImportanceScore(node, index) + (children.get(node.id) || []).length * 4 + (graphHasExercise(node) ? 6 : 0) + (graphHasResource(node) ? 4 : 0)
    }))
    .filter((entry) => graphNodeLevel(entry.node, entry.index) > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function graphAnalytics(graph) {
  const nodes = graph?.nodes || [];
  const links = graph?.links || [];
  const display = graph ? graphDisplayGraph(graph) : { nodes: [], links: [] };
  const masteryEntries = nodes
    .map((node) => graphMasteryValue(node))
    .filter((value) => Number.isFinite(value));
  const masteredCount = nodes.filter((node) => {
    const learner = realLearnerState(node);
    return /已掌握|已完成/.test(String(learner.status || "")) || Number(learner.mastery) >= 0.78;
  }).length;
  const weakCount = nodes.filter((node) => graphNodeMatchesDashboardFilter(node, 0, "weak")).length;
  const chapterCount = nodes.filter((node, index) => graphNodeLevel(node, index) <= 1).length;
  const resourceCount = nodes.filter(graphHasResource).length;
  const exerciseCount = nodes.filter(graphHasExercise).length;
  const averageMastery = masteryEntries.length
    ? masteryEntries.reduce((sum, value) => sum + value, 0) / masteryEntries.length
    : 0;
  const completion = nodes.length ? masteredCount / nodes.length : 0;
  return {
    totalNodes: nodes.length,
    totalLinks: links.length,
    visibleNodes: display.nodes.length,
    visibleLinks: display.links.length,
    hiddenNodes: Math.max(0, nodes.length - display.nodes.length),
    hiddenLinks: Math.max(0, links.length - display.links.length),
    chapterCount,
    resourceCount,
    exerciseCount,
    weakCount,
    masteredCount,
    masteryEntries: masteryEntries.length,
    averageMastery,
    completion
  };
}

function graphTextMatchesNode(node, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return false;
  const haystack = [
    node?.label,
    node?.details,
    node?.ontology?.layer,
    node?.ontology?.type,
    node?.misconception,
    ...(Array.isArray(node?.knowledgePoints) ? node.knowledgePoints : [])
  ].join(" ").toLowerCase();
  return haystack.includes(q);
}

function graphAddAncestors(ids, nodeId, parents) {
  let current = nodeId;
  const guard = new Set();
  while (current && !guard.has(current)) {
    guard.add(current);
    ids.add(current);
    current = parents.get(current);
  }
}

function graphAddChildren(ids, nodeId, children, limit = 24) {
  (children.get(nodeId) || []).slice(0, limit).forEach((id) => ids.add(id));
}

function graphAddNeighbors(ids, graph, nodeId, limit = 48) {
  let count = 0;
  (graph.links || []).forEach((link) => {
    if (count >= limit || !graphRelationAllowed(link, state.graphLayer)) return;
    if (link.source === nodeId) {
      ids.add(link.target);
      count += 1;
    } else if (link.target === nodeId) {
      ids.add(link.source);
      count += 1;
    }
  });
}

function graphSelectedNode(graph) {
  const nodes = graph?.nodes || [];
  return nodes.find((node) => node.id === state.graphSelectedNodeId)
    || nodes.find((node) => node.id === state.graphFocusNodeId)
    || nodes[0]
    || null;
}

function graphExplicitSelectedNode(graph) {
  const nodes = graph?.nodes || [];
  return nodes.find((node) => node.id === state.graphSelectedNodeId)
    || nodes.find((node) => node.id === state.graphFocusNodeId)
    || null;
}

function graphVisibleSubgraph(graph) {
  const nodes = graph.nodes || [];
  const links = graph.links || [];
  if (!nodes.length) return { nodes: [], links: [], hiddenNodes: 0, hiddenLinks: 0 };
  const nodesById = new Map(nodes.map((node, index) => [node.id, { node, index }]));
  const parents = graphParentMap(graph);
  const children = graphChildrenMap(parents);
  const ids = new Set();
  const layer = state.graphLayer || "overview";
  const query = String(state.graphSearch || "").trim();
  const nodeFilter = String(state.graphNodeFilter || "all");
  const validFocus = nodesById.has(state.graphFocusNodeId) ? state.graphFocusNodeId : null;
  const validSelected = nodesById.has(state.graphSelectedNodeId) ? state.graphSelectedNodeId : null;
  const focusId = validFocus || validSelected;

  if (query) {
    nodes.forEach((node) => {
      const entry = nodesById.get(node.id);
      if (!graphTextMatchesNode(node, query) || !graphNodeMatchesDashboardFilter(node, entry?.index || 0, nodeFilter)) return;
      graphAddAncestors(ids, node.id, parents);
      graphAddChildren(ids, node.id, children, 18);
      graphAddNeighbors(ids, graph, node.id, 28);
    });
  }

  if (!ids.size && nodeFilter !== "all") {
    nodes.forEach((node) => {
      const entry = nodesById.get(node.id);
      if (!graphNodeMatchesDashboardFilter(node, entry?.index || 0, nodeFilter)) return;
      graphAddAncestors(ids, node.id, parents);
      ids.add(node.id);
      graphAddChildren(ids, node.id, children, 12);
      graphAddNeighbors(ids, graph, node.id, 18);
    });
  }

  if (!ids.size && layer === "relation" && focusId) {
    graphAddAncestors(ids, focusId, parents);
    graphAddChildren(ids, focusId, children, 46);
    graphAddNeighbors(ids, graph, focusId, 54);
  }

  if (!ids.size && layer === "diagnosis") {
    nodes.forEach((node, index) => {
      if (index === 0 || graphNodeLevel(node, index) <= 1 || graphNodeHasWeakness(node)) ids.add(node.id);
    });
    if (focusId) {
      graphAddAncestors(ids, focusId, parents);
      graphAddNeighbors(ids, graph, focusId, 32);
    }
  }

  if (!ids.size) {
    nodes
      .map((node, index) => ({ node, index, score: graphNodeImportanceScore(node, index) }))
      .filter((entry) => graphNodeLevel(entry.node, entry.index) <= 2)
      .sort((a, b) => graphNodeLevel(a.node, a.index) - graphNodeLevel(b.node, b.index) || b.score - a.score)
      .slice(0, 80)
      .forEach((entry) => ids.add(entry.node.id));
  }

  if (!ids.size && nodes[0]) ids.add(nodes[0].id);

  const limit = layer === "relation" ? 120 : layer === "diagnosis" ? 100 : 80;
  let visibleNodes = nodes.filter((node) => ids.has(node.id));
  if (visibleNodes.length > limit) {
    const protectedIds = new Set([nodes[0]?.id, focusId, validSelected].filter(Boolean));
    visibleNodes = visibleNodes
      .map((node) => ({ node, entry: nodesById.get(node.id) }))
      .sort((a, b) => {
        const protectedDelta = Number(protectedIds.has(b.node.id)) - Number(protectedIds.has(a.node.id));
        if (protectedDelta) return protectedDelta;
        return graphNodeLevel(a.node, a.entry?.index || 0) - graphNodeLevel(b.node, b.entry?.index || 0)
          || graphNodeImportanceScore(b.node, b.entry?.index || 0) - graphNodeImportanceScore(a.node, a.entry?.index || 0);
      })
      .slice(0, limit)
      .map((entry) => entry.node);
  }
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  let visibleLinks = links.filter((link) => visibleIds.has(link.source) && visibleIds.has(link.target) && graphRelationAllowed(link, layer));
  const linkLimit = layer === "overview" ? 120 : 180;
  if (visibleLinks.length > linkLimit) {
    visibleLinks = visibleLinks
      .map((link) => ({ link, score: (isTreeLink(link) ? 30 : 0) + Number(link.weight || 0) * 10 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, linkLimit)
      .map((entry) => entry.link);
  }
  return {
    nodes: visibleNodes,
    links: visibleLinks,
    hiddenNodes: Math.max(0, nodes.length - visibleNodes.length),
    hiddenLinks: Math.max(0, links.length - visibleLinks.length)
  };
}

function graphDisplayGraph(graph) {
  const visible = graphVisibleSubgraph(graph);
  return {
    ...graph,
    nodes: visible.nodes,
    links: visible.links,
    meta: {
      ...(graph.meta || {}),
      visibleStats: {
        nodes: visible.nodes.length,
        links: visible.links.length,
        hiddenNodes: visible.hiddenNodes,
        hiddenLinks: visible.hiddenLinks,
        totalNodes: (graph.nodes || []).length,
        totalLinks: (graph.links || []).length
      }
    }
  };
}

function graphZoomClass(graphId) {
  const scale = Number(state.graphViews?.[graphId]?.scale || 1);
  if (scale < 0.7) return "zoom-global";
  if (scale < 1.15) return "zoom-mid";
  return "zoom-local";
}

function graphMasteryClass(node) {
  const learner = realLearnerState(node);
  const stateText = String(learner.status || "");
  const mastery = Number(learner.mastery);
  if (!stateText && !Number.isFinite(mastery)) {
    if (state.user?.role === "student" && (state.graphFocusNodeId === node?.id || state.graphSelectedNodeId === node?.id)) return "learning";
    return state.user?.role === "student" ? "not-started" : "";
  }
  if (/正在学习|学习中/.test(stateText)) return "learning";
  if (/未学习|未开始|未诊断/.test(stateText)) return "not-started";
  if (/已掌握|已完成/.test(stateText)) return mastery >= 0.82 ? "mastery-expert" : "mastery-high";
  if (stateText.includes("待巩固")) return "mastery-mid";
  if (stateText.includes("未") || stateText.includes("高风险") || stateText.includes("薄弱") || (Number.isFinite(mastery) && mastery < 0.35)) return "mastery-low";
  if (stateText.includes("模糊") || (Number.isFinite(mastery) && mastery < 0.58)) return "mastery-mid";
  if (stateText.includes("精通") || (Number.isFinite(mastery) && mastery >= 0.82)) return "mastery-expert";
  return "mastery-high";
}

function percentText(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "未知";
  return `${Math.round(clamp(number, 0, 1) * 100)}%`;
}

function resourceTypeLabel(type) {
  return {
    "micro-video": "微课",
    exercise: "练习",
    "interactive-sim": "互动实验",
    "worked-example": "例题"
  }[type] || "资源";
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
  const maxChars = root ? 6 : radius >= 58 ? 5 : radius >= 46 ? 4 : 3;
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
      width: 4000,
      height: 2700,
      pixelHeight: 920,
      complex: true,
      nodeCount: nodes.length
    };
  }
  if (nodes.length > 90) {
    return {
      width: 3400,
      height: 2300,
      pixelHeight: 900,
      complex: true,
      nodeCount: nodes.length
    };
  }
  if (nodes.length > 40) {
    return {
      width: 2500,
      height: 1650,
      pixelHeight: 860,
      complex: true,
      nodeCount: nodes.length
    };
  }
  return {
    width: 1850,
    height: 1120,
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
  if (level === 0 || node.group === "root") return dense ? 74 : medium ? 80 : 86;
  if (level === 1 || node.group === "chapter") return dense ? 60 : medium ? 66 : 70;
  if (level === 2 || node.group === "concept" || node.group === "topic") return dense ? 50 : medium ? 56 : 60;
  return dense ? 46 : medium ? 50 : 54;
}

function graphElasticGap(totalNodes = 0) {
  if (totalNodes > 220) return 88;
  if (totalNodes > 90) return 82;
  if (totalNodes > 40) return 72;
  return 60;
}

function graphEdgePadding(totalNodes = 0) {
  if (totalNodes > 220) return 150;
  if (totalNodes > 90) return 140;
  if (totalNodes > 40) return 125;
  return 110;
}

function graphSpringLength(totalNodes = 0, treeLink = true) {
  if (totalNodes > 220) return treeLink ? 310 : 410;
  if (totalNodes > 90) return treeLink ? 285 : 380;
  if (totalNodes > 40) return treeLink ? 240 : 320;
  return treeLink ? 190 : 260;
}

function clampGraphPoint(point, width, height, padding = 50) {
  point.x = clamp(point.x, padding, width - padding);
  point.y = clamp(point.y, padding, height - padding);
}

function defaultGraphScale(size) {
  if (!size.complex) return 0.72;
  if ((size.nodeCount || 0) > 220) return 0.7;
  if ((size.nodeCount || 0) > 90) return 0.78;
  if ((size.nodeCount || 0) > 40) return 0.9;
  return 1;
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
  const sectionRadius = totalNodes > 90 ? 300 : 215;
  const detailRadius = totalNodes > 90 ? 160 : 118;

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
        const radius = detailRadius + ring * (totalNodes > 90 ? 86 : 64);
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

  const relaxationIterations = totalNodes > 260 ? 92 : totalNodes > 140 ? 132 : 160;
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
        const minDistance = graphNetworkRadius(a, i, totalNodes) + graphNetworkRadius(b, j, totalNodes) + graphElasticGap(totalNodes);
        const ux = dx / distance;
        const uy = dy / distance;
        let push = 0;
        if (distance < minDistance) {
          push = (minDistance - distance) * 0.56;
        } else if (distance < minDistance * 1.38) {
          push = (minDistance * 1.38 - distance) * 0.045;
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
        + graphSpringLength(totalNodes, isTreeLink(link));
      const move = clamp((distance - desired) * 0.022, -10, 10);
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
      clampGraphPoint(position, width, height, graphEdgePadding(totalNodes));
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

function renderGraphViewer(graph, showControls = true) {
  const displayGraph = graphDisplayGraph(graph);
  const stats = displayGraph.meta?.visibleStats || {};
  const size = graphCanvasSize(displayGraph);
  const view = getGraphView(displayGraph);
  const zoomText = `${Math.round(Number(view?.scale || defaultGraphScale(size)) * 100)}%`;
  return `
    <div class="graph-viewer" data-graph-viewer="${graph.id}">
      ${showControls ? `<div class="graph-toolbar graph-zoom-dock" aria-label="图谱工具">
        <button type="button" class="graph-icon-button" data-graph-action="maximize" title="${state.graphMaximized ? "还原" : "最大化"}">${iconSvg(state.graphMaximized ? "minimize" : "maximize", state.graphMaximized ? "还原" : "最大化")}</button>
        <button type="button" class="graph-icon-button" data-graph-zoom="in" title="放大">${iconSvg("zoomIn", "放大")}</button>
        <span class="graph-zoom-value">${escapeHtml(zoomText)}</span>
        <button type="button" class="graph-icon-button" data-graph-zoom="out" title="缩小">${iconSvg("zoomOut", "缩小")}</button>
        <button type="button" class="graph-icon-button" data-graph-zoom="reset" title="重置视图">${iconSvg("target", "重置视图")}</button>
        <button type="button" class="graph-icon-button" data-graph-zoom="reset" title="恢复布局">${iconSvg("refresh", "恢复布局")}</button>
        <button type="button" class="graph-icon-button" title="图谱快照">${iconSvg("image", "图谱快照")}</button>
        <strong>${stats.nodes || 0}/${stats.totalNodes || 0} 节点 · ${stats.links || 0}/${stats.totalLinks || 0} 关系</strong>
      </div>` : ""}
      ${renderGraphSvg(graph)}
    </div>
  `;
}

function renderGraphSvg(graph) {
  const displayGraph = graphDisplayGraph(graph);
  const size = graphCanvasSize(displayGraph);
  const width = size.width;
  const height = size.height;
  const links = displayGraph.links || [];
  const nodes = displayGraph.nodes || [];
  const view = getGraphView(displayGraph);
  const positions = view.positions;
  const nodeEntriesById = new Map(nodes.map((node, index) => [node.id, { node, index }]));
  const renderedLinks = links
    .map((link, index) => ({ link, index }))
    .sort((a, b) => Number(!isTreeLink(a.link)) - Number(!isTreeLink(b.link)));
  const safeId = graphSafeDomId(graph.id);
  const arrowId = `arrow-${safeId}`;
  return `
    <svg class="graph-svg network ${graphZoomClass(graph.id)}" data-graph-id="${graph.id}" viewBox="0 0 ${width} ${height}" style="height:${size.pixelHeight}px; min-height:${size.pixelHeight}px" role="img" aria-label="${escapeHtml(graph.title)}">
      <defs>
        <linearGradient id="nodeGrad" x1="0%" x2="100%">
          <stop offset="0%" stop-color="#247db2"></stop>
          <stop offset="100%" stop-color="#37a38b"></stop>
        </linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#13506f" flood-opacity="0.16"></feDropShadow>
        </filter>
        <marker id="${arrowId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#2b84b8"></path>
        </marker>
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
          const relationClass = graphRelationClass(link);
          const marker = ["prerequisite", "dependency", "review"].includes(graphRelationKey(link)) ? `marker-end="url(#${arrowId})"` : "";
          return `
            <path data-link-index="${index}" data-link-source="${link.source}" data-link-target="${link.target}" d="${linkPath}" class="graph-link halo ${treeLink ? "tree" : "cross"} relation-${relationClass}"></path>
            <path data-link-index="${index}" data-link-source="${link.source}" data-link-target="${link.target}" d="${linkPath}" class="graph-link ${treeLink ? "tree" : "cross"} relation-${relationClass}" ${marker}></path>
          `;
        }).join("")}
        ${nodes.map((node, index) => {
          const p = positions[node.id] || { x: width / 2, y: height / 2 };
          const root = index === 0 || node.group === "root";
          const level = graphNodeLevel(node, index);
          const radius = size.complex ? graphNetworkRadius(node, index, nodes.length) : graphNodeRadius(node, index);
          const groupClass = graphNodeVisualClass(node, index);
          const masteryClass = graphMasteryClass(node);
          const selected = state.graphSelectedNodeId === node.id ? "selected" : "";
          const focused = state.graphFocusNodeId === node.id ? "focused" : "";
          const label = String(node.label || "");
          const labelLines = graphInnerLabelLines(label, radius, root);
          const lineHeight = root ? 18 : radius >= 58 ? 16 : radius >= 46 ? 14 : 13;
          const badges = graphNodeBadges(node);
          return `
            <g class="graph-node level-${level} ${groupClass} ${masteryClass} ${selected} ${focused}" data-node-id="${node.id}" transform="translate(${p.x},${p.y})" ${size.complex ? "" : `filter="url(#softShadow)"`}>
              <title>${escapeHtml(label)}</title>
              <circle r="${radius + 7}" class="mastery-ring"></circle>
              <circle r="${radius}" class="${root ? "root" : groupClass}"></circle>
              ${labelLines.map((line, lineIndex) => {
                const labelY = (lineIndex - (labelLines.length - 1) / 2) * lineHeight;
                return `<text x="0" y="${labelY}" class="inside label-center ${root ? "root" : ""}">${escapeHtml(line)}</text>`;
              }).join("")}
              ${badges.map((badge, badgeIndex) => `
                <g class="node-badge" transform="translate(${radius - 4},${-radius + 10 + badgeIndex * 17})">
                  <circle r="8"></circle>
                  <text x="0" y="0">${escapeHtml(badge)}</text>
                </g>
              `).join("")}
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
          return `<text data-link-label="${index}" data-link-source="${link.source}" data-link-target="${link.target}" x="${labelPoint.x}" y="${labelPoint.y}" class="graph-link-label ${treeLink ? "tree" : "cross"} relation-${graphRelationClass(link)}">${escapeHtml(visibleLabel)}</text>`;
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
  const learner = realLearnerState(node);
  const mastery = Number(learner.mastery);
  const masteryWidth = Number.isFinite(mastery) ? clamp(mastery, 0, 1) * 100 : 0;
  const explanation = uniqueTexts([
    node.details,
    ...(node.knowledgePoints || []),
    ...points
  ].filter(Boolean)).slice(0, 6);
  return `
    <div class="modal-backdrop">
      <section class="modal graph-node-modal">
        <button class="modal-close" id="closeGraphNodeModal">×</button>
        <h2>${escapeHtml(node.label)}</h2>
        <p class="hint">${escapeHtml(graph.title)} · ${escapeHtml(graph.subject)}</p>
        <div class="node-edu-grid concise-node-modal">
          <article>
            <strong>掌握程度诊断</strong>
            ${Number.isFinite(mastery) ? `<div class="mastery-meter"><span style="width:${masteryWidth}%"></span></div>` : ""}
            <p>${learner.status ? `${escapeHtml(learner.status)}，掌握度 ${percentText(learner.mastery)}。${escapeHtml(learner.evidence || "")}` : "暂无基于问答或教师确认批改的真实学习记录。"}</p>
          </article>
          <article>
            <strong>知识点解释</strong>
            ${explanation.map((point) => `<p>${escapeHtml(point)}</p>`).join("") || `<p>${escapeHtml(node.label)}：当前节点暂无补充解释。</p>`}
          </article>
          <article class="path-explanation-card">
            <strong>学习路径解释</strong>
            ${renderGraphLearningPathExplanation(graph, node, context)}
          </article>
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
  svg.classList.remove("zoom-global", "zoom-mid", "zoom-local");
  svg.classList.add(graphZoomClass(graphId));
}

function updateGraphDom(svg, graphId) {
  const view = state.graphViews[graphId];
  if (!view) return;
  const graph = state.data?.knowledgeGraphs?.find((item) => item.id === graphId);
  const displayGraph = graph ? graphDisplayGraph(graph) : null;
  const graphNodes = displayGraph?.nodes || [];
  const graphLinks = displayGraph?.links || [];
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
    const link = graphLinks[index] || { label: line.dataset.linkLabel || "" };
    const sourceEntry = nodeEntriesById.get(line.dataset.linkSource);
    const targetEntry = nodeEntriesById.get(line.dataset.linkTarget);
    line.setAttribute("d", graphNetworkLinkPath(source, target, link, index, sourceEntry?.node, targetEntry?.node, graphNodes.length));
  });
  svg.querySelectorAll(".graph-link-label").forEach((label) => {
    const source = view.positions[label.dataset.linkSource];
    const target = view.positions[label.dataset.linkTarget];
    if (!source || !target) return;
    const index = Number(label.dataset.linkLabel || 0);
    const link = graphLinks[index] || {};
    const point = graphLinkLabelPoint(source, target, index, isTreeLink(link));
    label.setAttribute("x", point.x);
    label.setAttribute("y", point.y);
  });
}

function graphNeighborDepths(graph, rootId, maxDepth = 2) {
  const adjacency = new Map();
  (graph.links || []).forEach((link) => {
    if (!adjacency.has(link.source)) adjacency.set(link.source, new Set());
    if (!adjacency.has(link.target)) adjacency.set(link.target, new Set());
    adjacency.get(link.source).add(link.target);
    adjacency.get(link.target).add(link.source);
  });
  const depths = new Map([[rootId, 0]]);
  const queue = [rootId];
  while (queue.length) {
    const current = queue.shift();
    const depth = depths.get(current) || 0;
    if (depth >= maxDepth) continue;
    (adjacency.get(current) || []).forEach((next) => {
      if (depths.has(next)) return;
      depths.set(next, depth + 1);
      queue.push(next);
    });
  }
  return depths;
}

function graphDragWeight(depth) {
  if (depth === 0) return 1;
  if (depth === 1) return 0.52;
  if (depth === 2) return 0.22;
  return 0.1;
}

function relaxGraphViewPositions(graph, view, size, options = {}) {
  const nodes = graph.nodes || [];
  const totalNodes = nodes.length;
  const fixed = new Set(options.fixedIds || []);
  const iterations = options.iterations || 4;
  const nodeEntriesById = new Map(nodes.map((node, index) => [node.id, { node, index }]));
  const linkEntries = (graph.links || [])
    .map((link, index) => ({ link, index, source: nodeEntriesById.get(link.source), target: nodeEntriesById.get(link.target) }))
    .filter((entry) => entry.source && entry.target);

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      const pa = view.positions[a.id];
      if (!pa) continue;
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        const pb = view.positions[b.id];
        if (!pb) continue;
        const dx = pb.x - pa.x;
        const dy = pb.y - pa.y;
        const distance = Math.max(0.1, Math.hypot(dx, dy));
        const minDistance = graphNetworkRadius(a, i, totalNodes) + graphNetworkRadius(b, j, totalNodes) + graphElasticGap(totalNodes);
        if (distance >= minDistance * 1.16) continue;
        const push = (minDistance * 1.16 - distance) * 0.12;
        const ux = dx / distance;
        const uy = dy / distance;
        const aFixed = fixed.has(a.id);
        const bFixed = fixed.has(b.id);
        if (!aFixed) {
          pa.x -= ux * push * (bFixed ? 1.25 : 0.5);
          pa.y -= uy * push * (bFixed ? 1.25 : 0.5);
        }
        if (!bFixed) {
          pb.x += ux * push * (aFixed ? 1.25 : 0.5);
          pb.y += uy * push * (aFixed ? 1.25 : 0.5);
        }
      }
    }
    linkEntries.forEach(({ link, source, target }) => {
      const sourcePosition = view.positions[source.node.id];
      const targetPosition = view.positions[target.node.id];
      if (!sourcePosition || !targetPosition) return;
      const dx = targetPosition.x - sourcePosition.x;
      const dy = targetPosition.y - sourcePosition.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const desired = graphNetworkRadius(source.node, source.index, totalNodes)
        + graphNetworkRadius(target.node, target.index, totalNodes)
        + graphSpringLength(totalNodes, isTreeLink(link));
      const move = clamp((distance - desired) * 0.012, -5, 5);
      const ux = dx / distance;
      const uy = dy / distance;
      const sourceFixed = fixed.has(source.node.id);
      const targetFixed = fixed.has(target.node.id);
      if (!sourceFixed) {
        sourcePosition.x += ux * move * (targetFixed ? 0.9 : 0.45);
        sourcePosition.y += uy * move * (targetFixed ? 0.9 : 0.45);
      }
      if (!targetFixed) {
        targetPosition.x -= ux * move * (sourceFixed ? 0.9 : 0.45);
        targetPosition.y -= uy * move * (sourceFixed ? 0.9 : 0.45);
      }
    });
    nodes.forEach((node) => {
      if (fixed.has(node.id)) return;
      const position = view.positions[node.id];
      if (position) clampGraphPoint(position, size.width, size.height, graphEdgePadding(totalNodes));
    });
  }
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
    const type = educationRelationLabel(link);
    const pedagogy = link.pedagogy ? `，${link.pedagogy}` : "";
    return `${source} -> ${target}：${link.label || type}（${type}${pedagogy}）`;
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

function isPrerequisiteLink(link) {
  const label = String(link?.label || link?.relation || "");
  return String(link?.type || "") === "prerequisite" || /前置|递进|支撑|驱动|进入|服务/.test(label);
}

function graphShortestLearningPath(graph, node, context) {
  const nodesById = new Map((graph.nodes || []).map((item) => [item.id, item]));
  const prerequisiteByTarget = new Map();
  (graph.links || []).forEach((link) => {
    if (!isPrerequisiteLink(link)) return;
    if (!prerequisiteByTarget.has(link.target)) prerequisiteByTarget.set(link.target, []);
    prerequisiteByTarget.get(link.target).push(link.source);
  });
  const ordered = [];
  const visited = new Set();
  const tracePrerequisite = (id, depth = 0) => {
    if (depth > 6 || visited.has(id)) return;
    visited.add(id);
    (prerequisiteByTarget.get(id) || []).forEach((sourceId) => {
      tracePrerequisite(sourceId, depth + 1);
      const sourceNode = nodesById.get(sourceId);
      if (sourceNode) ordered.push(sourceNode.label);
    });
  };
  tracePrerequisite(node.id);
  (context?.path || []).forEach((item) => ordered.push(item.label));
  ordered.push(node.label);
  return uniqueTexts(ordered).slice(-10);
}

function graphWeaknessAttribution(graph, node) {
  const nodesById = new Map((graph.nodes || []).map((item) => [item.id, item]));
  const prerequisiteByTarget = new Map();
  (graph.links || []).forEach((link) => {
    if (!isPrerequisiteLink(link)) return;
    if (!prerequisiteByTarget.has(link.target)) prerequisiteByTarget.set(link.target, []);
    prerequisiteByTarget.get(link.target).push(link.source);
  });
  const visited = new Set([node.id]);
  const queue = [node.id];
  const candidates = [];
  while (queue.length && candidates.length < 12) {
    const currentId = queue.shift();
    (prerequisiteByTarget.get(currentId) || []).forEach((sourceId) => {
      if (visited.has(sourceId)) return;
      visited.add(sourceId);
      const sourceNode = nodesById.get(sourceId);
      if (sourceNode) {
        candidates.push(sourceNode);
        queue.push(sourceId);
      }
    });
  }
  const fallback = candidates.length ? candidates : [node];
  return fallback
    .map((item) => ({
      label: item.label,
      status: realLearnerState(item).status || "待诊断",
      mastery: Number(realLearnerState(item).mastery ?? 0.5),
      real: isRealLearnerState(item.learnerState)
    }))
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 4);
}

function graphLocalSubgraphSummary(graph, node, context) {
  const nodesById = new Map((graph.nodes || []).map((item) => [item.id, item]));
  const neighborIds = new Set([node.id]);
  (context?.path || []).forEach((item) => neighborIds.add(item.id));
  (context?.children || []).slice(0, 8).forEach((item) => neighborIds.add(item.id));
  (context?.incoming || []).concat(context?.outgoing || []).forEach((link) => {
    neighborIds.add(link.source);
    neighborIds.add(link.target);
  });
  const neighborLabels = Array.from(neighborIds).map((id) => nodesById.get(id)?.label).filter(Boolean);
  const relationTypes = uniqueTexts((context?.incoming || []).concat(context?.outgoing || []).map(educationRelationLabel));
  return {
    nodes: uniqueTexts(neighborLabels).slice(0, 14),
    relations: relationTypes.slice(0, 8),
    prompt: node.graphRag?.promptHint || `回答「${node.label}」相关问题时，优先使用当前节点、前置依赖、下级节点和易错提醒。`
  };
}

function renderGraphLearningPathExplanation(graph, node, context) {
  const path = graphShortestLearningPath(graph, node, context);
  const weakSources = graphWeaknessAttribution(graph, node);
  const learner = realLearnerState(node);
  const mastery = Number(learner.mastery);
  const lowMastery = !Number.isFinite(mastery) || mastery < 0.58;
  const misconceptionText = node.misconception || (node.misconceptions || []).slice(0, 3).join("、") || "暂无显式误区，需要用前测或 AI 诊断确认。";
  const fallback = weakSources[0]?.label && weakSources[0].label !== node.label ? weakSources[0].label : (context.parent?.label || path[path.length - 2] || "前置节点");
  return `
    <div class="graph-path-explanation">
      <p><b>为什么先学这个：</b>${escapeHtml(lowMastery ? "该节点与当前薄弱点或未诊断状态相关，先补它可以支撑后续任务。" : "该节点已有掌握证据，适合作为后测和迁移验证点。")}</p>
      <p><b>与错因的关系：</b>${escapeHtml(misconceptionText)}</p>
      <p><b>前置知识：</b>${escapeHtml(path.slice(0, -1).slice(-4).join(" → ") || "本章基础概念")}</p>
      <p><b>学完怎么验证：</b>${escapeHtml(graphHasExercise(node) ? "完成节点关联练习或知识测试，并把结果写入学习档案。" : "用自己的话解释该节点，再完成一道同知识点变式题。")}</p>
      <p><b>仍未掌握下一步：</b>${escapeHtml(`回到「${fallback}」补学，并让 AI 只给提示和引用，不直接代答。`)}</p>
    </div>
  `;
}

function enrichedNodePoints(graph, node, context) {
  const label = String(node.label || "该节点");
  const parentLabel = context.parent?.label || graph.subject || "当前图谱";
  const childLabels = context.children.map((item) => item.label).slice(0, 8);
  const relationSummary = context.relationLines.slice(0, 5).join("；");
  const cognitive = node.cognitive || {};
  const assessment = node.assessment || {};
  const competencies = Array.isArray(node.competencies) ? node.competencies.join("、") : "";
  const generated = [
    context.path.length ? `知识路径：${context.path.map((item) => item.label).join(" / ")}。` : "",
    `学习定位：「${label}」属于「${parentLabel}」模块，复习时先明确它解决的问题，再看它与相邻节点的关系。`,
    cognitive.objective ? `认知目标：${cognitive.objective}` : "",
    competencies ? `核心素养：本节点主要训练${competencies}。` : "",
    assessment.examFrequency ? `考察属性：考频${assessment.examFrequency}，难度${assessment.difficulty}，区分度${assessment.discrimination}。` : "",
    childLabels.length ? `下级知识点：${childLabels.join("、")}。这些节点可作为展开复习和出题的直接入口。` : `该节点是当前分支的末级知识点，适合用定义、步骤、适用条件和典型题型四个角度复习。`,
    relationSummary ? `图谱关系：${relationSummary}。` : "",
    `掌握要求：能用自己的话解释「${label}」，能说明它和「${parentLabel}」的联系，并能举出一个教材或试题中的应用场景。`,
    node.misconception || `易错提醒：不要只记节点名称，要同时记录前提条件、数据流或控制流方向，以及它对性能、存储或执行过程的影响。`
  ];
  return uniqueTexts(generated.concat(node.knowledgePoints || [])).slice(0, 12);
}

function bindInteractiveGraph() {
  const svg = document.querySelector(".graph-svg");
  if (!svg) return;
  const graphId = svg.dataset.graphId;
  const graph = state.data.knowledgeGraphs.find((item) => item.id === graphId);
  if (!graph) return;
  const displayGraph = graphDisplayGraph(graph);
  const size = graphCanvasSize(displayGraph);
  getGraphView(displayGraph);

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
        getGraphView(displayGraph);
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
  let nodeClickTimer = null;
  svg.querySelectorAll(".graph-node").forEach((nodeEl) => {
    nodeEl.addEventListener("click", (event) => {
      event.stopPropagation();
      if (nodeClickTimer) clearTimeout(nodeClickTimer);
      if (event.detail > 1) return;
      nodeClickTimer = setTimeout(() => {
        state.graphNodeModal = { graphId, nodeId: nodeEl.dataset.nodeId };
        renderContent();
      }, 180);
    });
    nodeEl.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      if (nodeClickTimer) clearTimeout(nodeClickTimer);
      if (nodeEl.closest(".graph-atlas-shell")) {
        setGraphMaximized(!state.graphMaximized, true);
        return;
      }
      state.graphSelectedNodeId = nodeEl.dataset.nodeId;
      state.graphFocusNodeId = nodeEl.dataset.nodeId;
      state.graphLayer = "relation";
      renderContent();
    });
    nodeEl.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const view = state.graphViews[graphId];
      const start = view.positions[nodeEl.dataset.nodeId];
      if (!start) return;
      const maxDepth = (graph.nodes || []).length > 180 ? 2 : 3;
      const linkedDepths = graphNeighborDepths(graph, nodeEl.dataset.nodeId, maxDepth);
      const linkedNodes = Array.from(linkedDepths.entries())
        .map(([nodeId, depth]) => {
          const position = view.positions[nodeId];
          if (!position) return null;
          return {
            nodeId,
            depth,
            weight: graphDragWeight(depth),
            startX: position.x,
            startY: position.y
          };
        })
        .filter(Boolean);
      dragged = {
        nodeId: nodeEl.dataset.nodeId,
        x: event.clientX,
        y: event.clientY,
        startX: start.x,
        startY: start.y,
        width: rect.width,
        height: rect.height,
        linkedNodes
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
    const padding = graphEdgePadding((graph.nodes || []).length);
    (dragged.linkedNodes || []).forEach((item) => {
      view.positions[item.nodeId] = {
        x: clamp(item.startX + dx * item.weight, padding, size.width - padding),
        y: clamp(item.startY + dy * item.weight, padding, size.height - padding)
      };
    });
    relaxGraphViewPositions(displayGraph, view, size, { fixedIds: [dragged.nodeId], iterations: 2 });
    updateGraphDom(svg, graphId);
  });

  window.addEventListener("pointerup", () => {
    if (panning) {
      svg.classList.remove("panning");
      panning = null;
    }
    if (!dragged) return;
    const view = state.graphViews[graphId];
    relaxGraphViewPositions(displayGraph, view, size, { fixedIds: [dragged.nodeId], iterations: 14 });
    updateGraphDom(svg, graphId);
    svg.querySelector(`[data-node-id="${CSS.escape(dragged.nodeId)}"]`)?.classList.remove("dragging");
    dragged = null;
  });
}

function syncGraphMaximizedClass() {
  const active = state.page === "graph" && state.graphMaximized;
  document.body?.classList.toggle("graph-page-maximized", active);
  document.querySelectorAll(".graph-atlas-shell").forEach((shell) => {
    shell.classList.toggle("graph-maximized", active);
  });
}

function setGraphMaximized(maximized, requestFullscreen = false) {
  state.graphMaximized = Boolean(maximized);
  syncGraphMaximizedClass();
  const shell = document.querySelector(".graph-atlas-shell");
  if (!shell) return;
  if (state.graphMaximized && requestFullscreen && shell.requestFullscreen && !document.fullscreenElement) {
    shell.requestFullscreen().catch(() => {});
  } else if (!state.graphMaximized && document.fullscreenElement === shell && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

function bindGraphMaximizeControls() {
  const shell = document.querySelector(".graph-atlas-shell");
  if (!shell) {
    syncGraphMaximizedClass();
    return;
  }
  syncGraphMaximizedClass();
  shell.addEventListener("dblclick", (event) => {
    if (event.target.closest(".graph-node, button, a, input, select, textarea, .graph-toolbar, .graph-atlas-filterbar, .graph-atlas-nav, .graph-atlas-mode-panel, .graph-atlas-footer")) return;
    setGraphMaximized(!state.graphMaximized, true);
  });
  document.querySelectorAll('[data-graph-action="maximize"]').forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      setGraphMaximized(!state.graphMaximized, true);
      button.title = state.graphMaximized ? "还原" : "最大化";
      button.innerHTML = iconSvg(state.graphMaximized ? "minimize" : "maximize", button.title);
    });
  });
  if (!window.__graphFullscreenListenerBound) {
    document.addEventListener("fullscreenchange", () => {
      if (state.graphMaximized && !document.fullscreenElement) {
        state.graphMaximized = false;
        syncGraphMaximizedClass();
        renderContent();
      }
    });
    window.__graphFullscreenListenerBound = true;
  }
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
  if (!["graph", "learning-path"].includes(state.page)) return;
  const mount = document.getElementById("graphProgressMount");
  if (!mount) {
    renderContent();
    return;
  }
  mount.innerHTML = renderGraphProgress();
  bindGraphProgressControls();
}

function refreshGraphTaskCenter() {
  if (!["graph", "learning-path"].includes(state.page)) return;
  const mount = document.getElementById("graphTaskCenter");
  if (!mount) return;
  mount.innerHTML = renderGraphTaskCenter();
  bindGraphTaskControls();
}

async function loadGraphJobsSnapshot() {
  if (!isTeacherLike()) return;
  try {
    const payload = await api("/api/graphs/jobs");
    state.graphJobs = payload.jobs || [];
    refreshGraphTaskCenter();
  } catch {
    // 任务中心是辅助信息，失败时不打断图谱主流程。
  }
}

function bindGraphTaskControls() {
  document.querySelectorAll("[data-cancel-graph-job]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const payload = await api(`/api/graphs/jobs/${button.dataset.cancelGraphJob}/cancel`, { method: "POST", body: { userId: state.user.id } });
        state.graphJobs = (state.graphJobs || []).map((job) => job.id === payload.job.id ? payload.job : job);
        if (state.graphJob?.id === payload.job.id) state.graphJob = payload.job;
        refreshGraphTaskCenter();
        refreshGraphProgress();
        showToast("图谱任务已取消");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
  document.querySelectorAll("[data-open-job-graph]").forEach((button) => {
    button.addEventListener("click", () => {
      state.graphMaximized = false;
      state.selectedGraphId = button.dataset.openJobGraph;
      state.graphTab = "library";
      state.learningPathTab = "library";
      renderContent();
    });
  });
  document.querySelectorAll("[data-retry-graph-job]").forEach((button) => {
    button.addEventListener("click", () => {
      const job = (state.graphJobs || []).find((item) => item.id === button.dataset.retryGraphJob);
      state.graphDraft = {
        subject: job?.meta?.subject || preferredSubject(),
        title: job?.meta?.title || "",
        sourceText: "",
        extractor: job?.meta?.extractor || DEFAULT_GRAPH_EXTRACTOR
      };
      if (state.page === "learning-path") state.learningPathTab = "generate";
      else state.graphTab = "generate";
      renderContent();
      showToast("已带入失败任务信息，请重新选择文件后生成");
    });
  });
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
        showToast(state.page === "learning-path" ? "学习路径已生成" : "知识图谱已生成");
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

async function uploadFileInChunks(file, onProgress = () => {}, signal = null) {
  const chunkSize = 6 * 1024 * 1024;
  const started = await api("/api/uploads/start", {
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
    const start = index * chunkSize;
    const end = Math.min(file.size, start + chunkSize);
    const chunk = file.slice(start, end);
    const response = await fetch(`/api/uploads/${started.upload.id}/chunk?index=${index}&offset=${uploadedBytes}`, {
      method: "POST",
      headers: { "content-type": "application/octet-stream" },
      body: chunk,
      signal,
      credentials: "same-origin"
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) throw new Error(payload.error || `第 ${index + 1} 个分块上传失败`);
    uploadedBytes = payload.upload.received;
    onProgress({ index: index + 1, totalChunks, uploadedBytes, upload: payload.upload });
  }
  return started.upload;
}

async function generateGraphFromUploadedFile({ file, files = null, subject, title, sourceText, sourceName, extractor }) {
  const fileList = (Array.isArray(files) && files.length ? files : [file]).filter((item) => item && item.name);
  const totalSize = fileList.reduce((sum, item) => sum + Number(item.size || 0), 0);
  const joinedNames = fileList.map((item) => item.name).join("、");
  state.graphGenerationCanceled = false;
  state.graphUploadAbort = new AbortController();
  state.graphJob = {
    status: "running",
    stage: "上传文件",
    progress: 4,
    message: `准备分块上传 ${fileList.length} 个文件（${formatBytes(totalSize)}），大文件请保持页面打开。`,
    meta: { sourceName: joinedNames, fileSize: totalSize, fileCount: fileList.length, extractor }
  };
  refreshGraphProgress();

  const uploads = [];
  try {
    let uploadedBefore = 0;
    for (let fileIndex = 0; fileIndex < fileList.length; fileIndex += 1) {
      const currentFile = fileList[fileIndex];
      const upload = await uploadFileInChunks(currentFile, ({ index, totalChunks, uploadedBytes }) => {
        if (state.graphGenerationCanceled) throw graphCancelError();
        const overallUploaded = uploadedBefore + uploadedBytes;
        state.graphJob = {
          status: "running",
          stage: "上传文件",
          progress: Math.min(32, 4 + Math.floor((overallUploaded / Math.max(1, totalSize)) * 28)),
          message: `正在上传第 ${fileIndex + 1}/${fileList.length} 个文件：${currentFile.name}，分块 ${index}/${totalChunks}，总进度 ${formatBytes(overallUploaded)} / ${formatBytes(totalSize)}。`,
          meta: { sourceName: joinedNames, fileSize: totalSize, fileCount: fileList.length, extractor }
        };
        refreshGraphProgress();
      }, state.graphUploadAbort.signal);
      uploads.push(upload);
      uploadedBefore += currentFile.size;
    }

    if (state.graphGenerationCanceled) throw graphCancelError();
    state.graphJob = {
      status: "queued",
      stage: "等待解析",
      progress: 34,
      message: `${fileList.length} 个文件上传完成，正在启动汇总解析任务。`,
      meta: { sourceName: joinedNames, fileSize: totalSize, fileCount: fileList.length, extractor }
    };
    refreshGraphProgress();

    const payload = await api("/api/graphs/generate-upload", {
      method: "POST",
      body: {
        userId: state.user.id,
        classId: state.selectedClassId || "",
        uploadIds: uploads.map((upload) => upload.id),
        subject,
        title,
        sourceText,
        sourceName: sourceName || joinedNames,
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
  document.querySelector("[data-ml-graph-node-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = { userId: state.user.id, nodeId: form.dataset.nodeId };
    ["label", "group", "learningGoal", "masteryStandard"].forEach((key) => { body[key] = String(data.get(key) || ""); });
    ["prerequisites", "misconceptions", "diagnosticQuestions", "remediationResources", "verificationQuestions"].forEach((key) => { body[key] = String(data.get(key) || "").split(/\n|；|;/).map((item) => item.trim()).filter(Boolean); });
    try {
      const payload = await api(`/api/graphs/${form.dataset.graphId}`, { method: "PUT", body });
      const index = state.data.knowledgeGraphs.findIndex((item) => item.id === payload.graph.id);
      if (index >= 0) state.data.knowledgeGraphs[index] = payload.graph;
      showToast("节点教学配置已保存");
      renderContent();
    } catch (error) { showToast(error.message, "error"); }
  });
  document.querySelector("[data-ml-relation-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const graph = state.data.knowledgeGraphs.find((item) => item.id === form.dataset.graphId);
    if (!graph) return;
    const source = String(data.get("source") || "");
    const target = String(data.get("target") || "");
    const type = String(data.get("type") || "prerequisite");
    if (!source || !target || source === target) return showToast("请选择两个不同的知识点", "error");
    const exists = (graph.links || []).some((link) => link.source === source && link.target === target && graphRelationKey(link) === type);
    if (exists) return showToast("这条语义关系已经存在", "error");
    const links = [...(graph.links || []), { source, target, type, label: type === "prerequisite" ? "前置依赖" : "易混淆关系", pedagogy: type === "prerequisite" ? "用于路径规划和薄弱点归因" : "用于错因诊断和对比干预" }];
    try {
      const payload = await api(`/api/graphs/${form.dataset.graphId}`, { method: "PUT", body: { userId: state.user.id, links } });
      const index = state.data.knowledgeGraphs.findIndex((item) => item.id === payload.graph.id);
      if (index >= 0) state.data.knowledgeGraphs[index] = payload.graph;
      showToast("语义关系已保存");
      renderContent();
    } catch (error) { showToast(error.message, "error"); }
  });
  bindDashboardPageLinks();
  bindReflectionForms();
  bindNodeAnnotationForms();
  bindInteractiveGraph();
  bindGraphMaximizeControls();
  bindGraphProgressControls();
  bindGraphTaskControls();
  loadGraphJobsSnapshot();
  document.querySelectorAll("[data-graph-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.graphTab = button.dataset.graphTab || "library";
      renderContent();
    });
  });
  document.querySelectorAll("[data-student-graph-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.studentGraphTab = button.dataset.studentGraphTab || "library";
      renderContent();
    });
  });
  document.getElementById("knowledgeTestSubjectSelect")?.addEventListener("change", (event) => {
    state.knowledgeTest = {
      ...(state.knowledgeTest || {}),
      subject: event.currentTarget.value,
      materialId: "",
      quizId: "",
      questions: [],
      currentIndex: 0,
      answer: "",
      result: null,
      attempts: [],
      summary: null,
      sourceNotice: "",
      sourceMaterials: []
    };
    renderContent();
  });
  document.getElementById("knowledgeTestMaterialSelect")?.addEventListener("change", (event) => {
    state.knowledgeTest = {
      ...(state.knowledgeTest || {}),
      materialId: event.currentTarget.value,
      quizId: "",
      questions: [],
      currentIndex: 0,
      answer: "",
      result: null,
      attempts: [],
      summary: null,
      sourceNotice: "",
      sourceMaterials: []
    };
    renderContent();
  });
  document.getElementById("knowledgeTestSetupForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const payload = await api("/api/knowledge-tests/generate", {
        method: "POST",
        body: {
          subject: form.get("subject"),
          materialId: form.get("materialId"),
          count: 4,
          phase: form.get("phase") || state.knowledgeTest?.phase || "diagnostic",
          nodeId: state.graphFocusNodeId || state.graphSelectedNodeId || ""
        }
      });
      state.knowledgeTest = {
        ...(state.knowledgeTest || {}),
        subject: payload.quiz.subject || form.get("subject") || "",
        materialId: payload.quiz.materialId || form.get("materialId") || "",
        quizId: payload.quiz.id,
        questions: payload.quiz.questions || [],
        currentIndex: 0,
        answer: "",
        result: null,
        attempts: [],
        summary: null,
        sourceNotice: payload.quiz.sourceNotice || "",
        sourceMaterials: payload.quiz.sourceMaterials || [],
        phase: payload.quiz.phase || form.get("phase") || "diagnostic",
        startedAt: Date.now(),
        previousAccuracy: state.knowledgeTest?.phase === "diagnostic" ? Number(state.knowledgeTest?.summary?.accuracy || 0) : Number(state.knowledgeTest?.previousAccuracy || 0)
      };
      renderContent();
      showToast("知识测试题目已生成");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.getElementById("knowledgeTestAnswerForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const answer = String(form.get("answer") || "").trim();
    const test = state.knowledgeTest || {};
    const question = (test.questions || [])[Number(test.currentIndex || 0)];
    if (!question || !answer) return showToast("请先输入答案", "error");
    try {
      const payload = await api("/api/knowledge-tests/evaluate", {
        method: "POST",
        body: {
          quizId: test.quizId,
          subject: test.subject,
          materialId: test.materialId,
          question,
          answer,
          attempts: test.attempts || [],
          questionCount: (test.questions || []).length,
          phase: test.phase || question.phase || "diagnostic",
          previousAccuracy: test.previousAccuracy || 0,
          durationMs: test.startedAt ? Math.max(0, Date.now() - test.startedAt) : 0,
          version: question.version
        }
      });
      const attempt = {
        id: `${Date.now()}`,
        questionId: question.id,
        order: question.order || Number(test.currentIndex || 0) + 1,
        topic: question.topic,
        accuracy: payload.result.accuracy,
        masteryLevel: payload.result.masteryLevel,
        feedback: payload.result.feedback,
        version: question.version,
        difficulty: question.difficulty,
        misconceptionTags: question.misconceptionTags || [],
        source: question.source || question.sourceTitle,
        durationMs: test.startedAt ? Math.max(0, Date.now() - test.startedAt) : 0,
        answerLength: answer.length,
        matched: payload.result.matched || [],
        missing: payload.result.missing || [],
        at: new Date().toISOString()
      };
      const attempts = [attempt, ...(test.attempts || [])].reduce((items, item) => {
        if (!item.questionId || items.some((existing) => existing.questionId === item.questionId)) return items;
        items.push(item);
        return items;
      }, []).slice(0, 12);
      state.knowledgeTest = {
        ...test,
        answer,
        result: payload.result,
        attempts,
        summary: payload.result.overall || null,
        phase: test.phase || question.phase || "diagnostic"
      };
      await loadState();
      if ((test.phase || question.phase) === "remedial" && attempts.length >= (test.questions || []).length) {
        const verifyPayload = await api("/api/knowledge-tests/generate", {
          method: "POST",
          body: { subject: test.subject, materialId: test.materialId, count: 4, phase: "verify", nodeId: question.nodeId || state.graphFocusNodeId || state.graphSelectedNodeId || "" }
        });
        state.knowledgeTest = {
          ...test,
          phase: "verify",
          quizId: verifyPayload.quiz.id,
          questions: verifyPayload.quiz.questions || [],
          currentIndex: 0,
          answer: "",
          result: null,
          attempts: [],
          summary: null,
          sourceNotice: verifyPayload.quiz.sourceNotice || "",
          sourceMaterials: verifyPayload.quiz.sourceMaterials || [],
          previousAccuracy: Number(test.previousAccuracy || test.summary?.accuracy || 0)
          ,startedAt: Date.now()
        };
        renderContent();
        showToast("补救完成，已自动生成验证性小测");
        return;
      }
      renderShell();
      showToast(`本题 ${payload.result.accuracy}%；累计 ${payload.result.overall?.accuracy ?? payload.result.accuracy}%`);
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.getElementById("knowledgeTestRetry")?.addEventListener("click", () => {
    state.knowledgeTest = { ...(state.knowledgeTest || {}), answer: "", result: null };
    renderContent();
  });
  document.getElementById("knowledgeTestNext")?.addEventListener("click", () => {
    const test = state.knowledgeTest || {};
    const total = (test.questions || []).length;
    if (!total) return;
    state.knowledgeTest = {
      ...test,
      currentIndex: (Number(test.currentIndex || 0) + 1) % total,
      answer: "",
      result: null,
      startedAt: Date.now()
    };
    renderContent();
  });
  document.querySelectorAll("[data-practice-phase], [data-practice-next-phase]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextPhase = button.dataset.practicePhase || button.dataset.practiceNextPhase;
      state.knowledgeTest = {
        ...(state.knowledgeTest || {}),
        phase: nextPhase,
        questions: [],
        currentIndex: 0,
        answer: "",
        result: null,
        attempts: [],
        summary: null,
        previousAccuracy: Number(state.knowledgeTest?.summary?.accuracy || state.knowledgeTest?.previousAccuracy || 0)
      };
      renderContent();
    });
  });
  document.querySelectorAll("[data-test-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.testAction;
      const test = state.knowledgeTest || {};
      const question = (test.questions || [])[Number(test.currentIndex || 0)] || {};
      const result = test.result || {};
      if (action === "analysis") {
        const panel = document.querySelector("[data-practice-analysis]");
        if (panel) panel.hidden = !panel.hidden;
        return;
      }
      if (action === "archive") {
        try {
          await api("/api/wrong-notes", {
            method: "POST",
            body: {
              userId: state.user.id,
              topic: question.topic || test.subject || "机器学习知识点",
              question: question.prompt || "知识测评",
              answer: test.answer || "",
              source: "知识测评订正",
              analysis: (result.missing || []).length ? `待补齐：${(result.missing || []).join("、")}` : "学生主动加入订正档案",
              recommendation: "完成同类辨析题与一道变式迁移题后再复测。"
            }
          });
          await loadState();
          showToast("已加入订正档案");
        } catch (error) { showToast(error.message, "error"); }
        return;
      }
      if (action === "variant") {
        state.knowledgeTest = { ...test, phase: "remedial", questions: [], currentIndex: 0, answer: "", result: null, attempts: [], summary: null, previousAccuracy: Number(result.accuracy || test.previousAccuracy || 0) };
        renderContent();
      }
    });
  });
  document.getElementById("refreshGraphJobs")?.addEventListener("click", loadGraphJobsSnapshot);
  document.getElementById("graphLibrarySearchForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    state.graphSearch = String(new FormData(event.currentTarget).get("query") || "").trim();
    renderContent();
  });
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

  const currentGraph = state.data.knowledgeGraphs.find((item) => item.id === state.selectedGraphId)
    || graphListForCurrentRole()[0];

  document.querySelectorAll("[data-graph-layer]").forEach((button) => {
    button.addEventListener("click", () => {
      state.graphLayer = button.dataset.graphLayer || "overview";
      renderContent();
    });
  });

  document.querySelectorAll("[data-graph-node-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.graphNodeFilter = button.dataset.graphNodeFilter || "all";
      if (state.graphNodeFilter !== "all") state.graphLayer = state.graphLayer === "overview" ? "relation" : state.graphLayer;
      renderContent();
    });
  });

  document.getElementById("graphDetailToggle")?.addEventListener("click", () => {
    state.graphDetailOpen = state.graphDetailOpen === false;
    renderContent();
  });

  document.getElementById("graphSearchForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("query") || "").trim();
    state.graphSearch = query;
    if (currentGraph && query) {
      const match = (currentGraph.nodes || []).find((node) => graphTextMatchesNode(node, query));
      if (match) {
        state.graphSelectedNodeId = match.id;
        state.graphFocusNodeId = match.id;
        state.graphLayer = "relation";
      } else {
        showToast("未找到匹配知识点", "error");
      }
    }
    renderContent();
  });

  document.querySelectorAll("[data-graph-relation]").forEach((control) => {
    const isCheckbox = control.matches('input[type="checkbox"]');
    const updateRelationFilters = () => {
      if (isCheckbox) {
        state.graphRelationFilters = Array.from(document.querySelectorAll('input[type="checkbox"][data-graph-relation]:checked'))
          .map((item) => item.dataset.graphRelation);
      } else {
        const next = graphFilterSet();
        const key = control.dataset.graphRelation;
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        state.graphRelationFilters = Array.from(next);
      }
      renderContent();
    };
    control.addEventListener(isCheckbox ? "change" : "click", updateRelationFilters);
  });

  document.querySelectorAll("[data-graph-focus-node]").forEach((button) => {
    button.addEventListener("click", () => {
      state.graphFocusNodeId = button.dataset.graphFocusNode;
      state.graphSelectedNodeId = button.dataset.graphFocusNode;
      state.graphLayer = "relation";
      renderContent();
    });
  });

  document.querySelectorAll("[data-ml-module]").forEach((button) => {
    button.addEventListener("click", () => {
      const graph = graphListForCurrentRole().find((item) => item.id === state.selectedGraphId) || machineLearningGraph();
      const module = ML_GRAPH_MODULES.find((item) => item.key === button.dataset.mlModule);
      if (!graph || !module) return;
      const match = (graph.nodes || [])
        .map((node, index) => ({ node, score: (machineLearningModuleMatches(node, module) ? 100 : 0) + graphNodeImportanceScore(node, index) }))
        .filter((entry) => entry.score >= 100)
        .sort((a, b) => b.score - a.score)[0]?.node;
      if (!match) return showToast("该模块暂未定位到对应知识点", "error");
      state.selectedGraphId = graph.id;
      state.graphFocusNodeId = match.id;
      state.graphSelectedNodeId = match.id;
      state.graphLayer = "relation";
      state.graphNodeFilter = "all";
      renderContent();
    });
  });

  document.querySelectorAll("[data-ml-focus-node]").forEach((button) => {
    button.addEventListener("click", () => {
      const graph = graphListForCurrentRole().find((item) => item.id === state.selectedGraphId) || machineLearningGraph();
      if (!graph) return;
      state.selectedGraphId = graph.id;
      state.graphFocusNodeId = button.dataset.mlFocusNode;
      state.graphSelectedNodeId = button.dataset.mlFocusNode;
      state.graphLayer = "relation";
      renderContent();
    });
  });

  document.querySelectorAll("[data-graph-node-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.graphNodeAction;
      const graph = graphListForCurrentRole().find((item) => item.id === state.selectedGraphId) || graphListForCurrentRole()[0];
      const node = graph ? graphSelectedNode(graph) : null;
      if (!graph || !node) return showToast("请先选择一个知识图谱节点", "error");
      const context = graphNodeContext(graph, node);
      const linkNeighbor = (context.incoming || []).concat(context.outgoing || [])
        .map((link) => {
          const otherId = link.source === node.id ? link.target : link.source;
          return (graph.nodes || []).find((item) => item.id === otherId);
        })
        .find((item) => item && item.id !== node.id);
      const compareTarget = context.children?.find((item) => item.id !== node.id)?.label
        || linkNeighbor?.label
        || context.parent?.label
        || graph.title;
      const pathText = graphShortestLearningPath(graph, node, context).join(" → ") || node.label;
      const aiActions = {
        explain: {
          mode: "explain",
          depth: "layered",
          toast: "讲解已生成",
          prompt: `请基于课程资料和知识图谱，分层讲解「${node.label}」。请包含定义、算法/方法流程、关键条件、例子和常见误区。`
        },
        exercise: {
          mode: "practice",
          depth: "layered",
          toast: "练习题已生成",
          prompt: `请基于课程资料和当前图谱节点「${node.label}」生成课堂练习题。题目需包含基础题、提高题、综合题，并给出答案解析和评分要点。`
        },
        path: {
          mode: "plan",
          depth: "layered",
          toast: "学习路径已生成",
          prompt: `请根据知识图谱前置关系，为「${node.label}」生成学习路径。当前路径线索：${pathText}。请给出前置补齐、学习顺序、每日任务和检测方式。`
        },
        compare: {
          mode: "explain",
          depth: "full",
          toast: "对比讲解已生成",
          prompt: `请基于课程资料和知识图谱，对比「${node.label}」与「${compareTarget}」。请从适用场景、输入输出、关键假设、参数影响、易混淆点和课堂例题角度说明。`
        }
      };
      const aiAction = aiActions[action];
      if (!aiAction) return showToast("未识别的图谱操作", "error");
      button.disabled = true;
      try {
        const payload = await api("/api/ai/chat", {
          method: "POST",
          body: {
            userId: state.user.id,
            conversationId: state.activeConversationId,
            mode: aiAction.mode,
            subject: graph.subject || state.user.subject || "通用",
            chapter: (context.path || []).map((item) => item.label).join(" / "),
            knowledgePoint: node.label,
            graphId: graph.id,
            nodeId: node.id,
            answerDepth: aiAction.depth,
            prompt: aiAction.prompt
          }
        });
        state.activeConversationId = payload.conversation.id;
        state.aiMode = aiAction.mode;
        state.aiSubject = graph.subject || "";
        state.aiChapter = (context.path || []).map((item) => item.label).join(" / ");
        state.aiKnowledgePoint = node.label;
        state.aiAnswerDepth = aiAction.depth;
        state.page = "ai";
        await loadState();
        renderShell();
        showToast(aiAction.toast);
      } catch (error) {
        button.disabled = false;
        showToast(error.message, "error");
      }
    });
  });

  document.querySelectorAll("[data-select-graph]").forEach((card) => {
    card.addEventListener("dblclick", (event) => {
      if (event.target.closest("button, a, input, select, textarea")) return;
      state.graphMaximized = false;
      state.selectedGraphId = card.dataset.selectGraph;
      state.graphFocusNodeId = null;
      state.graphSelectedNodeId = null;
      state.graphSearch = "";
      state.graphNodeFilter = "all";
      state.graphDetailOpen = true;
      renderContent();
    });
  });

  document.getElementById("graphBackToLibrary")?.addEventListener("click", () => {
    setGraphMaximized(false);
    state.selectedGraphId = null;
    state.graphFocusNodeId = null;
    state.graphSelectedNodeId = null;
    state.graphSearch = "";
    state.graphNodeFilter = "all";
    renderContent();
  });

  document.querySelectorAll("[data-export-graph]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const graph = findGraphResource(button.dataset.exportGraph);
      if (graph) downloadJson(`${graph.title}.json`, graph);
    });
  });

  document.querySelectorAll("[data-export-learning-path]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const path = allVisibleLearningPaths().find((item) => item.id === button.dataset.exportLearningPath);
      if (path) downloadJson(`${path.title}.json`, path);
    });
  });

  document.querySelectorAll("[data-sync-graph]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      state.graphSyncModal = { graphId: button.dataset.syncGraph };
      renderContent();
    });
  });

  const closeGraphSyncModal = () => {
    state.graphSyncModal = null;
    renderContent();
  };
  document.getElementById("closeGraphSyncModal")?.addEventListener("click", closeGraphSyncModal);
  document.getElementById("cancelGraphSync")?.addEventListener("click", closeGraphSyncModal);
  document.getElementById("graphSyncForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const classIds = new FormData(form).getAll("classIds");
    if (!classIds.length) return showToast("请至少选择一个班级", "error");
    const submitButton = form.querySelector('button[type="submit"]');
    setButtonBusy(submitButton, true, "同步中...");
    try {
      await api(`/api/graphs/${form.dataset.graphId}/sync-classes`, {
        method: "POST",
        body: { userId: state.user.id, classIds }
      });
      state.graphSyncModal = null;
      await loadState();
      renderShell();
      showToast("图谱已同步到所选班级");
    } catch (error) {
      setButtonBusy(submitButton, false);
      showToast(error.message, "error");
    }
  });

  document.querySelectorAll("[data-sync-learning-path]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      state.learningPathSyncModal = { pathId: button.dataset.syncLearningPath };
      renderContent();
    });
  });

  const closeLearningPathSyncModal = () => {
    state.learningPathSyncModal = null;
    renderContent();
  };
  document.getElementById("closeLearningPathSyncModal")?.addEventListener("click", closeLearningPathSyncModal);
  document.getElementById("cancelLearningPathSync")?.addEventListener("click", closeLearningPathSyncModal);
  document.getElementById("learningPathSyncForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const classIds = new FormData(form).getAll("classIds");
    if (!classIds.length) return showToast("请至少选择一个班级", "error");
    const submitButton = form.querySelector('button[type="submit"]');
    setButtonBusy(submitButton, true, "同步中...");
    try {
      await api(`/api/learning-paths/${form.dataset.pathId}/sync-classes`, {
        method: "POST",
        body: { userId: state.user.id, classIds }
      });
      state.learningPathSyncModal = null;
      await loadState();
      renderShell();
      showToast("学习路径已同步到所选班级");
    } catch (error) {
      setButtonBusy(submitButton, false);
      showToast(error.message, "error");
    }
  });

  document.querySelectorAll("[data-delete-graph]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (!confirm("确认删除该图谱？")) return;
      try {
        await api(`/api/graphs/${button.dataset.deleteGraph}?userId=${state.user.id}`, { method: "DELETE" });
        setGraphMaximized(false);
        state.selectedGraphId = null;
        state.graphFocusNodeId = null;
        state.graphSelectedNodeId = null;
        state.graphNodeFilter = "all";
        await loadState();
        renderShell();
        showToast("图谱已删除");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });

  document.querySelectorAll("[data-delete-learning-path]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (!confirm("确认删除该学习路径？")) return;
      try {
        await api(`/api/learning-paths/${button.dataset.deleteLearningPath}?userId=${state.user.id}`, { method: "DELETE" });
        state.selectedGraphId = null;
        await loadState();
        renderShell();
        showToast("学习路径已删除");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });

  document.querySelectorAll("[data-publish-graph]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      try {
        await api(`/api/graphs/${button.dataset.publishGraph}/publish`, { method: "POST", body: { userId: state.user.id } });
        await loadState();
        renderShell();
        showToast("图谱已发布，学生端可开始学习与测评");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });

  document.querySelectorAll("[data-publish-learning-path]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      try {
        await api(`/api/learning-paths/${button.dataset.publishLearningPath}/publish`, { method: "POST", body: { userId: state.user.id } });
        await loadState();
        renderShell();
        showToast("学习路径已发布，可同步到班级");
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
    setGraphMaximized(false);
    state.graphSubject = event.target.value;
    state.selectedGraphId = null;
    state.graphFocusNodeId = null;
    state.graphSelectedNodeId = null;
    state.graphSearch = "";
    state.graphNodeFilter = "all";
    renderContent();
  });

  document.getElementById("studentGraphSelect")?.addEventListener("change", (event) => {
    setGraphMaximized(false);
    state.selectedGraphId = event.currentTarget.value || null;
    state.graphFocusNodeId = null;
    state.graphSelectedNodeId = null;
    state.graphSearch = "";
    state.graphNodeFilter = "all";
    state.graphRelationFilters = [];
    renderContent();
  });

  document.getElementById("sampleGraphBtn")?.addEventListener("click", async () => {
    try {
      await api("/api/graphs/generate", {
        method: "POST",
        body: {
          userId: state.user.id,
          classId: state.selectedClassId || "",
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
    const files = form.getAll("book").filter((item) => item && item.name);
    let sourceText = String(state.graphDraft.sourceText || "");
    let sourceName = files.map((item) => item.name).join("、");
    const extractor = String(form.get("extractor") || DEFAULT_GRAPH_EXTRACTOR);
    const subject = String(form.get("subject") || "").trim();
    if (!subject) return showToast("请先输入学科名称", "error");
    const title = String(form.get("title") || `${subject}知识图谱`).trim();
    try {
      state.graphGenerationCanceled = false;
      if (files.length) {
        await generateGraphFromUploadedFile({
          files,
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
        message: `${state.page === "learning-path" ? "学习路径" : "图谱"}已生成：${payload.graph.nodes.length} 个节点，${payload.graph.links.length} 条关系`,
        graphId: payload.graph.id
      };
      state.selectedGraphId = payload.graph.id;
      clearGraphForms();
      await loadState();
      renderShell();
      showToast(state.page === "learning-path" ? "学习路径已生成" : "知识图谱已生成");
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
          classId: state.selectedClassId || "",
          subject,
          title: form.get("title"),
          sourceName: file.name,
          resourceType: state.page === "learning-path" ? "learning-path" : "knowledge-graph",
          graph
        }
      });
      state.selectedGraphId = payload.graph.id;
      clearGraphForms();
      await loadState();
      renderShell();
      showToast(state.page === "learning-path" ? "学习路径导入成功" : "知识图谱导入成功");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

function renderCitationList(citations = []) {
  if (!citations.length) return `<p class="hint">本轮回答暂无明确引用。上传课程资料后，系统会显示 PDF/讲义来源、章节和页码。</p>`;
  return `
    <div class="citation-list">
      ${citations.slice(0, 5).map((citation) => `
        <article>
          <strong>[${escapeHtml(citation.id)}] ${escapeHtml(citation.sourceName || citation.title || "课程资料")}</strong>
          <span>${escapeHtml(citation.chapter || "课程片段")}${citation.page ? ` · 第 ${citation.page} 页` : ""}</span>
          <p>${escapeHtml(compactText(citation.quote || "", 120))}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function normalizeAiModeClient(mode) {
  const map = {
    rag: "qa",
    socratic: "guided",
    questions: "practice",
    "teacher-plan": "plan",
    "study-plan": "plan",
    lesson_plan: "plan",
    "lesson-plan": "plan",
    quiz_generation: "practice",
    "quiz-generation": "practice",
    grading: "grade",
    class_analysis: "plan",
    "class-analysis": "plan",
    remedial_plan: "plan",
    "remedial-plan": "plan"
  };
  return map[mode] || mode || "qa";
}

function aiModeLabel(mode) {
  const normalized = normalizeAiModeClient(mode);
  return AI_MODE_OPTIONS.find((item) => item.key === normalized)?.title || "问答模式";
}

function aiDepthLabel(depth) {
  return AI_DEPTH_OPTIONS.find((item) => item.key === depth)?.label || "分层";
}

function activeAiConversation() {
  const conversations = state.data?.conversations || [];
  return conversations.find((conv) => conv.id === state.activeConversationId) || conversations[0] || null;
}

function aiConversationHistory() {
  return (state.data?.conversations || [])
    .filter((conversation) => (conversation.messages || []).some((message) => message.role === "user" || message.role === "assistant"))
    .slice()
    .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0));
}

function renderAiHistoryMenu() {
  const conversations = aiConversationHistory();
  if (!state.aiHistoryOpen) return "";
  return `
    <div class="ai-history-menu" role="menu" aria-label="历史问答记录">
      <div class="ai-history-menu-head"><strong>历史问答</strong><span>${conversations.length} 条</span></div>
      <div class="ai-history-menu-list">
        ${conversations.map((conversation) => {
          const lastQuestion = [...(conversation.messages || [])].reverse().find((message) => message.role === "user");
          return `
            <button type="button" class="${conversation.id === state.activeConversationId ? "active" : ""}" data-ai-history-conversation="${escapeHtml(conversation.id)}" role="menuitem">
              <strong>${escapeHtml(conversation.title || lastQuestion?.content || "未命名对话")}</strong>
              <span>${escapeHtml(compactText(lastQuestion?.content || "暂无提问", 38))}</span>
              <small>${escapeHtml(fmtTime(conversation.updatedAt || conversation.createdAt))}</small>
            </button>
          `;
        }).join("") || `<p class="ai-history-empty">暂无历史问答记录</p>`}
      </div>
    </div>
  `;
}

function latestAssistantMessage(active) {
  return [...(active?.messages || [])].reverse().find((message) => message.role === "assistant") || null;
}

function materialSubjectOptions(selected = "") {
  return subjectSelectOptions(selected, materialSubjects(), true, "全部课程");
}

function inferSubjectFromPrompt(prompt, fallback = "") {
  const text = String(prompt || "");
  const knownSubjects = Array.from(new Set([
    ...subjects,
    ...materialSubjects(),
    ...allVisibleGraphs().map((graph) => graph.subject).filter(Boolean)
  ]));
  return knownSubjects.find((subject) => subject && text.includes(subject)) || fallback || "";
}

function inferAiDepthFromPrompt(prompt, fallback = "layered") {
  const text = String(prompt || "");
  if (/简洁|简短|一句话|快速/.test(text)) return "brief";
  if (/完整|详细|全面|系统|深入/.test(text)) return "full";
  if (/考试|应试|答题模板|拿分|评分/.test(text)) return "exam";
  if (/分层|逐层|一步步|由浅入深/.test(text)) return "layered";
  return fallback || "layered";
}

function inferTeacherTaskKeyFromPrompt(prompt) {
  const text = String(prompt || "");
  if (/批改|评分|改作业|作业反馈|检查答案|错因/.test(text)) return "grading";
  if (/出题|题目|练习|测验|试卷|作业|选择题|填空题|简答题|计算题/.test(text)) return "quiz_generation";
  if (/学情|掌握|薄弱|分层|班级.*情况|学习情况|诊断|补救/.test(text)) return "class_analysis";
  if (/备课|教案|课堂|授课|教学设计|教学目标|重难点|板书|讲义/.test(text)) return "lesson_plan";
  return "";
}

function findTeacherClassFromPrompt(prompt) {
  if (!isTeacherLike()) return null;
  const text = String(prompt || "");
  const compact = text.replace(/\s+/g, "");
  return teacherAiClasses().find((klass) => {
    const name = String(klass.name || "").replace(/\s+/g, "");
    return (name && compact.includes(name))
      || (klass.inviteCode && text.includes(klass.inviteCode))
      || (klass.id && text.includes(klass.id));
  }) || null;
}

function findMaterialFromPrompt(prompt, subject = "") {
  const text = String(prompt || "");
  return (state.data?.courseMaterials || []).find((material) => {
    if (subject && subject !== "通用" && material.subject && material.subject !== subject) return false;
    const title = String(material.title || "");
    const sourceName = String(material.sourceName || "");
    return (title && text.includes(title)) || (sourceName && text.includes(sourceName));
  }) || null;
}

function findGraphFromPrompt(prompt, subject = "") {
  const text = String(prompt || "");
  return graphListForCurrentRole().find((graph) => {
    if (subject && subject !== "通用" && graph.subject && graph.subject !== subject) return false;
    const title = String(graph.title || "");
    const sourceName = String(graph.sourceName || "");
    const graphSubject = String(graph.subject || "");
    return (title && text.includes(title)) || (sourceName && text.includes(sourceName)) || (graphSubject && text.includes(graphSubject));
  }) || null;
}

function findGraphNodeFromPrompt(prompt, graph) {
  const text = String(prompt || "");
  return (graph?.nodes || [])
    .slice()
    .sort((a, b) => String(b.label || "").length - String(a.label || "").length)
    .find((node) => node.label && text.includes(node.label)) || null;
}

function renderAiModeTabs() {
  const current = normalizeAiModeClient(state.aiMode);
  return `
    <div class="ai-mode-tabs" role="tablist" aria-label="对话模式">
      ${AI_MODE_OPTIONS.map((item) => `
        <button type="button" class="${current === item.key ? "active" : ""}" data-ai-mode="${item.key}" title="${escapeHtml(item.hint)}">
          <strong>${escapeHtml(item.label)}</strong>
          <span>${escapeHtml(item.hint)}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderAiDepthTabs() {
  return `
    <div class="ai-depth-tabs" aria-label="回答深度">
      ${AI_DEPTH_OPTIONS.map((item) => `
        <button type="button" class="${state.aiAnswerDepth === item.key ? "active" : ""}" data-ai-depth="${item.key}">${escapeHtml(item.label)}</button>
      `).join("")}
    </div>
  `;
}

function aiTaskOptions(isTeacher = isTeacherLike()) {
  return isTeacher
    ? [
      { key: "lesson_plan", label: "备课", hint: "教案、讲义和课堂目标", mode: "plan" },
      { key: "quiz_generation", label: "出题", hint: "测验、作业和解析", mode: "practice" },
      { key: "grading", label: "批改", hint: "评分建议和错因分析", mode: "grade" },
      { key: "class_analysis", label: "学情", hint: "薄弱点和分层补救", mode: "plan" }
    ]
    : STUDENT_AI_TASK_MODES;
}

function renderAiTaskButtons(isTeacher) {
  const current = normalizeAiModeClient(state.aiMode);
  const options = aiTaskOptions(isTeacher);
  const requestedTask = isTeacher ? (state.aiTeacherTask || state.aiTaskKey || "lesson_plan") : (state.aiTaskKey || current);
  const currentTask = options.some((item) => item.key === requestedTask) ? requestedTask : options[0]?.key;
  return `
    <div class="ai-task-strip" aria-label="${isTeacher ? "教师任务" : "学习任务"}">
      ${options.map((item) => `
        <button type="button" class="${currentTask === item.key || (!state.aiTaskKey && current === item.mode) ? "active" : ""}" data-ai-draft="${item.key}">
          <strong>${escapeHtml(item.label)}</strong>
          <span>${escapeHtml(item.hint)}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderAiDepthSelect() {
  return `
    <select id="aiAnswerDepthSelect" aria-label="回答深度">
      ${AI_DEPTH_OPTIONS.map((item) => `<option value="${item.key}" ${state.aiAnswerDepth === item.key ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
    </select>
  `;
}

function aiContextSummary() {
  const subject = state.aiSubject || preferredSubject() || "通用";
  const parts = [subject];
  if (state.aiChapter) parts.push(state.aiChapter);
  if (state.aiKnowledgePoint) parts.push(state.aiKnowledgePoint);
  parts.push(aiDepthLabel(state.aiAnswerDepth));
  return parts.filter(Boolean).join(" · ");
}

function renderAiContextSummary(active) {
  const latest = latestAssistantMessage(active);
  const citationCount = (latest?.citations || latest?.learningPanel?.citations || []).length;
  const focus = latest?.learningPanel?.graphFocus;
  return `
    <section class="ai-context-summary">
      <div>
        <span>当前上下文</span>
        <strong>${escapeHtml(aiContextSummary())}</strong>
      </div>
      <div class="ai-context-badges">
        <span>${citationCount ? `引用 ${citationCount} 条` : "引用待生成"}</span>
        <span>${focus?.label ? `图谱：${escapeHtml(compactText(focus.label, 18))}` : "图谱待定位"}</span>
      </div>
      <button type="button" class="mini" id="toggleAiContext">${state.aiContextEditorOpen ? "收起设置" : "修改上下文"}</button>
    </section>
  `;
}

function renderAiContextEditor() {
  if (!state.aiContextEditorOpen) return "";
  return `
    <section class="ai-control-bar compact-ai-controls">
      <label>课程
        <select id="aiSubjectSelect">${materialSubjectOptions(state.aiSubject || preferredSubject())}</select>
      </label>
      <label>章节
        <input id="aiChapterInput" value="${escapeHtml(state.aiChapter)}" placeholder="可选：第 3 章 存储系统" autocomplete="off" />
      </label>
      <label>知识点
        <input id="aiKnowledgeInput" value="${escapeHtml(state.aiKnowledgePoint)}" placeholder="可选：Cache 直接映射" autocomplete="off" />
      </label>
      <label>回答深度
        ${renderAiDepthSelect()}
      </label>
    </section>
  `;
}

function teacherTaskLabel(taskType) {
  const option = aiTaskOptions(true).find((item) => item.key === taskType);
  return option?.label || "教师任务";
}

function teacherAiClasses() {
  return (state.data?.classes || []).filter((klass) => isTeacherLike() && (state.user?.role === "admin" || klass.teacherId === state.user?.id));
}

function teacherAiMaterials() {
  const subject = state.aiSubject || preferredSubject();
  return (state.data?.courseMaterials || [])
    .filter((material) => !subject || subject === "通用" || !material.subject || material.subject === subject);
}

function teacherAiGraphs() {
  const subject = state.aiSubject || preferredSubject();
  return (state.data?.knowledgeGraphs || [])
    .filter((graph) => !isLearningPathResource(graph))
    .filter((graph) => !subject || subject === "通用" || !graph.subject || graph.subject === subject);
}

function teacherAiHomework() {
  const classId = state.aiClassId || "";
  return (state.data?.homework || [])
    .filter((item) => !classId || item.classId === classId)
    .filter((item) => state.user?.role === "admin" || item.teacherId === state.user?.id);
}

function teacherAiSubmissions() {
  const homeworkId = state.aiHomeworkId || "";
  return (state.data?.submissions || []).filter((item) => !homeworkId || item.homeworkId === homeworkId);
}

function optionRows(items, selected, emptyLabel, labelFor) {
  return `<option value="">${escapeHtml(emptyLabel)}</option>${items.map((item) => `<option value="${escapeHtml(item.id)}" ${selected === item.id ? "selected" : ""}>${escapeHtml(labelFor(item))}</option>`).join("")}`;
}

function renderTeacherAiWorkflowControls() {
  const classes = teacherAiClasses();
  const materials = teacherAiMaterials();
  const graphs = teacherAiGraphs();
  const selectedGraphId = state.aiGraphId || state.selectedGraphId || "";
  const selectedGraph = graphs.find((graph) => graph.id === selectedGraphId);
  const graphNodes = selectedGraph?.nodes || [];
  const homework = teacherAiHomework();
  const submissions = teacherAiSubmissions();
  const users = state.data?.users || [];
  const userName = (id) => users.find((user) => user.id === id)?.name || id || "学生";
  return `
    <section class="teacher-ai-task-panel">
      ${renderAiTaskButtons(true)}
      <div class="teacher-ai-context-grid">
        <label>班级
          <select id="aiClassSelect">${optionRows(classes, state.aiClassId, "全部班级", (klass) => `${klass.name}${klass.subject ? ` · ${klass.subject}` : ""}`)}</select>
        </label>
        <label>资料
          <select id="aiMaterialSelect">${optionRows(materials, state.aiMaterialId, "自动检索资料", (material) => `${material.title} · ${material.subject || "通用"}`)}</select>
        </label>
        <label>图谱
          <select id="aiGraphSelect">${optionRows(graphs, state.aiGraphId || state.selectedGraphId || "", "自动定位图谱", (graph) => `${graph.title} · ${graph.subject || "通用"}`)}</select>
        </label>
        <label>图谱节点
          <select id="aiGraphNodeSelect">${optionRows(graphNodes, state.aiGraphNodeId || state.graphSelectedNodeId || state.graphFocusNodeId || "", "自动定位节点", (node) => node.label || node.id)}</select>
        </label>
        <label>作业
          <select id="aiHomeworkSelect">${optionRows(homework, state.aiHomeworkId, "不绑定作业", (item) => item.title)}</select>
        </label>
        <label>学生提交
          <select id="aiSubmissionSelect">${optionRows(submissions, state.aiSubmissionId, "不绑定提交", (item) => `${userName(item.studentId)} · ${fmtTime(item.createdAt)}`)}</select>
        </label>
      </div>
    </section>
  `;
}

function renderAiMessageMeta(message) {
  if (message.role !== "assistant") return "";
  const points = Array.isArray(message.knowledgePoints) ? message.knowledgePoints : [];
  return `
    <div class="ai-message-meta">
      <span>${escapeHtml(aiModeLabel(message.mode || message.intent))}</span>
      ${message.strategy ? `<span>${escapeHtml(message.strategy)}</span>` : ""}
      ${points.slice(0, 3).map((point) => `<span>${escapeHtml(point)}</span>`).join("")}
    </div>
  `;
}

function renderAiMessageActions(message) {
  if (message.role !== "assistant") return "";
  return `
    <div class="ai-message-actions">
      <button class="mini" type="button" data-ai-card-message="${escapeHtml(message.id)}">转学习卡片</button>
      <button class="mini" type="button" data-dashboard-page="portfolio">写反思</button>
    </div>
  `;
}

function renderPanelChipList(items = [], emptyText = "暂无数据") {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) return `<p class="hint">${escapeHtml(emptyText)}</p>`;
  return `
    <div class="panel-chip-list">
      ${list.slice(0, 10).map((item) => {
        const label = typeof item === "string" ? item : item.label || item.topic || item.title || "";
        const meta = typeof item === "string" ? "" : item.relation || item.status || "";
        return `<span><strong>${escapeHtml(label)}</strong>${meta ? `<small>${escapeHtml(meta)}</small>` : ""}</span>`;
      }).join("")}
    </div>
  `;
}

function renderLearningPanelList(items = [], emptyText = "暂无建议") {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) return `<p class="hint">${escapeHtml(emptyText)}</p>`;
  return `
    <ol class="learning-panel-list">
      ${list.slice(0, 6).map((item) => `<li>${escapeHtml(typeof item === "string" ? item : item.label || item.title || "")}</li>`).join("")}
    </ol>
  `;
}

function renderMasteryPanel(items = []) {
  const list = Array.isArray(items) ? items.filter(Boolean).slice(0, 6) : [];
  if (!list.length) return `<p class="hint">完成更多问答、练习或批改后会形成掌握度。</p>`;
  return `
    <div class="mastery-panel-list">
      ${list.map((item) => {
        const score = item.score === null || item.score === undefined ? 0.5 : Number(item.score);
        return `
          <article>
            <div><strong>${escapeHtml(item.topic)}</strong><span>${escapeHtml(item.status || "待诊断")} · ${item.score === null || item.score === undefined ? "未估计" : percentText(score)}</span></div>
            <div class="mastery-meter small"><span style="width:${clamp(score, 0.08, 1) * 100}%"></span></div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderCompactCitationList(citations = []) {
  if (!citations.length) return "";
  const shown = citations.slice(0, 2);
  return `
    <div class="compact-citations">
      <strong>引用来源</strong>
      ${shown.map((citation) => `
        <span>[${escapeHtml(citation.id)}] ${escapeHtml(compactText(citation.sourceName || citation.title || "课程资料", 26))}${citation.page ? ` · 第 ${citation.page} 页` : ""}</span>
      `).join("")}
      ${citations.length > shown.length ? `<small>还有 ${citations.length - shown.length} 条引用，可在右侧栏查看。</small>` : ""}
    </div>
  `;
}

function compactAnswerContent(content) {
  const text = String(content || "");
  const marker = "【引用来源】";
  const index = text.lastIndexOf(marker);
  if (index < 0) return text;
  const before = text.slice(0, index).trimEnd();
  const lines = text.slice(index + marker.length).split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return text;
  const shown = lines.slice(0, 2).map((line) => compactText(line, 76));
  if (lines.length > shown.length) shown.push(`还有 ${lines.length - shown.length} 条引用，可在右侧栏查看。`);
  return `${before}\n\n${marker}\n${shown.join("\n")}`;
}

function aiMessageDisplayContent(message) {
  if (message.role !== "assistant") return String(message.content || "");
  return String(message.workflowResult?.final_answer || message.content || "");
}

function aiAnswerSummary(message, content) {
  const workflowResult = message.workflowResult || {};
  const topic = workflowResult.topic_localization?.selectedTopic || workflowResult.topic_label || (message.knowledgePoints || [])[0] || "";
  const feedback = workflowResult.diagnosis_feedback || workflowResult.mastery_level || "";
  const next = Array.isArray(workflowResult.next_questions) ? workflowResult.next_questions[0] : "";
  const plain = String(content || "").replace(/#+\s*/g, "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
  return {
    title: topic ? `本轮重点：${topic}` : "本轮摘要",
    summary: feedback ? compactText(feedback, 130) : compactText(plain[0] || "", 130),
    action: next ? `下一步：${compactText(next, 90)}` : "下一步：完成一次测试或写一条反思，把证据归入学习档案。"
  };
}

function renderAiMessage(message) {
  const citations = Array.isArray(message.citations) ? message.citations : [];
  const basis = message.answerBasis === "model_general" ? "通用模型解释" : message.answerBasis === "course_material" ? "课程资料依据" : "回答依据待确认";
  const confidence = message.confidence ? `<small class="answer-source">${escapeHtml(basis)} · 可靠性：${escapeHtml(message.confidence)}${citations.length ? ` · 引用 ${citations.length} 条` : ""}${message.confidenceReason ? ` · ${escapeHtml(message.confidenceReason)}` : ""}</small>` : "";
  const content = aiMessageDisplayContent(message);
  const summary = message.role === "assistant" ? aiAnswerSummary(message, content) : null;
  const body = message.role === "assistant"
    ? `
      <div class="ai-answer-summary-card">
        <strong>${escapeHtml(summary.title)}</strong>
        <p>${escapeHtml(summary.summary || "工作流已返回回答。")}</p>
        <span>${escapeHtml(summary.action)}</span>
      </div>
      <details class="ai-answer-detail" ${String(content || "").length < 520 ? "open" : ""}>
        <summary>查看详细解释</summary>
        <pre class="ai-answer-text">${escapeHtml(content)}</pre>
      </details>
    `
    : `<p>${escapeMultiline(content)}</p>`;
  return `
    <div class="bubble ${message.role}">
      <span>${message.role === "assistant" ? "AI" : "我"}</span>
      ${renderAiMessageMeta(message)}
      ${body}
      ${confidence}
      ${message.role === "assistant" && citations.length ? renderCompactCitationList(citations) : ""}
      ${renderAiMessageActions(message)}
    </div>
  `;
}

function renderPendingAiExchange(pending) {
  if (!pending?.prompt) return "";
  return `
    <div class="bubble user ai-pending-user">
      <span>我</span>
      <p>${escapeMultiline(pending.prompt)}</p>
    </div>
    <div class="bubble assistant ai-thinking-message" aria-live="polite">
      <div class="ai-thinking-head">
        <span class="ai-thinking-mark" aria-hidden="true"></span>
        <div><strong>学习助手正在整理回答</strong><small>会结合课程资料和你的学习记录</small></div>
      </div>
      <div class="ai-thinking-steps" aria-label="回答生成进度">
        <span class="done">理解问题</span>
        <span class="active">匹配资料</span>
        <span>组织讲解</span>
      </div>
    </div>
  `;
}

function renderLearningProfilePanel() {
  const analytics = state.data.learningAnalytics || {};
  const profile = analytics.profile || state.data.learningProfile || {};
  const summary = analytics.summary || {};
  const weak = summary.weak || [];
  const strong = summary.strong || [];
  const wrongNotes = state.data.wrongNotes || [];
  const hasMastery = summary.average !== null && summary.average !== undefined && Number(summary.count || 0) > 0;
  const avg = hasMastery ? Number(summary.average) : 0;
  return `
    <section class="ai-side-card profile-card">
      <h3>学习画像</h3>
      <div class="ai-side-card-body">
        <div class="profile-meter"><span style="width:${hasMastery ? clamp(avg * 100, 0, 100) : 0}%"></span></div>
        <p>${escapeHtml(profile.level || "待诊断")} · 提问 ${profile.questionCount || 0} 次 · 练习 ${profile.practiceCount || 0} 次 · 学习 ${profile.studyMinutes || 0} 分钟${hasMastery ? ` · 平均掌握度 ${percentText(avg)}` : ""}</p>
        ${weak.length ? `
          <div class="node-chip-row">
            ${weak.slice(0, 4).map((item) => `<span class="node-chip">${escapeHtml(item.topic)} ${item.score !== undefined ? percentText(item.score) : ""}</span>`).join("")}
          </div>
        ` : `<p class="hint">暂无真实薄弱点记录。完成问答、练习或作业批改后会显示学习画像。</p>`}
        ${strong.length ? `<p class="hint">优势：${escapeHtml(strong.map((item) => item.topic).join("、"))}</p>` : ""}
      </div>
    </section>
    <section class="ai-side-card wrong-note-card">
      <h3>错题本</h3>
      <div class="ai-side-card-body">
        ${wrongNotes.slice(0, 8).map((note) => `
          <article class="mini-note">
            <strong>${escapeHtml(note.topic)}</strong>
            <p>${escapeHtml(note.analysis || note.recommendation || note.question || "用户手动加入，暂无补充说明。")}</p>
          </article>
        `).join("") || `<p class="hint">暂无错题记录。用户手动加入或完成作业批改后会在这里显示。</p>`}
      </div>
    </section>
  `;
}

function renderMaterialsPage() {
  const selectedClassId = String(state.selectedClassId || "");
  const materials = (state.data.courseMaterials || []).filter((item) => (
    !isTeacherLike()
    || (selectedClassId
      ? ((item.syncedClassIds || []).length
        ? item.syncedClassIds.includes(selectedClassId)
        : String(item.classId || "") === selectedClassId)
      : true)
  ));
  const search = String(state.materialSearch || "").trim();
  const subjectFilter = state.materialSubjectFilter || "";
  const filtered = materials.filter((item) => {
    const text = `${item.title} ${item.subject} ${item.sourceName} ${item.preview || ""}`;
    return (!subjectFilter || item.subject === subjectFilter) && (!search || text.includes(search));
  });
  const selected = filtered.find((item) => item.id === state.materialDetailId)
    || filtered[0]
    || materials[0];
  if (selected && state.materialDetailId !== selected.id) state.materialDetailId = selected.id;
  return `
    <div class="materials-page-shell">
    ${state.materialUploadOpen ? `
      <div class="modal-backdrop">
      <section class="modal material-upload-drawer">
        <button class="modal-close" id="closeMaterialUpload">×</button>
        <h2>资料入库</h2>
        <p class="hint">支持文件上传或粘贴内容，入库后用于 RAG 检索、AI 助教和引用追溯。</p>
        <form id="materialUploadForm" class="stack">
          <div class="form-grid">
            <label>学科<input name="subject" value="${escapeHtml(preferredSubject())}" placeholder="例如：机器学习、操作系统、计算机组成原理" required autocomplete="off" /></label>
            <label>资料标题<input name="title" placeholder="例如：第 3 章 监督学习讲义" autocomplete="off" /></label>
          </div>
          <label>上传资料<input name="file" type="file" accept="${COURSE_MATERIAL_ACCEPT}" /></label>
          <label>或粘贴资料内容<textarea name="sourceText" rows="8" placeholder="可粘贴教材章节、讲义、习题解析、实验文档内容"></textarea></label>
          ${isTeacherLike() ? `<label class="check-line"><input name="global" type="checkbox" /> 学生可检索这份资料</label>` : ""}
          <p class="hint">支持 PDF、扫描版图片 PDF、Word、PPTX、Excel、Markdown、TXT、CSV、JSON 等格式；大文件会分块上传，扫描版 PDF 会尝试 OCR。</p>
          <button class="primary" type="submit">入库并建立 RAG 索引</button>
          <p id="materialUploadStatus" class="hint"></p>
        </form>
      </section>
      </div>` : ""}
    <div class="materials-master-layout">
      <section class="panel material-list-panel">
        <div class="split-head material-list-head">
          <div>
            <h3>资料列表</h3>
            <p class="hint">${materials.length} 份资料 · ${materials.reduce((sum, item) => sum + Number(item.chunkCount || 0), 0)} 个片段 · ${materials.reduce((sum, item) => sum + Number(item.characters || 0), 0)} 字</p>
          </div>
          <button class="primary" type="button" id="toggleMaterialUpload">上传资料</button>
        </div>
        <form id="materialFilterForm" class="material-filter-bar">
          <input id="materialSearchInput" name="query" value="${escapeHtml(search)}" placeholder="搜索资料、来源或片段摘要" />
          <select id="materialSubjectFilter">${subjectSelectOptions(subjectFilter, materialSubjects(), true, "全部学科")}</select>
        </form>
        <div class="material-list">
          ${filtered.map((item) => renderMaterialListItem(item, selected?.id)).join("") || emptyBlock("没有匹配资料。可清空搜索或上传新资料。")}
        </div>
      </section>
      <section class="panel material-detail-panel">
        ${selected ? renderMaterialDetailPane(selected) : emptyBlock("选择左侧资料后显示详情和索引状态。")}
      </section>
    </div>
    ${state.materialSyncId ? renderMaterialSyncModal() : ""}
    </div>
  `;
}

function renderMaterialListItem(item, selectedId) {
  const visibility = Array.isArray(item.syncedClassIds)
    ? `已同步 ${item.syncedClassIds.length} 个班级`
    : item.global ? "学生可检索" : "仅教师/本人可见";
  const status = item.chunkCount ? "已索引" : "待索引";
  const updatedText = item.updatedAt && item.updatedAt !== item.createdAt ? `更新：${fmtTime(item.updatedAt)}` : `入库：${fmtTime(item.createdAt)}`;
  const preview = String(item.preview || "").trim();
  return `
    <article class="${selectedId === item.id ? "active" : ""}" data-view-material="${item.id}">
      <div class="material-list-main">
        <strong>${escapeHtml(item.title)}</strong>
        <span class="material-list-meta">${escapeHtml(item.subject)} · ${item.chunkCount || 0} 个片段 · ${item.characters || 0} 字</span>
        <small>${escapeHtml(visibility)} · ${escapeHtml(item.sourceName || "课程资料")} · ${escapeHtml(updatedText)}</small>
        ${preview ? `<p class="material-list-preview">${escapeHtml(preview)}</p>` : ""}
        <div class="material-list-detail-row">
          <em>${escapeHtml(item.type || "text/plain")}</em>
          <em>${escapeHtml(item.classId ? `班级资料：${item.classId}` : "未绑定班级")}</em>
          <em>${escapeHtml(item.extraction?.method || item.extraction?.agent || "文本索引")}</em>
        </div>
      </div>
      <strong class="material-status ${item.chunkCount ? "ready" : "pending"}">${status}</strong>
    </article>
  `;
}

function renderMaterialActionGroup(material) {
  if (!isTeacherLike() || material.ownerId !== state.user.id) return "";
  return `
    <div class="material-action-group material-manage-group">
      <button class="mini" type="button" data-sync-material="${material.id}" ${material.chunkCount ? "" : "disabled"}>同步</button>
      <button class="mini danger" data-delete-material="${material.id}">删除资料</button>
    </div>
  `;
}

function renderMaterialSyncModal() {
  const material = (state.data.courseMaterials || []).find((item) => item.id === state.materialSyncId);
  if (!material) return "";
  const classes = state.data.classes || [];
  const syncedClassIds = new Set(material.syncedClassIds || []);
  return `
    <div class="modal-backdrop">
      <section class="modal compact-modal">
        <button class="modal-close" type="button" id="closeMaterialSyncModal">×</button>
        <h2>同步课程资料</h2>
        <p class="hint">选择后，所选班级的学生才能查看「${escapeHtml(material.title)}」。</p>
        <form id="materialSyncForm" class="stack" data-material-id="${escapeHtml(material.id)}">
          <div class="graph-sync-class-list">
            ${classes.map((klass) => `
              <label>
                <input type="checkbox" name="classId" value="${escapeHtml(klass.id)}" ${syncedClassIds.has(klass.id) ? "checked" : ""} />
                <span><strong>${escapeHtml(klass.name)}</strong><small>${escapeHtml(klass.subject || "未设置学科")} · ${(klass.studentIds || []).length} 名学生</small></span>
              </label>
            `).join("") || `<p class="graph-sync-hint">暂无可同步的班级，请先创建班级。</p>`}
          </div>
          <div class="actions">
            <button class="mini" type="button" id="cancelMaterialSync">取消</button>
            <button class="primary" type="submit" ${classes.length ? "" : "disabled"}>确认同步</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderMaterialDetailPane(material) {
  const result = state.materialRagResult?.materialId === material.id ? state.materialRagResult : null;
  return `
    <div class="split-head">
      <div>
        <h3>${escapeHtml(material.title)}</h3>
        <p class="hint">${escapeHtml(material.subject)} · ${escapeHtml(material.sourceName || "课程资料")} · ${fmtTime(material.createdAt)}</p>
      </div>
      <div class="material-detail-status-actions">
        <strong class="material-status ${material.chunkCount ? "ready" : "pending"}">${material.chunkCount ? "RAG 已索引" : "待索引"}</strong>
        ${renderMaterialActionGroup(material)}
      </div>
    </div>
    <div class="material-detail-grid">
      <div class="detail-card"><strong>片段数</strong><p>${material.chunkCount || 0} 个检索片段</p></div>
      <div class="detail-card"><strong>字数</strong><p>${material.characters || 0} 字</p></div>
      <div class="detail-card"><strong>可见性</strong><p>${Array.isArray(material.syncedClassIds) ? `已同步到 ${material.syncedClassIds.length} 个班级` : material.global ? "学生可检索" : "仅当前账号或教师可检索"}</p></div>
      <div class="detail-card"><strong>索引状态</strong><p>${material.chunkCount ? "可用于 AI 助教和引用追溯。" : "暂无可用片段，请重新入库。"}</p></div>
    </div>
    <section class="detail-card material-rag-test">
      <div class="split-head">
        <strong>RAG 检索测试</strong>
        <span>引用预览 / 命中片段</span>
      </div>
      <form id="materialRagForm" class="composer material-rag-form" data-material-id="${material.id}">
        <input name="query" value="${escapeHtml(state.materialRagQuestion || "")}" placeholder="输入一个学生或教师可能会问的问题" />
        <button class="primary" type="submit">检索</button>
      </form>
      ${result ? renderMaterialRagResult(result) : `<p class="hint">输入问题后会显示命中的资料片段、来源页/段落、分数和学生可见性。</p>`}
    </section>
    ${material.preview ? `<div class="detail-card"><strong>内容摘录</strong><p>${escapeHtml(material.preview)}</p></div>` : ""}
  `;
}

function renderMaterialRagResult(result) {
  const hits = result.hits || [];
  return `
    <div class="rag-hit-list">
      ${hits.map((hit, index) => `
        <article>
          <strong>#${index + 1} ${escapeHtml(hit.title || hit.sourceName || "课程资料")} · ${Number(hit.score || 0).toFixed(2)}</strong>
          <span>${escapeHtml(hit.chapter || "资料片段")} ${hit.page ? `· 第 ${escapeHtml(hit.page)} 页` : ""} · ${hit.studentVisible ? "学生可见" : "学生不可见"}</span>
          <p>${escapeHtml(hit.quote || hit.text || "")}</p>
        </article>
      `).join("") || emptyBlock("没有命中片段。可换一个问题，或确认资料是否已建立索引。")}
      ${hits.length ? `<button class="mini primary" type="button" data-save-rag-qa="${escapeHtml(result.materialId)}">保存为课堂资料</button>` : ""}
    </div>
  `;
}

function renderMaterialDetailModal() {
  const material = (state.data.courseMaterials || []).find((item) => item.id === state.materialDetailId);
  if (!material) return "";
  return `
    <div class="modal-backdrop">
      <section class="modal compact-modal">
        <button class="modal-close" id="closeMaterialModal">×</button>
        <h2>${escapeHtml(material.title)}</h2>
        <p class="hint">${escapeHtml(material.subject)} · ${material.chunkCount} 个片段 · ${material.characters} 字</p>
        <div class="detail-card">
          <strong>来源</strong>
          <p>${escapeHtml(material.sourceName || "粘贴资料")} · ${fmtTime(material.createdAt)}</p>
        </div>
        <div class="detail-card">
          <strong>检索状态</strong>
          <p>${material.global ? "学生可检索" : "仅当前账号可检索"}，可用于 RAG 问答引用追溯。</p>
        </div>
        ${material.textSample ? `<div class="detail-card"><strong>内容摘录</strong><p>${escapeHtml(material.textSample)}</p></div>` : ""}
      </section>
    </div>
  `;
}

function bindMaterialsPage() {
  document.getElementById("toggleMaterialUpload")?.addEventListener("click", () => {
    state.materialUploadOpen = !state.materialUploadOpen;
    renderContent();
  });
  document.getElementById("closeMaterialUpload")?.addEventListener("click", () => {
    state.materialUploadOpen = false;
    renderContent();
  });
  document.querySelectorAll("[data-sync-material]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      state.materialSyncId = button.dataset.syncMaterial;
      renderContent();
    });
  });
  document.getElementById("closeMaterialSyncModal")?.addEventListener("click", () => {
    state.materialSyncId = null;
    renderContent();
  });
  document.getElementById("cancelMaterialSync")?.addEventListener("click", () => {
    state.materialSyncId = null;
    renderContent();
  });
  document.getElementById("materialSyncForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const classIds = form.getAll("classId");
    if (!classIds.length) return showToast("请至少选择一个班级", "error");
    try {
      await api(`/api/materials/${encodeURIComponent(event.currentTarget.dataset.materialId)}/sync-classes`, {
        method: "POST",
        body: { classIds }
      });
      state.materialSyncId = null;
      await loadState();
      renderShell();
      showToast("课程资料已同步到所选班级");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.getElementById("materialFilterForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    state.materialSearch = String(new FormData(event.currentTarget).get("query") || "").trim();
    renderContent();
  });
  document.getElementById("materialSearchInput")?.addEventListener("input", (event) => {
    state.materialSearch = event.target.value;
  });
  document.getElementById("materialSubjectFilter")?.addEventListener("change", (event) => {
    state.materialSubjectFilter = event.target.value;
    renderContent();
  });
  document.getElementById("materialUploadForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get("file");
    const status = document.getElementById("materialUploadStatus");
    const subject = String(form.get("subject") || "").trim();
    const sourceText = String(form.get("sourceText") || "");
    if (!subject) return showToast("请先输入学科名称", "error");
    if (!(file && file.name) && !sourceText.trim()) return showToast("请上传资料或粘贴资料内容", "error");
    try {
      let payload;
      if (file && file.name) {
        if (status) status.textContent = `正在上传 ${file.name}（${formatBytes(file.size)}）...`;
        const upload = await uploadFileInChunks(file, ({ index, totalChunks, uploadedBytes }) => {
          if (status) status.textContent = `已上传 ${index}/${totalChunks} 个分块，${formatBytes(uploadedBytes)} / ${formatBytes(file.size)}，请等待解析。`;
        });
        if (status) status.textContent = "文件上传完成，正在解析文本层/OCR/Office 文档并建立索引...";
        payload = await api("/api/materials/from-upload", {
          method: "POST",
          body: {
            userId: state.user.id,
            uploadId: upload.id,
            subject,
            title: form.get("title"),
            sourceText,
            global: form.get("global") === "on",
            classId: state.selectedClassId || ""
          }
        });
      } else {
        if (status) status.textContent = "正在根据粘贴内容建立索引...";
        payload = await api("/api/materials", {
          method: "POST",
          body: {
            userId: state.user.id,
            subject,
            title: form.get("title"),
            sourceText,
            global: form.get("global") === "on",
            classId: state.selectedClassId || ""
          }
        });
      }
      await loadState();
      state.materialDetailId = payload.material.id;
      state.materialUploadOpen = false;
      renderShell();
      showToast(`课程资料已入库：${payload.material.chunkCount} 个检索片段`);
    } catch (error) {
      if (status) status.textContent = "";
      showToast(error.message, "error");
    }
  });
  document.querySelectorAll("[data-delete-material]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (!confirm("确认删除这份课程资料？")) return;
      try {
        await api(`/api/materials/${button.dataset.deleteMaterial}?userId=${state.user.id}`, { method: "DELETE" });
        if (state.materialDetailId === button.dataset.deleteMaterial) state.materialDetailId = null;
        await loadState();
        renderShell();
        showToast("课程资料已删除");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
  document.querySelectorAll("[data-view-material]").forEach((card) => {
    card.addEventListener("click", () => {
      state.materialDetailId = card.dataset.viewMaterial;
      state.materialRagResult = null;
      renderContent();
    });
  });
  document.getElementById("materialRagForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const materialId = event.currentTarget.dataset.materialId;
    const material = (state.data.courseMaterials || []).find((item) => item.id === materialId);
    const query = String(form.get("query") || "").trim();
    if (!query) return showToast("请先输入检索问题", "error");
    state.materialRagQuestion = query;
    try {
      const payload = await api("/api/materials/retrieval-test", {
        method: "POST",
        body: {
          userId: state.user.id,
          materialId,
          subject: material?.subject || state.aiSubject || preferredSubject(),
          query
        }
      });
      state.materialRagResult = { ...payload, materialId, query };
      renderContent();
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.querySelector("[data-save-rag-qa]")?.addEventListener("click", async (event) => {
    const materialId = event.currentTarget.dataset.saveRagQa;
    const material = (state.data.courseMaterials || []).find((item) => item.id === materialId);
    const result = state.materialRagResult?.materialId === materialId ? state.materialRagResult : null;
    if (!material || !result) return;
    const sourceText = [
      `问题：${result.query || state.materialRagQuestion}`,
      "命中引用：",
      ...(result.hits || []).slice(0, 4).map((hit, index) => `${index + 1}. ${hit.chapter || hit.title || "资料片段"}：${hit.quote || hit.text || ""}`)
    ].join("\n");
    try {
      const payload = await api("/api/materials", {
        method: "POST",
        body: {
          userId: state.user.id,
          subject: material.subject,
          title: `${material.title} · 检索问答`,
          sourceText,
          global: false,
          classId: material.classId || state.selectedClassId || ""
        }
      });
      await loadState();
      state.materialDetailId = payload.material.id;
      renderShell();
      showToast("已保存为课堂资料");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

function renderMaterialsPanel() {
  const materials = state.data.courseMaterials || [];
  return `
    <section class="panel material-panel">
      <div class="split-head">
        <h3>资料引用</h3>
        <span>${materials.length} 份</span>
      </div>
      <div class="material-list">
        ${materials.slice(0, 5).map((item) => `
          <article>
            <div>
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.subject)} · ${item.chunkCount} 个片段 · ${item.characters} 字</span>
            </div>
          </article>
        `).join("") || emptyBlock("还没有课程资料。请到左侧「课程资料」页面上传。")}
      </div>
    </section>
  `;
}

function renderAgentTracePanel(active) {
  const teacher = isTeacherLike();
  const assistant = latestAssistantMessage(active);
  const panel = assistant?.learningPanel || {};
  const citations = panel.citations || assistant?.citations || [...(active?.messages || [])].reverse().find((message) => message.citations?.length)?.citations || [];
  const run = (state.data.agentRuns || [])[0];
  const workflow = assistant?.workflow || run?.workflow || ML_DIAGNOSIS_WORKFLOW_INFO;
  const workflowSteps = Array.isArray(workflow.steps) && workflow.steps.length ? workflow.steps : ML_DIAGNOSIS_WORKFLOW_INFO.steps;
  const workflowResult = assistant?.workflowResult || {};
  const workflowQuestions = Array.isArray(workflowResult.next_questions) ? workflowResult.next_questions : [];
  const workflowSource = assistant ? "管理员模型服务" : "等待模型返回";
  const focus = panel.graphFocus;
  const graphs = graphListForCurrentRole();
  const insightTabs = [
    { key: "workflow", label: "工作流", count: 0 },
    { key: "citations", label: "引用", count: citations.length },
    { key: "graph", label: "图谱", count: (panel.relatedKnowledgePoints || []).length },
    { key: "practice", label: "练习", count: (panel.recommendedExercises || []).length },
    { key: "mastery", label: "掌握", count: (panel.mastery || []).length }
  ].filter(Boolean);
  const defaultTab = "workflow";
  const activeTab = insightTabs.some((item) => item.key === state.aiInsightTab) ? state.aiInsightTab : defaultTab;
  const trace = `
    <section class="ai-side-card trace-card">
      <h3>AI 助教执行过程</h3>
      <div class="ai-side-card-body">
        <p><strong>${escapeHtml(workflow.name || ML_DIAGNOSIS_WORKFLOW_INFO.name)}</strong>${workflow.version ? ` · ${escapeHtml(workflow.version)}` : ""}</p>
        ${(workflowSteps).map((step, index) => `<p><strong>${index + 1}.</strong> ${escapeHtml(step)}</p>`).join("")}
      </div>
    </section>
  `;
  const workflowResultCard = `
    <section class="ai-side-card workflow-result-card">
      <h3>工作流结果</h3>
      <div class="ai-side-card-body">
        <p><strong>${escapeHtml(workflowResult.topic_label || "未定位")}</strong>${workflowResult.mastery_level ? ` · ${escapeHtml(workflowResult.mastery_level)} ${Number.isFinite(Number(workflowResult.mastery_score)) ? Number(workflowResult.mastery_score) : 0}分` : ""}</p>
        <p class="hint">${escapeHtml(workflowSource)}${workflowResult.workflow_run_id ? ` · ${escapeHtml(workflowResult.workflow_run_id)}` : ""}</p>
        ${workflowQuestions.length ? `<ol>${workflowQuestions.slice(0, 3).map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ol>` : `<p class="hint">提交问题后会显示知识点、掌握度和追问题。</p>`}
      </div>
    </section>
  `;
  const graphContent = focus ? `
    <section class="ai-side-card">
      <h3>图谱焦点</h3>
      <div class="ai-side-card-body context-card-body">
        <article class="graph-focus-mini">
          <strong>${escapeHtml(focus.label)}</strong>
          <span>${escapeHtml(focus.graphTitle || "知识图谱")}</span>
          ${focus.path?.length ? `<p>${escapeHtml(focus.path.join(" → "))}</p>` : ""}
          <button type="button" class="mini" data-ai-open-graph="${escapeHtml(focus.graphId || "")}" data-ai-open-node="${escapeHtml(focus.nodeId || "")}">打开图谱焦点</button>
        </article>
      </div>
    </section>
  ` : `
    <section class="ai-side-card">
      <h3>可用图谱</h3>
      <div class="ai-side-card-body context-card-body">
        ${graphs.slice(0, 4).map((graph) => `
          <article class="context-mini-item">
            <strong>${escapeHtml(graph.title)}</strong>
            <span>${escapeHtml(graph.subject)} · ${(graph.nodes || []).length} 节点</span>
          </article>
        `).join("") || `<p class="hint">提问命中知识点后，这里会显示图谱焦点。</p>`}
      </div>
    </section>
  `;
  const tabContent = {
    workflow: `${workflowResultCard}${trace}`,
    citations: `
      <section class="ai-side-card citation-card">
        <h3>引用来源</h3>
        <div class="ai-side-card-body">${renderCitationList(citations)}</div>
      </section>
      ${trace}
    `,
    graph: `
      ${graphContent}
      <section class="ai-side-card">
        <h3>相关知识点</h3>
        <div class="ai-side-card-body">${renderPanelChipList(panel.relatedKnowledgePoints, "本轮尚未定位知识点。")}</div>
      </section>
      <section class="ai-side-card">
        <h3>前置知识 / 易混淆</h3>
        <div class="ai-side-card-body">${renderPanelChipList([...(panel.prerequisites || []), ...(panel.misconceptions || [])], "暂无明确前置或易混淆节点。")}</div>
      </section>
    `,
    practice: `
      <section class="ai-side-card">
        <h3>推荐练习</h3>
        <div class="ai-side-card-body">${renderLearningPanelList(panel.recommendedExercises, "完成本轮问答后会生成练习建议。")}</div>
      </section>
      <section class="ai-side-card">
        <h3>学习建议</h3>
        <div class="ai-side-card-body">${renderLearningPanelList(panel.suggestions || state.data.learningAnalytics?.recommendations, "暂无学习建议。")}</div>
      </section>
    `,
    mastery: `
      <section class="ai-side-card">
        <h3>掌握度</h3>
        <div class="ai-side-card-body">${renderMasteryPanel(panel.mastery)}</div>
      </section>
      ${renderLearningProfilePanel()}
    `
  };
  return `
    <aside class="ai-side ai-insight-panel">
      <div class="ai-rail-head">
        <div>
          <h3>洞察</h3>
          <span>${citations.length ? `模型回答 + 引用 ${citations.length} 条` : "模型回答"}</span>
        </div>
      </div>
      <div class="ai-insight-tabs" role="tablist" aria-label="AI 洞察">
        ${insightTabs.map((item) => `
          <button type="button" class="${activeTab === item.key ? "active" : ""}" data-ai-insight-tab="${item.key}">
            ${escapeHtml(item.label)}${item.count ? `<small>${item.count}</small>` : ""}
          </button>
        `).join("")}
      </div>
      <div class="ai-insight-body ${activeTab === "workflow" ? "workflow-body" : ""}">
        ${tabContent[activeTab] || tabContent[defaultTab]}
      </div>
    </aside>
  `;
}

function aiPromptPlaceholder(isTeacher) {
  return isTeacher
    ? "直接输入教学需求，例如：给高一3班讲KNN，先看这个知识点的学情，再生成课堂练习"
    : "先写你的原始理解，再让 AI 诊断、给引用并接受你的审辩，例如：我认为 KNN 是...";
}

function inferAiModeFromPrompt(prompt, isTeacher) {
  const text = String(prompt || "");
  if (/批改|评分|看看.*答案|哪里错|错因|修改建议|改作业|检查代码|实验报告反馈/.test(text)) return "grade";
  if (/苏格拉底|追问|引导|提示模式|只给.*提示|分步提示|不要直接给答案|先问我|一步步/.test(text)) return "guided";
  if (/出题|生成.*题|练习|测验|选择题|填空题|简答题|计算题|编程题|错题|类似题|同类题/.test(text)) return "practice";
  if (/复习|学习路径|复习路径|学习计划|规划|薄弱点|掌握度|推荐顺序|每日|每周/.test(text)) return "plan";
  if (isTeacher && /教学设计|教案|课堂设计|授课方案|教学目标|重难点|课堂流程|评分标准/.test(text)) return "plan";
  if (/讲解|解释|是什么|为什么|原理|通俗|推导|举例|对比|区别/.test(text)) return "explain";
  return "qa";
}

function renderTopicLocalizationCard(assistant, panel = {}) {
  const workflowResult = assistant?.workflowResult || {};
  const localization = workflowResult.topic_localization || panel.topicLocalization || {};
  const candidates = Array.isArray(localization.candidates) ? localization.candidates : [];
  const selected = localization.selectedTopic || workflowResult.topic_label || (assistant?.knowledgePoints || [])[0] || "待定位";
  const confidence = Number(localization.confidence);
  const confidenceText = Number.isFinite(confidence) ? percentText(confidence) : (localization.confidenceLabel || "待确认");
  const masterySkipped = workflowResult.mastery_update_skipped || localization.needsConfirmation;
  return `
    <section class="ai-side-card diagnosis-card">
      <h3>诊断卡</h3>
      <div class="ai-side-card-body">
        <div class="diagnosis-main">
          <strong>${escapeHtml(selected)}</strong>
          <span>置信度 ${escapeHtml(confidenceText)} · ${masterySkipped ? "本轮不更新画像" : "已写入学习画像"}</span>
        </div>
        <div class="mastery-meter small"><span style="width:${Number.isFinite(confidence) ? clamp(confidence, 0, 1) * 100 : 0}%"></span></div>
        <p class="hint">${escapeHtml(localization.basis || localization.policy || "提交问题后会显示定位依据。")}</p>
        ${candidates.length ? `
          <div class="topic-candidate-list">
            ${candidates.map((item) => `<span>${escapeHtml(item.topic)} <small>${percentText(item.probability)}</small></span>`).join("")}
          </div>
        ` : `<p class="hint">暂无候选列表。</p>`}
        ${assistant ? `<form class="topic-correction-form" data-topic-correction-form>
          <input type="hidden" name="messageId" value="${escapeHtml(assistant?.id || "")}" />
          <input type="hidden" name="fromTopic" value="${escapeHtml(selected)}" />
          <input type="hidden" name="confidence" value="${escapeHtml(localization.confidence || "")}" />
          <label>手动纠正知识点<input name="correctedTopic" list="topicCorrectionCandidates" placeholder="例如：K 近邻" required /></label>
          <datalist id="topicCorrectionCandidates">
            ${candidates.map((item) => `<option value="${escapeHtml(item.topic)}"></option>`).join("")}
          </datalist>
          <label>纠正依据<input name="reason" placeholder="例如：我的问题问的是 KNN 核心思想，不是支持向量机" /></label>
          <button class="mini" type="submit">重新归档</button>
        </form>` : ""}
      </div>
    </section>
  `;
}

function renderStudentAiEvidenceCard(assistant, panel = {}) {
  const citations = panel.citations || assistant?.citations || [];
  const workflowResult = assistant?.workflowResult || {};
  const missing = workflowResult.missing_points || [];
  const errors = workflowResult.error_tags || [];
  return `
    <section class="ai-side-card evidence-card">
      <h3>证据卡</h3>
      <div class="ai-side-card-body">
        ${renderCitationList(citations)}
        ${(panel.relatedKnowledgePoints || []).length ? `<p class="hint">图谱节点：${escapeHtml((panel.relatedKnowledgePoints || []).slice(0, 4).map((item) => item.label || item.topic || item).join("、"))}</p>` : ""}
        ${missing.length || errors.length ? `<p class="hint">错因命中：${escapeHtml([...errors, ...missing].slice(0, 5).join("、"))}</p>` : `<p class="hint">暂无错因命中。提供自己的答案后可形成诊断反馈。</p>`}
      </div>
    </section>
  `;
}

function renderProfileDrivenPathCard(panel = {}) {
  const path = panel.profileDrivenPath || {};
  const steps = Array.isArray(path.nextPath) ? path.nextPath : [];
  return `
    <section class="ai-side-card profile-path-card">
      <h3>GraphRAG + 画像路径</h3>
      <div class="ai-side-card-body">
        <p class="hint">${escapeHtml(path.rationale || "AI 回答会绑定课程资料和图谱节点，学习行为回写画像后影响推荐路径。")}</p>
        ${path.graphNode?.label ? `<p><strong>${escapeHtml(path.graphNode.label)}</strong><br /><span class="hint">${escapeHtml((path.graphNode.path || []).join(" → ") || path.graphNode.graphTitle || "知识图谱节点")}</span></p>` : ""}
        <ol class="learning-panel-list">
          ${steps.slice(0, 5).map((step) => `<li>${escapeHtml(step)}</li>`).join("") || `<li>完成一次诊断后生成画像驱动路径。</li>`}
        </ol>
      </div>
    </section>
  `;
}

function renderMetacognitionCard(panel = {}) {
  const prompts = Array.isArray(panel.metacognitivePrompts) ? panel.metacognitivePrompts : [];
  return `
    <section class="ai-side-card metacognition-card">
      <h3>元认知追问</h3>
      <div class="ai-side-card-body">
        <ol class="learning-panel-list">
          ${prompts.slice(0, 5).map((prompt) => `<li>${escapeHtml(prompt)}</li>`).join("") || `<li>你为什么这样理解？你最不确定的是什么？下一步如何验证？</li>`}
        </ol>
      </div>
    </section>
  `;
}

function renderAiTrustReviewCard(assistant, active) {
  if (!assistant) return "";
  const workflowResult = assistant.workflowResult || {};
  const topic = workflowResult.topic_localization?.selectedTopic || workflowResult.topic_label || (assistant.knowledgePoints || [])[0] || "";
  const reviewOptions = [
    ["accepted", "我采纳"],
    ["partial_accept", "我部分采纳"],
    ["challenge", "我质疑"],
    ["ai_error", "我发现 AI 错误"],
    ["citation_needed", "我需要资料引用验证"]
  ];
  return `
    <section class="ai-side-card ai-trust-card">
      <h3>AI 审辩</h3>
      <div class="ai-side-card-body">
        <form class="ai-review-form" data-ai-review-form>
          <input type="hidden" name="conversationId" value="${escapeHtml(active?.id || state.activeConversationId || "")}" />
          <input type="hidden" name="messageId" value="${escapeHtml(assistant.id || "")}" />
          <input type="hidden" name="topic" value="${escapeHtml(topic)}" />
          <label>我的判断
            <select name="reviewType">
              ${reviewOptions.map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join("")}
            </select>
          </label>
          <label>可信度
            <select name="trustScore">
              <option value="0.8">高</option>
              <option value="0.55">中</option>
              <option value="0.25">低</option>
            </select>
          </label>
          <label>审辩说明<textarea name="comment" rows="2" placeholder="例如：引用材料对应 KNN，但回答混入了 SVM。"></textarea></label>
          <label>我的最终判断<textarea name="finalJudgment" rows="2" required placeholder="写一句最终判断：我采纳/保留/反驳 AI 的哪些内容，理由是什么。"></textarea></label>
          <label>下一步验证<input name="studentAction" placeholder="例如：手动纠正知识点，并做一道变式题验证" /></label>
          <label>引用核验<input name="verificationNeed" placeholder="例如：需要回看第 5 章 KNN 距离度量材料" /></label>
          <button class="mini" type="submit">保存审辩记录</button>
        </form>
      </div>
    </section>
  `;
}

function renderStudentAiNextStepCard(assistant, panel = {}) {
  const workflowResult = assistant?.workflowResult || {};
  const nextQuestions = Array.isArray(workflowResult.next_questions) ? workflowResult.next_questions : [];
  const topic = workflowResult.topic_localization?.selectedTopic || workflowResult.topic_label || (assistant?.knowledgePoints || [])[0] || "";
  return `
    <section class="ai-side-card next-step-card">
      <h3>下一步卡</h3>
      <div class="ai-side-card-body">
        <div class="quick-next-actions">
          <button class="mini primary" type="button" data-dashboard-page="graph">去做知识测试</button>
          <button class="mini" type="button" data-dashboard-page="graph">复习图谱节点</button>
          <button class="mini" type="button" data-dashboard-page="portfolio">查看档案</button>
        </div>
        ${nextQuestions.length ? `<ol class="learning-panel-list">${nextQuestions.slice(0, 4).map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ol>` : `<p class="hint">完成提问后会出现推荐测试、复习节点和追问题。</p>`}
        <details class="reflection-inline-card">
          <summary>写本轮反思</summary>
          ${renderStructuredReflectionForm({ contextType: "ai_diagnosis", contextId: assistant?.id || "", contextTitle: "AI 诊断", knowledgePoint: topic, subject: state.aiSubject || preferredSubject() })}
        </details>
      </div>
    </section>
  `;
}

function diagnosisTypeLabels(tags = []) {
  const raw = Array.isArray(tags) ? tags.join("、") : String(tags || "");
  const labels = [];
  if (/概念|任务类型/.test(raw)) labels.push("概念混淆");
  if (/前置|关键词/.test(raw)) labels.push("前置知识缺失");
  if (/公式|目标/.test(raw)) labels.push("公式理解偏差");
  if (/流程|步骤/.test(raw)) labels.push("步骤遗漏");
  if (/代码|数据泄漏/.test(raw)) labels.push("代码实现错误");
  if (/指标|场景|适用/.test(raw)) labels.push("迁移应用不足");
  return labels.length ? labels : (raw ? [raw] : ["暂未发现显著错因"]);
}

function renderStructuredDiagnosisResult(active) {
  const assistant = latestAssistantMessage(active);
  const result = assistant?.workflowResult || {};
  const panel = assistant?.learningPanel || {};
  const hasDiagnosis = Boolean(assistant && (result.mastery_score !== undefined || result.masteryScore !== undefined || result.error_tags?.length || result.missing_points?.length));
  const topic = result.topic_localization?.selectedTopic || result.topic_label || (assistant?.knowledgePoints || [])[0] || state.aiKnowledgePoint || "待学生提交作答";
  const errorTags = Array.isArray(result.error_tags) ? result.error_tags : [];
  const structuredTags = Array.isArray(result.misconception_tags) ? result.misconception_tags : errorTags;
  const missing = Array.isArray(result.missing_points) ? result.missing_points : [];
  const score = Number(result.mastery_score ?? result.masteryScore);
  const userMessage = [...(active?.messages || [])].reverse().find((item) => item.role === "user");
  const evidence = String(result.error_evidence || result.evidence_sentence || userMessage?.content || "等待学生作答后，系统将引用答案中的具体句子或代码行。").split("\n").find(Boolean) || "等待学生作答后生成。";
  const graphFocus = panel.graphFocus;
  if (!hasDiagnosis) {
    return `
      <section class="ai-side-card structured-diagnosis-card pending">
        <h3>结构化诊断结果</h3>
        <div class="ai-side-card-body"><p>请先在“错因诊断”模式提交你的答案与思路。AI 会判断正确性，但重点呈现错因、证据、掌握度和下一步补救任务。</p></div>
      </section>
    `;
  }
  return `
    <section class="ai-side-card structured-diagnosis-card">
      <h3>结构化诊断结果</h3>
      <div class="ai-side-card-body">
        <dl class="structured-diagnosis-list">
          <div><dt>对应知识点</dt><dd>${escapeHtml(topic)}</dd></div>
          <div><dt>错因类型</dt><dd>${escapeHtml(diagnosisTypeLabels(structuredTags).join("、") || "待分类")}${result.misconception_level ? ` · ${escapeHtml(result.misconception_level)}` : ""}</dd></div>
          <div><dt>错误证据</dt><dd>“${escapeHtml(compactText(result.evidence || evidence, 110))}”</dd></div>
          <div><dt>判断结果</dt><dd>${result.is_correct === true ? "正确" : result.is_correct === false ? "需要修正" : "待确认"}</dd></div>
          <div><dt>掌握度估计</dt><dd><b>${Number.isFinite(score) ? `${Math.round(score)} / 100` : "待诊断"}</b>${result.mastery_level ? ` · ${escapeHtml(result.mastery_level)}` : ""}</dd></div>
          <div><dt>关联节点</dt><dd>${escapeHtml(graphFocus?.label || (panel.relatedKnowledgePoints || []).map((item) => item.label || item).slice(0, 2).join("、") || "诊断后自动定位")}</dd></div>
          <div><dt>下一步</dt><dd>${(result.recommended_actions || []).length ? escapeHtml(result.recommended_actions.slice(0, 3).join("；")) : `1 个微课、2 道变式题、1 个实验操作${score < 60 ? "，必要时向教师求助" : ""}`}</dd></div>
          <div><dt>是否需要复测</dt><dd>${result.need_reassessment !== undefined ? (result.need_reassessment ? "是" : "否") : (!Number.isFinite(score) || score < 85 ? "是" : "否")}</dd></div>
        </dl>
        <div class="diagnosis-confirm-actions">
          <form data-ai-review-form><input type="hidden" name="conversationId" value="${escapeHtml(active?.id || "")}" /><input type="hidden" name="messageId" value="${escapeHtml(assistant?.id || "")}" /><input type="hidden" name="topic" value="${escapeHtml(topic)}" /><input type="hidden" name="reviewType" value="accepted" /><input type="hidden" name="trustScore" value="0.8" /><input type="hidden" name="finalJudgment" value="我理解了本轮诊断，并将按补救任务完成验证。" /><button class="mini primary" type="submit">我理解了</button></form>
          <form data-ai-review-form><input type="hidden" name="conversationId" value="${escapeHtml(active?.id || "")}" /><input type="hidden" name="messageId" value="${escapeHtml(assistant?.id || "")}" /><input type="hidden" name="topic" value="${escapeHtml(topic)}" /><input type="hidden" name="reviewType" value="challenge" /><input type="hidden" name="trustScore" value="0.55" /><input type="hidden" name="finalJudgment" value="我仍然困惑，需要通过变式题或向教师求助继续验证。" /><button class="mini" type="submit">仍然困惑</button></form>
        </div>
      </div>
    </section>
  `;
}

function renderStudentAiInsightPanel(active) {
  const assistant = latestAssistantMessage(active);
  const panel = assistant?.learningPanel || {};
  const profile = state.data?.learningAnalytics?.profile || {};
  const weakPoints = Array.isArray(profile.weakPoints) ? profile.weakPoints.slice(0, 3) : [];
  const mastery = Object.entries(profile.mastery || {})
    .filter(([, item]) => Array.isArray(item?.evidence) && item.evidence.length)
    .sort((a, b) => Number(a[1].score || 0) - Number(b[1].score || 0))
    .slice(0, 3);
  const workflowResult = assistant?.workflowResult || {};
  const citations = panel.citations || assistant?.citations || [];
  const nextStep = workflowResult.next_questions?.[0] || panel.profileDrivenPath?.nextPath?.[0] || "继续用自己的话复述刚学到的关键概念。";
  const hasDiagnosis = Boolean(assistant && (workflowResult.mastery_score !== undefined || workflowResult.error_tags?.length || workflowResult.missing_points?.length));
  return `
    <section class="ai-side ai-insight-panel student-diagnosis-rail ai-student-insight-stack">
      <div class="ai-rail-head">
        <h3>${assistant ? "本轮回答依据" : "我的学习情况"}</h3>
        ${renderStudentAiRailToggle(true)}
      </div>
      <section class="ai-side-card">
        <div class="ai-side-card-body">
          ${weakPoints.length || mastery.length
            ? `<p>${weakPoints.length ? `近期优先关注：${weakPoints.map(escapeHtml).join("、")}` : "暂未记录明显薄弱点。"}</p>${mastery.map(([topic, item]) => `<div class="student-mastery-summary"><span>${escapeHtml(topic)}</span><strong>${escapeHtml(item.status || "持续学习")}</strong></div>`).join("")}`
            : `<p class="hint">完成课程练习或提交自己的解题思路后，这里会逐步形成个性化学习建议。</p>`}
        </div>
      </section>
      ${assistant ? `<section class="ai-side-card"><h4>本轮依据</h4><div class="ai-side-card-body">
        ${panel.relatedKnowledgePoints?.length ? `<p>关联知识点：${escapeHtml(panel.relatedKnowledgePoints.slice(0, 3).map((item) => item.label || item.topic || item).join("、"))}</p>` : ""}
        ${citations.length ? renderCitationList(citations.slice(0, 3)) : `<p class="hint">本轮未检索到可引用的课程资料。</p>`}
        ${hasDiagnosis ? `<p class="hint">本轮包含你的作答证据；掌握度仍以测验和多次学习记录综合判断。</p>` : ""}
      </div></section>
      <section class="ai-side-card"><h4>接下来</h4><div class="ai-side-card-body"><button type="button" class="mini" data-ai-example="${escapeHtml(typeof nextStep === "string" ? nextStep : nextStep.action || nextStep.topic || "继续复习当前知识点")}">${escapeHtml(typeof nextStep === "string" ? nextStep : nextStep.action || nextStep.topic || "继续复习当前知识点")}</button></div></section>` : ""}
    </section>
  `;
}

function renderStudentAiRailToggle(open) {
  const label = open ? "收起本轮回答依据" : "展开本轮回答依据";
  return `<button type="button" class="student-ai-rail-toggle" data-student-ai-rail-toggle data-student-ai-rail-state="${open ? "open" : "closed"}" aria-label="${label}" title="${label}">${iconSvg(open ? "chevronRight" : "chevronLeft", label)}</button>`;
}

function renderStudentAiInsight(active) {
  return renderStudentAiInsightPanel(active);
}

function activeStudentAiTask() {
  const currentMode = normalizeAiModeClient(state.aiMode);
  return STUDENT_AI_TASK_MODES.find((item) => item.key === state.aiTaskKey)
    || STUDENT_AI_TASK_MODES.find((item) => item.mode === currentMode)
    || STUDENT_AI_TASK_MODES[0];
}

function studentAiExamples(taskKey) {
  const examples = {
    concept: ["为什么逻辑回归要使用交叉熵损失？", "请用反例解释过拟合和欠拟合的区别"],
    derivation: ["帮我检查这段逻辑回归梯度下降推导的关键步骤", "线性回归的最小二乘损失是怎样求导的？"],
    code: ["我在 LogisticRegression 中遇到收敛警告，如何排查？", "这段 sklearn 交叉验证代码为什么数据泄漏？"],
    diagnosis: ["题目：什么是正则化？我的答案：为了让模型更复杂。", "题目：KNN 如何分类？我的思路：直接选距离最远的样本。"],
    review: ["根据我的薄弱点安排今晚 90 分钟的逻辑回归复习任务。", "我下周考试，怎样复习 KNN、决策树和模型评估？"]
  };
  return examples[taskKey] || examples.concept;
}

function renderStudentAiPathRail(active) {
  const portfolio = currentStudentPortfolio();
  const cycle = portfolio.learningCycle || {};
  const path = portfolio.graphRagProfileCoupling?.recommendedPath || [];
  const nextTask = cycle.nextTask || (cycle.tasks || []).find((task) => !task.done) || {};
  const assistant = latestAssistantMessage(active);
  const focus = assistant?.learningPanel?.graphFocus;
  return `
    <aside class="ai-path-rail">
      <section class="ai-side-card">
        <h3>当前学习周期</h3>
        <div class="ai-side-card-body">
          <strong>${escapeHtml(cycle.title || "本轮学习周期")}</strong>
          <div class="cycle-stage-strip compact-stage-strip">${(cycle.currentStage?.stages || []).map((item) => `<span class="${item.done ? "done" : item.key === cycle.currentStage?.activeKey ? "active" : ""}"><b></b>${escapeHtml(item.label)}</span>`).join("")}</div>
          <p>${escapeHtml(nextTask.nextAction || nextTask.label || "完成当前阶段任务")}</p>
          <button class="mini primary" type="button" data-dashboard-page="${escapeHtml(nextTask.page || "portfolio")}">下一步</button>
        </div>
      </section>
      <section class="ai-side-card">
        <h3>我的学习路径</h3>
        <div class="ai-side-card-body ai-path-list">
          ${path.slice(0, 5).map((step, index) => `
            <button type="button" data-dashboard-page="graph">
              <b>${index + 1}</b>
              <span><strong>${escapeHtml(step.topic)}</strong><small>${escapeHtml(step.action || "")}</small></span>
            </button>
          `).join("") || `<p>完成诊断后生成画像驱动路径。</p>`}
        </div>
      </section>
      <section class="ai-side-card">
        <h3>图谱焦点</h3>
        <div class="ai-side-card-body">
          ${focus?.label ? `
            <strong>${escapeHtml(focus.label)}</strong>
            <p>${escapeHtml((focus.path || []).join(" → ") || focus.graphTitle || "知识图谱节点")}</p>
            <button type="button" class="mini" data-ai-open-graph="${escapeHtml(focus.graphId || "")}" data-ai-open-node="${escapeHtml(focus.nodeId || "")}">打开节点</button>
          ` : `<p>AI 定位知识点后会显示对应图谱节点。</p>`}
        </div>
      </section>
    </aside>
  `;
}

function learningPathSequence(path) {
  const nodes = Array.isArray(path?.nodes) ? path.nodes : [];
  const nodeIds = new Set(nodes.map((node) => String(node.id)));
  const prerequisiteLinks = (path.links || []).filter((link) => {
    const type = String(link.type || "").toLowerCase();
    return nodeIds.has(String(link.source)) && nodeIds.has(String(link.target))
      && (type === "prerequisite" || /前置|先修|递进/.test(String(link.label || "")));
  });
  const incoming = new Map(nodes.map((node) => [String(node.id), 0]));
  const outgoing = new Map(nodes.map((node) => [String(node.id), []]));
  prerequisiteLinks.forEach((link) => {
    incoming.set(String(link.target), (incoming.get(String(link.target)) || 0) + 1);
    outgoing.get(String(link.source))?.push(String(link.target));
  });
  const queue = nodes.filter((node) => !incoming.get(String(node.id))).map((node) => String(node.id));
  const orderedIds = [];
  while (queue.length) {
    const id = queue.shift();
    orderedIds.push(id);
    (outgoing.get(id) || []).forEach((target) => {
      incoming.set(target, incoming.get(target) - 1);
      if (incoming.get(target) === 0) queue.push(target);
    });
  }
  const order = new Set(orderedIds);
  nodes.forEach((node) => { if (!order.has(String(node.id))) orderedIds.push(String(node.id)); });
  const nodeMap = new Map(nodes.map((node) => [String(node.id), node]));
  return orderedIds.map((id) => nodeMap.get(id)).filter(Boolean);
}

function renderLearningPathDetail(path) {
  const sequence = learningPathSequence(path);
  return `
    <section class="panel learning-path-detail-shell">
      <div class="workbench-title">
        <div><span class="cycle-eyebrow">学习路径</span><h2>${escapeHtml(path.title)}</h2><p>${escapeHtml(path.subject || "通用")} · ${sequence.length} 个学习节点 · ${path.links?.length || 0} 条学习关系</p></div>
        <div class="row-actions"><button class="mini" type="button" data-export-learning-path="${escapeHtml(path.id)}">导出路径</button>${path.publishStatus !== "published" ? `<button class="mini primary" type="button" data-publish-learning-path="${escapeHtml(path.id)}">发布路径</button>` : ""}<button class="mini" type="button" data-sync-learning-path="${escapeHtml(path.id)}">同步班级</button></div>
      </div>
      <div class="learning-path-status-line"><span>${path.publishStatus === "published" ? "已发布" : "草稿"}</span><small>${path.publishStatus === "published" ? "学生可按顺序学习" : "发布后才能同步到班级"} · ${fmtTime(path.updatedAt || path.createdAt)}</small></div>
      <div class="learning-path-sequence">
        ${sequence.map((node, index) => `
          <article class="learning-path-step">
            <div class="learning-path-step-index">${index + 1}</div>
            <div class="learning-path-step-body">
              <div class="split-head"><div><span class="cycle-eyebrow">第 ${index + 1} 步</span><h3>${escapeHtml(node.label)}</h3></div><span class="graph-badge">${escapeHtml(node.group || "学习节点")}</span></div>
              <p>${escapeHtml(node.details || node.learningGoal || "完成本节点的学习与验证任务。")}</p>
              ${node.learningGoal ? `<div class="detail-card"><strong>学习目标</strong><p>${escapeHtml(node.learningGoal)}</p></div>` : ""}
              ${node.verificationQuestions?.length ? `<div class="detail-card"><strong>完成验证</strong><ul>${node.verificationQuestions.slice(0, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>` : ""}
              ${node.masteryStandard ? `<small class="learning-path-mastery">达标：${escapeHtml(node.masteryStandard)}</small>` : ""}
            </div>
          </article>
        `).join("") || emptyBlock("该学习路径暂无节点。")}
      </div>
    </section>
  `;
}

function renderTeacherLearningPathPage() {
  if (!isTeacherLike()) return emptyBlock("学习路径仅面向教师账号。");
  const paths = allVisibleLearningPaths().filter((path) => state.user.role === "admin" || path.ownerId === state.user.id);
  const selected = paths.find((path) => path.id === state.selectedGraphId) || null;
  const tab = state.learningPathTab || "library";
  const draft = state.graphDraft || {};
  const content = selected
    ? renderLearningPathDetail(selected)
    : tab === "generate"
      ? `
        <div class="grid two graph-form-grid">
          <section class="panel graph-form-card">
            <h3>生成学习路径</h3>
            <p class="hint">上传教材或粘贴学习资料，系统将调用管理员配置的模型生成知识节点、学习顺序和测评任务。</p>
            <form id="generateGraphForm" class="stack">
              <div class="form-grid">
                <label>学科<input name="subject" value="${escapeHtml(draft.subject || preferredSubject())}" placeholder="例如：机器学习、线性代数" required /></label>
                <label>路径名称<input name="title" value="${escapeHtml(draft.title || "")}" placeholder="例如：机器学习基础学习路径" /></label>
              </div>
              <label>上传学习资料（可多选 PDF/TXT/EPUB/MD）<input name="book" type="file" accept=".pdf,.txt,.epub,.md" multiple /></label>
              <label>补充学习目标或目录<textarea name="sourceText" form="generateGraphForm" rows="6" placeholder="例如：掌握线性回归、逻辑回归及模型评估，并说明适用条件。">${escapeHtml(draft.sourceText || "")}</textarea></label>
              <input type="hidden" name="extractor" value="configured-model-learning-path" />
              <div class="actions"><button class="primary" type="submit">调用模型生成</button></div>
            </form>
            <div id="graphProgressMount">${renderGraphProgress()}</div>
          </section>
          <section class="panel graph-task-panel">
            <div class="split-head"><h3>生成任务</h3><button class="mini" type="button" id="refreshGraphJobs">刷新</button></div>
            <div id="graphTaskCenter">${renderGraphTaskCenter()}</div>
          </section>
        </div>
      `
      : tab === "import"
        ? `
          <div class="grid two graph-form-grid">
            <section class="panel import-graph-panel graph-form-card">
              <h3>导入已有学习路径</h3>
              <p class="hint">选择符合学习路径格式的 JSON 文件，导入后可同步给指定班级。</p>
              <form id="importGraphForm" class="stack import-graph-form">
                <div class="form-grid">
                  <label>学科<input name="subject" value="${escapeHtml(preferredSubject())}" placeholder="例如：机器学习、线性代数" /></label>
                  <label>路径名称<input name="title" placeholder="导入后显示的路径名称" /></label>
                </div>
                <label>学习路径 JSON 文件<input name="graph" type="file" accept=".json,application/json" required /></label>
                <button class="primary" type="submit">导入学习路径</button>
              </form>
            </section>
            <section class="panel graph-import-check"><h3>路径内容</h3><div class="detail-card"><p>路径需包含 nodes 和 links 数组。导入后可检查节点顺序与学习内容，再同步到班级。</p></div></section>
          </div>
        `
        : `
          <section class="panel graph-product-shell">
            <div class="graph-list">${paths.map((path) => `
              <article class="list-card" data-select-graph="${escapeHtml(path.id)}">
                <div><h3>${escapeHtml(path.title)}</h3><p>${escapeHtml(path.subject)} · ${path.nodes.length} 个学习节点 · ${path.links.length} 条学习关系</p><small>${path.publishStatus === "published" ? "已发布" : "草稿"} · ${fmtTime(path.createdAt)}</small></div>
                <div class="row-actions"><button class="mini" type="button" data-export-learning-path="${escapeHtml(path.id)}">导出</button><button class="mini" type="button" data-sync-learning-path="${escapeHtml(path.id)}">同步班级</button>${path.publishStatus !== "published" ? `<button class="mini primary" type="button" data-publish-learning-path="${escapeHtml(path.id)}">发布路径</button>` : ""}<button class="mini danger" type="button" data-delete-learning-path="${escapeHtml(path.id)}">删除</button></div>
              </article>
            `).join("") || emptyBlock("暂无学习路径。可以先生成或导入一条路径。")}</div>
          </section>
        `;
  return `
    <div class="learning-path-workbench${!selected && tab === "library" ? " learning-path-library-workbench" : ""}">
      ${selected ? `<button class="mini learning-path-back" type="button" id="graphBackToLibrary">返回学习路径列表</button>` : `
        <div class="product-tabs learning-path-tabs" role="tablist" aria-label="学习路径管理">
          ${[["library", "路径库"], ["generate", "生成路径"], ["import", "导入路径"]].map(([key, label]) => `<button type="button" class="${tab === key ? "active" : ""}" data-learning-path-tab="${key}">${label}</button>`).join("")}
        </div>
      `}
      ${content}
      ${renderLearningPathSyncModal()}
    </div>
  `;
}

function renderAiPage() {
  const isTeacher = isTeacherLike();
  const conversations = state.data.conversations || [];
  const active = conversations.find((conv) => conv.id === state.activeConversationId) || conversations[0];
  const pending = state.pendingAiPrompt && (!state.pendingAiPrompt.conversationId || state.pendingAiPrompt.conversationId === active?.id)
    ? state.pendingAiPrompt
    : null;
  const messageContent = `${(active?.messages || []).map(renderAiMessage).join("")}${renderPendingAiExchange(pending)}`;
  if (active && !state.activeConversationId) {
    state.activeConversationId = active.id;
    state.aiMode = normalizeAiModeClient(active.mode || state.aiMode);
    state.aiTaskKey = state.aiMode;
    if (isTeacher) state.aiTeacherTask = state.aiTeacherTask || "lesson_plan";
  }
  const intro = isTeacher
    ? "输入教学目标、课堂问题、出题要求或批改需求，系统会使用管理员配置的模型结合项目资料回答。"
    : "直接提问，或粘贴你的答案、推导过程和代码。学习助手会结合课程资料与已有学习记录组织回答。";
  const emptyExamples = isTeacher ? ["围绕当前知识点生成一份教学方案"] : ["为什么逻辑回归使用交叉熵损失？"];
  return `
    <div class="chat-layout ai-workbench ai-assistant-workbench ${isTeacher ? "teacher-ai-workbench" : `student-ai-workbench ${state.studentAiRailOpen ? "" : "student-ai-rail-collapsed"}`} diagnosis-ai-workbench">
      <section class="panel chat-panel ai-chat-panel ${isTeacher ? "teacher-ai-main" : "student-ai-main"}">
        <div class="message-stream" id="aiMessages">
          ${messageContent || `<div class="ai-empty-state"><div class="ai-empty-icon">AI</div><h3>今天想弄懂什么？</h3><p>${escapeHtml(intro)}</p><div class="ai-example-list">${emptyExamples.map((example) => `<button type="button" class="ai-example-chip" data-ai-example="${escapeHtml(example)}">${escapeHtml(example)}</button>`).join("")}</div></div>`}
        </div>
        <form id="aiForm" class="composer rich-composer ai-composer dify-composer">
          <textarea name="prompt" rows="${isTeacher ? "3" : "4"}" placeholder="${escapeHtml(isTeacher ? aiPromptPlaceholder(true) : "直接问问题，也可以粘贴答案、推导过程或代码。")}"></textarea>
          <button class="primary ai-send-button" type="submit" ${pending ? "disabled" : ""}>${pending ? "正在回答" : "发送"}</button>
        </form>
      </section>
      ${isTeacher ? "" : `<aside class="student-ai-result-rail ${state.studentAiRailOpen ? "" : "is-collapsed"}">${state.studentAiRailOpen ? renderStudentAiInsight(active) : renderStudentAiRailToggle(false)}</aside>`}
    </div>
  `;
}

function bindAiPage() {
  bindDashboardPageLinks();
  bindReflectionForms();
  bindKnowledgeCorrectionForms();
  bindAiReviewForms();
  document.querySelectorAll("[data-student-ai-rail-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      state.studentAiRailOpen = button.dataset.studentAiRailState === "closed";
      renderContent();
    });
  });
  document.getElementById("toggleAiContext")?.addEventListener("click", () => {
    state.aiContextEditorOpen = !state.aiContextEditorOpen;
    renderContent();
  });
  const syncAiControls = () => {
    const subjectControl = document.getElementById("aiSubjectSelect");
    const chapterControl = document.getElementById("aiChapterInput");
    const knowledgeControl = document.getElementById("aiKnowledgeInput");
    const classControl = document.getElementById("aiClassSelect");
    const materialControl = document.getElementById("aiMaterialSelect");
    const graphControl = document.getElementById("aiGraphSelect");
    const graphNodeControl = document.getElementById("aiGraphNodeSelect");
    const homeworkControl = document.getElementById("aiHomeworkSelect");
    const submissionControl = document.getElementById("aiSubmissionSelect");
    if (subjectControl) state.aiSubject = subjectControl.value || state.aiSubject || "";
    if (chapterControl) state.aiChapter = chapterControl.value || "";
    if (knowledgeControl) state.aiKnowledgePoint = knowledgeControl.value || "";
    if (classControl) state.aiClassId = classControl.value || "";
    if (materialControl) state.aiMaterialId = materialControl.value || "";
    if (graphControl) state.aiGraphId = graphControl.value || "";
    if (graphNodeControl) state.aiGraphNodeId = graphNodeControl.value || "";
    if (homeworkControl) state.aiHomeworkId = homeworkControl.value || "";
    if (submissionControl) state.aiSubmissionId = submissionControl.value || "";
    const promptControl = document.querySelector("#aiForm textarea[name='prompt']");
    if (!isTeacherLike()) state.aiStudentAnswer = activeStudentAiTask().key === "diagnosis" ? (promptControl?.value || "") : "";
  };
  const active = activeAiConversation();
  const findMessage = (id) => (active?.messages || []).find((message) => message.id === id);
  document.querySelectorAll("[data-ai-card-message]").forEach((button) => {
    button.addEventListener("click", async () => {
      const message = findMessage(button.dataset.aiCardMessage);
      if (!message) return;
      setButtonBusy(button, true, "保存中...");
      try {
        const previousUser = [...(active?.messages || [])].reverse().find((item) => item.role === "user" && new Date(item.createdAt || 0) <= new Date(message.createdAt || 0));
        const topic = message.workflowResult?.topic_localization?.selectedTopic || message.workflowResult?.topic_label || (message.knowledgePoints || [])[0] || "AI 学习卡片";
        await api("/api/wrong-notes", {
          method: "POST",
          body: {
            userId: state.user.id,
            source: "AI 回答学习卡片",
            topic,
            question: previousUser?.content || active?.title || "",
            answer: aiMessageDisplayContent(message),
            analysis: "学生将 AI 回答转成学习卡片，后续可在反思中记录采纳情况。",
            recommendation: "用自己的话重写核心概念，并完成一道同知识点测试。"
          }
        });
        await loadState();
        renderShell();
        showToast("已转成学习卡片并入档");
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        setButtonBusy(button, false);
      }
    });
  });
  const submitPrompt = async (prompt, explicitMode = "") => {
    const cleanPrompt = String(prompt || "").trim();
    if (!cleanPrompt) return;
    syncAiControls();
    const isTeacher = isTeacherLike();
    const inferredSubject = inferSubjectFromPrompt(cleanPrompt, state.aiSubject || preferredSubject() || "通用");
    const inferredDepth = inferAiDepthFromPrompt(cleanPrompt, state.aiAnswerDepth || "layered");
    const inferredClass = findTeacherClassFromPrompt(cleanPrompt);
    const inferredMaterial = findMaterialFromPrompt(cleanPrompt, inferredSubject);
    const inferredGraph = findGraphFromPrompt(cleanPrompt, inferredSubject);
    const candidateGraph = inferredGraph
      || (state.aiGraphId ? (state.data?.knowledgeGraphs || []).find((item) => item.id === state.aiGraphId) : null)
      || (state.selectedGraphId ? (state.data?.knowledgeGraphs || []).find((item) => item.id === state.selectedGraphId) : null);
    const inferredNode = findGraphNodeFromPrompt(cleanPrompt, candidateGraph);
    if (inferredSubject) state.aiSubject = inferredSubject;
    state.aiAnswerDepth = inferredDepth;
    if (inferredClass) state.aiClassId = inferredClass.id;
    if (inferredMaterial) state.aiMaterialId = inferredMaterial.id;
    if (inferredGraph) state.aiGraphId = inferredGraph.id;
    if (inferredNode) {
      state.aiGraphNodeId = inferredNode.id;
      state.aiKnowledgePoint = inferredNode.label || state.aiKnowledgePoint;
    }
    const inferredTeacherTask = inferTeacherTaskKeyFromPrompt(cleanPrompt);
    const taskOption = isTeacher
      ? aiTaskOptions(true).find((item) => item.key === (explicitMode || inferredTeacherTask))
      : null;
    const inferredMode = inferAiModeFromPrompt(cleanPrompt, isTeacher);
    const hasStudentEvidence = /(?:我的答案|我的作答|我的思路|我的推导|代码[：:]|报错[：:]|推导过程|答案[：:]|```)/.test(cleanPrompt)
      || /(?:function\s+\w+|def\s+\w+\s*\(|\b(?:const|let|var)\s+\w+\s*=|\b(?:import|from)\s+\w+|Traceback \(most recent call last\))/i.test(cleanPrompt);
    const selectedMode = normalizeAiModeClient(explicitMode || taskOption?.mode || inferredMode);
    const mode = isTeacher ? (taskOption?.mode || selectedMode || "plan") : "auto";
    state.aiMode = mode;
    state.aiTaskKey = isTeacher ? (taskOption?.key || inferredTeacherTask || mode) : inferredMode;
    if (isTeacher) state.aiTeacherTask = state.aiTaskKey;
    const activeGraphId = isTeacher ? (state.aiGraphId || state.selectedGraphId) : state.selectedGraphId;
    const focusedGraph = (state.data?.knowledgeGraphs || []).find((item) => item.id === activeGraphId);
    const focusedNodeId = isTeacher ? (state.aiGraphNodeId || state.graphFocusNodeId || state.graphSelectedNodeId || "") : (state.graphFocusNodeId || state.graphSelectedNodeId || "");
    const graphFocus = focusedGraph && focusedNodeId && (focusedGraph.nodes || []).some((node) => node.id === focusedNodeId)
      ? { graphId: focusedGraph.id, nodeId: focusedNodeId }
      : {};
    const teacherContext = isTeacher ? {
      teacherTask: state.aiTeacherTask,
      task: state.aiTeacherTask,
      classId: state.aiClassId,
      selectedMaterialIds: state.aiMaterialId ? [state.aiMaterialId] : [],
      selectedGraphId: state.aiGraphId || graphFocus.graphId || "",
      selectedNodeId: state.aiGraphNodeId || graphFocus.nodeId || "",
      homeworkId: state.aiHomeworkId,
      studentSubmissionId: state.aiSubmissionId,
      outputFormat: "json"
    } : {};
    const pendingId = `pending_ai_${Date.now()}`;
    state.pendingAiPrompt = { id: pendingId, prompt: cleanPrompt, conversationId: state.activeConversationId || "" };
    renderContent();
    try {
      const payload = await apiStream("/api/ai/chat", {
        method: "POST",
        body: {
          userId: state.user.id,
          conversationId: state.activeConversationId,
          mode,
          subject: state.aiSubject || inferredSubject || "通用",
          chapter: state.aiChapter,
          knowledgePoint: state.aiKnowledgePoint,
          answerDepth: state.aiAnswerDepth,
          workflowType: isTeacher ? taskOption?.workflowType || "knowledge_qa" : inferredMode === "grade" ? "misconception_classification" : inferredMode === "plan" ? "personalized_path" : "knowledge_qa",
          prompt: cleanPrompt,
          stream: true,
          studentAnswer: isTeacher || !hasStudentEvidence ? "" : cleanPrompt,
          ...graphFocus,
          ...teacherContext
        }
      });
      state.pendingAiPrompt = "";
      state.activeConversationId = payload.conversation.id;
      state.aiStudentAnswer = "";
      await loadState();
      renderShell();
    } catch (error) {
      if (state.pendingAiPrompt?.id === pendingId) {
        state.pendingAiPrompt = "";
        renderContent();
      }
      throw error;
    }
  };
  const createConversation = async () => {
    try {
      const payload = await api("/api/conversations", {
        method: "POST",
        body: { userId: state.user.id, mode: "qa", title: "新的对话" }
      });
      state.activeConversationId = payload.conversation.id;
      state.aiMode = "qa";
      state.aiTaskKey = "qa";
      state.aiTeacherTask = "lesson_plan";
      await loadState();
      renderShell();
    } catch (error) {
      showToast(error.message, "error");
    }
  };
  document.querySelectorAll("#newConversationBtn").forEach((button) => {
    button.addEventListener("click", createConversation);
  });
  document.getElementById("aiHistoryToggle")?.addEventListener("click", (event) => {
    event.stopPropagation();
    state.aiHistoryOpen = !state.aiHistoryOpen;
    renderContent();
  });
  document.querySelectorAll("[data-ai-history-conversation]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeConversationId = button.dataset.aiHistoryConversation;
      const conversation = activeAiConversation();
      if (conversation?.mode) state.aiMode = normalizeAiModeClient(conversation.mode);
      state.aiHistoryOpen = false;
      renderContent();
    });
  });
  document.querySelectorAll("[data-ai-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      syncAiControls();
      state.aiMode = button.dataset.aiMode;
      state.aiTaskKey = button.dataset.aiMode;
      renderContent();
    });
  });
  document.querySelectorAll("[data-ai-depth]").forEach((button) => {
    button.addEventListener("click", () => {
      syncAiControls();
      state.aiAnswerDepth = button.dataset.aiDepth;
      renderContent();
    });
  });
  document.getElementById("aiAnswerDepthSelect")?.addEventListener("change", (event) => {
    syncAiControls();
    state.aiAnswerDepth = event.currentTarget.value || "layered";
    renderContent();
  });
  ["aiSubjectSelect", "aiChapterInput", "aiKnowledgeInput", "aiClassSelect", "aiMaterialSelect", "aiGraphNodeSelect", "aiSubmissionSelect"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", syncAiControls);
    document.getElementById(id)?.addEventListener("input", syncAiControls);
  });
  document.getElementById("aiGraphSelect")?.addEventListener("change", () => {
    syncAiControls();
    state.aiGraphNodeId = "";
    renderContent();
  });
  document.getElementById("aiSubjectSelect")?.addEventListener("change", () => {
    syncAiControls();
    state.aiMaterialId = "";
    state.aiGraphId = "";
    state.aiGraphNodeId = "";
    renderContent();
  });
  document.getElementById("aiHomeworkSelect")?.addEventListener("change", () => {
    syncAiControls();
    state.aiSubmissionId = "";
    renderContent();
  });
  document.getElementById("aiClassSelect")?.addEventListener("change", () => {
    syncAiControls();
    state.aiHomeworkId = "";
    state.aiSubmissionId = "";
    renderContent();
  });
  document.querySelector("#aiForm textarea[name='prompt']")?.addEventListener("input", syncAiControls);
  document.querySelectorAll("[data-ai-insight-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.aiInsightTab = button.dataset.aiInsightTab || "citations";
      renderContent();
    });
  });
  const stream = document.getElementById("aiMessages");
  if (stream) stream.scrollTop = stream.scrollHeight;
  document.querySelector("#aiForm textarea[name='prompt']")?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  });
  document.getElementById("aiForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const prompt = String(form.get("prompt") || "").trim();
    if (!prompt) return;
    try {
      await submitPrompt(prompt);
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.querySelectorAll("[data-ai-example]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.querySelector("#aiForm [name='prompt']");
      if (!input) return;
      input.value = button.dataset.aiExample || "";
      input.focus();
    });
  });
  document.querySelectorAll("[data-ai-draft]").forEach((button) => {
    button.addEventListener("click", () => {
      syncAiControls();
      const input = document.querySelector("#aiForm [name='prompt']");
      const topic = state.aiKnowledgePoint || "当前知识点";
      const teacherMap = {
        lesson_plan: { mode: "plan", depth: "layered", prompt: `请围绕「${topic}」生成一份可直接备课的教学方案，包含教学目标、重难点、课堂流程、板书结构和检测方式。` },
        quiz_generation: { mode: "practice", depth: "layered", prompt: `请根据「${topic}」生成分层练习或测验，包含基础题、提高题、迁移题、标准答案、评分点和错因标签。` },
        grading: { mode: "grade", depth: "layered", prompt: `请按教师批改模式分析选中的作业/提交或以下学生答案，给出 rubric 分项、建议分、错因和修改建议，最终分数保留教师确认。` },
        class_analysis: { mode: "plan", depth: "full", prompt: `请结合选中班级、作业和学习画像分析「${topic}」的学情，输出薄弱点、学生分层、补救路径和复测安排。` },
        remedial_plan: { mode: "plan", depth: "layered", prompt: `请围绕「${topic}」设计分层补救方案，包含分组任务、同类练习、讲评重点和复测标准。` },
        classroom_generation: { mode: "plan", depth: "full", prompt: `请把「${topic}」生成一节互动课堂，包含课堂脚本、AI 教师/助教发言、提问链、随堂测验和板书动作。` }
      };
      const studentMap = {
        concept: { mode: "explain", depth: "layered", prompt: `请分层讲解「${topic}」，包含生活类比、反例、关联知识点和易错点。` },
        derivation: { mode: "explain", depth: "full", prompt: `请协助我检查「${topic}」的公式推导，按步骤说明符号含义并指出易错点，不要跳过中间过程。` },
        code: { mode: "guided", depth: "layered", prompt: `请解读或纠正我关于「${topic}」的 Python / sklearn 代码，定位报错、解释参数并提示修改方向，不要直接代做。` },
        diagnosis: { mode: "grade", depth: "layered", prompt: `请基于我的答案与思路诊断「${topic}」，输出对应知识点、错因类型、错误证据、掌握度、补救任务和是否需要复测。` },
        review: { mode: "plan", depth: "layered", prompt: `请根据我的个人薄弱点围绕「${topic}」生成考前巩固任务，包含优先级、预计时间、题目和资源组合。` }
      };
      const isTeacher = isTeacherLike();
      const draft = (isTeacher ? teacherMap : studentMap)[button.dataset.aiDraft];
      if (!draft) return;
      state.aiTaskKey = button.dataset.aiDraft;
      if (isTeacher) state.aiTeacherTask = button.dataset.aiDraft;
      state.aiMode = draft.mode;
      state.aiAnswerDepth = draft.depth;
      const preservedPrompt = input?.value || "";
      const shouldFill = !input || !input.value.trim();
      renderContent();
      const nextInput = document.querySelector("#aiForm [name='prompt']");
      if (nextInput) nextInput.value = shouldFill ? draft.prompt : preservedPrompt;
      nextInput?.focus();
    });
  });
  document.querySelectorAll("[data-ai-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.aiAction;
      const message = findMessage(button.dataset.aiMessage);
      const topics = Array.isArray(message?.knowledgePoints) ? message.knowledgePoints : [];
      const topic = topics[0] || state.aiKnowledgePoint || "当前知识点";
      try {
        if (action === "sources") {
          document.querySelector(".citation-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        if (action === "wrong-note") {
          await api("/api/wrong-notes", {
            method: "POST",
            body: {
              userId: state.user.id,
              topic,
              question: active?.messages?.filter((item) => item.role === "user").slice(-1)[0]?.content || "",
              answer: message?.content || "",
              source: "对话回答",
              analysis: `用户将「${topic}」加入错题本，需要后续复盘。`,
              recommendation: "建议生成同类题，并回看前置知识。"
            }
          });
          await loadState();
          renderShell();
          showToast("已加入错题本");
          return;
        }
        if (action === "mastered") {
          await api("/api/mastery/update", {
            method: "POST",
            body: {
              userId: state.user.id,
              topics: topics.length ? topics : [topic],
              delta: 0.12,
              evidence: `用户在对话中标记「${topic}」已掌握`
            }
          });
          await loadState();
          renderShell();
          showToast("掌握度已更新");
          return;
        }
        const prompt = button.dataset.aiActionPrompt || {
          simplify: `请把「${topic}」讲得更简单，并用生活类比说明。`,
          example: `请围绕「${topic}」举一个例子，并说明每一步依据。`,
          quiz: `请根据「${topic}」生成 2 道同类题，并附答案解析。`,
          hint: `请围绕「${topic}」只给我下一步提示，不要直接给完整答案。`,
          full: `请把「${topic}」按完整解析模式讲清楚。`,
          grade: `请按批改模式检查我对「${topic}」的答案。`
        }[action] || "";
        await submitPrompt(prompt, button.dataset.aiActionMode || "");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
  document.querySelectorAll("[data-ai-open-graph]").forEach((button) => {
    button.addEventListener("click", () => {
      const graphId = button.dataset.aiOpenGraph;
      if (!graphId) return;
      state.selectedGraphId = graphId;
      state.graphFocusNodeId = button.dataset.aiOpenNode || null;
      state.graphSelectedNodeId = button.dataset.aiOpenNode || null;
      state.page = "graph";
      renderShell();
    });
  });
}

function chatUser(id) {
  if (id === "system") return { id: "system", name: "系统", role: "system" };
  return (state.data?.users || []).find((user) => user.id === id) || null;
}

function chatUserLabel(id) {
  const user = chatUser(id);
  return user ? `${user.name} · ${user.id}` : id;
}

function directFriendId(thread) {
  return (thread?.memberIds || []).find((id) => id !== state.user.id) || "";
}

function canSendToThread(thread) {
  if (!thread) return false;
  if (thread.type !== "direct") return thread.memberIds.includes(state.user.id);
  const friendId = directFriendId(thread);
  return (state.data.friends || []).some((friend) => friend.id === friendId);
}

function threadSubtitle(thread) {
  if (!thread) return "";
  const last = (thread.messages || []).slice(-1)[0];
  const messageText = last ? compactText(last.content || "", 26) : "暂无消息";
  return `${thread.type === "group" ? `${thread.memberIds.length} 人群聊` : "私聊"} · ${messageText}`;
}

function pendingFriendRequests(direction = "incoming") {
  return (state.data.friendRequests || []).filter((item) => (
    item.status === "pending"
    && (direction === "incoming" ? item.toUserId === state.user.id : item.fromUserId === state.user.id)
  ));
}

function pendingChatInvites(direction = "incoming") {
  return (state.data.chatInvites || []).filter((item) => (
    item.status === "pending"
    && (direction === "incoming" ? item.toUserId === state.user.id : item.fromUserId === state.user.id)
  ));
}

function groupPendingInvites(thread) {
  if (!thread) return [];
  return (state.data.chatInvites || []).filter((item) => item.threadId === thread.id && item.status === "pending");
}

function renderChatActionCards(friends) {
  return `
    <div class="chat-action-grid">
      <section class="panel chat-action-card">
        <div class="split-head">
          <h3>添加好友</h3>
          <span>对方同意后才会成为好友</span>
        </div>
        <form id="addFriendForm" class="stack compact-auth-form">
          <div class="inline-form">
            <input name="target" placeholder="输入 8 位 ID、ID-姓名或姓名" />
            <button class="primary" type="submit">发送申请</button>
          </div>
          <input name="message" placeholder="申请说明（选填）" maxlength="160" />
        </form>
        <form id="searchUserForm" class="inline-form">
          <input name="query" placeholder="搜索用户" />
          <button class="ghost" type="submit">搜索</button>
        </form>
        <div class="search-results compact-results">
          ${state.searchResults.map((user) => `
            <button type="button" data-add-result="${user.id}">
              ${escapeHtml(user.name)}<span>${user.id} · ${roleName(user.role)}</span>
            </button>
          `).join("")}
        </div>
      </section>
      <section class="panel chat-action-card">
        <div class="split-head">
          <h3>创建群聊</h3>
          <span>好友接受邀请后才会进群</span>
        </div>
        <form id="groupForm" class="stack">
          <input name="name" placeholder="群聊名称" />
          <div class="check-list compact-check-list">
            ${friends.map((friend) => `<label><input type="checkbox" name="member" value="${friend.id}" />${escapeHtml(friend.name)}<span>${friend.id}</span></label>`).join("") || `<span class="hint">先添加好友，再邀请入群。</span>`}
          </div>
          <button class="primary" type="submit">创建并发送邀请</button>
        </form>
      </section>
    </div>
  `;
}

function chatPendingCount() {
  return pendingFriendRequests("incoming").length + pendingChatInvites("incoming").length;
}

function renderChatContactsPanel(friends) {
  const groups = (state.data.chatThreads || []).filter((thread) => thread.type === "group");
  return `
    <section class="chat-contacts-panel">
      <div class="split-head">
        <div>
          <h2>通讯录</h2>
          <p class="hint">好友和群聊集中管理，点击即可打开对应会话。</p>
        </div>
        <span>${friends.length} 好友 · ${groups.length} 群</span>
      </div>
      <div class="contact-directory-grid">
        <section>
          <h3>好友</h3>
          <div class="contact-list">
            ${friends.map((friend) => `
              <div class="contact-row">
                <button type="button" data-open-friend="${friend.id}">${escapeHtml(friend.name)}<span>${friend.id} · ${roleName(friend.role)}</span></button>
                <button class="icon-danger" data-delete-friend="${friend.id}" title="删除好友">×</button>
              </div>
            `).join("") || emptyBlock("暂无好友")}
          </div>
        </section>
        <section>
          <h3>群</h3>
          <div class="conversation-list contact-groups">
            ${groups.map((thread) => `
              <button class="${state.activeThreadId === thread.id ? "active" : ""}" data-thread="${thread.id}">
                <strong>${escapeHtml(thread.name)}</strong>
                <span>${thread.memberIds.length} 人 · ${escapeHtml(threadSubtitle(thread))}</span>
              </button>
            `).join("") || emptyBlock("暂无群聊")}
          </div>
        </section>
      </div>
    </section>
  `;
}

function renderChatToolModal(friends, active) {
  if (!state.chatTool) return "";
  return `
    <div class="modal-backdrop">
      <section class="modal compact-modal chat-tool-modal">
        <button class="modal-close" id="closeChatTool">×</button>
        ${state.chatTool === "pending" ? renderFriendRequestPanel() : ""}
        ${state.chatTool === "contacts" ? renderChatContactsPanel(friends) : ""}
        ${state.chatTool === "thread" ? renderChatInfoPanel(active, friends, true) : ""}
        ${state.chatTool === "friend" ? `
          <h2>添加好友</h2>
          <form id="addFriendForm" class="stack compact-auth-form">
            <input name="target" placeholder="输入 8 位 ID、ID-姓名或姓名" />
            <input name="message" placeholder="申请说明（选填）" maxlength="160" />
            <button class="primary" type="submit">发送申请</button>
          </form>
          <form id="searchUserForm" class="inline-form">
            <input name="query" placeholder="搜索用户" />
            <button class="ghost" type="submit">搜索</button>
          </form>
          <div class="search-results compact-results">
            ${state.searchResults.map((user) => `
              <button type="button" data-add-result="${user.id}">
                ${escapeHtml(user.name)}<span>${user.id} · ${roleName(user.role)}</span>
              </button>
            `).join("")}
          </div>
        ` : ""}
        ${state.chatTool === "group" ? `
          <h2>创建群聊</h2>
          <form id="groupForm" class="stack">
            <input name="name" placeholder="群聊名称" />
            <div class="check-list compact-check-list">
              ${friends.map((friend) => `<label><input type="checkbox" name="member" value="${friend.id}" />${escapeHtml(friend.name)}<span>${friend.id}</span></label>`).join("") || `<span class="hint">先添加好友，再邀请入群。</span>`}
            </div>
            <button class="primary" type="submit">创建并发送邀请</button>
          </form>
        ` : ""}
      </section>
    </div>
  `;
}

function renderFriendRequestPanel() {
  const incoming = pendingFriendRequests("incoming");
  const outgoing = pendingFriendRequests("outgoing");
  const incomingInvites = pendingChatInvites("incoming");
  return `
    <section class="chat-request-panel">
      <h3>待处理</h3>
      <div class="request-list">
        ${incoming.map((request) => {
          const from = chatUser(request.fromUserId);
          return `
            <article class="request-card">
              <strong>${escapeHtml(from?.name || request.fromUserId)}</strong>
              <span>申请添加你为好友 · ${fmtTime(request.createdAt)}</span>
              ${request.message ? `<p>${escapeHtml(request.message)}</p>` : ""}
              <div class="actions">
                <button class="mini primary" data-friend-request-action="accept" data-request-id="${request.id}">同意</button>
                <button class="mini danger" data-friend-request-action="reject" data-request-id="${request.id}">拒绝</button>
              </div>
            </article>
          `;
        }).join("")}
        ${incomingInvites.map((invite) => {
          const from = chatUser(invite.fromUserId);
          const thread = (state.data.chatThreads || []).find((item) => item.id === invite.threadId) || { name: invite.groupName || "群聊邀请" };
          return `
            <article class="request-card">
              <strong>${escapeHtml(thread.name)}</strong>
              <span>${escapeHtml(from?.name || invite.fromUserId)} 邀请你入群 · ${fmtTime(invite.createdAt)}</span>
              <div class="actions">
                <button class="mini primary" data-chat-invite-action="accept" data-invite-id="${invite.id}">同意</button>
                <button class="mini danger" data-chat-invite-action="reject" data-invite-id="${invite.id}">拒绝</button>
              </div>
            </article>
          `;
        }).join("")}
        ${!incoming.length && !incomingInvites.length ? emptyBlock("暂无待处理申请") : ""}
      </div>
      ${outgoing.length ? `
        <h3>已发送</h3>
        <div class="request-list compact">
          ${outgoing.map((request) => `<div class="request-line">${escapeHtml(chatUserLabel(request.toUserId))}<span>等待通过</span></div>`).join("")}
        </div>
      ` : ""}
    </section>
  `;
}

function renderChatSidebar(friends, threads, active) {
  return `
    <aside class="panel chat-directory-panel chat-conversation-panel">
      <section>
        <div class="split-head">
          <div>
            <h3>会话</h3>
            <p class="hint">${friends.length} 位好友 · ${threads.length} 个会话</p>
          </div>
        </div>
        <div class="conversation-list in-panel">
          ${threads.map((thread) => `
            <button class="${active?.id === thread.id ? "active" : ""}" data-thread="${thread.id}">
              <strong>${escapeHtml(thread.name)}</strong>
              <span>${escapeHtml(threadSubtitle(thread))}</span>
            </button>
          `).join("") || emptyBlock("暂无聊天")}
        </div>
      </section>
    </aside>
  `;
}

function renderChatMain(active) {
  if (!active) return `<section class="panel chat-panel standard-chat-panel">${emptyBlock("添加好友、通过申请或创建群聊后即可开始聊天。")}</section>`;
  const canSend = canSendToThread(active);
  return `
    <section class="panel chat-panel standard-chat-panel">
      <div class="chat-thread-head">
        <div>
          <h3>${escapeHtml(active.name)}</h3>
          <span>${escapeHtml(threadSubtitle(active))}</span>
        </div>
        <div class="actions compact-actions">
          <button class="mini" type="button" data-chat-tool="thread">会话设置</button>
          <button class="danger" id="deleteSelectedMessages">删除选中记录</button>
        </div>
      </div>
      <div class="message-stream standard-message-stream">
        ${(active.messages || []).map((message) => {
          const from = chatUser(message.fromUserId);
          const mine = message.fromUserId === state.user.id;
          const system = message.system || message.fromUserId === "system";
          if (system) {
            return `<div class="chat-system-message">${escapeHtml(message.content)}<span>${fmtTime(message.createdAt)}</span></div>`;
          }
          return `
            <label class="chat-message ${mine ? "mine" : ""}">
              <input type="checkbox" data-message-check="${message.id}" ${state.selectedMessages.has(message.id) ? "checked" : ""} />
              <span>${escapeHtml(from?.name || message.fromUserId)} · ${fmtTime(message.createdAt)}</span>
              <p>${escapeHtml(message.content)}</p>
            </label>
          `;
        }).join("") || `<div class="bubble assistant"><span>系统</span><p>还没有消息。</p></div>`}
      </div>
      <form id="chatForm" class="composer">
        <input name="content" placeholder="${canSend ? "输入聊天内容" : "当前不能发送消息"}" ${canSend ? "" : "disabled"} maxlength="2000" />
        <button class="primary" type="submit" ${canSend ? "" : "disabled"}>发送</button>
      </form>
      ${canSend ? "" : `<p class="hint">私聊需双方保持好友关系；群聊需你是当前群成员。</p>`}
    </section>
  `;
}

function renderChatInfoPanel(active, friends, embedded = false) {
  const shellClass = embedded ? "chat-info-panel embedded" : "panel chat-info-panel";
  if (!active) return `<section class="${shellClass}">${emptyBlock("选择会话后显示详情。")}</section>`;
  if (active.type === "direct") {
    const friendId = directFriendId(active);
    const friend = chatUser(friendId);
    return `
      <section class="${shellClass}">
        <h3>好友信息</h3>
        <div class="profile-mini chat-profile-card">
          <strong>${escapeHtml(friend?.name || friendId)}</strong>
          <span>ID：${escapeHtml(friendId)}</span>
          <span>身份：${friend ? roleName(friend.role) : "-"}</span>
        </div>
        <button class="danger wide" data-delete-friend="${friendId}">删除好友</button>
      </section>
    `;
  }
  const owner = chatUser(active.ownerId);
  const isOwner = active.ownerId === state.user.id;
  const pendingIds = new Set(groupPendingInvites(active).map((invite) => invite.toUserId));
  const availableFriends = friends.filter((friend) => !active.memberIds.includes(friend.id) && !pendingIds.has(friend.id));
  const pending = groupPendingInvites(active);
  return `
    <section class="${shellClass}">
      <h3>群聊信息</h3>
      <div class="profile-mini chat-profile-card">
        <strong>${escapeHtml(active.name)}</strong>
        <span>群主：${escapeHtml(owner?.name || active.ownerId || "-")}</span>
        <span>成员：${active.memberIds.length} 人</span>
      </div>
      <h3>成员</h3>
      <div class="member-list">
        ${active.memberIds.map((id) => {
          const user = chatUser(id);
          return `
            <div class="member-row">
              <span>${escapeHtml(user?.name || id)}${id === active.ownerId ? "（群主）" : ""}<small>${escapeHtml(id)}</small></span>
              ${isOwner && id !== state.user.id ? `<button class="mini danger" data-remove-group-member="${id}" data-group-id="${active.id}">移出</button>` : ""}
            </div>
          `;
        }).join("")}
      </div>
      <h3>邀请好友入群</h3>
      <form id="groupInviteForm" class="stack">
        <div class="check-list compact-check-list">
          ${availableFriends.map((friend) => `<label><input type="checkbox" name="member" value="${friend.id}" />${escapeHtml(friend.name)}<span>${friend.id}</span></label>`).join("") || `<span class="hint">没有可邀请的好友。</span>`}
        </div>
        <button class="primary" type="submit" ${availableFriends.length ? "" : "disabled"}>发送入群邀请</button>
      </form>
      ${pending.length ? `
        <h3>待通过邀请</h3>
        <div class="request-list compact">
          ${pending.map((invite) => `<div class="request-line">${escapeHtml(chatUserLabel(invite.toUserId))}<span>等待通过</span></div>`).join("")}
        </div>
      ` : ""}
      <div class="chat-danger-zone">
        ${isOwner ? `<button class="danger wide" id="dissolveGroupBtn">解散群聊</button>` : `<button class="ghost wide" id="leaveGroupBtn">退出群聊</button>`}
      </div>
    </section>
  `;
}

function renderChatPage() {
  const threads = state.data.chatThreads || [];
  const active = threads.find((thread) => thread.id === state.activeThreadId) || threads[0];
  const friends = state.data.friends || [];
  if (active && !state.activeThreadId) state.activeThreadId = active.id;
  return `
    <div class="chat-page-shell">
    <div class="chat-layout standard">
      ${renderChatSidebar(friends, threads, active)}
      ${renderChatMain(active)}
    </div>
    ${renderChatToolModal(friends, active)}
    </div>
  `;
}

function friendRequestToast(payload) {
  if (payload.status === "already_friends") return "你们已经是好友";
  if (payload.status === "accepted_reverse") return "已通过对方的好友申请";
  return "好友申请已发送，等待对方通过";
}

function bindChatPage() {
  document.querySelectorAll("[data-chat-tool]").forEach((button) => {
    button.addEventListener("click", () => {
      state.chatTool = button.dataset.chatTool;
      renderContent();
    });
  });
  document.getElementById("closeChatTool")?.addEventListener("click", () => {
    state.chatTool = null;
    renderContent();
  });
  document.getElementById("addFriendForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const payload = await api("/api/friends", { method: "POST", body: { userId: state.user.id, target: form.get("target"), message: form.get("message") } });
      state.chatTool = null;
      await loadState();
      renderShell();
      showToast(friendRequestToast(payload));
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
        const payload = await api("/api/friends", { method: "POST", body: { userId: state.user.id, target: button.dataset.addResult } });
        state.searchResults = [];
        state.chatTool = null;
        await loadState();
        renderShell();
        showToast(friendRequestToast(payload));
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
  document.querySelectorAll("[data-friend-request-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await api(`/api/friend-requests/${button.dataset.requestId}/respond`, {
          method: "POST",
          body: { userId: state.user.id, action: button.dataset.friendRequestAction }
        });
        await loadState();
        renderShell();
        showToast(button.dataset.friendRequestAction === "accept" ? "已同意好友申请" : "已拒绝好友申请");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
  document.querySelectorAll("[data-chat-invite-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const payload = await api(`/api/chat/invites/${button.dataset.inviteId}/respond`, {
          method: "POST",
          body: { userId: state.user.id, action: button.dataset.chatInviteAction }
        });
        if (payload.thread?.id && button.dataset.chatInviteAction === "accept") state.activeThreadId = payload.thread.id;
        await loadState();
        renderShell();
        showToast(button.dataset.chatInviteAction === "accept" ? "已加入群聊" : "已拒绝群聊邀请");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
  document.querySelectorAll("[data-open-friend]").forEach((button) => {
    button.addEventListener("click", () => {
      const thread = (state.data.chatThreads || []).find((item) => item.type === "direct" && item.memberIds.includes(button.dataset.openFriend));
      if (thread) {
        state.activeThreadId = thread.id;
        state.selectedMessages.clear();
        state.chatTool = null;
        renderContent();
      } else {
        showToast("对方通过好友申请后即可私聊", "error");
      }
    });
  });
  document.querySelectorAll("[data-delete-friend]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("确认删除该好友？聊天记录会保留，但双方不能继续私聊。")) return;
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
      state.chatTool = null;
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
      state.chatTool = null;
      await loadState();
      renderShell();
      showToast(memberIds.length ? "群聊已创建，入群邀请已发送" : "群聊已创建");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.getElementById("groupInviteForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const memberIds = form.getAll("member");
    if (!memberIds.length) return showToast("请选择要邀请的好友", "error");
    try {
      await api(`/api/chat/groups/${state.activeThreadId}/invites`, {
        method: "POST",
        body: { fromUserId: state.user.id, memberIds }
      });
      await loadState();
      renderShell();
      showToast("入群邀请已发送");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.querySelectorAll("[data-remove-group-member]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("确认将该成员移出群聊？")) return;
      try {
        await api(`/api/chat/groups/${button.dataset.groupId}/members/${button.dataset.removeGroupMember}`, {
          method: "DELETE",
          body: { userId: state.user.id }
        });
        await loadState();
        renderShell();
        showToast("成员已移出群聊");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
  document.getElementById("dissolveGroupBtn")?.addEventListener("click", async () => {
    if (!confirm("确认解散该群聊？所有成员都将看不到这个群聊。")) return;
    try {
      await api(`/api/chat/groups/${state.activeThreadId}`, { method: "DELETE", body: { userId: state.user.id } });
      state.activeThreadId = null;
      await loadState();
      renderShell();
      showToast("群聊已解散");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.getElementById("leaveGroupBtn")?.addEventListener("click", async () => {
    if (!confirm("确认退出该群聊？")) return;
    try {
      await api(`/api/chat/groups/${state.activeThreadId}/members/${state.user.id}`, { method: "DELETE", body: { userId: state.user.id } });
      state.activeThreadId = null;
      await loadState();
      renderShell();
      showToast("已退出群聊");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

function renderTeacherClassManagementPage() {
  if (state.user.role !== "teacher") return emptyBlock("学生端不显示班级管理。");
  const classes = state.data.classes || [];
  const active = classes.find((klass) => klass.id === state.selectedClassId) || null;
  if (!active) state.classManageOpen = false;
  const totalStudentIds = new Set(classes.flatMap((klass) => klass.studentIds || []));
  const totalApplications = classes.reduce((sum, klass) => sum + (klass.applications || []).filter((item) => item.status === "pending").length, 0);
  return renderTeacherClassList(classes, active, totalStudentIds, totalApplications);
}

function renderClassLearningPage() {
  if (state.user.role !== "teacher") return emptyBlock("学生端不显示班级学情。");
  const classes = state.data.classes || [];
  const active = classes.find((klass) => klass.id === state.selectedClassId) || null;
  if (!active) return emptyBlock(classes.length
    ? "请先在左侧“所在班级”中选择要查看的班级。"
    : "暂无班级。请在设置中的“我管理的班级”创建班级后查看学情。");
  state.classLearningOpen = true;
  return `
    <div class="class-page-shell class-learning-shell">
      ${renderTeacherLearningDiagnosis(active.id, classes, state.data.submissions || [])}
      ${renderTieredInterventionPanel(active.id, classes)}
    </div>
  `;
}

function renderTeacherClassList(classes, active, totalStudentIds, totalApplications) {
  return `
    <div class="class-page-shell class-course-shell class-management-grid">
      <section class="class-management-heading">
        <div>
          <h2>我管理的班级</h2>
          <p class="hint">查看班级信息，或进入班级管理。</p>
        </div>
        <div class="class-course-summary inline-stats">
          <span>${classes.length}<small>班级</small></span>
          <span>${totalStudentIds.size}<small>总学生</small></span>
          <span>${totalApplications}<small>待审核</small></span>
        </div>
      </section>
      <section class="class-course-board">
        ${classes.length ? `
          <div class="class-management-list">
            ${classes.map((klass) => {
              const count = (klass.studentIds || []).length;
              const pending = (klass.applications || []).filter((item) => item.status === "pending").length;
              return `
                <article class="class-management-row ${active?.id === klass.id ? "active" : ""}">
                  <div class="class-management-row-title">
                    <span>${escapeHtml(klass.subject)}</span>
                    <strong>${escapeHtml(klass.name)}</strong>
                  </div>
                  <div class="class-management-row-actions">
                    <button class="class-management-stat" type="button" data-inline-class-tool="roster" data-class-id="${escapeHtml(klass.id)}"><strong>${count}</strong><small>学生</small></button>
                    <span><strong>${escapeHtml(klass.inviteCode)}</strong><small>邀请码</small></span>
                    <button class="class-management-stat" type="button" data-inline-class-tool="import" data-class-id="${escapeHtml(klass.id)}"><strong>导入</strong><small>学生</small></button>
                    <button class="class-management-stat" type="button" data-inline-class-tool="applications" data-class-id="${escapeHtml(klass.id)}"><strong>${pending}</strong><small>待审核</small></button>
                    <button class="danger class-management-delete" type="button" data-delete-class="${escapeHtml(klass.id)}" data-class-name="${escapeHtml(klass.name)}">解散</button>
                  </div>
                </article>
              `;
            }).join("")}
          </div>
        ` : `
          <div class="class-course-empty">
            <strong>暂无班级</strong>
          </div>
        `}
      </section>
      ${active && state.classTool ? renderClassToolModal(active, active.applications || [], (active.studentIds || []).map((id) => state.data.users.find((user) => user.id === id)).filter(Boolean)) : ""}
    </div>
  `;
}

function classLearningPercent(value, fallback = "未测评") {
  return value === null || value === undefined || value === "" ? fallback : `${Math.round(Number(value) * 100)}%`;
}

function renderClassLearningAnalytics(active) {
  if (!state.classLearningOpen) return "";
  const closeButton = state.page === "classes" ? "" : `<button class="mini" type="button" data-class-learning-close>关闭</button>`;
  const analytics = state.classAnalytics?.class?.id === active.id ? state.classAnalytics : null;
  if (!analytics) {
    const message = state.classAnalyticsError || "正在读取图谱节点、测验、诊断与掌握度证据...";
    return `<section class="panel class-learning-panel"><div class="split-head"><div><h3>班级学情</h3><p class="hint">${escapeHtml(message)}</p></div><div class="row-actions"><button class="mini" type="button" data-refresh-class-learning>刷新</button>${closeButton}</div></div></section>`;
  }
  const selected = state.classStudentAnalytics?.id === state.classAnalyticsStudentId
    ? state.classStudentAnalytics
    : analytics.students.find((student) => student.id === state.classAnalyticsStudentId);
  return `
    <section class="panel class-learning-panel">
      <div class="split-head">
        <div><h3>班级学情</h3><p class="hint">${escapeHtml(analytics.graph ? `${analytics.graph.title} · v${analytics.graph.version}` : "尚未找到本班对应知识图谱")}</p></div>
        <div class="row-actions"><button class="mini" type="button" data-refresh-class-learning>刷新</button>${closeButton}</div>
      </div>
      <div class="dashboard-stats compact class-learning-stats">
        <article class="dashboard-stat"><strong>${analytics.summary.studentCount}</strong><span>班级学生</span></article>
        <article class="dashboard-stat"><strong>${analytics.summary.assessedStudents}</strong><span>已有测评证据</span></article>
        <article class="dashboard-stat"><strong>${classLearningPercent(analytics.summary.averageScore)}</strong><span>平均掌握度</span></article>
        <article class="dashboard-stat"><strong>${analytics.summary.atRiskStudents}</strong><span>需关注学生</span></article>
      </div>
      ${analytics.graph ? `<div class="class-learning-grid">
        <section class="class-learning-section"><h4>节点风险</h4><div class="class-learning-node-list">${analytics.nodes.map((node) => `<div><strong>${escapeHtml(node.label)}</strong><span>${classLearningPercent(node.averageScore)} · ${node.assessedCount} 人有证据 · ${node.weakCount} 人待巩固</span></div>`).join("") || `<p class="hint">暂无可评测节点。</p>`}</div></section>
        <section class="class-learning-section"><h4>学生概览</h4><div class="class-learning-student-list">${analytics.students.map((student) => `<button type="button" class="${selected?.id === student.id ? "active" : ""}" data-class-learning-student="${escapeHtml(student.id)}"><strong>${escapeHtml(student.name)}</strong><span>${classLearningPercent(student.averageScore)} · ${student.assessedCount}/${student.totalNodes} 节点 · ${student.weakNodes.length} 个待巩固</span></button>`).join("") || `<p class="hint">班级暂无学生。</p>`}</div></section>
      </div>` : `<div class="dashboard-empty"><p>请先上传教材并发布包含可评测节点的知识图谱。</p></div>`}
      ${selected ? `<section class="class-student-profile"><div class="split-head"><div><h4>${escapeHtml(selected.name)}的学习证据</h4><p class="hint">平均掌握度 ${classLearningPercent(selected.averageScore)} · 最近学习 ${escapeHtml(selected.lastLearningAt ? fmtTime(selected.lastLearningAt) : "暂无")}</p></div></div><div class="class-student-node-grid">${selected.nodeMastery.map((node) => `<div><strong>${escapeHtml(node.nodeLabel)}</strong><span>${classLearningPercent(node.score)} · ${escapeHtml(node.status || "未测评")} · ${node.evidenceCount} 条证据</span></div>`).join("") || `<p class="hint">暂无节点证据。</p>`}</div><div class="class-student-evidence"><div><h5>近期学习活动</h5>${selected.recentEvents.map((event) => `<p>${escapeHtml(fmtTime(event.occurredAt))} · ${escapeHtml(event.knowledgePoint || event.eventType)} · ${classLearningPercent(event.score, "未评分")}</p>`).join("") || `<p>暂无活动。</p>`}</div><div><h5>最新诊断</h5>${selected.diagnoses.map((item) => `<p>${escapeHtml(item.topic)} · ${classLearningPercent(item.masteryScore)} · ${escapeHtml((item.errorTags || []).join("、") || "暂无错因标签")}</p>`).join("") || `<p>暂无诊断。</p>`}</div></div></section>` : ""}
    </section>
  `;
}

function classApplicationStatusText(status) {
  return {
    pending: "待审核",
    approved: "已同意",
    rejected: "已拒绝"
  }[status] || status || "未知";
}

function renderClassToolModal(active, applications, students = []) {
  if (!state.classTool) return "";
  const pendingApplications = (applications || []).filter((item) => item.status === "pending");
  const modalBody = state.classTool === "roster"
    ? `
      <h2>学生名单</h2>
      <div class="table-list class-student-list class-modal-table">
        ${students.map((student) => `<div><span>${escapeHtml(student.name)}</span><span>${student.id}</span><span>${(student.classIds || []).length} 个班级</span><button class="mini danger" type="button" data-remove-class-student="${student.id}" data-student-name="${escapeHtml(student.name)}" data-class-name="${escapeHtml(active.name)}">移除</button></div>`).join("") || emptyBlock("暂无学生")}
      </div>
    `
    : state.classTool === "applications"
    ? `
      <h2>待审核申请</h2>
      <div class="table-list class-tool-table">
        ${pendingApplications.map((item) => `
          <div>
            <span>${escapeHtml(item.studentName)}</span>
            <span>${escapeHtml(classApplicationStatusText(item.status))}</span>
            <span>${escapeHtml(item.reason)}</span>
            <span class="row-actions">
              <button class="mini primary" type="button" data-class-application-action="accept" data-class-application-id="${escapeHtml(item.id)}">同意</button>
              <button class="mini danger" type="button" data-class-application-action="reject" data-class-application-id="${escapeHtml(item.id)}">拒绝</button>
            </span>
          </div>
        `).join("") || emptyBlock("暂无待审核申请")}
      </div>
    `
    : `
      <h2>导入学生</h2>
      <p class="hint">${escapeHtml(active.name)} · 默认密码 123456。每行一名学生，格式：姓名,8位ID；没有账号的学生会自动创建占位账号。</p>
      <form id="importStudentsForm" class="stack">
        <label>选择名单文件<input id="importStudentsFile" name="file" type="file" accept=".csv,.txt,text/csv,text/plain" /></label>
        <textarea name="students" rows="8" placeholder="张三,20261234&#10;李四,20262345"></textarea>
        <button class="primary" type="submit">导入到 ${escapeHtml(active.name)}</button>
      </form>
    `;
  return `
    <div class="modal-backdrop">
      <section class="modal class-tool-modal">
        <button class="modal-close" id="closeClassTool">×</button>
        ${modalBody}
      </section>
    </div>
  `;
}

function bindClassPage() {
  const activeClass = (state.data.classes || []).find((klass) => klass.id === state.selectedClassId);
  if (state.page === "classes" && activeClass
    && state.classAnalytics?.class?.id !== activeClass.id
    && state.classAnalyticsLoadingFor !== activeClass.id
    && state.classAnalyticsErrorFor !== activeClass.id) {
    state.classAnalyticsLoadingFor = activeClass.id;
    state.classAnalyticsError = "";
    api(`/api/classes/${encodeURIComponent(activeClass.id)}/learning-analytics`).then((payload) => {
      state.classAnalytics = payload.analytics;
      state.classAnalyticsLoadingFor = "";
      state.classAnalyticsErrorFor = "";
      renderContent();
    }).catch((error) => {
      state.classAnalyticsLoadingFor = "";
      state.classAnalyticsError = error.message;
      state.classAnalyticsErrorFor = activeClass.id;
      renderContent();
      showToast(error.message, "error");
    });
  }
  document.querySelectorAll("[data-inline-class-tool]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedClassId = button.dataset.classId;
      rememberTeacherSelectedClass(state.selectedClassId);
      state.classManageOpen = false;
      state.classTool = button.dataset.inlineClassTool;
      renderContent();
    });
  });
  document.querySelectorAll("[data-class]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedClassId = button.dataset.class;
      rememberTeacherSelectedClass(state.selectedClassId);
      state.classTool = null;
      renderContent();
    });
  });
  document.querySelectorAll("[data-class-tool]").forEach((button) => {
    button.addEventListener("click", () => {
      state.classTool = button.dataset.classTool;
      renderContent();
    });
  });
  document.querySelectorAll("[data-class-learning-close]").forEach((button) => {
    button.addEventListener("click", () => {
      state.classLearningOpen = false;
      state.classAnalyticsStudentId = "";
      state.classStudentAnalytics = null;
      renderContent();
    });
  });
  document.querySelector("[data-refresh-class-learning]")?.addEventListener("click", async () => {
    state.classAnalyticsError = "";
    state.classAnalyticsErrorFor = "";
    state.classAnalyticsLoadingFor = state.selectedClassId || "";
    renderContent();
    try {
      const payload = await api(`/api/classes/${encodeURIComponent(state.selectedClassId)}/learning-analytics`);
      state.classAnalytics = payload.analytics;
      state.classAnalyticsLoadingFor = "";
      state.classStudentAnalytics = null;
      renderContent();
    } catch (error) {
      state.classAnalyticsLoadingFor = "";
      state.classAnalyticsError = error.message;
      state.classAnalyticsErrorFor = state.selectedClassId || "";
      renderContent();
      showToast(error.message, "error");
    }
  });
  document.querySelectorAll("[data-class-learning-student]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const payload = await api(`/api/classes/${encodeURIComponent(state.selectedClassId)}/students/${encodeURIComponent(button.dataset.classLearningStudent)}/learning-profile`);
        state.classAnalyticsStudentId = button.dataset.classLearningStudent;
        state.classStudentAnalytics = payload.student;
        renderContent();
      } catch (error) { showToast(error.message, "error"); }
    });
  });
  bindClassLearningDiagnosisPanel();
  document.getElementById("closeClassTool")?.addEventListener("click", () => {
    state.classTool = null;
    renderContent();
  });
  document.querySelectorAll("[data-delete-class]").forEach((button) => {
    button.addEventListener("click", async () => {
      const className = button.dataset.className || "该班级";
      if (!confirm(`确认解散「${className}」？\n\n解散后会移除学生班级关系，并删除该班作业与提交记录。此操作不可恢复。`)) return;
      try {
        const payload = await api(`/api/classes/${button.dataset.deleteClass}`, {
          method: "DELETE",
          body: { teacherId: state.user.id }
        });
        state.selectedClassId = null;
        rememberTeacherSelectedClass("");
        state.classManageOpen = false;
        state.classTool = null;
        await loadState();
        renderShell();
        showToast(`班级已解散，移除 ${payload.removed?.students || 0} 名学生关系`);
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
  document.querySelectorAll("[data-remove-class-student]").forEach((button) => {
    button.addEventListener("click", async () => {
      const studentName = button.dataset.studentName || "该学生";
      const className = button.dataset.className || "该班级";
      if (!confirm(`确认将「${studentName}」移出「${className}」？\n\n移除后该学生将不再看到该班级的作业和资料。`)) return;
      try {
        await api(`/api/classes/${encodeURIComponent(state.selectedClassId)}/students/${encodeURIComponent(button.dataset.removeClassStudent)}`, {
          method: "DELETE"
        });
        await loadState();
        renderShell();
        showToast(`已将「${studentName}」移出「${className}」`);
      } catch (error) {
        showToast(error.message, "error");
      }
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
      state.classTool = null;
      renderShell();
      showToast(`已导入 ${payload.added.length} 名学生`);
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.getElementById("importStudentsFile")?.addEventListener("change", async (event) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const textarea = document.querySelector("#importStudentsForm textarea[name='students']");
      if (textarea) textarea.value = text;
    } catch (error) {
      showToast(error.message || "名单文件读取失败", "error");
    }
  });
  document.querySelectorAll("[data-class-application-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.classApplicationAction;
      try {
        const payload = await api(`/api/classes/${encodeURIComponent(state.selectedClassId)}/applications/${encodeURIComponent(button.dataset.classApplicationId)}`, {
          method: "POST",
          body: { teacherId: state.user.id, action }
        });
        await loadState();
        state.classTool = "applications";
        renderShell();
        showToast(payload.application.status === "approved" ? "已同意学生加入" : "已拒绝申请");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
}

function bindClassLearningDiagnosisPanel() {
  document.getElementById("interventionErrorTag")?.addEventListener("change", (event) => {
    state.interventionErrorTag = event.target.value;
    renderContent();
  });
  document.querySelectorAll("[data-tier-student]").forEach((select) => {
    select.addEventListener("change", () => {
      state.interventionTierOverrides[select.dataset.tierStudent] = select.value;
      renderContent();
    });
  });
  document.getElementById("createTieredInterventionForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const errorTag = String(form.get("errorTag") || "");
    const classId = String(form.get("classId") || "");
    const groups = ["补基础", "巩固", "进阶"].map((tier) => ({ tier, studentIds: [] }));
    form.forEach((value, key) => {
      if (!key.startsWith("tier:")) return;
      const group = groups.find((item) => item.tier === value);
      if (group) group.studentIds.push(key.slice(5));
    });
    try {
      const payload = await api(`/api/classes/${encodeURIComponent(classId)}/interventions`, { method: "POST", body: { teacherId: state.user.id, topic: errorTag, errorTag, description: form.get("description"), dueAt: form.get("dueAt"), resources: String(form.get("resources") || "").split(/；|;/).map((item) => item.trim()).filter(Boolean), groups } });
      state.interventionTierOverrides = {};
      await loadState();
      renderShell();
      showToast(`已确认分层并发布 ${payload.homework.length} 份定向任务`);
    } catch (error) { showToast(error.message, "error"); }
  });
  document.querySelectorAll("[data-error-tag]").forEach((button) => {
    button.addEventListener("click", () => {
      state.interventionErrorTag = button.dataset.errorTag;
      renderContent();
    });
  });
  document.querySelectorAll("[data-class-learning-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.classLearningView = button.dataset.classLearningView;
      renderContent();
    });
  });
}

function classInterventionEvidence(classId, students) {
  const studentIds = new Set(students.map((student) => student.id));
  const errors = new Map();
  const addEvidence = (studentId, tag, evidence) => {
    if (!studentIds.has(studentId) || !tag) return;
    const row = errors.get(tag) || { tag, students: new Set(), evidence: [] };
    row.students.add(studentId);
    if (evidence) row.evidence.push(String(evidence).slice(0, 140));
    errors.set(tag, row);
  };
  (state.data.diagnosisResults || []).forEach((result) => {
    (result.errorTags || []).forEach((tag) => addEvidence(result.studentId, tag, result.evidence?.[0]?.comment || result.finalAnswer));
  });
  (state.data.wrongNotes || []).forEach((note) => addEvidence(note.userId, note.topic, note.analysis));
  return [...errors.values()].sort((a, b) => b.students.size - a.students.size || b.evidence.length - a.evidence.length);
}

function renderTieredInterventionPanel(classId, classes) {
  const active = classes.find((item) => item.id === classId);
  const studentIds = new Set(active?.studentIds || []);
  const students = (state.data.users || []).filter((user) => studentIds.has(user.id) && user.role === "student");
  const mastery = state.data.studentMastery || [];
  const errors = classInterventionEvidence(classId, students);
  const errorTags = errors.length ? errors : [{ tag: "待诊断学生", students: new Set(), evidence: [] }];
  if (!errorTags.some((item) => item.tag === state.interventionErrorTag)) state.interventionErrorTag = errorTags[0].tag;
  const selectedError = state.interventionErrorTag;
  const targetEvidence = errors.find((item) => item.tag === selectedError);
  const groups = { "补基础": [], "巩固": [], "进阶": [] };
  const participants = students.map((student) => {
    const scores = mastery.filter((item) => item.studentId === student.id).map((item) => Number(item.score ?? item.mastery)).filter(Number.isFinite);
    const baseline = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
    const hasError = targetEvidence?.students.has(student.id);
    const suggested = baseline === null ? "巩固" : baseline < .58 ? "补基础" : baseline < .78 ? "巩固" : "进阶";
    const tier = state.interventionTierOverrides[student.id] || (hasError && suggested === "进阶" ? "巩固" : suggested);
    const reason = hasError ? `错因证据：${selectedError}` : baseline === null ? "暂无测评，安排验证任务" : `当前掌握度 ${Math.round(baseline * 100)}%`;
    const item = { student, baseline, tier, reason };
    groups[tier].push(item);
    return item;
  });
  const plans = (state.data.interventionPlans || []).filter((item) => item.classId === classId).slice(0, 3);
  return `<section class="panel tiered-intervention-panel">
    <div class="split-head"><div><span class="cycle-eyebrow">TEACHER-CONFIRMED INTERVENTION</span><h3>确认分层并发布干预任务</h3><p class="hint">系统仅提出建议。教师调整名单后，才会按三层创建定向任务并记录再测结果。</p></div><span class="class-diagnosis-kpi">${participants.length} 名学生待确认</span></div>
    <form id="createTieredInterventionForm" class="tiered-intervention-form">
      <input type="hidden" name="classId" value="${escapeHtml(classId)}" />
      <div class="form-grid"><label>优先错因<select name="errorTag" id="interventionErrorTag">${errorTags.map((item) => `<option value="${escapeHtml(item.tag)}" ${item.tag === selectedError ? "selected" : ""}>${escapeHtml(item.tag)} · ${item.students.size} 人</option>`).join("")}</select></label><label>截止时间<input name="dueAt" type="datetime-local" /></label></div>
      <p class="intervention-evidence"><strong>诊断证据：</strong>${escapeHtml(targetEvidence?.evidence?.[0] || "当前无足够的错因文本证据，任务将以验证性练习确认学情。")}</p>
      <label>任务说明<textarea name="description" rows="2">围绕该错因完成概念辨析、过程练习和一条反思；教师确认评分后作为复测证据。</textarea></label>
      <label>学习资源<input name="resources" value="概念辨析微课；针对性例题；变式复测题" /></label>
      <div class="tiered-student-list">${participants.map((item) => `<div class="tiered-student-row"><div><strong>${escapeHtml(item.student.name)}</strong><small>${escapeHtml(item.reason)}</small></div><span>${item.baseline === null ? "未测评" : `干预前 ${Math.round(item.baseline * 100)}%`}</span><label>分层<select name="tier:${escapeHtml(item.student.id)}" data-tier-student="${escapeHtml(item.student.id)}"><option value="补基础" ${item.tier === "补基础" ? "selected" : ""}>补基础</option><option value="巩固" ${item.tier === "巩固" ? "selected" : ""}>巩固</option><option value="进阶" ${item.tier === "进阶" ? "selected" : ""}>进阶</option></select></label></div>`).join("") || `<p class="hint">当前班级暂无学生，无法发布分层任务。</p>`}</div>
      <div class="tier-summary">${Object.entries(groups).map(([tier, items]) => `<span>${tier} ${items.length} 人</span>`).join("")}</div>
      <button class="primary" type="submit" ${participants.length ? "" : "disabled"}>确认名单并发布三层任务</button>
    </form>
    ${plans.length ? `<div class="intervention-history"><h4>已发布干预</h4>${plans.map((plan) => `<div><strong>${escapeHtml(plan.topic)}</strong><span>目标 ${plan.metrics?.targetCount || 0} 人</span><span>已复测 ${plan.metrics?.retestedCount || 0} 人</span><span>改善率 ${plan.metrics?.retestedCount ? `${plan.metrics.improvementRate}%` : "待复测"}</span></div>`).join("")}</div>` : ""}
  </section>`;
}

function renderTeacherHomeworkPage() {
  const classes = state.data.classes || [];
  if (!classes.length) {
    return `
      <div class="teacher-homework-empty-layout">
      <section class="panel homework-empty-guide">
        <div class="split-head">
          <div>
            <h3>先完成班级初始化</h3>
            <p class="hint">没有班级时无法发布作业。按下面三步完成后，作业发布、学生提交、AI 建议和教师确认才会形成闭环。</p>
          </div>
          <button class="primary" data-dashboard-page="classes">创建班级</button>
        </div>
        <div class="setup-steps">
          <button type="button" data-dashboard-page="classes"><strong>1. 创建班级</strong><span>设置班级名称和学科，生成邀请码。</span></button>
          <button type="button" data-dashboard-page="classes"><strong>2. 导入学生</strong><span>导入学生姓名和 8 位 ID，或让学生用邀请码加入。</span></button>
          <button type="button" disabled><strong>3. 发布作业</strong><span>请先创建班级，之后这里会开放发布按钮。</span></button>
        </div>
      </section>
      <section class="panel homework-create-panel disabled-panel">
        <h3>布置作业</h3>
        <form class="stack">
          <label>标题<input placeholder="作业标题" disabled /></label>
          <label>作业内容<textarea rows="4" placeholder="可填写文字说明" disabled></textarea></label>
          <button class="primary" type="button" disabled>发布作业</button>
          <p class="hint">请先创建班级。</p>
        </form>
      </section>
      </div>
    `;
  }
  const activeClassId = String(state.selectedClassId || "");
  if (!activeClassId) {
    return emptyBlock("请先在左侧选择要管理的班级。未选择班级时不显示或管理作业。");
  }
  const homework = (state.data.homework || []).filter((item) => item.classId === activeClassId);
  const submissions = state.data.submissions || [];
  const board = homeworkBoardColumns(homework, submissions, classes);
  return `
    <div class="teacher-homework-workspace">
    <section class="panel homework-create-panel compact-homework-create">
      <div class="split-head">
        <h3>布置作业</h3>
      </div>
      <form id="createHomeworkForm" class="homework-create-form">
        <input type="hidden" name="classId" value="${escapeHtml(activeClassId)}" />
        <div class="homework-create-row">
          <label>标题<input name="title" placeholder="作业标题" /></label>
          <label>上传图片/视频<input name="attachments" type="file" multiple accept="image/*,video/*" /></label>
          <button class="primary" type="submit">发布作业</button>
        </div>
        <div class="homework-create-fields">
          <label>作业内容<textarea name="description" rows="2" placeholder="可填写文字说明"></textarea></label>
          <label>参考答案<textarea name="answer" rows="2" placeholder="用于 AI 批改匹配"></textarea></label>
          <label>评分标准<textarea name="rubric" rows="2" placeholder="每行一个评分项，例如：核心概念 35分：说明关键定义和条件"></textarea></label>
        </div>
      </form>
    </section>
    <section class="panel homework-board-panel">
      <div class="split-head">
        <div>
          <h3>作业批改看板</h3>
          <p class="hint">${escapeHtml(classes.find((klass) => klass.id === activeClassId)?.name || "当前班级")} · 按真实提交和批改状态统计</p>
        </div>
      </div>
      <div class="homework-kanban">
        ${board.map((column) => `
          <section>
            <strong>${escapeHtml(column.title)} <span>${column.items.length}</span></strong>
            <div>
              ${column.items.slice(0, 8).map((item) => item.published
                ? `<div class="homework-kanban-published-item"><button type="button" data-board-homework="${item.homework.id}" data-edit-homework="${item.homework.id}">${escapeHtml(item.label)}<small>${escapeHtml(item.meta)}</small></button><button class="mini danger" type="button" data-delete-homework="${item.homework.id}">删除</button></div>`
                : `<button type="button" data-board-homework="${item.homework.id}" ${item.pending ? `data-view-pending-homework="${item.homework.id}"` : item.submission ? `data-view-submission="${item.submission.id}"` : ""}>${escapeHtml(item.label)}<small>${escapeHtml(item.meta)}</small></button>`).join("") || `<p class="hint">暂无</p>`}
            </div>
          </section>
        `).join("")}
      </div>
    </section>
    </div>
    ${state.homeworkModal ? renderSubmissionModal() : ""}
    ${state.teacherHomeworkDetailId ? renderTeacherHomeworkDetailModal() : ""}
    ${state.teacherHomeworkPendingId ? renderTeacherHomeworkPendingModal() : ""}
  `;
}

function renderTeacherLearningDiagnosis(classId, classes, submissions) {
  const view = state.classLearningView || "topic";
  const active = classes.find((item) => item.id === classId);
  const studentIds = new Set(active?.studentIds || []);
  const students = (state.data.users || []).filter((user) => studentIds.has(user.id));
  const mastery = (state.data.studentMastery || []).filter((item) => studentIds.has(item.studentId));
  const wrongNotes = (state.data.wrongNotes || []).filter((item) => studentIds.has(item.userId));
  const topicMap = new Map();
  mastery.forEach((item) => { const key = item.topic || item.knowledgePoint || "待定位"; const row = topicMap.get(key) || { topic: key, scores: [], students: new Set() }; row.scores.push(Number(item.score ?? item.mastery ?? 0)); row.students.add(item.studentId); topicMap.set(key, row); });
  const topics = [...topicMap.values()].map((row) => ({ ...row, average: row.scores.length ? row.scores.reduce((a, b) => a + b, 0) / row.scores.length : 0 })).sort((a, b) => a.average - b.average).slice(0, 8);
  const topErrors = classInterventionEvidence(classId, students).map((item) => ({ ...item, count: item.evidence.length || item.students.size })).slice(0, 10);
  const highRisk = students.filter((student) => { const rows = mastery.filter((item) => item.studentId === student.id); return rows.length && rows.reduce((sum, item) => sum + Number(item.score ?? item.mastery ?? 0), 0) / rows.length < 0.58; });
  const graded = submissions.filter((item) => item.status === "graded");
  const improvement = graded.length ? Math.round(graded.filter((item) => Number(item.score || 0) >= 80).length / graded.length * 100) : 0;
  return `<section class="panel class-learning-diagnosis">
    <div class="split-head"><div><span class="cycle-eyebrow">CLASS LEARNING DIAGNOSIS</span><h3>班级学情诊断看板</h3><p class="hint">按知识点、错因和学生三种视图组织干预优先级。</p></div><span class="class-diagnosis-kpi">干预后改善率 ${improvement}%</span></div>
    <div class="diagnosis-view-tabs"><button type="button" class="${view === "topic" ? "active" : ""}" data-class-learning-view="topic">按知识点</button><button type="button" class="${view === "error" ? "active" : ""}" data-class-learning-view="error">按错因</button><button type="button" class="${view === "student" ? "active" : ""}" data-class-learning-view="student">按学生</button></div>
    ${view === "topic" ? `<div class="class-diagnosis-grid"><div><h4>知识点掌握度热力图</h4><div class="mastery-heatmap">${topics.map((item) => `<div class="heatmap-row"><span>${escapeHtml(item.topic)}</span><i><b style="width:${Math.max(4, Math.min(100, item.average * 100))}%"></b></i><strong>${Math.round(item.average * 100)}%</strong></div>`).join("") || `<span class="hint">暂无掌握度数据</span>`}</div></div><div><h4>高频错因 Top 10</h4><div class="class-error-list">${topErrors.map((item, index) => `<button type="button" data-error-tag="${escapeHtml(item.tag)}"><b>${index + 1}</b><span>${escapeHtml(item.tag)}</span><em>${item.students.size} 人</em></button>`).join("") || `<span class="hint">暂无错因数据</span>`}</div></div></div>` : view === "error" ? `<div class="class-diagnosis-grid"><div><h4>错因 Top 10 · 学生覆盖</h4><div class="class-error-list">${topErrors.map((item, index) => `<button type="button" data-error-tag="${escapeHtml(item.tag)}"><b>${index + 1}</b><span>${escapeHtml(item.tag)}</span><em>${item.students.size} 人 · ${item.count} 次</em></button>`).join("") || `<span class="hint">暂无错因数据</span>`}</div></div><div class="ai-intervention-advice"><h4>按错因的干预建议</h4><p>优先选择覆盖人数最多的错因发布任务，采用“概念辨析 → 实验操作 → 变式复测”的分层干预链。</p></div></div>` : `<div class="student-diagnosis-table">${students.map((student) => { const rows = mastery.filter((item) => item.studentId === student.id); const avg = rows.length ? rows.reduce((sum, item) => sum + Number(item.score ?? item.mastery ?? 0), 0) / rows.length : 0; const noteCount = wrongNotes.filter((item) => item.userId === student.id).length; return `<div><strong>${escapeHtml(student.name)}</strong><span>掌握度 ${Math.round(avg * 100)}%</span><span>错因 ${noteCount} 条</span><em>${avg < .58 ? "高风险" : "持续跟踪"}</em></div>`; }).join("") || `<span class="hint">暂无学生学情记录</span>`}</div>`}
    ${view !== "student" ? `<div class="class-diagnosis-bottom"><div><h4>高风险学生</h4><div class="risk-student-list">${highRisk.map((student) => `<span>${escapeHtml(student.name)} <small>需优先干预</small></span>`).join("") || `<span class="hint">当前没有识别到高风险学生</span>`}</div></div><div class="ai-intervention-advice"><h4>AI 教师干预建议</h4><p>${topErrors[0] ? `建议优先针对“${escapeHtml(topErrors[0].tag)}”发布分层任务，覆盖 ${topErrors[0].students.size} 名学生；先用概念辨析，再用实验或变式题验证迁移。` : "完成一次前测或作业批改后，AI 会根据班级错因生成干预建议。"}</p></div></div>` : ""}
  </section>`;
}

function homeworkBoardColumns(homework, submissions, classes) {
  const studentCount = (homeworkItem) => classes.find((klass) => klass.id === homeworkItem.classId)?.studentIds?.length || 0;
  const byHomework = (homeworkItem) => submissions.filter((sub) => sub.homeworkId === homeworkItem.id);
  const columns = [
    { key: "published", title: "已发布作业", items: [] },
    { key: "unsubmitted", title: "待提交", items: [] },
    { key: "done", title: "已完成", items: [] },
    { key: "ai", title: "待 AI 建议", items: [] },
    { key: "confirm", title: "待教师确认", items: [] },
    { key: "recheck", title: "需要复批", items: [] }
  ];
  homework.forEach((item) => {
    const itemSubs = byHomework(item);
    columns[0].items.push({
      homework: item,
      published: true,
      label: item.title,
      meta: `已提交 ${itemSubs.length}/${studentCount(item)} 人`
    });
    const missing = Math.max(0, studentCount(item) - itemSubs.length);
    if (missing) columns[1].items.push({ homework: item, pending: true, label: item.title, meta: `${missing} 人未提交` });
    itemSubs.forEach((sub) => {
      const student = state.data.users.find((user) => user.id === sub.studentId);
      const entry = { homework: item, submission: sub, label: `${student?.name || sub.studentId} · ${item.title}`, meta: fmtTime(sub.updatedAt || sub.createdAt) };
      if (sub.status === "review_pending") columns[4].items.push({ ...entry, meta: `AI 建议 ${sub.aiSuggestedScore ?? "-"} 分` });
      else if (sub.status === "graded") columns[2].items.push({ ...entry, meta: `${sub.score ?? "-"} 分` });
      else if (sub.status === "needs_recheck") columns[5].items.push(entry);
      else columns[3].items.push(entry);
    });
  });
  return columns;
}

function renderTeacherHomeworkDetailModal() {
  const homework = (state.data.homework || []).find((item) => item.id === state.teacherHomeworkDetailId);
  if (!homework) return "";
  const classes = state.data.classes || [];
  return `
    <div class="modal-backdrop">
      <section class="modal large">
        <button class="modal-close" id="closeTeacherHomeworkModal">×</button>
        <h2>${escapeHtml(homework.title)}</h2>
        <form id="editHomeworkForm" class="stack">
          <h3>作业信息</h3>
          <label>班级<select name="classId">${classes.map((klass) => `<option value="${klass.id}" ${klass.id === homework.classId ? "selected" : ""}>${escapeHtml(klass.name)} · ${escapeHtml(klass.subject)}</option>`).join("")}</select></label>
          <label>标题<input name="title" value="${escapeHtml(homework.title)}" /></label>
          <label>作业内容<textarea name="description" rows="5">${escapeHtml(homework.description || "")}</textarea></label>
          <label>追加作业图片/视频<input name="attachments" type="file" multiple accept="image/*,video/*" /></label>
          <label>参考答案<textarea name="answer" rows="5">${escapeHtml(homework.answer || "")}</textarea></label>
          <label>评分标准<textarea name="rubric" rows="5">${escapeHtml(homework.rubricText || (homework.rubric || []).map((item) => `${item.title} ${item.points}分：${item.expected}`).join("\n"))}</textarea></label>
          <button class="primary" type="submit">保存修改</button>
        </form>
      </section>
    </div>
  `;
}

function renderTeacherHomeworkPendingModal() {
  const homework = (state.data.homework || []).find((item) => item.id === state.teacherHomeworkPendingId);
  if (!homework) return "";
  const klass = (state.data.classes || []).find((item) => item.id === homework.classId);
  const submittedIds = new Set((state.data.submissions || []).filter((item) => item.homeworkId === homework.id).map((item) => item.studentId));
  const students = (klass?.studentIds || []).filter((studentId) => !submittedIds.has(studentId)).map((studentId) => (state.data.users || []).find((user) => user.id === studentId) || { id: studentId, name: studentId });
  return `
    <div class="modal-backdrop">
      <section class="modal">
        <button class="modal-close" id="closePendingHomeworkModal">×</button>
        <h2>待提交学生 · ${escapeHtml(homework.title)}</h2>
        <p>共 ${students.length} 名学生待提交。</p>
        <div class="submission-grid compact-submission-grid">
          ${students.map((student) => `<article class="submission-card"><h3>${escapeHtml(student.name)}</h3><p>${escapeHtml(klass?.name || "当前班级")}</p></article>`).join("") || emptyBlock("所有学生均已提交。")}
        </div>
      </section>
    </div>
  `;
}

function renderSubmissionModal() {
  const submission = state.data.submissions.find((item) => item.id === state.homeworkModal);
  if (!submission) return "";
  const homework = state.data.homework.find((item) => item.id === submission.homeworkId);
  const student = state.data.users.find((user) => user.id === submission.studentId);
  const rubricResults = submission.feedback?.rubricResults || [];
  return `
    <div class="modal-backdrop">
      <section class="modal large">
        <button class="modal-close" id="closeSubmissionModal">×</button>
        <h2>确认批改 · ${escapeHtml(homework?.title || "")}</h2>
        <div class="review-layout">
          <div>
            <h3>学生答案</h3>
            <p class="answer-box">${escapeHtml(submission.answerText || "未填写文字答案")}</p>
            ${renderAttachments(submission.attachments)}
            ${submission.aiComment ? `
              <div class="detail-card">
                <strong>AI 批改建议</strong>
                <p>${escapeHtml(submission.aiComment)}</p>
                ${rubricResults.length ? `
                  <div class="table-list">
                    ${rubricResults.map((item) => `<div><span>${escapeHtml(item.title)}</span><span>${item.score}/${item.points} 分</span><span>${escapeHtml(item.comment)}</span></div>`).join("")}
                  </div>
                ` : ""}
              </div>
            ` : ""}
          </div>
          <form id="manualGradeForm" class="stack">
            <p>学生：${escapeHtml(student?.name || submission.studentId)}</p>
            <label>最终分数<input name="score" type="number" min="0" max="100" value="${submission.score ?? submission.aiSuggestedScore ?? ""}" /></label>
            <label>评语<textarea name="comment" rows="5">${escapeHtml(submission.comment || "")}</textarea></label>
            <button class="mini" type="button" data-ai-grade="${submission.id}">生成 AI 建议</button>
            <button class="primary" type="submit">确认最终成绩</button>
          </form>
        </div>
      </section>
    </div>
  `;
}

function bindTeacherHomeworkPage() {
  bindDashboardPageLinks();
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
          rubric: form.get("rubric"),
          attachments
        }
      });
      state.selectedClassId = payload.homework.classId;
      rememberTeacherSelectedClass(state.selectedClassId);
      await loadState();
      renderShell();
      showToast("作业已发布");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.getElementById("interventionErrorTag")?.addEventListener("change", (event) => {
    state.interventionErrorTag = event.target.value;
    renderContent();
  });
  document.querySelectorAll("[data-tier-student]").forEach((select) => {
    select.addEventListener("change", () => {
      state.interventionTierOverrides[select.dataset.tierStudent] = select.value;
      renderContent();
    });
  });
  document.getElementById("createTieredInterventionForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const errorTag = String(form.get("errorTag") || "");
    const classId = String(form.get("classId") || "");
    const groups = ["补基础", "巩固", "进阶"].map((tier) => ({ tier, studentIds: [] }));
    form.forEach((value, key) => {
      if (!key.startsWith("tier:")) return;
      const group = groups.find((item) => item.tier === value);
      if (group) group.studentIds.push(key.slice(5));
    });
    try {
      const payload = await api(`/api/classes/${encodeURIComponent(classId)}/interventions`, { method: "POST", body: { teacherId: state.user.id, topic: errorTag, errorTag, description: form.get("description"), dueAt: form.get("dueAt"), resources: String(form.get("resources") || "").split(/；|;/).map((item) => item.trim()).filter(Boolean), groups } });
      state.interventionTierOverrides = {};
      await loadState(); renderShell(); showToast(`已确认分层并发布 ${payload.homework.length} 份定向任务`);
    } catch (error) { showToast(error.message, "error"); }
  });
  document.querySelectorAll("[data-error-tag]").forEach((button) => {
    button.addEventListener("click", () => {
      state.interventionErrorTag = button.dataset.errorTag;
      renderContent();
    });
  });
  document.querySelectorAll("[data-class-learning-view]").forEach((button) => {
    button.addEventListener("click", () => { state.classLearningView = button.dataset.classLearningView; renderContent(); });
  });
  document.querySelectorAll("[data-teacher-homework]").forEach((card) => {
    card.addEventListener("dblclick", () => {
      state.teacherHomeworkPendingId = null;
      state.teacherHomeworkDetailId = card.dataset.teacherHomework;
      renderContent();
    });
  });
  document.querySelectorAll("[data-edit-homework]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      state.teacherHomeworkPendingId = null;
      state.teacherHomeworkDetailId = button.dataset.editHomework;
      renderContent();
    });
  });
  document.querySelectorAll("[data-view-pending-homework]").forEach((button) => {
    button.addEventListener("click", () => {
      state.teacherHomeworkDetailId = null;
      state.teacherHomeworkPendingId = button.dataset.viewPendingHomework;
      renderContent();
    });
  });
  document.querySelectorAll("[data-delete-homework]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (!confirm("确认删除这份作业？相关学生提交也会删除。")) return;
      try {
        await api(`/api/homework/${button.dataset.deleteHomework}`, {
          method: "DELETE",
          body: { teacherId: state.user.id }
        });
        state.teacherHomeworkDetailId = null;
        state.teacherHomeworkPendingId = null;
        await loadState();
        renderShell();
        showToast("作业已删除");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
  document.getElementById("closeTeacherHomeworkModal")?.addEventListener("click", () => {
    state.teacherHomeworkDetailId = null;
    renderContent();
  });
  document.getElementById("closePendingHomeworkModal")?.addEventListener("click", () => {
    state.teacherHomeworkPendingId = null;
    renderContent();
  });
  document.getElementById("editHomeworkForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const files = form.getAll("attachments").filter((file) => file && file.name);
    try {
      const attachments = await Promise.all(files.map(fileToPayload));
      await api(`/api/homework/${state.teacherHomeworkDetailId}`, {
        method: "PUT",
        body: {
          teacherId: state.user.id,
          classId: form.get("classId"),
          title: form.get("title"),
          description: form.get("description"),
          answer: form.get("answer"),
          rubric: form.get("rubric"),
          attachments
        }
      });
      state.teacherHomeworkDetailId = null;
      state.teacherHomeworkPendingId = null;
      await loadState();
      renderShell();
      showToast("作业已修改");
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
        showToast("AI 批改建议已生成，需教师确认");
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
  const activeClass = activeLearningClass();
  const homeworkList = homework.map((item) => {
    const klass = state.data.classes.find((classItem) => classItem.id === item.classId);
    const submission = submissions.find((sub) => sub.homeworkId === item.id && sub.studentId === state.user.id);
    return `
      <article class="panel homework-card compact-homework-card" data-student-homework="${item.id}">
        <div class="split-head">
          <div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(klass?.name || "")} · ${fmtTime(item.createdAt)}</p>
          </div>
          <strong class="score-badge ${submission?.status === "graded" ? "done" : ""}">${submission?.status === "graded" ? `${submission.score} 分` : (submission ? "待批改" : "未提交")}</strong>
        </div>
        <p>${escapeHtml(compactText(item.description || "双击查看并提交作业", 72))}</p>
        <small>双击查看详情和提交</small>
      </article>
    `;
  }).join("");
  return `
    <div class="student-homework-shell list-state">
    <section class="homework-list compact-homework-list">
      ${homeworkList || emptyBlock(!activeClass ? "请先在学生基本信息中选择正在学习的班级。" : (!(state.data.courseMaterials || []).length ? learningResourceEmptyMessage("个性化练习") : "老师尚未发布个性化练习。"))}
    </section>
    ${state.homeworkDetailId ? renderStudentHomeworkModal() : ""}
    </div>
  `;
}

function renderStudentHomeworkModal() {
  const item = (state.data.homework || []).find((homework) => homework.id === state.homeworkDetailId);
  if (!item) return "";
  const klass = state.data.classes.find((classItem) => classItem.id === item.classId);
  const submission = (state.data.submissions || []).find((sub) => sub.homeworkId === item.id && sub.studentId === state.user.id);
  return `
    <div class="modal-backdrop">
      <section class="modal large">
        <button class="modal-close" id="closeStudentHomeworkModal">×</button>
        <h2>${escapeHtml(item.title)}</h2>
        <p class="hint">${escapeHtml(klass?.name || "")} · ${fmtTime(item.createdAt)} · ${submission?.status === "graded" ? `${submission.score} 分` : (submission ? "待批改" : "未提交")}</p>
        <div class="detail-card">
          <strong>作业内容</strong>
          <p>${escapeHtml(item.description || "无文字说明")}</p>
          ${renderAttachments(item.attachments)}
        </div>
        ${submission?.comment ? `<div class="detail-card"><strong>老师评语</strong><p>${escapeHtml(submission.comment)}</p></div>` : ""}
        <form class="submitHomeworkForm stack" data-homework-id="${item.id}">
          <label>文字答案<textarea name="answerText" rows="5">${escapeHtml(submission?.answerText || "")}</textarea></label>
          <label>上传图片/视频答案<input name="attachments" type="file" accept="image/*,video/*" multiple /></label>
          <button class="primary" type="submit">${submission ? "更新提交" : "提交作业"}</button>
        </form>
      </section>
    </div>
  `;
}

function bindStudentHomeworkPage() {
  bindDashboardPageLinks();
  document.querySelectorAll("[data-student-homework]").forEach((card) => {
    card.addEventListener("dblclick", () => {
      state.homeworkDetailId = card.dataset.studentHomework;
      renderContent();
    });
  });
  document.getElementById("closeStudentHomeworkModal")?.addEventListener("click", () => {
    state.homeworkDetailId = null;
    renderContent();
  });
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

function renderAdminExportSection(section) {
  const rows = section?.rows || [];
  return `
    <article class="admin-export-section">
      <div>
        <strong>${escapeHtml(section?.title || "")}</strong>
        <span>${rows.length} 条</span>
      </div>
      <p>${rows.length ? escapeHtml(Object.values(rows[0]).filter(Boolean).slice(0, 3).join(" · ")) : "暂无数据"}</p>
    </article>
  `;
}

function adminRecordTitle(record, index) {
  return record?.name || record?.title || record?.label || record?.id || `记录 ${index + 1}`;
}

function adminRecordSummary(record = {}) {
  return Object.entries(record)
    .filter(([key, value]) => !["id", "name", "title", "label"].includes(key) && value !== "" && value !== null && value !== undefined)
    .slice(0, 4)
    .map(([key, value]) => {
      if (Array.isArray(value)) return `${key}: ${value.length} 项`;
      if (typeof value === "object") return `${key}: 已记录`;
      return `${key}: ${compactText(String(value), 70)}`;
    })
    .join(" · ") || "暂无附加字段";
}

function adminRecordDetails(section) {
  const selection = state.adminSelectedRecord;
  if (!selection || selection.sectionKey !== section?.key) return emptyBlock("从列表中选择一条记录查看完整业务字段。");
  const record = section.rows?.[selection.rowIndex];
  if (!record) return emptyBlock("所选记录已不存在，请刷新数据。");
  return `
    <div class="admin-record-detail">
      <div class="split-head"><div><h3>${escapeHtml(adminRecordTitle(record, selection.rowIndex))}</h3><p class="hint">${escapeHtml(section.title)} · 已隐藏密码、会话、令牌、密钥与附件二进制内容。</p></div></div>
      <pre>${escapeHtml(JSON.stringify(record, null, 2))}</pre>
    </div>
  `;
}

function renderAdminPage() {
  if (state.user.role !== "admin") return emptyBlock("只有管理员可以访问数据导出。");
  const overview = state.adminOverview;
  const summary = overview?.summary || {};
  const sections = overview?.sections || [];
  const selectedSection = sections.find((section) => section.key === state.adminSection) || sections[0];
  const query = state.adminQuery.trim().toLocaleLowerCase();
  const rows = (selectedSection?.rows || []).map((record, rowIndex) => ({ record, rowIndex }))
    .filter(({ record }) => !query || JSON.stringify(record).toLocaleLowerCase().includes(query));
  return `
    <div class="admin-export-shell">
      <section class="workbench-title admin-export-title">
        <div>
          <h2>管理员项目总览</h2>
          <p>查看学生端与教师端全部已持久化业务数据、运行任务和审计记录；敏感凭证不会返回页面。</p>
        </div>
        <div class="actions compact-actions">
          <button class="mini" type="button" data-admin-refresh>刷新数据</button>
          <button class="mini" type="button" data-admin-export="csv">导出匿名 CSV</button>
        </div>
      </section>
      ${overview ? `
        <section class="dashboard-stats compact admin-export-stats">
          ${renderDashboardStat("学生 / 教师", `${summary.students || 0} / ${summary.teachers || 0}`, `${summary.classes || 0} 个班级`)}
          ${renderDashboardStat("作业提交", summary.submissions || 0, `${summary.learningEvents || 0} 条学习事件`)}
          ${renderDashboardStat("AI 对话", summary.conversations || 0, `${summary.materials || 0} 份资料 · ${summary.graphs || 0} 个图谱`)}
          ${renderDashboardStat("任务异常", summary.failedJobs || 0, `${summary.jobs || 0} 个任务 · ${summary.auditLogs || 0} 条审计`)}
        </section>
        <section class="panel admin-overview-panel">
          <div class="admin-overview-toolbar">
            <label>数据模块<select data-admin-section>${sections.map((section) => `<option value="${escapeHtml(section.key)}" ${section.key === selectedSection?.key ? "selected" : ""}>${escapeHtml(section.title)}（${section.count}）</option>`).join("")}</select></label>
            <label>关键词<input type="search" value="${escapeHtml(state.adminQuery)}" placeholder="检索账号、姓名、班级、作业或记录内容" data-admin-query /></label>
            <span class="hint">更新于 ${escapeHtml(fmtTime(overview.generatedAt))} · 当前 ${rows.length} 条</span>
          </div>
          <div class="admin-overview-grid">
            <nav class="admin-data-nav" aria-label="管理员数据模块">
              ${sections.map((section) => `<button type="button" class="${section.key === selectedSection?.key ? "active" : ""}" data-admin-nav="${escapeHtml(section.key)}"><span>${escapeHtml(section.title)}</span><b>${section.count}</b></button>`).join("")}
            </nav>
            <div class="admin-record-list">
              <div class="split-head"><div><h3>${escapeHtml(selectedSection?.title || "数据记录")}</h3><p class="hint">点击记录查看全部字段。</p></div></div>
              ${rows.length ? `<div class="admin-record-table">${rows.map(({ record, rowIndex }) => `<button type="button" class="${state.adminSelectedRecord?.sectionKey === selectedSection.key && state.adminSelectedRecord?.rowIndex === rowIndex ? "active" : ""}" data-admin-record="${rowIndex}"><strong>${escapeHtml(adminRecordTitle(record, rowIndex))}</strong><span>${escapeHtml(adminRecordSummary(record))}</span></button>`).join("")}</div>` : emptyBlock("没有符合当前筛选条件的记录。")}
            </div>
            <aside class="admin-record-inspector">${adminRecordDetails(selectedSection)}</aside>
          </div>
        </section>
      ` : `
        <section class="panel admin-overview-panel">
          <div class="split-head">
            <h3>加载项目数据</h3>
            <button class="primary" type="button" data-admin-refresh>加载数据</button>
          </div>
          ${emptyBlock("正在加载管理员项目数据。")}
        </section>
      `}
    </div>
  `;
}

async function loadAdminExportPreview() {
  const payload = await api("/api/admin/export?format=json");
  state.adminExport = payload;
}

async function loadAdminOverview() {
  const payload = await api("/api/admin/overview");
  state.adminOverview = payload.overview;
  if (!state.adminOverview.sections.some((section) => section.key === state.adminSection)) {
    state.adminSection = state.adminOverview.sections[0]?.key || "users";
  }
  state.adminSelectedRecord = null;
}

async function downloadAdminExport(format) {
  const printWindow = format === "pdf" ? window.open("", "_blank", "noopener,noreferrer") : null;
  let payload;
  try {
    payload = await api(`/api/admin/export?format=${encodeURIComponent(format)}`);
  } catch (error) {
    if (printWindow) printWindow.close();
    throw error;
  }
  state.adminExport = payload;
  if (payload.format === "pdf") {
    const blob = new Blob([payload.content], { type: payload.mime || "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    if (printWindow) printWindow.location.href = url;
    else window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 15000);
    showToast("已打开 PDF 打印页");
    return;
  }
  downloadText(payload.fileName, payload.content, payload.mime || "text/plain;charset=utf-8");
  showToast(`已导出 ${payload.fileName}`);
}

function bindAdminPage() {
  if (state.user.role !== "admin") return;
  document.querySelectorAll("[data-admin-refresh]").forEach((button) => button.addEventListener("click", async () => {
    try {
      await loadAdminOverview();
      renderContent();
      showToast("管理员项目数据已刷新");
    } catch (error) {
      showToast(error.message, "error");
    }
  }));
  document.querySelector("[data-admin-section]")?.addEventListener("change", (event) => {
    state.adminSection = event.target.value;
    state.adminSelectedRecord = null;
    renderContent();
  });
  document.querySelector("[data-admin-query]")?.addEventListener("input", (event) => {
    state.adminQuery = event.target.value;
    const caret = event.target.selectionStart;
    renderContent();
    const queryInput = document.querySelector("[data-admin-query]");
    queryInput?.focus();
    queryInput?.setSelectionRange(caret, caret);
  });
  document.querySelectorAll("[data-admin-nav]").forEach((button) => button.addEventListener("click", () => {
    state.adminSection = button.dataset.adminNav;
    state.adminSelectedRecord = null;
    renderContent();
  }));
  document.querySelectorAll("[data-admin-record]").forEach((button) => button.addEventListener("click", () => {
    state.adminSelectedRecord = { sectionKey: state.adminSection, rowIndex: Number(button.dataset.adminRecord) };
    renderContent();
  }));
  document.querySelectorAll("[data-admin-export]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await downloadAdminExport(button.dataset.adminExport);
        renderContent();
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
  if (!state.adminOverview) {
    loadAdminOverview()
      .then(() => renderContent())
      .catch((error) => showToast(error.message, "error"));
  }
}

function renderAdminApiPage() {
  if (state.user.role !== "admin") return emptyBlock("只有管理员可以配置 AI 模型。");
  const config = state.adminModelConfig;
  const provider = config?.provider || "openai-compatible";
  return `
    <div class="admin-api-shell">
      <section class="workbench-title admin-api-title">
        <div>
          <h2>配置 API</h2>
          <p>学生端和教师端共用此处保存的模型服务配置，保存后立即生效。</p>
        </div>
      </section>
      <section class="panel admin-api-panel">
        ${config ? `
          <div class="admin-api-status ${config.configured ? "configured" : "unconfigured"}">
            <span>${iconSvg(config.configured ? "check" : "admin", config.configured ? "已配置" : "未配置")}</span>
            <div><strong>${config.configured ? `当前使用：${escapeHtml(config.model)}` : "尚未完成模型配置"}</strong><p>${config.configured ? `最近更新：${escapeHtml(fmtTime(config.updatedAt) || "刚刚")}` : "配置后，学生端和教师端的 AI 助手才能发起模型调用。"}</p></div>
          </div>
          <form id="adminModelConfigForm" class="admin-api-form">
            <label>服务类型
              <select name="provider" id="adminModelProvider">
                <option value="openai-compatible" ${provider === "openai-compatible" ? "selected" : ""}>OpenAI 兼容 API</option>
                <option value="ollama" ${provider === "ollama" ? "selected" : ""}>Ollama</option>
              </select>
            </label>
            <label>API 地址
              <input name="baseUrl" type="url" required value="${escapeHtml(config.baseUrl || "")}" placeholder="https://api.openai.com/v1" />
            </label>
            <label>模型名称
              <input name="model" required value="${escapeHtml(config.model || "")}" placeholder="例如：gpt-4.1-mini" />
            </label>
            <label>超时时间（毫秒）
              <input name="timeoutMs" type="number" min="5000" max="180000" step="1000" required value="${Number(config.timeoutMs || 60000)}" />
            </label>
            <label class="admin-api-key-field">API Key
              <input name="apiKey" type="password" autocomplete="new-password" placeholder="${config.hasApiKey ? "已保存；留空则保持不变" : "请输入 API Key"}" />
              <span>密钥不会回显或返回浏览器。</span>
            </label>
            <label class="check-line admin-api-clear"><input name="clearApiKey" type="checkbox" />清除已保存的 API Key</label>
            <div class="actions admin-api-actions">
              <button class="primary" type="submit">保存配置</button>
              <button class="mini" type="button" data-admin-model-test ${config.configured ? "" : "disabled"}>测试连接</button>
            </div>
          </form>
        ` : emptyBlock("正在加载模型配置。")}
      </section>
    </div>
  `;
}

async function loadAdminModelConfig() {
  const payload = await api("/api/admin/model-config");
  state.adminModelConfig = payload.config;
}

function bindAdminApiPage() {
  if (state.user.role !== "admin") return;
  const form = document.getElementById("adminModelConfigForm");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = new FormData(form);
    const button = form.querySelector('button[type="submit"]');
    setButtonBusy(button, true, "保存中...");
    try {
      const payload = await api("/api/admin/model-config", {
        method: "PUT",
        body: {
          provider: values.get("provider"),
          baseUrl: values.get("baseUrl"),
          model: values.get("model"),
          timeoutMs: values.get("timeoutMs"),
          apiKey: values.get("apiKey"),
          clearApiKey: values.get("clearApiKey") === "on"
        }
      });
      state.adminModelConfig = payload.config;
      renderContent();
      showToast("AI 模型配置已保存，学生端和教师端将立即使用新配置");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      if (button?.isConnected) setButtonBusy(button, false);
    }
  });
  document.querySelector("[data-admin-model-test]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    setButtonBusy(button, true, "测试中...");
    try {
      const payload = await api("/api/admin/model-config/test", { method: "POST", body: {} });
      showToast(`连接成功：${compactText(payload.message, 40)}`);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      if (button.isConnected) setButtonBusy(button, false);
    }
  });
  if (!state.adminModelConfig) {
    loadAdminModelConfig().then(renderContent).catch((error) => showToast(error.message, "error"));
  }
}

function renderSettingsPage() {
  const role = roleName(state.user.role);
  const isStudent = state.user.role === "student";
  const isTeacher = state.user.role === "teacher";
  const classes = state.data.classes || [];
  const users = state.data.users || [];
  return `
    <div class="settings-page-shell">
      <section class="settings-grid">
        <article class="panel settings-card">
          <div class="settings-card-icon">${iconSvg("user", "账户资料")}</div>
          <div>
            <h3>账户资料</h3>
            <p>${escapeHtml(state.user.name)} · ${role} · ID ${escapeHtml(state.user.id)}</p>
          </div>
          <button class="mini" type="button" data-settings-profile>编辑资料</button>
        </article>
        ${isStudent ? `
        <article class="panel settings-card">
          <div class="settings-card-icon">${iconSvg("users", "所在班级")}</div>
          <div>
            <h3>所在班级</h3>
            <p>${escapeHtml(studentClassSummary(classes))}</p>
          </div>
          <button class="mini" type="button" data-settings-classes>查看班级</button>
        </article>
        <article class="panel settings-card">
          <div class="settings-card-icon">${iconSvg("school", "加入班级")}</div>
          <div>
            <h3>加入班级</h3>
            <p>输入教师提供的班级邀请码或班级 ID。</p>
          </div>
          <button class="mini" type="button" data-settings-join>加入班级</button>
        </article>
        ` : ""}
        ${isTeacher ? `
        <article class="panel settings-card">
          <div class="settings-card-icon">${iconSvg("users", "我管理的班级")}</div>
          <div>
            <h3>我管理的班级</h3>
            <p>${classes.length ? `当前管理 ${classes.length} 个班级。` : "创建班级、导入学生并查看班级学情。"}</p>
          </div>
          <button class="mini" type="button" data-settings-teacher-classes>查看班级</button>
        </article>
        ` : ""}
        <article class="panel settings-card">
          <div class="settings-card-icon">${iconSvg("refresh", "数据同步")}</div>
          <div>
            <h3>数据同步</h3>
            <p>刷新后将同步班级、课程、学习记录和消息状态。</p>
          </div>
          <button class="mini" type="button" data-settings-refresh>刷新数据</button>
        </article>
        <article class="panel settings-card settings-card-danger">
          <div class="settings-card-icon">${iconSvg("admin", "账户安全")}</div>
          <div>
            <h3>账户安全</h3>
            <p>退出当前设备上的登录状态。</p>
          </div>
          <button class="mini danger" type="button" data-settings-logout>退出登录</button>
        </article>
      </section>
      ${state.settingsTeacherClassesOpen && isTeacher ? `
        <div class="modal-backdrop">
          <section class="modal teacher-class-management-modal">
            <button class="modal-close" type="button" data-close-settings-teacher-classes>×</button>
            ${renderTeacherClassManagementPage()}
          </section>
        </div>
      ` : ""}
      ${state.settingsEditOpen ? `
        <div class="modal-backdrop">
          <section class="modal compact-modal">
            <button class="modal-close" type="button" data-close-settings-edit>×</button>
            <h2>编辑资料</h2>
            <form id="settingsProfileForm" class="stack">
              <label>${isStudent ? "学号" : "工号"}<input value="${escapeHtml(state.user.id)}" disabled /></label>
              <label>身份<input value="${role}" disabled /></label>
              <label>姓名<input name="name" value="${escapeHtml(state.user.name)}" /></label>
              <label>${isStudent ? "班级" : "任教学科"}<input name="${isStudent ? "className" : "subject"}" value="${escapeHtml(isStudent ? (state.user.className || "") : (state.user.subject || ""))}" /></label>
              <label>邮箱<input name="email" value="${escapeHtml(state.user.email || "")}" /></label>
              <label>电话<input name="phone" value="${escapeHtml(state.user.phone || "")}" /></label>
              <button class="primary" type="submit">保存资料</button>
            </form>
          </section>
        </div>
      ` : ""}
      ${state.settingsJoinOpen && isStudent ? `
        <div class="modal-backdrop">
          <section class="modal compact-modal">
            <button class="modal-close" type="button" data-close-settings-join>×</button>
            <h2>加入班级</h2>
            <form id="settingsJoinClassForm" class="stack">
              <label>班级邀请码或班级 ID<input name="classCode" placeholder="向老师获取班级邀请码" required /></label>
              <button class="primary" type="submit">申请加入</button>
            </form>
          </section>
        </div>
      ` : ""}
      ${state.settingsClassesOpen && isStudent ? `
        <div class="modal-backdrop">
          <section class="modal compact-modal">
            <button class="modal-close" type="button" data-close-settings-classes>×</button>
            <h2>所在班级</h2>
            ${classes.length ? `
              <div class="table-list settings-class-list">
                ${classes.map((klass) => {
                  const teacher = users.find((user) => user.id === klass.teacherId);
                  return `
                    <div>
                      <span class="class-membership-main">
                        <strong>${escapeHtml(klass.name)}</strong>
                        <small>${escapeHtml(klass.subject || "未设置学科")}</small>
                      </span>
                      <span class="class-membership-meta">教师：${escapeHtml(teacher?.name || klass.teacherId || "未设置")}</span>
                      <button class="mini danger" type="button" data-settings-leave-class="${escapeHtml(klass.id)}" data-class-name="${escapeHtml(klass.name)}">退出班级</button>
                    </div>
                  `;
                }).join("")}
              </div>
            ` : emptyBlock("暂未加入班级，可在设置中输入邀请码申请加入。")}
          </section>
        </div>
      ` : ""}
    </div>
  `;
}

function renderStudentGraphToolbar(graph, stats) {
  const filterButtons = [
    { label: "我的路径", key: "all" },
    { label: "当前薄弱", key: "weak" },
    { label: "已掌握", key: "mastered" },
    { label: "误区节点", key: "misconception" }
  ];
  const searchValue = escapeHtml(state.graphSearch || "");
  return `
    <section class="student-graph-toolbar" aria-label="知识图谱工具栏">
      <div class="student-graph-toolbar-heading">
        <div>
          <span>知识图谱</span>
          <strong title="${escapeHtml(graph.title || "知识图谱")}">${escapeHtml(compactText(graph.title || "知识图谱", 34))}</strong>
        </div>
        <span>当前显示 <b>${stats.visibleNodes}/${stats.totalNodes}</b> 个知识点</span>
      </div>
      <div class="student-graph-toolbar-controls">
        <form id="graphSearchForm" class="student-graph-search">
          ${iconSvg("search", "搜索知识点")}
          <input name="query" value="${searchValue}" placeholder="搜索知识点" />
        </form>
        <div class="student-graph-filter-list">
          ${filterButtons.map((item) => `<button type="button" class="${(state.graphNodeFilter || "all") === item.key ? "active" : ""}" data-graph-node-filter="${item.key}">${escapeHtml(item.label)}</button>`).join("")}
        </div>
        <button class="student-graph-layout-button" type="button" data-graph-layer="${state.graphLayer === "overview" ? "relation" : "overview"}" title="切换图谱布局">
          ${iconSvg("refresh", "切换图谱布局")}
        </button>
      </div>
    </section>
  `;
}

function bindSettingsPage() {
  document.querySelector("[data-settings-profile]")?.addEventListener("click", () => {
    state.settingsEditOpen = true;
    renderContent();
  });
  document.querySelector("[data-close-settings-edit]")?.addEventListener("click", () => {
    state.settingsEditOpen = false;
    renderContent();
  });
  document.querySelector("[data-settings-join]")?.addEventListener("click", () => {
    state.settingsJoinOpen = true;
    renderContent();
  });
  document.querySelector("[data-close-settings-join]")?.addEventListener("click", () => {
    state.settingsJoinOpen = false;
    renderContent();
  });
  document.querySelector("[data-settings-classes]")?.addEventListener("click", () => {
    state.settingsClassesOpen = true;
    renderContent();
  });
  document.querySelector("[data-close-settings-classes]")?.addEventListener("click", () => {
    state.settingsClassesOpen = false;
    renderContent();
  });
  document.querySelector("[data-settings-teacher-classes]")?.addEventListener("click", () => {
    state.settingsTeacherClassesOpen = true;
    state.classManageOpen = false;
    state.classTool = null;
    renderContent();
  });
  document.querySelector("[data-close-settings-teacher-classes]")?.addEventListener("click", () => {
    state.settingsTeacherClassesOpen = false;
    state.classManageOpen = false;
    state.classTool = null;
    renderContent();
  });
  document.querySelectorAll("[data-settings-leave-class]").forEach((button) => {
    button.addEventListener("click", async () => {
      const className = button.dataset.className || "该班级";
      if (!confirm(`确认退出「${className}」？\n\n退出后将无法查询该班级的作业、资料和班级信息。`)) return;
      try {
        await api(`/api/classes/${encodeURIComponent(button.dataset.settingsLeaveClass)}/students/${encodeURIComponent(state.user.id)}`, {
          method: "DELETE"
        });
        state.homeworkDetailId = null;
        await loadState();
        renderShell();
        showToast(`已退出「${className}」`);
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
  document.getElementById("settingsProfileForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = { name: form.get("name"), email: form.get("email"), phone: form.get("phone") };
    if (state.user.role === "student") body.className = form.get("className");
    else body.subject = form.get("subject");
    try {
      const payload = await api(`/api/users/${state.user.id}`, { method: "PUT", body });
      state.user = payload.user;
      state.settingsEditOpen = false;
      await loadState();
      renderShell();
      showToast("资料已保存");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.getElementById("settingsJoinClassForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("classCode") || "").trim();
    if (!code) return showToast("请输入班级邀请码或班级 ID", "error");
    try {
      const payload = await api(`/api/classes/${encodeURIComponent(code)}/apply`, {
        method: "POST",
        body: { studentId: state.user.id }
      });
      state.settingsJoinOpen = false;
      await loadState();
      renderShell();
      showToast(payload.application?.status === "pending" ? "申请已提交，等待教师同意" : "已加入班级");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.querySelector("[data-settings-refresh]")?.addEventListener("click", async () => {
    await loadState();
    renderShell();
    showToast("数据已刷新");
  });
  document.querySelector("[data-settings-logout]")?.addEventListener("click", () => {
    document.getElementById("logoutBtn")?.click();
  });
  if (state.user.role === "teacher" && state.settingsTeacherClassesOpen) bindClassPage();
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
