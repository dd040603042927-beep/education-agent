const app = document.getElementById("app");
const toast = document.getElementById("toast");
const DEFAULT_GRAPH_EXTRACTOR = "ai-unlimited-pdf-graph-agent";

const state = {
  user: null,
  data: null,
  page: "ai",
  navOpen: false,
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
    sourceMaterials: []
  },
  graphJobs: [],
  activeConversationId: null,
  aiMode: "qa",
  aiTaskKey: "qa",
  aiTeacherTask: "lesson_plan",
  aiSubject: "",
  aiChapter: "",
  aiKnowledgePoint: "",
  aiClassId: "",
  aiMaterialId: "",
  aiGraphId: "",
  aiGraphNodeId: "",
  aiHomeworkId: "",
  aiSubmissionId: "",
  aiAnswerDepth: "layered",
  aiStudentAnswer: "",
  aiContextEditorOpen: false,
  aiInsightTab: "workflow",
  modelSubject: "",
  modelMode: "ideal",
  modelComponents: [],
  selectedComponentId: null,
  loadedModelId: null,
  modelCodeType: null,
  modelCodeComponentId: null,
  modelCodeDraft: "",
  modelCodeRan: false,
  modelCodeRunning: false,
  modelRunResult: "",
  modelAlgorithmPrompt: "",
  modelCodeMode: "teaching",
  modelDifficulty: "standard",
  modelAlgorithmGenerating: false,
  modelGenerationInfo: null,
  modelExperimentRecord: null,
  mathFunctionExpression: "sin(x)",
  mathFunctionXMin: "-10",
  mathFunctionXMax: "10",
  mathFunctionError: "",
  activeThreadId: null,
  selectedMessages: new Set(),
  selectedClassId: null,
  classManageOpen: false,
  studentCourseClassId: null,
  classTool: null,
  homeworkModal: null,
  homeworkDetailId: null,
  teacherHomeworkDetailId: null,
  materialDetailId: null,
  materialSearch: "",
  materialSubjectFilter: "",
  materialUploadOpen: false,
  materialRagQuestion: "",
  materialRagResult: null,
  profilePanel: null,
  chatTool: null,
  adminExport: null,
  graphViews: {},
  graphNodeModal: null,
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
const AI_DEPTH_OPTIONS = [
  { key: "brief", label: "简洁" },
  { key: "layered", label: "分层" },
  { key: "full", label: "完整" },
  { key: "exam", label: "考试版" }
];
const ML_DIAGNOSIS_WORKFLOW_INFO = {
  name: "机器学习知识点问答与学习诊断助手",
  version: "0.6.0",
  source: "Dify 多 RAG 工作流",
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
  { key: "all", label: "全部" },
  { key: "weak", label: "薄弱" },
  { key: "mastered", label: "已掌握" },
  { key: "core", label: "重点" },
  { key: "resource", label: "有资料" },
  { key: "exercise", label: "有练习" }
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

const teacherMenus = [
  { key: "ai", icon: "bot", label: "AI 助教", section: "教学" },
  { key: "homework", icon: "clipboard", label: "作业管理", section: "教学" },
  { key: "graph", icon: "network", label: "知识图谱", section: "资源" },
  { key: "materials", icon: "files", label: "课程资料", section: "资源" },
  { key: "models", icon: "lab", label: "模型实验室", section: "资源" },
  { key: "classes", icon: "users", label: "班级管理", section: "管理" },
  { key: "chat", icon: "message", label: "师生消息", section: "沟通" },
  { key: "profile", icon: "user", label: "个人信息", section: "账户" }
];

const adminMenus = [
  { key: "admin", icon: "admin", label: "数据导出", section: "管理" }
];

const studentMenus = [
  { key: "ai", icon: "bot", label: "AI 助教", section: "学习" },
  { key: "graph", icon: "network", label: "知识图谱", section: "学习" },
  { key: "courses", icon: "school", label: "我的课程", section: "学习" },
  { key: "homework", icon: "clipboard", label: "作业提交", section: "学习" },
  { key: "models", icon: "lab", label: "模型实验室", section: "资源" },
  { key: "chat", icon: "message", label: "站内消息", section: "沟通" },
  { key: "profile", icon: "user", label: "个人信息", section: "账户" }
];

const MODEL_LABS = {
  物理: {
    title: "物理实验室",
    summary: "力学、电学、光学和运动学组件可组合成真实或理想状态模型。",
    hint: "拖入小车、斜面、弹簧、电路或透镜后，可编辑质量、速度、电压、焦距等参数。",
    showAxes: true,
    components: [
      { type: "cart", icon: "▣", label: "小车", subject: "物理", defaults: { mass: "2kg", velocity: "0m/s", acceleration: "0m/s²" } },
      { type: "slope", icon: "╱", label: "斜面", subject: "物理", defaults: { angle: "30°", friction: "0.20", length: "2m" } },
      { type: "spring", icon: "⌁", label: "弹簧", subject: "物理", defaults: { k: "20N/m", elongation: "0.10m" } },
      { type: "pulley", icon: "○", label: "滑轮", subject: "物理", defaults: { radius: "0.20m", tension: "待测" } },
      { type: "battery", icon: "▥", label: "电源", subject: "物理", defaults: { voltage: "6V", internalResistance: "0Ω" } },
      { type: "resistor", icon: "▱", label: "电阻", subject: "物理", defaults: { resistance: "10Ω", current: "0.6A" } },
      { type: "lens", icon: "◐", label: "透镜", subject: "物理", defaults: { focal: "10cm", objectDistance: "30cm" } },
      { type: "force", icon: "→", label: "力矢量", subject: "物理", defaults: { magnitude: "10N", direction: "0°" } },
      { type: "point", icon: "●", label: "质点", subject: "物理", defaults: { position: "(0,0)", velocity: "v" } },
      { type: "formula", icon: "ƒ", label: "公式块", subject: "通用", defaults: { formula: "F=ma", condition: "理想状态" } }
    ]
  },
  化学: {
    title: "化学实验室",
    summary: "围绕反应装置、溶液、分子结构和实验现象搭建化学模型。",
    hint: "拖入烧杯、滴定管、反应箭头或分子模型，记录浓度、温度、pH、催化剂和现象。",
    showAxes: false,
    components: [
      { type: "beaker", icon: "杯", label: "烧杯", subject: "化学", defaults: { solution: "NaCl(aq)", volume: "100mL", concentration: "0.1mol/L" } },
      { type: "test-tube", icon: "管", label: "试管", subject: "化学", defaults: { reagent: "待加入", observation: "无明显现象" } },
      { type: "burette", icon: "滴", label: "滴定管", subject: "化学", defaults: { titrant: "NaOH", concentration: "0.1000mol/L", endpoint: "酚酞变色" } },
      { type: "burner", icon: "焰", label: "酒精灯", subject: "化学", defaults: { flame: "外焰", temperature: "约600℃" } },
      { type: "molecule", icon: "⚯", label: "分子模型", subject: "化学", defaults: { formula: "H2O", bondAngle: "104.5°" } },
      { type: "ph-meter", icon: "pH", label: "pH计", subject: "化学", defaults: { ph: "7.00", calibration: "已校准" } },
      { type: "reaction", icon: "⇌", label: "反应箭头", subject: "化学", defaults: { equation: "A + B ⇌ C", condition: "常温" } },
      { type: "catalyst", icon: "Cat", label: "催化剂", subject: "化学", defaults: { catalyst: "MnO2", effect: "降低活化能" } },
      { type: "precipitate", icon: "沉", label: "沉淀", subject: "化学", defaults: { color: "白色", substance: "AgCl" } },
      { type: "chem-table", icon: "表", label: "数据表", subject: "化学", defaults: { columns: "时间/温度/pH/现象", rows: "待记录" } }
    ]
  },
  数学: {
    title: "数学建模实验室",
    summary: "输入函数表达式，直接在画布中生成函数图像。",
    hint: "支持 sin(x)、cos(x)、x^2、sqrt(x)、log(x)、exp(x)、abs(x) 等常见表达式。",
    showAxes: true,
    components: []
  },
  生物: {
    title: "生命科学实验室",
    summary: "构建细胞结构、遗传信息、代谢调控、生态关系和实验流程模型。",
    hint: "拖入细胞、DNA、酶、神经元或生态关系，记录结构、功能、变量和实验观察。",
    showAxes: false,
    components: [
      { type: "cell", icon: "胞", label: "细胞", subject: "生物", defaults: { type: "真核细胞", organelle: "细胞核/线粒体" } },
      { type: "dna", icon: "DNA", label: "DNA", subject: "生物", defaults: { sequence: "ATCG", process: "复制/转录" } },
      { type: "protein", icon: "蛋", label: "蛋白质", subject: "生物", defaults: { structure: "一级-四级结构", function: "催化/运输/调控" } },
      { type: "enzyme", icon: "酶", label: "酶反应", subject: "生物", defaults: { substrate: "底物", optimumPh: "7.0", optimumTemp: "37℃" } },
      { type: "neuron", icon: "神", label: "神经元", subject: "生物", defaults: { signal: "动作电位", direction: "轴突末梢" } },
      { type: "microscope", icon: "镜", label: "显微镜", subject: "生物", defaults: { magnification: "400x", sample: "临时装片" } },
      { type: "petri", icon: "皿", label: "培养皿", subject: "生物", defaults: { medium: "LB", colonyCount: "待计数" } },
      { type: "population", icon: "群", label: "种群", subject: "生物", defaults: { size: "N", growthModel: "Logistic" } },
      { type: "ecosystem", icon: "链", label: "生态关系", subject: "生物", defaults: { relation: "捕食/竞争/互利", energyFlow: "单向流动" } },
      { type: "pathway", icon: "路", label: "代谢通路", subject: "生物", defaults: { pathway: "糖酵解", regulation: "反馈抑制" } }
    ]
  },
  机器学习: {
    title: "机器学习算法实验室",
    summary: "输入想要实现的算法，由 AI 先检索课程资料，再生成并运行 Python 代码。",
    hint: "生成后可直接查看代码、真实运行 stdout/stderr，并保存为自己的算法实验。",
    showAxes: false,
    components: [
      { type: "ml-knn", icon: "KNN", label: "K近邻", subject: "机器学习", kind: "algorithm", defaults: { task: "分类", k: "5", distance: "欧氏距离" } },
      { type: "ml-linear-regression", icon: "LR", label: "线性回归", subject: "机器学习", kind: "algorithm", defaults: { task: "回归", loss: "MSE", optimizer: "梯度下降" } },
      { type: "ml-logistic-regression", icon: "Log", label: "逻辑回归", subject: "机器学习", kind: "algorithm", defaults: { task: "二分类", loss: "BCE", regularization: "L2" } },
      { type: "ml-decision-tree", icon: "Tree", label: "决策树", subject: "机器学习", kind: "algorithm", defaults: { criterion: "gini/entropy", maxDepth: "4" } },
      { type: "ml-random-forest", icon: "RF", label: "随机森林", subject: "机器学习", kind: "algorithm", defaults: { estimators: "100", sampling: "bootstrap" } },
      { type: "ml-svm", icon: "SVM", label: "支持向量机", subject: "机器学习", kind: "algorithm", defaults: { kernel: "rbf", C: "1.0" } },
      { type: "ml-kmeans", icon: "KM", label: "K-Means", subject: "机器学习", kind: "algorithm", defaults: { task: "聚类", clusters: "3" } },
      { type: "ml-pca", icon: "PCA", label: "主成分分析", subject: "机器学习", kind: "algorithm", defaults: { components: "2", goal: "降维" } },
      { type: "ml-naive-bayes", icon: "NB", label: "朴素贝叶斯", subject: "机器学习", kind: "algorithm", defaults: { model: "GaussianNB", assumption: "条件独立" } },
      { type: "ml-gmm", icon: "GMM", label: "高斯混合", subject: "机器学习", kind: "algorithm", defaults: { components: "3", optimizer: "EM" } },
      { type: "ml-mlp", icon: "MLP", label: "多层感知机", subject: "机器学习", kind: "algorithm", defaults: { layers: "64-32", activation: "ReLU" } },
      { type: "ml-cnn", icon: "空白", label: "空白画布", subject: "机器学习", kind: "algorithm", defaults: {} }
    ]
  },
  通用: {
    title: "通用模型实验室",
    summary: "用于其他学科的概念、流程、公式和数据记录。",
    hint: "拖入概念节点、流程箭头、公式块或数据表，搭建可保存的学科模型。",
    showAxes: true,
    components: [
      { type: "axis", icon: "＋", label: "坐标系", subject: "通用", defaults: { scale: "1:1" } },
      { type: "concept", icon: "点", label: "概念节点", subject: "通用", defaults: { name: "核心概念", relation: "关联" } },
      { type: "process", icon: "→", label: "流程箭头", subject: "通用", defaults: { from: "步骤A", to: "步骤B" } },
      { type: "formula", icon: "ƒ", label: "公式块", subject: "通用", defaults: { formula: "待填写", condition: "适用条件" } },
      { type: "data-table", icon: "表", label: "数据表", subject: "通用", defaults: { columns: "变量/单位/结果", rows: "待记录" } },
      { type: "note", icon: "记", label: "备注", subject: "通用", defaults: { note: "记录现象、推理或结论" } }
    ]
  }
};

const MODEL_TEMPLATES = {
  物理: [
    { key: "physics-cart-slope", title: "小车斜面", types: ["slope", "cart", "force"], hint: "观察斜面角度、摩擦和合力对加速度的影响。" },
    { key: "physics-spring", title: "弹簧振子", types: ["spring", "point", "formula"], hint: "修改弹性系数和伸长量，推导回复力。" },
    { key: "physics-ohm", title: "电路欧姆定律", types: ["battery", "resistor", "formula"], hint: "调整电压和电阻，验证 I=U/R。" }
  ],
  数学: [
    { key: "math-function", title: "函数图像", types: ["coordinate", "function-curve", "math-formula"], hint: "查看函数表达式、定义域和图像关系。" },
    { key: "math-tangent", title: "导数切线", types: ["coordinate", "function-curve", "tangent"], hint: "修改切点，观察导数几何意义。" },
    { key: "math-probability", title: "概率分布", types: ["probability", "data-table", "math-formula"], hint: "记录分布参数、期望和方差。" }
  ],
  机器学习: [
    { key: "ml-knn-template", title: "KNN 分类", types: ["ml-knn"], hint: "运行 Iris 分类示例，修改 K 值和距离度量。" },
    { key: "ml-linear-template", title: "线性回归", types: ["ml-linear-regression"], hint: "运行合成回归数据，观察参数和 R2。" },
    { key: "ml-logistic-template", title: "逻辑回归", types: ["ml-logistic-regression"], hint: "运行二分类示例，查看概率输出。" },
    { key: "ml-kmeans-template", title: "K-Means", types: ["ml-kmeans"], hint: "运行三簇聚类示例，查看轮廓系数。" }
  ]
};

const ML_ALGORITHM_MODELS = {
  "ml-knn": {
    title: "K近邻分类",
    chapter: "监督学习 · 基于实例的分类",
    result: "点击“运行测试”后会真实执行标准库 KNN 代码，并输出准确率与预测结果。",
    code: `import math
from collections import Counter

train = [
    ([5.1, 3.5, 1.4, 0.2], "setosa"),
    ([4.9, 3.0, 1.4, 0.2], "setosa"),
    ([6.2, 3.4, 5.4, 2.3], "virginica"),
    ([5.9, 3.0, 5.1, 1.8], "virginica"),
    ([6.0, 2.2, 4.0, 1.0], "versicolor"),
    ([5.6, 2.9, 3.6, 1.3], "versicolor"),
]
test = [
    ([5.0, 3.4, 1.5, 0.2], "setosa"),
    ([6.1, 2.8, 4.7, 1.2], "versicolor"),
    ([6.5, 3.0, 5.5, 1.8], "virginica"),
]

def euclidean(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))

def predict(sample, k=3):
    neighbors = sorted((euclidean(sample, x), label) for x, label in train)[:k]
    return Counter(label for _, label in neighbors).most_common(1)[0][0]

k = 3
correct = sum(1 for x, y in test if predict(x, k) == y)
query = [5.7, 2.8, 4.1, 1.3]
print("算法: K近邻分类")
print("训练样本数:", len(train), "测试样本数:", len(test), "k:", k)
print("测试准确率:", round(correct / len(test), 3))
print("预测样本:", query, "=>", predict(query, k))`
  },
  "ml-linear-regression": {
    title: "线性回归",
    chapter: "监督学习 · 回归与最小二乘",
    result: "点击“运行测试”后会真实执行梯度下降线性回归，并输出损失、参数和 R2。",
    code: `import random

random.seed(7)
data = []
for i in range(60):
    x1 = random.uniform(-3, 3)
    x2 = random.uniform(-2, 2)
    y = 2.8 * x1 - 1.7 * x2 + 4.2 + random.uniform(-0.18, 0.18)
    data.append((x1, x2, y))

w1 = w2 = b = 0.0
lr = 0.025
for epoch in range(700):
    g1 = g2 = gb = loss = 0.0
    for x1, x2, y in data:
        pred = w1 * x1 + w2 * x2 + b
        err = pred - y
        loss += err * err
        g1 += 2 * err * x1
        g2 += 2 * err * x2
        gb += 2 * err
    n = len(data)
    w1 -= lr * g1 / n
    w2 -= lr * g2 / n
    b -= lr * gb / n
    if epoch in (0, 100, 300, 699):
        print(f"epoch={epoch} mse={loss/n:.5f}")

mean_y = sum(y for _, _, y in data) / len(data)
ss_tot = sum((y - mean_y) ** 2 for _, _, y in data)
ss_res = sum((w1 * x1 + w2 * x2 + b - y) ** 2 for x1, x2, y in data)
print("算法: 线性回归（梯度下降）")
print("参数:", {"w1": round(w1, 3), "w2": round(w2, 3), "b": round(b, 3)})
print("R2:", round(1 - ss_res / ss_tot, 4))
print("预测 x=(1.5,-0.8):", round(w1 * 1.5 + w2 * -0.8 + b, 3))`
  },
  "ml-logistic-regression": {
    title: "逻辑回归",
    chapter: "监督学习 · 线性分类模型",
    result: "点击“运行测试”后会真实执行逻辑回归训练，并输出参数、准确率和样本概率。",
    code: `import math

data = [
    (0.2, 1.1, 0), (0.7, 1.4, 0), (1.0, 0.8, 0), (1.3, 1.2, 0),
    (2.1, 2.0, 1), (2.4, 2.5, 1), (2.8, 2.2, 1), (3.0, 2.9, 1),
]

def sigmoid(z):
    return 1 / (1 + math.exp(-z))

w1 = w2 = b = 0.0
lr = 0.35
for epoch in range(500):
    g1 = g2 = gb = loss = 0.0
    for x1, x2, y in data:
        p = sigmoid(w1 * x1 + w2 * x2 + b)
        err = p - y
        g1 += err * x1
        g2 += err * x2
        gb += err
        loss += -(y * math.log(p + 1e-9) + (1 - y) * math.log(1 - p + 1e-9))
    n = len(data)
    w1 -= lr * g1 / n
    w2 -= lr * g2 / n
    b -= lr * gb / n

predictions = []
for x1, x2, y in data:
    prob = sigmoid(w1 * x1 + w2 * x2 + b)
    predictions.append((prob >= 0.5) == bool(y))
print("算法: 逻辑回归二分类")
print("参数:", {"w1": round(w1, 3), "w2": round(w2, 3), "b": round(b, 3)})
print("训练准确率:", round(sum(predictions) / len(predictions), 3))
sample = (1.8, 1.7)
print("样本概率:", round(sigmoid(w1 * sample[0] + w2 * sample[1] + b), 4))`
  },
  "ml-decision-tree": {
    title: "决策树",
    chapter: "监督学习 · 树模型与可解释规则",
    result: "点击“运行测试”后会真实执行 CART 风格决策树，并输出根节点、增益和准确率。",
    code: `from collections import Counter

train = [
    ([5.1, 3.5, 1.4, 0.2], "setosa"), ([4.9, 3.0, 1.4, 0.2], "setosa"),
    ([5.0, 3.4, 1.5, 0.2], "setosa"), ([6.0, 2.2, 4.0, 1.0], "versicolor"),
    ([5.6, 2.9, 3.6, 1.3], "versicolor"), ([6.1, 2.8, 4.7, 1.2], "versicolor"),
    ([6.2, 3.4, 5.4, 2.3], "virginica"), ([5.9, 3.0, 5.1, 1.8], "virginica"),
    ([6.5, 3.0, 5.5, 1.8], "virginica"),
]
test = [
    ([5.4, 3.4, 1.7, 0.2], "setosa"),
    ([6.3, 2.5, 4.9, 1.5], "versicolor"),
    ([6.7, 3.1, 5.6, 2.4], "virginica"),
]
feature_names = ["sepal_len", "sepal_width", "petal_len", "petal_width"]

def majority(rows):
    return Counter(label for _, label in rows).most_common(1)[0][0]

def gini(rows):
    total = len(rows)
    counts = Counter(label for _, label in rows)
    return 1 - sum((count / total) ** 2 for count in counts.values())

def best_split(rows):
    base = gini(rows)
    best = None
    for feature in range(len(rows[0][0])):
        values = sorted(set(x[feature] for x, _ in rows))
        thresholds = [(a + b) / 2 for a, b in zip(values, values[1:])]
        for threshold in thresholds:
            left = [row for row in rows if row[0][feature] <= threshold]
            right = [row for row in rows if row[0][feature] > threshold]
            if not left or not right:
                continue
            score = (len(left) * gini(left) + len(right) * gini(right)) / len(rows)
            gain = base - score
            if best is None or gain > best["gain"]:
                best = {"feature": feature, "threshold": threshold, "gain": gain, "left": left, "right": right}
    return best

def build_tree(rows, depth=0, max_depth=3):
    labels = {label for _, label in rows}
    if len(labels) == 1 or depth >= max_depth:
        return {"label": majority(rows), "samples": len(rows)}
    split = best_split(rows)
    if not split or split["gain"] <= 0:
        return {"label": majority(rows), "samples": len(rows)}
    return {
        "feature": split["feature"],
        "threshold": split["threshold"],
        "gain": split["gain"],
        "left": build_tree(split["left"], depth + 1, max_depth),
        "right": build_tree(split["right"], depth + 1, max_depth),
    }

def predict(tree, sample):
    if "label" in tree:
        return tree["label"]
    branch = "left" if sample[tree["feature"]] <= tree["threshold"] else "right"
    return predict(tree[branch], sample)

tree = build_tree(train)
correct = sum(1 for x, y in test if predict(tree, x) == y)
root = f'{feature_names[tree["feature"]]} <= {tree["threshold"]:.2f}'
print("算法: 决策树分类")
print("根节点:", root, "gini_gain:", round(tree["gain"], 4))
print("测试准确率:", round(correct / len(test), 3))
print("预测样本:", test[1][0], "=>", predict(tree, test[1][0]))`
  },
  "ml-random-forest": {
    title: "随机森林",
    chapter: "集成学习 · Bagging 与特征重要性",
    result: "点击“运行测试”后会真实执行 Bagging + 随机特征桩，并输出投票结果。",
    code: `import random
from collections import Counter

random.seed(12)
train = []
for _ in range(18):
    x1 = random.gauss(0.8, 0.35)
    x2 = random.gauss(1.0, 0.35)
    train.append(((x1, x2), "low_risk"))
for _ in range(18):
    x1 = random.gauss(2.5, 0.45)
    x2 = random.gauss(2.7, 0.45)
    train.append(((x1, x2), "high_risk"))
test = [((0.7, 1.2), "low_risk"), ((2.7, 2.4), "high_risk"), ((1.0, 0.6), "low_risk"), ((2.2, 3.0), "high_risk")]

def majority(rows):
    return Counter(label for _, label in rows).most_common(1)[0][0]

def gini(rows):
    total = len(rows)
    counts = Counter(label for _, label in rows)
    return 1 - sum((count / total) ** 2 for count in counts.values())

def best_stump(rows, feature):
    values = sorted(set(x[feature] for x, _ in rows))
    best = None
    for threshold in [(a + b) / 2 for a, b in zip(values, values[1:])]:
        left = [row for row in rows if row[0][feature] <= threshold]
        right = [row for row in rows if row[0][feature] > threshold]
        if not left or not right:
            continue
        score = (len(left) * gini(left) + len(right) * gini(right)) / len(rows)
        if best is None or score < best["score"]:
            best = {
                "feature": feature,
                "threshold": threshold,
                "left": majority(left),
                "right": majority(right),
                "score": score,
            }
    return best

forest = []
for _ in range(9):
    sample = [random.choice(train) for _ in train]
    feature = random.randrange(2)
    forest.append(best_stump(sample, feature))

def predict(sample):
    votes = []
    for tree in forest:
        votes.append(tree["left"] if sample[tree["feature"]] <= tree["threshold"] else tree["right"])
    return Counter(votes).most_common(1)[0][0], Counter(votes)

correct = 0
for x, y in test:
    label, _ = predict(x)
    correct += int(label == y)
print("算法: 随机森林分类（Bagging + 随机特征桩）")
print("树数量:", len(forest), "特征使用次数:", dict(Counter(tree["feature"] for tree in forest)))
print("测试准确率:", round(correct / len(test), 3))
sample = (2.4, 2.8)
label, votes = predict(sample)
print("预测样本:", sample, "=>", label, "votes:", dict(votes))`
  },
  "ml-svm": {
    title: "支持向量机",
    chapter: "监督学习 · 间隔最大化与核函数",
    result: "点击“运行测试”后会真实执行线性 SVM 的 hinge loss 更新，并输出间隔违反次数。",
    code: `data = [
    ((-2.0, -1.2), -1), ((-1.5, -1.0), -1), ((-1.2, -2.0), -1), ((-2.2, -1.7), -1),
    ((1.4, 1.2), 1), ((2.0, 1.5), 1), ((1.7, 2.2), 1), ((2.4, 1.8), 1),
]
w1 = w2 = b = 0.0
lr = 0.03
c = 1.0
for epoch in range(700):
    errors = 0
    for (x1, x2), y in data:
        margin = y * (w1 * x1 + w2 * x2 + b)
        if margin < 1:
            w1 = w1 * (1 - lr) + lr * c * y * x1
            w2 = w2 * (1 - lr) + lr * c * y * x2
            b += lr * c * y
            errors += 1
        else:
            w1 *= 1 - lr
            w2 *= 1 - lr
    if epoch in (0, 50, 200, 699):
        print(f"epoch={epoch} hinge_violations={errors}")

def predict(sample):
    score = w1 * sample[0] + w2 * sample[1] + b
    return 1 if score >= 0 else -1, score

correct = sum(1 for x, y in data if predict(x)[0] == y)
sample = (1.2, 1.4)
label, score = predict(sample)
print("算法: 线性支持向量机")
print("参数:", {"w1": round(w1, 3), "w2": round(w2, 3), "b": round(b, 3)})
print("训练准确率:", round(correct / len(data), 3))
print("预测样本:", sample, "=>", label, "decision_score:", round(score, 3))`
  },
  "ml-kmeans": {
    title: "K-Means 聚类",
    chapter: "无监督学习 · 原型聚类",
    result: "点击“运行测试”后会真实执行 K-Means 迭代，并输出簇中心、簇大小和 SSE。",
    code: `import math

points = [
    (1.0, 1.2), (1.2, 0.9), (0.8, 1.1),
    (4.0, 4.1), (4.2, 3.8), (3.8, 4.0),
    (7.0, 1.0), (7.3, 1.3), (6.8, 0.7),
]
centers = [(1.0, 1.0), (4.0, 4.0), (7.0, 1.0)]

def distance(a, b):
    return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)

for epoch in range(8):
    groups = [[] for _ in centers]
    for p in points:
        idx = min(range(len(centers)), key=lambda i: distance(p, centers[i]))
        groups[idx].append(p)
    centers = [
        (sum(x for x, _ in group) / len(group), sum(y for _, y in group) / len(group))
        for group in groups
    ]

sse = sum(min(distance(p, c) ** 2 for c in centers) for p in points)
print("算法: K-Means 聚类")
print("簇中心:", [(round(x, 3), round(y, 3)) for x, y in centers])
print("簇大小:", [len(group) for group in groups])
print("SSE:", round(sse, 4))`
  },
  "ml-pca": {
    title: "主成分分析 PCA",
    chapter: "无监督学习 · 降维与特征压缩",
    result: "点击“运行测试”后会真实计算协方差矩阵和第一主成分，并输出解释方差比。",
    code: `import math

points = [
    (2.5, 2.4), (0.5, 0.7), (2.2, 2.9), (1.9, 2.2), (3.1, 3.0),
    (2.3, 2.7), (2.0, 1.6), (1.0, 1.1), (1.5, 1.6), (1.1, 0.9),
]
mean_x = sum(x for x, _ in points) / len(points)
mean_y = sum(y for _, y in points) / len(points)
centered = [(x - mean_x, y - mean_y) for x, y in points]
cov_xx = sum(x * x for x, _ in centered) / (len(points) - 1)
cov_xy = sum(x * y for x, y in centered) / (len(points) - 1)
cov_yy = sum(y * y for _, y in centered) / (len(points) - 1)

v = (1.0, 0.0)
for _ in range(30):
    nx = cov_xx * v[0] + cov_xy * v[1]
    ny = cov_xy * v[0] + cov_yy * v[1]
    norm = math.sqrt(nx * nx + ny * ny)
    v = (nx / norm, ny / norm)

eigenvalue = v[0] * (cov_xx * v[0] + cov_xy * v[1]) + v[1] * (cov_xy * v[0] + cov_yy * v[1])
total_variance = cov_xx + cov_yy
projections = [x * v[0] + y * v[1] for x, y in centered]
print("算法: PCA 主成分分析")
print("均值:", (round(mean_x, 3), round(mean_y, 3)))
print("第一主成分:", (round(v[0], 4), round(v[1], 4)))
print("解释方差比:", round(eigenvalue / total_variance, 4))
print("前3个投影:", [round(value, 4) for value in projections[:3]])`
  },
  "ml-naive-bayes": {
    title: "朴素贝叶斯",
    chapter: "概率学习 · 条件独立假设",
    result: "点击“运行测试”后会真实执行带拉普拉斯平滑的朴素贝叶斯，并输出后验分数。",
    code: `import math

data = [
    (("sunny", "hot"), "no"), (("sunny", "mild"), "no"), (("overcast", "hot"), "yes"),
    (("rain", "mild"), "yes"), (("rain", "cool"), "yes"), (("sunny", "cool"), "no"),
    (("overcast", "cool"), "yes"), (("rain", "hot"), "yes"),
]
classes = sorted(set(label for _, label in data))
feature_values = [sorted(set(x[i] for x, _ in data)) for i in range(2)]

def predict(sample):
    scores = {}
    for label in classes:
        subset = [x for x, y in data if y == label]
        prior = (len(subset) + 1) / (len(data) + len(classes))
        logp = math.log(prior)
        for i, value in enumerate(sample):
            count = sum(1 for x in subset if x[i] == value)
            prob = (count + 1) / (len(subset) + len(feature_values[i]))
            logp += math.log(prob)
        scores[label] = logp
    return max(scores, key=scores.get), scores

sample = ("rain", "cool")
label, scores = predict(sample)
print("算法: 朴素贝叶斯分类")
print("样本:", sample, "预测:", label)
print("类别对数概率:", {k: round(v, 4) for k, v in scores.items()})`
  },
  "ml-gmm": {
    title: "高斯混合模型 GMM",
    chapter: "概率模型 · EM 算法",
    result: "点击“运行测试”后会真实执行一维 GMM 的 EM 迭代，并输出权重、均值、方差和责任度。",
    code: `import math

data = [-2.4, -2.1, -1.8, -1.5, -1.2, 1.2, 1.5, 1.8, 2.0, 2.4, 2.7]
weights = [0.5, 0.5]
means = [-1.8, 1.8]
variances = [0.7, 0.7]

def normal_pdf(x, mean, var):
    return math.exp(-((x - mean) ** 2) / (2 * var)) / math.sqrt(2 * math.pi * var)

for epoch in range(25):
    responsibilities = []
    for x in data:
        probs = [weights[k] * normal_pdf(x, means[k], variances[k]) for k in range(2)]
        total = sum(probs)
        responsibilities.append([p / total for p in probs])
    for k in range(2):
        nk = sum(r[k] for r in responsibilities)
        means[k] = sum(r[k] * x for r, x in zip(responsibilities, data)) / nk
        variances[k] = sum(r[k] * (x - means[k]) ** 2 for r, x in zip(responsibilities, data)) / nk
        weights[k] = nk / len(data)
    if epoch in (0, 4, 24):
        log_likelihood = sum(math.log(sum(weights[k] * normal_pdf(x, means[k], variances[k]) for k in range(2))) for x in data)
        print(f"epoch={epoch + 1} log_likelihood={log_likelihood:.4f}")

sample = 1.6
probs = [weights[k] * normal_pdf(sample, means[k], variances[k]) for k in range(2)]
total = sum(probs)
print("算法: 一维高斯混合模型 EM")
print("权重:", [round(v, 3) for v in weights])
print("均值:", [round(v, 3) for v in means])
print("方差:", [round(v, 3) for v in variances])
print("样本责任度:", [round(p / total, 4) for p in probs])`
  },
  "ml-mlp": {
    title: "多层感知机 MLP",
    chapter: "神经网络 · 前向传播与反向传播",
    result: "点击“运行测试”后会真实执行两层感知机反向传播，并输出 XOR 训练结果。",
    code: `import math

data = [((0, 0), 0), ((0, 1), 1), ((1, 0), 1), ((1, 1), 0)]
weights = {
    "h1": [0.6, -0.4, 0.1],
    "h2": [-0.3, 0.7, -0.2],
    "out": [0.5, 0.5, -0.3],
}

def sigmoid(x):
    return 1 / (1 + math.exp(-x))

def forward(x):
    x1, x2 = x
    h1 = sigmoid(weights["h1"][0] * x1 + weights["h1"][1] * x2 + weights["h1"][2])
    h2 = sigmoid(weights["h2"][0] * x1 + weights["h2"][1] * x2 + weights["h2"][2])
    out = sigmoid(weights["out"][0] * h1 + weights["out"][1] * h2 + weights["out"][2])
    return h1, h2, out

lr = 0.8
for epoch in range(5000):
    loss = 0
    for x, y in data:
        h1, h2, out = forward(x)
        error = out - y
        loss += error * error
        delta_out = error * out * (1 - out)
        old_out = weights["out"][:]
        weights["out"][0] -= lr * delta_out * h1
        weights["out"][1] -= lr * delta_out * h2
        weights["out"][2] -= lr * delta_out
        delta_h1 = delta_out * old_out[0] * h1 * (1 - h1)
        delta_h2 = delta_out * old_out[1] * h2 * (1 - h2)
        weights["h1"][0] -= lr * delta_h1 * x[0]
        weights["h1"][1] -= lr * delta_h1 * x[1]
        weights["h1"][2] -= lr * delta_h1
        weights["h2"][0] -= lr * delta_h2 * x[0]
        weights["h2"][1] -= lr * delta_h2 * x[1]
        weights["h2"][2] -= lr * delta_h2
    if epoch in (0, 999, 4999):
        print(f"epoch={epoch + 1} mse={loss / len(data):.5f}")

predictions = []
for x, y in data:
    _, _, prob = forward(x)
    predictions.append((x, y, round(prob, 4), int(prob >= 0.5)))
correct = sum(1 for _, y, _, pred in predictions if pred == y)
print("算法: 多层感知机 XOR 分类")
print("训练准确率:", round(correct / len(data), 3))
print("预测:", predictions)`
  },
  "ml-cnn": {
    title: "空白画布",
    chapter: "自定义机器学习算法",
    result: "运行结果：请先输入自定义算法代码，再点击运行测试。",
    code: ""
  }
};

function labConfigForSubject(subject) {
  return MODEL_LABS[subject] || MODEL_LABS.通用;
}

function paletteForSubject(subject) {
  return labConfigForSubject(subject).components || MODEL_LABS.通用.components;
}

function modelComponentMeta(type, subject = state.modelSubject) {
  return paletteForSubject(subject).find((item) => item.type === type)
    || Object.values(MODEL_LABS).flatMap((lab) => lab.components || []).find((item) => item.type === type);
}

function mlAlgorithmForType(type) {
  return ML_ALGORITHM_MODELS[type] || null;
}

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
  return role === "student" ? "graph" : "ai";
}

function allVisibleGraphs() {
  return state.data?.knowledgeGraphs || [];
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

function studentGraphSubjects() {
  return Array.from(new Set(allVisibleGraphs().filter((graph) => graph.global).map((graph) => graph.subject).filter(Boolean)));
}

function materialSubjects() {
  return Array.from(new Set(allVisibleMaterials().map((item) => item.subject).filter(Boolean)));
}

function knowledgeTestSubjects() {
  const classes = state.data?.classes || [];
  const classSubjects = state.user?.role === "student" ? classes.map((klass) => klass.subject).filter(Boolean) : [];
  const classTeacherIds = new Set(classes.map((klass) => klass.teacherId).filter(Boolean));
  const classIds = new Set(classes.map((klass) => klass.id).filter(Boolean));
  const scopedMaterialSubjects = state.user?.role === "student"
    ? allVisibleMaterials()
      .filter((material) => material.global || classTeacherIds.has(material.ownerId) || (material.classId && classIds.has(material.classId)))
      .map((material) => material.subject)
      .filter(Boolean)
    : materialSubjects();
  const userSubject = state.user?.subject ? [state.user.subject] : [];
  return Array.from(new Set(userSubject.concat(classSubjects, scopedMaterialSubjects, subjects).filter(Boolean)));
}

function knowledgeTestMaterialsForSubject(subject) {
  const target = normalizeSubjectLabel(subject || preferredSubject());
  const materials = latestByTime(allVisibleMaterials()).filter((material) => !target || material.subject === target);
  if (state.user?.role !== "student") return materials;
  const classes = state.data?.classes || [];
  const teacherIds = new Set(classes.map((klass) => klass.teacherId).filter(Boolean));
  const classIds = new Set(classes.map((klass) => klass.id).filter(Boolean));
  return materials.filter((material) => material.global || teacherIds.has(material.ownerId) || (material.classId && classIds.has(material.classId)));
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
  if (!state.subjectDefaultsInitialized || !state.modelSubject) {
    state.modelSubject = MODEL_LABS[fallback] ? fallback : "通用";
    state.modelMode = state.modelSubject === "机器学习" ? "algorithm" : "ideal";
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
  return state.page === "admin" ? "数据导出" : "AI 助教";
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
      placeholder: "可留空，之后在班级管理中申请加入"
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
  state.studentCourseClassId = null;
  state.classTool = null;
  state.activeConversationId = null;
  state.activeThreadId = null;
  state.homeworkModal = null;
  state.homeworkDetailId = null;
  state.teacherHomeworkDetailId = null;
  state.materialDetailId = null;
  state.selectedComponentId = null;
  state.loadedModelId = null;
  state.modelCodeType = null;
  state.modelCodeComponentId = null;
  state.modelCodeDraft = "";
  state.modelCodeRan = false;
  state.modelCodeRunning = false;
  state.modelRunResult = "";
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
  if (!state.selectedClassId) state.classManageOpen = false;
  if (!state.selectedClassId && state.data.classes.length) state.selectedClassId = state.data.classes[0].id;
  if (state.studentCourseClassId && !state.data.classes.some((klass) => klass.id === state.studentCourseClassId)) state.studentCourseClassId = null;
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
  const sections = [];
  menus.forEach((item) => {
    const section = item.section || "功能";
    let group = sections.find((entry) => entry.name === section);
    if (!group) {
      group = { name: section, items: [] };
      sections.push(group);
    }
    group.items.push(item);
  });
  return sections.map((group) => `
    <div class="nav-section">
      <div class="nav-section-title">${escapeHtml(group.name)}</div>
      ${group.items.map((item) => `
        <button class="nav-item ${state.page === item.key ? "active" : ""}" data-page="${item.key}">
          <span>${iconSvg(item.icon, item.label)}</span>${escapeHtml(item.label)}
        </button>
        ${item.key === "ai" ? renderSidebarConversations() : ""}
      `).join("")}
    </div>
  `).join("");
}

function renderBottomNav(menus) {
  const quickKeys = ["ai", "graph", "homework", "models", "chat"];
  const items = quickKeys.map((key) => menus.find((item) => item.key === key)).filter(Boolean);
  if (!items.length) return "";
  return `
    <nav class="bottom-nav" aria-label="手机端高频入口">
      ${items.map((item) => `
        <button class="${state.page === item.key ? "active" : ""}" data-page="${item.key}" title="${escapeHtml(item.label)}">
          ${iconSvg(item.icon, item.label)}
          <span>${escapeHtml(item.key === "homework" ? "作业" : item.key === "graph" ? "图谱" : item.key === "chat" ? "消息" : item.label.replace(" 助教", ""))}</span>
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
        <h1>智学伴</h1>
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
          <label>账号 ID 或姓名<input name="account" autocomplete="username" placeholder="建议使用 8 位 ID，重名用户必须用 ID" required /></label>
          <label>密码<input name="password" type="password" autocomplete="current-password" placeholder="请输入账号密码" required /></label>
          <button class="primary wide" type="submit">进入平台</button>
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
          <button class="primary wide" type="submit">注册并进入平台</button>
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
    ? "数据导出"
    : teacherSide
    ? (state.user.subject || preferredSubject() || "未设置学科")
    : studentClassSummary(classes);
  if (state.page === "history") state.page = "ai";
  app.innerHTML = `
    <div class="layout ${state.navOpen ? "drawer-open" : ""}">
      <header class="mobile-topbar">
        <div>
          <strong>智学伴</strong>
          <span>${escapeHtml(roleName(state.user.role))} · ${escapeHtml(identity)}</span>
        </div>
        <button type="button" id="mobileMenuBtn" title="打开菜单">${iconSvg("menu", "菜单")}</button>
      </header>
      <div class="drawer-backdrop" id="drawerBackdrop"></div>
      <aside class="sidebar">
        <div class="side-brand">
          <div class="brand-lockup">
            <span class="brand-logo">${iconSvg("school")}</span>
            <strong>智学伴</strong>
          </div>
          <div class="side-identity">
            <span>${escapeHtml(state.user.name)}（${roleName(state.user.role)}）</span>
            <div class="side-id-row">
              <small>ID：${state.user.id}</small>
              <div class="side-actions">
                <button class="mini side-action-button" type="button" id="refreshBtn" title="刷新数据">${iconSvg("refresh", "刷新")}</button>
                ${isAdmin ? "" : `<button class="mini side-action-button" type="button" data-page="profile" title="个人信息">${iconSvg("user", "个人信息")}</button>`}
              </div>
            </div>
          </div>
        </div>
        <div class="section-label">${isAdmin ? "管理员端" : teacherSide ? "教师端" : "学生端"}</div>
        <nav class="nav">
          ${renderNavSections(menus)}
        </nav>
        <button id="logoutBtn" class="ghost wide">退出登录</button>
      </aside>
      <main class="main">
        <section id="content" class="content"></section>
      </main>
      <div class="floating-tools">
        <button title="返回默认页" data-page="${defaultPageForRole()}">${iconSvg("home", "返回默认页")}</button>
      </div>
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
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.page = button.dataset.page;
      state.navOpen = false;
      state.selectedMessages.clear();
      await loadState();
      renderShell();
    });
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
  document.getElementById("refreshBtn").addEventListener("click", async () => {
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
  if (state.user?.role === "admin" && state.page !== "admin") state.page = "admin";
  if (state.user?.role === "student" && state.page === "materials") state.page = "graph";
  if (state.page !== "graph") state.graphMaximized = false;
  const main = document.querySelector(".main");
  main?.classList.toggle("ai-main", state.page === "ai");
  main?.classList.toggle("model-main", state.page === "models");
  main?.classList.toggle("ml-model-main", state.page === "models" && state.modelSubject === "机器学习");
  document.body?.classList.toggle("graph-page-maximized", state.page === "graph" && state.graphMaximized);
  const contentClasses = ["content"];
  if (state.page === "ai") contentClasses.push("ai-content");
  if (state.page === "graph") contentClasses.push("graph-content");
  if (state.page === "models") contentClasses.push("model-content");
  if (state.page === "models" && state.modelSubject === "机器学习") contentClasses.push("ml-model-content");
  if (state.page === "graph" && state.user?.role === "student") contentClasses.push("student-graph-content");
  if (state.page === "materials") contentClasses.push("materials-content");
  if (state.page === "courses") contentClasses.push("courses-content");
  if (state.page === "homework") contentClasses.push("homework-content");
  if (state.page === "chat") contentClasses.push("chat-content");
  if (state.page === "profile") contentClasses.push("profile-content");
  if (state.page === "classes") contentClasses.push("class-content");
  if (state.page === "admin") contentClasses.push("admin-content");
  content.className = contentClasses.join(" ");
  const pageMap = {
    home: renderHomePage,
    graph: renderGraphPage,
    ai: renderAiPage,
    materials: renderMaterialsPage,
    courses: renderStudentCoursesPage,
    models: renderModelPage,
    chat: renderChatPage,
    classes: renderClassPage,
    admin: renderAdminPage,
    homework: isTeacherLike() ? renderTeacherHomeworkPage : renderStudentHomeworkPage,
    profile: renderProfilePage
  };
  const renderer = pageMap[state.page] || renderGraphPage;
  content.innerHTML = renderer();
  bindCurrentPage();
}

function bindCurrentPage() {
  const binders = {
    home: bindHomePage,
    graph: bindGraphPage,
    ai: bindAiPage,
    materials: bindMaterialsPage,
    courses: bindStudentCoursesPage,
    models: bindModelPage,
    chat: bindChatPage,
    classes: bindClassPage,
    admin: bindAdminPage,
    homework: isTeacherLike() ? bindTeacherHomeworkPage : bindStudentHomeworkPage,
    profile: bindProfilePage
  };
  (binders[state.page] || bindGraphPage)();
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
        <h2>教学工作台</h2>
        <p>今日待办、课程资产、作业批改和学生问题集中在同一个页面。</p>
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

function renderStudentHomePage() {
  const homework = state.data.homework || [];
  const submissions = state.data.submissions || [];
  const graphs = state.data.knowledgeGraphs || [];
  const classes = state.data.classes || [];
  const materials = state.data.courseMaterials || [];
  const conversations = state.data.conversations || [];
  const wrongNotes = state.data.wrongNotes || [];
  const analytics = state.data.learningAnalytics || {};
  const submittedIds = new Set(submissions.filter((item) => item.studentId === state.user.id).map((item) => item.homeworkId));
  const pendingHomework = homework.filter((item) => !submittedIds.has(item.id));
  const latestConversation = conversations[0];
  const hasRealMastery = Number(analytics.summary?.count || 0) > 0;
  const weak = hasRealMastery ? (analytics.summary?.weak || []) : [];
  return `
    <div class="workbench-page student-home-workbench">
    <section class="workbench-title">
      <div>
        <h2>学习首页</h2>
        <p>作业、复习、图谱和最近对话集中展示；掌握度只来自真实问答、测验或批改记录。</p>
      </div>
      <div class="actions compact-actions">
        <button class="primary" data-dashboard-page="ai">问 AI</button>
        <button class="mini" data-dashboard-page="homework">作业</button>
        <button class="mini" data-dashboard-page="graph">图谱</button>
        <button class="mini" data-dashboard-page="models">实验室</button>
      </div>
    </section>
    <section class="dashboard-stats compact">
      ${renderDashboardStat("待完成作业", pendingHomework.length, submissions.length ? `${submissions.length} 份已提交` : "尚未提交")}
      ${renderDashboardStat("真实掌握记录", analytics.summary?.count || 0, hasRealMastery ? `平均 ${percentText(analytics.summary.average)}` : "暂无真实诊断")}
      ${renderDashboardStat("错题记录", wrongNotes.length, wrongNotes[0] ? wrongNotes[0].topic : "完成练习后生成")}
      ${renderDashboardStat("可学习图谱", graphs.length, "由教师开放或自己生成")}
    </section>
    <div class="home-workbench-grid student">
      ${!classes.length ? `
        <section class="panel dashboard-card home-wide-card student-onboarding">
          <div class="split-head">
            <div>
              <h3>还没有加入班级</h3>
              <p class="hint">${materials.length ? "已有教师公开资料可用；加入班级后会同步显示该班作业和消息。" : "加入班级后会看到该班作业和消息；资料只展示老师公开为学生可检索的内容。"}</p>
            </div>
            <button class="primary" data-dashboard-page="homework">输入邀请码加入</button>
          </div>
        </section>
      ` : ""}
      ${graphs.length ? `
        <section class="panel dashboard-card">
          <div class="split-head">
            <h3>可学习图谱</h3>
            <button class="mini" data-dashboard-page="graph">进入图谱</button>
          </div>
          <div class="dashboard-list compact">
            ${graphs.slice(0, 4).map((graph) => `<article><strong>${escapeHtml(graph.title)}</strong><span>${escapeHtml(graph.subject)} · ${(graph.nodes || []).length} 个知识点 · ${graph.global ? "教师已开放" : "个人图谱"}</span></article>`).join("")}
          </div>
        </section>
      ` : ""}
      <section class="panel dashboard-card home-priority-card">
        <div class="split-head">
          <h3>今日学习</h3>
          <button class="mini" data-dashboard-page="homework">作业提交</button>
        </div>
        <div class="dashboard-list">
          ${pendingHomework.slice(0, 4).map((item) => `<article><strong>${escapeHtml(item.title)}</strong><span>${fmtTime(item.createdAt)} · 双击作业卡片查看并提交</span></article>`).join("") || renderDashboardEmpty("当前没有待完成作业。可以进入对话或知识图谱继续复习。", "ai", "开始提问")}
        </div>
      </section>
      <section class="panel dashboard-card">
        <div class="split-head">
          <h3>真实诊断</h3>
          <button class="mini" data-dashboard-page="graph">查看图谱</button>
        </div>
        <div class="dashboard-list">
          ${weak.slice(0, 4).map((item) => `<article><strong>${escapeHtml(item.topic)}</strong><span>掌握度 ${percentText(item.score)} · ${escapeHtml(item.status || "需要复习")}</span></article>`).join("") || renderDashboardEmpty("暂无真实薄弱点。完成一次问答或教师确认批改后会生成学习画像。", "ai", "做一次诊断")}
        </div>
      </section>
      <section class="panel dashboard-card">
        <div class="split-head">
          <h3>继续学习</h3>
          <button class="mini" data-dashboard-page="ai">打开对话</button>
        </div>
        <div class="dashboard-list">
          ${latestConversation ? `<article><strong>${escapeHtml(latestConversation.title || "最近对话")}</strong><span>${escapeHtml(aiModeLabel(latestConversation.mode || "qa"))} · ${fmtTime(latestConversation.updatedAt)}</span></article>` : renderDashboardEmpty("还没有学习对话。可以先问一个概念、一道题或一个复习计划。", "ai", "发起第一次对话")}
          ${wrongNotes.slice(0, 3).map((note) => `<article><strong>${escapeHtml(note.topic || "错题")}</strong><span>${escapeHtml(compactText(note.analysis || note.question || "", 56))}</span></article>`).join("")}
        </div>
      </section>
    </div>
    </div>
  `;
}

function renderHomePage() {
  return isTeacherLike() ? renderTeacherHomePage() : renderStudentHomePage();
}

function bindHomePage() {
  bindDashboardPageLinks();
}

function bindDashboardPageLinks() {
  document.querySelectorAll("[data-dashboard-page]").forEach((button) => {
    button.addEventListener("click", () => {
      state.page = button.dataset.dashboardPage;
      renderShell();
    });
  });
}

function graphListForCurrentRole() {
  let graphs = state.data.knowledgeGraphs || [];
  if (state.user.role === "student") {
    graphs = graphs.filter((graph) => graph.global && (!state.graphSubject || graph.subject === state.graphSubject));
  }
  return graphs;
}

function renderGraphPage() {
  return isTeacherLike() ? renderTeacherGraphPage() : renderStudentGraphPage();
}

function graphCard(graph) {
  const active = state.selectedGraphId === graph.id ? "active" : "";
  const graphRagReady = graph.meta?.graphRagReady || graph.meta?.graphRag?.ready;
  const layerCount = Array.isArray(graph.meta?.ontologyLayers) ? graph.meta.ontologyLayers.length : 0;
  const relationTypes = Array.isArray(graph.meta?.semanticRelations) ? graph.meta.semanticRelations.length : new Set((graph.links || []).map((link) => link.type || link.label)).size;
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
          <h3>知识图谱</h3>
          <p class="hint">按“查看已有图谱 -> 生成图谱 -> 导入图谱”组织主流程，详情区保留章节树、画布、节点详情和学习诊断。</p>
        </div>
        <div class="inline-stats">
          <span>${graphs.length}<small>可见图谱</small></span>
          <span>${graphs.filter((item) => item.global).length}<small>已开放</small></span>
        </div>
      </div>
      <div class="product-tabs">
        ${[
          ["library", "图谱库"],
          ["generate", "生成图谱"],
          ["import", "导入图谱"]
        ].map(([key, label]) => `<button type="button" class="${tab === key ? "active" : ""}" data-graph-tab="${key}">${label}</button>`).join("")}
      </div>
      ${tab === "generate" ? renderTeacherGraphGenerateTab(draft) : tab === "import" ? renderTeacherGraphImportTab() : renderTeacherGraphLibraryTab(graphs, selected)}
    </section>
    ${renderGraphNodeModal()}
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
          <form id="graphLibrarySearchForm" class="graph-search">
            <input name="query" value="${escapeHtml(query)}" placeholder="搜索图谱名称或学科" />
            <button class="mini" type="submit">搜索</button>
          </form>
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
        <form id="graphLibrarySearchForm" class="graph-search">
          <input name="query" value="${escapeHtml(query)}" placeholder="搜索图谱名称或学科" />
          <button class="mini" type="submit">搜索</button>
        </form>
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
  const selected = graphs.find((graph) => graph.id === state.selectedGraphId) || null;
  if (selected) return renderGraphDetailShell(graphs, selected, "student");
  const tab = state.studentGraphTab || "library";
  return `
    <section class="panel student-graph-full student-graph-home">
      <div class="product-tabs student-graph-tabs">
        ${[
          ["library", "图谱库"],
          ["test", "知识测试"]
        ].map(([key, label]) => `<button type="button" class="${tab === key ? "active" : ""}" data-student-graph-tab="${key}">${label}</button>`).join("")}
      </div>
      ${tab === "test" ? renderStudentKnowledgeTestTab(graphs) : renderStudentGraphLibraryTab(graphs)}
    </section>
    ${renderGraphNodeModal()}
  `;
}

function renderGraphDetailShell(graphs, selected, mode = "teacher") {
  const stats = graphAnalytics(selected);
  const detailOpen = Boolean(graphExplicitSelectedNode(selected));
  const shellClass = state.graphMaximized ? "graph-maximized" : "";
  return `
    <section class="panel graph-detail-shell graph-dashboard-shell graph-atlas-shell graph-focus-shell ${detailOpen ? "detail-open" : "detail-collapsed"} ${mode === "student" ? "student-graph-detail-shell" : "teacher-graph-detail-shell"} ${shellClass}" data-graph-atlas-shell="${escapeHtml(selected.id)}">
      ${renderGraphAtlasNav(selected)}
      <div class="graph-atlas-main">
        ${renderGraphAtlasFilterbar(selected, stats)}
        <div class="graph-atlas-workbench">
          <aside class="graph-atlas-stat-stack">
            ${renderGraphAtlasStats(selected, mode, stats)}
          </aside>
          <div class="graph-atlas-stage">
            <div class="graph-canvas">${renderGraphViewer(selected)}</div>
          </div>
          ${renderGraphAtlasModePanel()}
          ${renderGraphAtlasLegend()}
        </div>
      </div>
      ${renderGraphAtlasFooter(selected)}
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
  const filterButtons = [
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
  const items = [
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
  const emptyMessage = state.graphSubject
    ? `数据库中暂未找到「${escapeHtml(state.graphSubject)}」图谱。`
    : "暂无可查看图谱。";
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
  return `
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
          <button class="primary" type="submit" ${materials.length ? "" : "disabled"}>生成题目</button>
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
            <p>${escapeHtml(question.prompt)}</p>
            <div class="knowledge-question-meta">
              <span>${escapeHtml(question.sourceTitle || "课程资料")}</span>
              ${question.sourceChapter ? `<span>${escapeHtml(question.sourceChapter)}</span>` : ""}
              <span>${escapeHtml(question.rubric || "按资料依据、关键点和表达完整度评分")}</span>
            </div>
            ${question.sourceQuote ? `<blockquote>${escapeHtml(question.sourceQuote)}</blockquote>` : ""}
            <form id="knowledgeTestAnswerForm" class="stack">
              <textarea name="answer" rows="7" placeholder="输入你的回答，可以多次修改后重新提交">${escapeHtml(test.answer || "")}</textarea>
              <button class="primary" type="submit">提交本次回答</button>
            </form>
            ${test.result ? `
              <div class="knowledge-test-result">
                <strong>本题 ${Number(test.result.accuracy || 0)}% · ${escapeHtml(test.result.masteryLevel || "")}</strong>
                <p>${escapeHtml(test.result.feedback || "")}</p>
                <div class="mastery-meter"><span style="width:${clamp(Number(test.result.accuracy || 0), 0, 100)}%"></span></div>
                ${(test.result.matched || []).length ? `<p class="knowledge-test-detail">已覆盖：${escapeHtml((test.result.matched || []).slice(0, 8).join("、"))}</p>` : ""}
                ${(test.result.missing || []).length ? `<p class="knowledge-test-detail">待补充：${escapeHtml((test.result.missing || []).slice(0, 8).join("、"))}</p>` : ""}
              </div>
            ` : ""}
            <div class="knowledge-test-actions">
              <button class="mini" type="button" id="knowledgeTestRetry">再次回答</button>
              <button class="mini" type="button" id="knowledgeTestNext">下一题</button>
            </div>
          </article>
          <aside class="knowledge-attempts">
            <h3>掌握判断</h3>
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
                    <p>第 ${Number(item.order || 0) || "-"} 题 · ${Number(item.accuracy || 0)}% · ${escapeHtml(item.masteryLevel || "")}</p>
                  </div>
                </article>
              `).join("") || emptyBlock("提交答案后显示记录。")}
            </div>
          </aside>
        ` : emptyBlock(materials.length ? "选择学科或课程资料后生成题目。" : `当前「${escapeHtml(selectedSubject)}」暂无可用于出题的课程资料，请老师先上传并开放给学生检索。`)}
      </section>
    </div>
  `;
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
          <strong>学科</strong>
          <select id="studentGraphSubject">${subjectSelectOptions(state.graphSubject, studentGraphSubjects(), true, "全部图谱")}</select>
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
      <div><span class="legend-dot concept"></span>概念</div>
      <div><span class="legend-dot method"></span>方法/算法</div>
      <div><span class="legend-dot formula"></span>公式</div>
      <div><span class="legend-dot misconception"></span>易错点</div>
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

function realLearnerState(node) {
  return isRealLearnerState(node?.learnerState) ? node.learnerState : {};
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
  const masteredCount = masteryEntries.filter((value) => value >= 0.78).length;
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
  if (!stateText && !Number.isFinite(mastery)) return "";
  if (stateText.includes("未") || (Number.isFinite(mastery) && mastery < 0.35)) return "mastery-low";
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

function renderGraphViewer(graph) {
  const displayGraph = graphDisplayGraph(graph);
  const stats = displayGraph.meta?.visibleStats || {};
  const size = graphCanvasSize(displayGraph);
  const view = getGraphView(displayGraph);
  const zoomText = `${Math.round(Number(view?.scale || defaultGraphScale(size)) * 100)}%`;
  return `
    <div class="graph-viewer" data-graph-viewer="${graph.id}">
      <div class="graph-toolbar graph-zoom-dock" aria-label="图谱工具">
        <button type="button" class="graph-icon-button" data-graph-action="maximize" title="${state.graphMaximized ? "还原" : "最大化"}">${iconSvg(state.graphMaximized ? "minimize" : "maximize", state.graphMaximized ? "还原" : "最大化")}</button>
        <button type="button" class="graph-icon-button" data-graph-zoom="in" title="放大">${iconSvg("zoomIn", "放大")}</button>
        <span class="graph-zoom-value">${escapeHtml(zoomText)}</span>
        <button type="button" class="graph-icon-button" data-graph-zoom="out" title="缩小">${iconSvg("zoomOut", "缩小")}</button>
        <button type="button" class="graph-icon-button" data-graph-zoom="reset" title="重置视图">${iconSvg("target", "重置视图")}</button>
        <button type="button" class="graph-icon-button" data-graph-zoom="reset" title="恢复布局">${iconSvg("refresh", "恢复布局")}</button>
        <button type="button" class="graph-icon-button" title="图谱快照">${iconSvg("image", "图谱快照")}</button>
        <strong>${stats.nodes || 0}/${stats.totalNodes || 0} 节点 · ${stats.links || 0}/${stats.totalLinks || 0} 关系</strong>
      </div>
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
  if (state.page !== "graph") return;
  const mount = document.getElementById("graphProgressMount");
  if (!mount) {
    renderContent();
    return;
  }
  mount.innerHTML = renderGraphProgress();
  bindGraphProgressControls();
}

function refreshGraphTaskCenter() {
  if (state.page !== "graph") return;
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
      state.graphTab = "generate";
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
          count: 4
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
        sourceMaterials: payload.quiz.sourceMaterials || []
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
          questionCount: (test.questions || []).length
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
        summary: payload.result.overall || null
      };
      await loadState();
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
      result: null
    };
    renderContent();
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
    : [
      { key: "explain", label: "讲解", hint: "把概念讲清楚", mode: "explain" },
      { key: "guided", label: "提示", hint: "只给下一步线索", mode: "guided" },
      { key: "practice", label: "出题", hint: "生成练习并解析", mode: "practice" },
      { key: "plan", label: "复习计划", hint: "安排复习路径", mode: "plan" }
    ];
}

function renderAiTaskButtons(isTeacher) {
  const current = normalizeAiModeClient(state.aiMode);
  const options = aiTaskOptions(isTeacher);
  const currentTask = isTeacher ? (state.aiTeacherTask || state.aiTaskKey || "lesson_plan") : (state.aiTaskKey || current);
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
  return "";
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

function renderAiMessage(message) {
  const citations = Array.isArray(message.citations) ? message.citations : [];
  const confidence = message.confidence ? `<small class="answer-source">可靠性：${escapeHtml(message.confidence)}${citations.length ? ` · 引用 ${citations.length} 条` : ""}</small>` : "";
  const content = aiMessageDisplayContent(message);
  const body = message.role === "assistant"
    ? `<pre class="ai-answer-text">${escapeHtml(content)}</pre>`
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
  const materials = state.data.courseMaterials || [];
  const search = String(state.materialSearch || "").trim();
  const subjectFilter = state.materialSubjectFilter || "";
  const filtered = materials.filter((item) => {
    const text = `${item.title} ${item.subject} ${item.sourceName} ${item.preview || ""}`;
    return (!subjectFilter || item.subject === subjectFilter) && (!search || text.includes(search));
  });
  const selected = filtered.find((item) => item.id === state.materialDetailId)
    || materials.find((item) => item.id === state.materialDetailId)
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
    </div>
  `;
}

function renderMaterialListItem(item, selectedId) {
  const visibility = item.global ? "学生可检索" : "仅教师/本人可见";
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
      <button class="mini danger" data-delete-material="${material.id}">删除资料</button>
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
      <div class="detail-card"><strong>可见性</strong><p>${material.global ? "学生可检索" : "仅当前账号或教师可检索"}</p></div>
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
            global: form.get("global") === "on"
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
            global: form.get("global") === "on"
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
          global: false
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
  const workflowSource = workflowResult.source === "dify-api" ? "Dify API" : workflowResult.source || "等待工作流返回";
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
      <h3>Dify 工作流</h3>
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
          <span>${citations.length ? `工作流 + 引用 ${citations.length} 条` : "Dify 工作流回答"}</span>
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
    : "直接输入问题、学科、需要的深度或你的答案，例如：机器学习 KNN 这题我的答案是...";
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

function renderDifyWorkflowSummary(active) {
  const assistant = latestAssistantMessage(active);
  const panel = assistant?.learningPanel || {};
  const workflowResult = assistant?.workflowResult || {};
  const citations = panel.citations || assistant?.citations || [];
  const isTeacherWorkflow = workflowResult.source === "teacher-dify-api" || Boolean(workflowResult.task_type);
  const nextQuestions = Array.isArray(workflowResult.follow_up_actions) && workflowResult.follow_up_actions.length
    ? workflowResult.follow_up_actions
    : Array.isArray(workflowResult.next_questions) ? workflowResult.next_questions : [];
  const focus = panel.graphFocus;
  const source = workflowResult.source === "teacher-dify-api"
    ? "教师 Dify 工作流"
    : workflowResult.source === "dify-api" ? "Dify API" : (assistant ? "工作流结果" : "等待提问");
  const score = Number(workflowResult.mastery_score);
  const scoreText = Number.isFinite(score) && score > 0 ? `${score}分` : "未诊断";
  const workflowTitle = isTeacherWorkflow
    ? teacherTaskLabel(workflowResult.task_type)
    : (workflowResult.topic_label || "未定位知识点");
  const workflowMeta = isTeacherWorkflow
    ? `${workflowResult.teacher_review_required === false ? "可直接参考" : "需教师复核"} · ${workflowResult.workflow?.name || "教师教学工作流"}`
    : `${workflowResult.mastery_level || "未诊断"} · ${scoreText}`;
  const structuredItems = isTeacherWorkflow
    ? [
      ...(Array.isArray(workflowResult.teaching_objectives) ? workflowResult.teaching_objectives.slice(0, 2) : []),
      ...(Array.isArray(workflowResult.key_difficult_points) ? workflowResult.key_difficult_points.slice(0, 2) : []),
      ...(Array.isArray(workflowResult.lesson_steps) ? workflowResult.lesson_steps.slice(0, 2) : [])
    ]
    : [];
  return `
    <aside class="ai-side ai-workflow-summary">
      <section class="ai-side-card workflow-result-card">
        <h3>工作流结果</h3>
        <div class="ai-side-card-body">
          <p><strong>${escapeHtml(workflowTitle)}</strong></p>
          <p>${escapeHtml(workflowMeta)}</p>
          <p class="hint">${escapeHtml(source)}${workflowResult.workflow_run_id ? ` · ${escapeHtml(workflowResult.workflow_run_id)}` : ""}</p>
          ${structuredItems.length ? `<ol class="learning-panel-list">${structuredItems.map((item) => `<li>${escapeHtml(typeof item === "string" ? item : item.title || item.name || item.text || JSON.stringify(item))}</li>`).join("")}</ol>` : ""}
        </div>
      </section>
      <section class="ai-side-card citation-card">
        <h3>引用来源</h3>
        <div class="ai-side-card-body">
          ${renderCitationList(citations)}
        </div>
      </section>
      <section class="ai-side-card">
        <h3>${isTeacherWorkflow ? "后续动作" : "后续问题"}</h3>
        <div class="ai-side-card-body">
          ${nextQuestions.length ? `<ol class="learning-panel-list">${nextQuestions.slice(0, 4).map((question) => `<li>${escapeHtml(typeof question === "string" ? question : question.label || question.title || question.action || JSON.stringify(question))}</li>`).join("")}</ol>` : `<p class="hint">${isTeacherWorkflow ? "工作流返回可执行动作后会显示在这里。" : "工作流返回追问后会显示在这里。"}</p>`}
        </div>
      </section>
      ${focus?.label ? `
        <section class="ai-side-card">
          <h3>图谱焦点</h3>
          <div class="ai-side-card-body context-card-body">
            <article class="graph-focus-mini">
              <strong>${escapeHtml(focus.label)}</strong>
              <span>${escapeHtml(focus.graphTitle || "知识图谱")}</span>
              ${focus.path?.length ? `<p>${escapeHtml(focus.path.join(" → "))}</p>` : ""}
            </article>
          </div>
        </section>
      ` : ""}
    </aside>
  `;
}

function renderAiPage() {
  const isTeacher = isTeacherLike();
  const conversations = state.data.conversations || [];
  const active = conversations.find((conv) => conv.id === state.activeConversationId) || conversations[0];
  if (active && !state.activeConversationId) {
    state.activeConversationId = active.id;
    state.aiMode = normalizeAiModeClient(active.mode || state.aiMode);
    state.aiTaskKey = state.aiMode;
    if (isTeacher) state.aiTeacherTask = state.aiTeacherTask || "lesson_plan";
  }
  const intro = isTeacher
    ? "输入教学目标、课堂问题、出题要求或批改需求，系统会通过 Dify 工作流结合项目资料回答。"
    : "输入概念问题、练习要求、学习计划或你的解题答案，系统会通过 Dify 工作流结合课程资料回答。";
  return `
    <div class="chat-layout ai-workbench ai-assistant-workbench dify-only-workbench ${isTeacher ? "teacher-ai-workbench" : "student-ai-workbench"}">
      <section class="panel chat-panel ai-chat-panel">
        <div class="dify-ai-head">
          <div>
            <h2>${isTeacher ? "教学 AI 助教" : "学习 AI 助教"}</h2>
          </div>
          <button id="newConversationBtn" class="primary" type="button">新建对话</button>
        </div>
        <div class="message-stream" id="aiMessages">
          ${(active?.messages || []).map(renderAiMessage).join("") || `<div class="bubble assistant"><span>AI</span><p>${escapeHtml(intro)}</p></div>`}
        </div>
        <form id="aiForm" class="composer rich-composer ai-composer dify-composer">
          <textarea name="prompt" rows="${isTeacher ? "3" : "2"}" placeholder="${escapeHtml(aiPromptPlaceholder(isTeacher))}"></textarea>
          <button class="primary ai-send-button" type="submit">发送</button>
        </form>
      </section>
      ${renderDifyWorkflowSummary(active)}
    </div>
  `;
}

function bindAiPage() {
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
    const studentAnswerControl = document.querySelector("#aiForm textarea[name='studentAnswer']");
    if (subjectControl) state.aiSubject = subjectControl.value || state.aiSubject || "";
    if (chapterControl) state.aiChapter = chapterControl.value || "";
    if (knowledgeControl) state.aiKnowledgePoint = knowledgeControl.value || "";
    if (classControl) state.aiClassId = classControl.value || "";
    if (materialControl) state.aiMaterialId = materialControl.value || "";
    if (graphControl) state.aiGraphId = graphControl.value || "";
    if (graphNodeControl) state.aiGraphNodeId = graphNodeControl.value || "";
    if (homeworkControl) state.aiHomeworkId = homeworkControl.value || "";
    if (submissionControl) state.aiSubmissionId = submissionControl.value || "";
    if (studentAnswerControl) state.aiStudentAnswer = studentAnswerControl.value || "";
  };
  const active = activeAiConversation();
  const findMessage = (id) => (active?.messages || []).find((message) => message.id === id);
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
    const selectedMode = normalizeAiModeClient(explicitMode || taskOption?.mode || inferredMode);
    const mode = isTeacher
      ? (taskOption?.mode || selectedMode || "plan")
      : explicitMode ? selectedMode : inferredMode;
    state.aiMode = mode;
    state.aiTaskKey = isTeacher ? (taskOption?.key || inferredTeacherTask || mode) : (explicitMode ? selectedMode : mode);
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
    const payload = await api("/api/ai/chat", {
      method: "POST",
      body: {
        userId: state.user.id,
        conversationId: state.activeConversationId,
        mode,
        subject: state.aiSubject || inferredSubject || "通用",
        chapter: state.aiChapter,
        knowledgePoint: state.aiKnowledgePoint,
        answerDepth: state.aiAnswerDepth,
        prompt: cleanPrompt,
        ...graphFocus,
        ...teacherContext
      }
    });
    state.activeConversationId = payload.conversation.id;
    state.aiStudentAnswer = "";
    await loadState();
    renderShell();
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
  document.querySelector("#aiForm textarea[name='studentAnswer']")?.addEventListener("input", syncAiControls);
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
    const form = new FormData(event.currentTarget);
    const prompt = String(form.get("prompt") || "").trim();
    if (!prompt) return;
    try {
      await submitPrompt(prompt);
    } catch (error) {
      showToast(error.message, "error");
    }
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
        explain: { mode: "explain", depth: "layered", prompt: `请分层讲解「${topic}」，包含定义、例子和易错点。` },
        guided: { mode: "guided", depth: "brief", prompt: `请用提示模式引导我理解「${topic}」，不要直接给完整答案。` },
        full: { mode: "explain", depth: "full", prompt: `请给出「${topic}」的完整解析，包含资料依据、步骤、例子和练习。` },
        practice: { mode: "practice", depth: "layered", prompt: `请根据「${topic}」生成 3 道练习题，并附答案解析。` },
        grade: { mode: "grade", depth: "layered", prompt: `请按批改模式检查我关于「${topic}」的答案，并指出错因和修改建议。` },
        plan: { mode: "plan", depth: "layered", prompt: `请围绕「${topic}」生成复习路径和每日练习安排。` }
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

function resetModelCodeState() {
  state.modelCodeType = null;
  state.modelCodeComponentId = null;
  state.modelCodeDraft = "";
  state.modelCodeRan = false;
  state.modelCodeRunning = false;
}

function modelCodeDefinition() {
  const component = state.modelComponents.find((item) => item.id === state.modelCodeComponentId);
  if (component?.props?.code !== undefined || component?.kind === "customAlgorithm") {
    const base = mlAlgorithmForType(component.type);
    const hasSavedCode = component?.props && Object.prototype.hasOwnProperty.call(component.props, "code");
    return {
      title: component.label || base?.title || "自定义算法模型",
      chapter: component.props?.chapter || base?.chapter || "自定义机器学习模型",
      code: hasSavedCode ? component.props.code : base?.code || "",
      result: component.props?.runResult || component.props?.expectedResult || base?.result || "代码已载入，可点击运行测试真实执行。"
    };
  }
  const algorithm = mlAlgorithmForType(state.modelCodeType);
  if (algorithm) return algorithm;
  return null;
}

function openModelCode(type, componentId = null) {
  const component = state.modelComponents.find((item) => item.id === componentId);
  const hasSavedCode = component?.props && Object.prototype.hasOwnProperty.call(component.props, "code");
  const algorithm = component?.props?.code !== undefined || component?.kind === "customAlgorithm"
    ? {
      code: hasSavedCode ? component.props.code : "",
      result: component.props?.runResult || component.props?.expectedResult || ""
    }
    : mlAlgorithmForType(type);
  if (!algorithm && !component) return;
  state.modelCodeType = type;
  state.modelCodeComponentId = componentId;
  state.modelCodeDraft = hasSavedCode ? component.props.code : algorithm?.code || "";
  state.modelCodeRan = false;
}

function persistOpenModelCodeDraft() {
  const editor = document.getElementById("modelCodeEditor");
  if (!editor) return;
  state.modelCodeDraft = editor.value;
  const component = state.modelComponents.find((item) => item.id === state.modelCodeComponentId);
  if (component) {
    component.props = component.props && typeof component.props === "object" ? component.props : {};
    component.props.code = editor.value;
  }
}

function hasCanvasModel() {
  return state.modelComponents.length > 0;
}

function hasModelDraft() {
  return hasCanvasModel() || (state.modelSubject === "机器学习" && Boolean(modelCodeDefinition()));
}

function modelDraftComponents() {
  if (state.modelComponents.length) return state.modelComponents;
  if (state.modelSubject !== "机器学习" || !state.modelCodeType) return [];
  const meta = modelComponentMeta(state.modelCodeType, "机器学习");
  const definition = modelCodeDefinition();
  if (!meta || !definition) return [];
  return [{
    id: `cmp_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    type: meta.type,
    icon: meta.icon,
    label: meta.label,
    kind: meta.kind || "algorithm",
    x: 50,
    y: 45,
    props: {
      ...meta.defaults,
      code: state.modelCodeDraft || definition.code || "",
      expectedResult: definition.result || "",
      runResult: state.modelRunResult || "",
      lastRunAt: state.modelRunResult ? new Date().toISOString() : ""
    }
  }];
}

function currentModelExperimentRecord() {
  if (state.modelSubject !== "????") return null;
  const component = state.modelComponents.find((item) => item.id === state.modelCodeComponentId) || state.modelComponents.find((item) => componentSupportsCode(item));
  const base = state.modelExperimentRecord || component?.props?.experiment || null;
  return { ...(base || {}), agentName: base?.agentName || "ML Lab Code Agent", userId: state.user?.id || base?.userId || "", subject: state.modelSubject, prompt: state.modelAlgorithmPrompt || component?.props?.prompt || base?.prompt || "", codeMode: state.modelCodeMode || base?.codeMode || "teaching", difficulty: state.modelDifficulty || base?.difficulty || "standard", sourceType: component?.props?.generationSource || base?.sourceType || "", title: component?.label || base?.title || "", chapter: component?.props?.chapter || base?.chapter || "", citations: component?.props?.citations || base?.citations || [], explanation: component?.props?.explanation || base?.explanation || null, verifiedRun: component?.props?.verifiedRun || base?.verifiedRun || null, repairAttempts: component?.props?.repairAttempts || base?.repairAttempts || 0, repairHistory: component?.props?.repairHistory || base?.repairHistory || [], workflow: component?.props?.workflow || base?.workflow || [], updatedAt: new Date().toISOString() };
}

function componentSupportsCode(component) {
  return Boolean(component && (mlAlgorithmForType(component.type) || component.kind === "customAlgorithm" || component.props?.code !== undefined));
}

function normalizeLoadedModelComponents(model) {
  const loaded = JSON.parse(JSON.stringify(model.components || []));
  if (loaded.length) {
    return loaded.map((component, index) => ({
      ...component,
      id: component.id || `cmp_${Date.now()}_${index}`,
      x: Number.isFinite(Number(component.x)) ? Number(component.x) : 46 + index * 8,
      y: Number.isFinite(Number(component.y)) ? Number(component.y) : 42 + index * 6,
      props: component.props && typeof component.props === "object" ? component.props : {}
    }));
  }
  const palette = paletteForSubject(model.subject || state.modelSubject);
  const text = `${model.name || ""} ${model.notes || ""}`;
  const meta = palette.find((item) => text.includes(item.label) || text.includes(mlAlgorithmForType(item.type)?.title || "")) || palette[0];
  if (!meta) return [];
  return [{
    id: `cmp_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    type: meta.type,
    icon: meta.icon,
    label: meta.label,
    kind: meta.kind || "component",
    x: 50,
    y: 45,
    props: { ...meta.defaults }
  }];
}

function renderRunResultPanel() {
  const result = state.modelRunResult || "";
  return `
    <div class="run-result-panel">
      <strong>运行结果</strong>
      <pre>${result ? escapeHtml(result) : "暂无运行结果。双击机器学习算法节点，修改代码后点击运行测试。"}</pre>
    </div>
  `;
}

function renderModelTemplates(subject) {
  const templates = MODEL_TEMPLATES[subject] || MODEL_TEMPLATES.机器学习;
  return `
    <div class="model-template-grid">
      ${templates.map((item) => `
        <article>
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.hint)}</span>
          </div>
          <div class="row-actions">
            <button class="mini" type="button" data-open-model-template="${item.key}">打开模板</button>
            <button class="mini primary" type="button" data-run-model-template="${item.key}">运行示例</button>
            <button class="mini" type="button" data-edit-model-template="${item.key}">修改参数</button>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function findModelTemplate(key) {
  return Object.values(MODEL_TEMPLATES).flatMap((items) => items).find((item) => item.key === key);
}

function applyModelTemplate(key, options = {}) {
  const template = findModelTemplate(key);
  if (!template) return false;
  const components = (template.types || []).map((type, index) => {
    const meta = modelComponentMeta(type, state.modelSubject) || modelComponentMeta(type);
    if (!meta) return null;
    return {
      id: `cmp_${Date.now()}_${index}_${Math.random().toString(16).slice(2)}`,
      type: meta.type,
      icon: meta.icon,
      label: meta.label,
      kind: meta.kind || "component",
      x: 22 + index * 24,
      y: state.modelSubject === "机器学习" ? 42 : 34 + (index % 2) * 24,
      props: { ...meta.defaults }
    };
  }).filter(Boolean);
  state.modelComponents = components;
  state.selectedComponentId = components[0]?.id || null;
  state.loadedModelId = null;
  state.modelMode = state.modelSubject === "机器学习" ? "algorithm" : state.modelMode;
  resetModelCodeState();
  const codeComponent = components.find((item) => componentSupportsCode(item));
  if (codeComponent && (options.openCode || options.runExample)) {
    state.selectedComponentId = codeComponent.id;
    openModelCode(codeComponent.type, codeComponent.id);
    const definition = modelCodeDefinition();
    state.modelRunResult = options.runExample ? "模板代码已载入，正在执行真实运行..." : "";
  } else {
    state.modelRunResult = options.runExample ? `${template.title} 示例已载入，请修改参数后保存模型。` : "";
  }
  return true;
}

const BLANK_ALGORITHM_CODE = `# 自定义机器学习算法画布
# 可以清空本示例，按你的思路编写任意 Python 标准库代码。
# 点击右上角“运行测试”会在后端真实执行，并在下方显示 stdout/stderr。

data = [
    (0.1, 0),
    (0.4, 0),
    (0.8, 1),
    (1.2, 1),
]

threshold = sum(x for x, _ in data) / len(data)
predictions = [(x, int(x >= threshold), y) for x, y in data]
accuracy = sum(1 for _, pred, y in predictions if pred == y) / len(predictions)

print("自定义算法示例：一维阈值分类")
print("threshold:", round(threshold, 3))
print("predictions:", predictions)
print("accuracy:", round(accuracy, 3))`;

function createBlankAlgorithmCanvas() {
  const component = {
    id: `cmp_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    type: "ml-blank-custom",
    icon: "空白",
    label: "空白算法画布",
    kind: "customAlgorithm",
    x: 50,
    y: 42,
    props: {
      code: BLANK_ALGORITHM_CODE,
      chapter: "自定义机器学习算法",
      expectedResult: "可在代码面板中编写自定义算法，并点击“运行测试”真实执行。"
    }
  };
  state.modelComponents = [component];
  state.selectedComponentId = component.id;
  state.loadedModelId = null;
  state.modelGenerationInfo = null;
  state.modelRunResult = "";
  state.modelCodeType = component.type;
  state.modelCodeComponentId = component.id;
  state.modelCodeDraft = component.props.code;
  state.modelCodeRan = false;
}

function renderAiAlgorithmGenerator() {
  const info = state.modelGenerationInfo || null;
  const citations = Array.isArray(info?.citations) ? info.citations : [];
  return `
    <form id="aiAlgorithmForm" class="ai-algorithm-form stack">
      <label>想要的算法
        <textarea name="prompt" rows="5" placeholder="例如：生成一个 KNN 分类算法，用小型数据集训练并输出准确率和预测结果">${escapeHtml(state.modelAlgorithmPrompt || "")}</textarea>
      </label>
      <div class="algorithm-option-grid">
        <label>Code type
          <select name="codeMode">
            <option value="teaching" ${state.modelCodeMode === "teaching" ? "selected" : ""}>Teaching</option>
            <option value="from_scratch" ${state.modelCodeMode === "from_scratch" ? "selected" : ""}>From scratch</option>
            <option value="standard_library" ${state.modelCodeMode === "standard_library" ? "selected" : ""}>Stdlib</option>
          </select>
        </label>
        <label>Difficulty
          <select name="difficulty">
            <option value="beginner" ${state.modelDifficulty === "beginner" ? "selected" : ""}>Beginner</option>
            <option value="standard" ${state.modelDifficulty === "standard" ? "selected" : ""}>Standard</option>
            <option value="advanced" ${state.modelDifficulty === "advanced" ? "selected" : ""}>Advanced</option>
          </select>
        </label>
      </div>
      <div class="model-action-row">
        <button class="primary" type="submit" ${state.modelAlgorithmGenerating ? "disabled" : ""}>${state.modelAlgorithmGenerating ? "生成并运行中..." : "AI 生成并运行"}</button>
        <button class="ghost" type="button" id="openBlankAlgorithmCanvas">空白画布</button>
      </div>
      <p class="hint">系统会结合课程资料上下文调用 AI 生成可运行 Python 代码；也可以打开空白画布自定义算法并测试运行。</p>
    </form>
    ${info ? `
      <div class="algorithm-generation-info">
        <strong>${escapeHtml(info.sourceLabel || "生成来源")}</strong>
        <p>${escapeHtml(info.summary || "")}</p>
        ${Array.isArray(info.workflow) && info.workflow.length ? `
          <div class="agent-workflow-list">
            ${info.workflow.map((step) => `
              <article class="${escapeHtml(step.status || "")}">
                <strong>${escapeHtml(step.label || step.key || "")}</strong>
                <span>${escapeHtml(step.detail || "")}</span>
              </article>
            `).join("")}
          </div>
        ` : ""}
        ${info.explanation?.goal ? `
          <div class="algorithm-explanation">
            <strong>Code explanation</strong>
            <p>${escapeHtml(info.explanation.goal)}</p>
            ${Array.isArray(info.explanation.steps) ? `<ol>${info.explanation.steps.slice(0, 4).map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>` : ""}
          </div>
        ` : ""}
        ${citations.length ? `
          <div class="algorithm-citation-list">
            ${citations.slice(0, 3).map((item) => `
              <article>
                <span>${escapeHtml(item.title || item.sourceName || "课程资料")}</span>
                <small>${escapeHtml(item.chapter || item.nodeLabel || "")}</small>
              </article>
            `).join("")}
          </div>
        ` : ""}
      </div>
    ` : ""}
  `;
}

const MATH_FUNCTION_NAMES = ["abs", "acos", "asin", "atan", "atan2", "ceil", "cos", "exp", "floor", "log", "max", "min", "pow", "round", "sin", "sqrt", "tan"];
const MATH_FUNCTION_IMPLS = Object.freeze(MATH_FUNCTION_NAMES.reduce((map, name) => {
  map[name] = Math[name];
  return map;
}, {}));

function tokenizeMathExpression(source) {
  const tokens = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    const numberMatch = source.slice(index).match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
    if (numberMatch) {
      tokens.push({ type: "number", value: Number(numberMatch[0]) });
      index += numberMatch[0].length;
      continue;
    }
    const nameMatch = source.slice(index).match(/^[A-Za-z_]\w*/);
    if (nameMatch) {
      tokens.push({ type: "name", value: nameMatch[0] });
      index += nameMatch[0].length;
      continue;
    }
    if ("+-*/%^(),".includes(char)) {
      tokens.push({ type: char, value: char });
      index += 1;
      continue;
    }
    throw new Error(`表达式包含暂不支持的字符：${char}`);
  }
  tokens.push({ type: "eof", value: "" });
  return tokens;
}

function parseMathExpressionTokens(tokens) {
  let index = 0;
  const peek = () => tokens[index] || { type: "eof", value: "" };
  const consume = (type) => {
    if (peek().type !== type) return false;
    index += 1;
    return true;
  };
  const expect = (type) => {
    if (!consume(type)) throw new Error("函数表达式语法不完整");
  };

  function parseExpression() {
    return parseAdditive();
  }

  function parseAdditive() {
    let node = parseMultiplicative();
    while (peek().type === "+" || peek().type === "-") {
      const op = peek().type;
      index += 1;
      node = { type: "binary", op, left: node, right: parseMultiplicative() };
    }
    return node;
  }

  function parseMultiplicative() {
    let node = parseUnary();
    while (peek().type === "*" || peek().type === "/" || peek().type === "%") {
      const op = peek().type;
      index += 1;
      node = { type: "binary", op, left: node, right: parseUnary() };
    }
    return node;
  }

  function parseUnary() {
    if (consume("+")) return parseUnary();
    if (consume("-")) return { type: "unary", op: "-", value: parseUnary() };
    return parsePower();
  }

  function parsePower() {
    let node = parsePrimary();
    if (consume("^")) {
      node = { type: "binary", op: "^", left: node, right: parseUnary() };
    }
    return node;
  }

  function parsePrimary() {
    const token = peek();
    if (token.type === "number") {
      index += 1;
      return { type: "number", value: token.value };
    }
    if (token.type === "name") {
      index += 1;
      if (consume("(")) {
        const args = [];
        if (!consume(")")) {
          do {
            args.push(parseExpression());
          } while (consume(","));
          expect(")");
        }
        return { type: "call", name: token.value.toLowerCase(), args };
      }
      return { type: "name", name: token.value };
    }
    if (consume("(")) {
      const node = parseExpression();
      expect(")");
      return node;
    }
    throw new Error("函数表达式语法不完整");
  }

  const ast = parseExpression();
  if (peek().type !== "eof") throw new Error("函数表达式语法不完整");
  return ast;
}

function evaluateMathExpressionNode(node, x) {
  if (node.type === "number") return node.value;
  if (node.type === "name") {
    const name = node.name;
    if (name.toLowerCase() === "x") return x;
    if (name === "PI" || name.toLowerCase() === "pi") return Math.PI;
    if (name === "E" || name === "e") return Math.E;
    throw new Error(`不支持的标识符：${name}`);
  }
  if (node.type === "unary") {
    const value = evaluateMathExpressionNode(node.value, x);
    return node.op === "-" ? -value : value;
  }
  if (node.type === "binary") {
    const left = evaluateMathExpressionNode(node.left, x);
    const right = evaluateMathExpressionNode(node.right, x);
    if (node.op === "+") return left + right;
    if (node.op === "-") return left - right;
    if (node.op === "*") return left * right;
    if (node.op === "/") return left / right;
    if (node.op === "%") return left % right;
    if (node.op === "^") return Math.pow(left, right);
  }
  if (node.type === "call") {
    const args = node.args.map((arg) => evaluateMathExpressionNode(arg, x));
    if (!MATH_FUNCTION_IMPLS[node.name]) throw new Error(`不支持的函数：${node.name}`);
    if ((node.name === "atan2" || node.name === "pow") && args.length !== 2) throw new Error(`${node.name} 函数需要 2 个参数`);
    if ((node.name === "max" || node.name === "min") && args.length < 1) throw new Error(`${node.name} 函数至少需要 1 个参数`);
    if (!["atan2", "pow", "max", "min"].includes(node.name) && args.length !== 1) throw new Error(`${node.name} 函数需要 1 个参数`);
    return MATH_FUNCTION_IMPLS[node.name](...args);
  }
  throw new Error("函数表达式语法不完整");
}

function compileMathExpression(input) {
  let source = String(input || "").trim();
  source = source
    .replace(/^y\s*=\s*/i, "")
    .replace(/\u03c0/g, "PI")
    .replace(/\bln\s*\(/gi, "log(")
    .replace(/\bMath\s*\.\s*/g, "");
  if (!source) throw new Error("请输入函数表达式");
  const tokens = tokenizeMathExpression(source);
  const ast = parseMathExpressionTokens(tokens);
  return { source, fn: (x) => evaluateMathExpressionNode(ast, Number(x)) };
}

function buildMathFunctionPlot(expression, xMinValue, xMaxValue) {
  try {
    const xMin = Number(xMinValue);
    const xMax = Number(xMaxValue);
    if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMin >= xMax) throw new Error("请输入有效的 x 范围");
    const compiled = compileMathExpression(expression);
    const samples = 360;
    const points = [];
    for (let i = 0; i <= samples; i += 1) {
      const x = xMin + ((xMax - xMin) * i) / samples;
      const y = Number(compiled.fn(x));
      if (Number.isFinite(y)) points.push({ x, y });
      else points.push({ x, y: null });
    }
    const finite = points.filter((point) => Number.isFinite(point.y));
    if (!finite.length) throw new Error("当前范围内没有可绘制的有限函数值");
    let yMin = Math.min(...finite.map((point) => point.y));
    let yMax = Math.max(...finite.map((point) => point.y));
    if (Math.abs(yMax - yMin) < 1e-9) {
      yMin -= 1;
      yMax += 1;
    }
    const padding = (yMax - yMin) * 0.12;
    return {
      ok: true,
      expression: compiled.source,
      points,
      xMin,
      xMax,
      yMin: yMin - padding,
      yMax: yMax + padding
    };
  } catch (error) {
    return { ok: false, error: error.message || "函数图像生成失败" };
  }
}

function renderMathFunctionSvg(plot) {
  if (!plot.ok) {
    return `<div class="math-function-empty">${escapeHtml(plot.error || "输入函数后生成图像。")}</div>`;
  }
  const width = 920;
  const height = 540;
  const pad = 48;
  const mapX = (x) => pad + ((x - plot.xMin) / (plot.xMax - plot.xMin)) * (width - pad * 2);
  const mapY = (y) => height - pad - ((y - plot.yMin) / (plot.yMax - plot.yMin)) * (height - pad * 2);
  const axisY = clamp(mapX(0), pad, width - pad);
  const axisX = clamp(mapY(0), pad, height - pad);
  let pathData = "";
  let drawing = false;
  plot.points.forEach((point) => {
    if (!Number.isFinite(point.y)) {
      drawing = false;
      return;
    }
    const x = mapX(point.x).toFixed(2);
    const y = mapY(point.y).toFixed(2);
    pathData += `${drawing ? "L" : "M"}${x} ${y} `;
    drawing = true;
  });
  const xTicks = Array.from({ length: 5 }, (_, index) => plot.xMin + ((plot.xMax - plot.xMin) * index) / 4);
  const yTicks = Array.from({ length: 5 }, (_, index) => plot.yMin + ((plot.yMax - plot.yMin) * index) / 4);
  return `
    <svg class="function-plot-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(plot.expression)} 函数图像">
      <rect x="0" y="0" width="${width}" height="${height}" rx="8"></rect>
      ${xTicks.map((tick) => `<line class="plot-grid" x1="${mapX(tick).toFixed(2)}" y1="${pad}" x2="${mapX(tick).toFixed(2)}" y2="${height - pad}"></line>`).join("")}
      ${yTicks.map((tick) => `<line class="plot-grid" x1="${pad}" y1="${mapY(tick).toFixed(2)}" x2="${width - pad}" y2="${mapY(tick).toFixed(2)}"></line>`).join("")}
      <line class="plot-axis" x1="${pad}" y1="${axisX.toFixed(2)}" x2="${width - pad}" y2="${axisX.toFixed(2)}"></line>
      <line class="plot-axis" x1="${axisY.toFixed(2)}" y1="${pad}" x2="${axisY.toFixed(2)}" y2="${height - pad}"></line>
      <path class="plot-curve" d="${pathData.trim()}"></path>
      ${xTicks.map((tick) => `<text class="plot-label" x="${mapX(tick).toFixed(2)}" y="${height - 16}" text-anchor="middle">${escapeHtml(Number(tick.toFixed(2)).toString())}</text>`).join("")}
      ${yTicks.map((tick) => `<text class="plot-label" x="12" y="${(mapY(tick) + 4).toFixed(2)}">${escapeHtml(Number(tick.toFixed(2)).toString())}</text>`).join("")}
      <text class="plot-title" x="${pad}" y="30">y = ${escapeHtml(plot.expression)}</text>
    </svg>
  `;
}

function renderMathFunctionLab() {
  const lab = labConfigForSubject(state.modelSubject);
  const plot = buildMathFunctionPlot(state.mathFunctionExpression, state.mathFunctionXMin, state.mathFunctionXMax);
  return `
    <div class="model-layout math-function-layout">
      <section class="panel palette-panel math-function-panel">
        <div class="lab-head">
          <div>
            <h3>${escapeHtml(lab.title)}</h3>
            <p class="hint">${escapeHtml(lab.summary)}</p>
          </div>
          <label class="compact-label">学科<select id="modelSubject">${subjectOptions(state.modelSubject)}</select></label>
        </div>
        <form id="mathFunctionForm" class="math-function-form stack">
          <label>函数表达式
            <input name="expression" value="${escapeHtml(state.mathFunctionExpression || "")}" placeholder="例如：sin(x)、x^2 + 2*x - 1" />
          </label>
          <div class="math-range-row">
            <label>x 最小值<input name="xMin" value="${escapeHtml(state.mathFunctionXMin || "-10")}" /></label>
            <label>x 最大值<input name="xMax" value="${escapeHtml(state.mathFunctionXMax || "10")}" /></label>
          </div>
          <button class="primary" type="submit">生成函数图像</button>
          <button class="ghost" type="button" id="mathFunctionExample">载入示例</button>
          <p class="hint">${escapeHtml(lab.hint)}</p>
        </form>
        ${plot.ok ? `
          <div class="math-plot-meta">
            <strong>当前函数</strong>
            <p>y = ${escapeHtml(plot.expression)}，x ∈ [${plot.xMin}, ${plot.xMax}]</p>
            <p>自动缩放 y 轴范围：[${Number(plot.yMin.toFixed(3))}, ${Number(plot.yMax.toFixed(3))}]</p>
          </div>
        ` : `<div class="algorithm-generation-info"><strong>生成失败</strong><p>${escapeHtml(plot.error || "")}</p></div>`}
      </section>
      <section class="panel model-canvas-panel math-plot-panel">
        <div class="split-head">
          <div>
            <h3>函数图像画布</h3>
            <span>输入表达式后在同一画布中重绘函数曲线。</span>
          </div>
        </div>
        <div class="function-plot-canvas">
          ${renderMathFunctionSvg(plot)}
        </div>
      </section>
    </div>
  `;
}

function renderModelPage() {
  const models = (state.data.models || []).filter((model) => model.subject === state.modelSubject);
  const selected = state.modelComponents.find((item) => item.id === state.selectedComponentId);
  const lab = labConfigForSubject(state.modelSubject);
  const isMachineLearning = state.modelSubject === "机器学习";
  if (state.modelSubject === "数学") return renderMathFunctionLab();
  const palette = isMachineLearning ? [] : paletteForSubject(state.modelSubject);
  const canSaveOrDownload = hasModelDraft();
  return `
    <div class="model-layout">
      <section class="panel palette-panel">
        <div class="lab-head">
          <div>
            <h3>${escapeHtml(lab.title)}</h3>
            <p class="hint">${escapeHtml(lab.summary)}</p>
          </div>
          <label class="compact-label">学科<select id="modelSubject">${subjectOptions(state.modelSubject)}</select></label>
        </div>
        <p class="hint">${escapeHtml(lab.hint)}</p>
        ${isMachineLearning ? renderAiAlgorithmGenerator() : `
          ${renderModelTemplates(state.modelSubject)}
          <div class="palette">
            ${palette.map((item) => `
              <button draggable="true" class="palette-item ${item.kind === "algorithm" ? "algorithm-item" : ""}" data-component-type="${item.type}" title="${item.kind === "algorithm" ? "双击查看代码，或拖入画布保存实验" : "拖入画布"}">
                <span>${item.icon}</span>${item.label}
              </button>
            `).join("")}
          </div>
        `}
        <form id="saveModelForm" class="stack">
          <label>模型名称<input name="name" value="${escapeHtml(models.find((model) => model.id === state.loadedModelId)?.name || "")}" placeholder="${isMachineLearning ? "例如：AI生成KNN分类实验" : "例如：斜面小车运动模型"}" /></label>
          <label>说明<textarea name="notes" rows="3" placeholder="记录参数、题目来源或使用场景"></textarea></label>
          <div class="model-action-row">
            <button class="primary" type="submit" ${canSaveOrDownload ? "" : "disabled"}>${isMachineLearning ? "保存算法代码" : "保存模型"}</button>
            <button class="ghost" type="button" id="downloadDraftModel" ${canSaveOrDownload ? "" : "disabled"}>${isMachineLearning ? "下载算法代码" : "下载当前模型"}</button>
          </div>
          <button class="ghost" type="button" id="clearModelCanvas">清空画布</button>
          ${canSaveOrDownload ? "" : `<p class="hint">${isMachineLearning ? "请先输入算法需求并点击“AI 生成并运行”。" : "请先把模型或算法节点拖入画布，再保存或下载。"}</p>`}
        </form>
      </section>
      <section class="panel model-canvas-panel">
        ${isMachineLearning ? "" : `
          <div class="split-head">
            <div>
              <h3>${escapeHtml(lab.title)}画布 · ${state.modelMode === "ideal" ? "理想状态" : "真实状态"}</h3>
              <span>将左侧组件拖到画布中，可继续拖动调整位置。</span>
            </div>
            <div class="segmented compact">
              <button class="${state.modelMode === "ideal" ? "active" : ""}" data-model-mode="ideal">理想状态</button>
              <button class="${state.modelMode === "real" ? "active" : ""}" data-model-mode="real">真实状态</button>
            </div>
          </div>
        `}
        <div id="modelCanvas" class="model-canvas ${state.modelSubject === "机器学习" ? "ml-canvas" : ""}">
          ${lab.showAxes === false ? "" : `<div class="axis-line x"></div><div class="axis-line y"></div>`}
          ${state.modelComponents.map((item) => renderModelComponent(item)).join("")}
          ${isMachineLearning && !state.modelComponents.length ? `<div class="ml-empty-canvas">输入左侧算法需求后由 AI 生成代码，或点击“空白画布”自定义算法。</div>` : ""}
          ${renderModelCodePanel()}
        </div>
        <div class="inspector ${isMachineLearning ? "result-only" : ""}">
          ${isMachineLearning ? renderRunResultPanel() : `
            ${selected ? `
              <strong>当前组件：${escapeHtml(selected.label)}</strong>
              <div class="property-grid">
                ${Object.entries(selected.props || {}).map(([key, value]) => `
                  <label>${escapeHtml(key)}<input data-prop-key="${escapeHtml(key)}" value="${escapeHtml(value)}" /></label>
                `).join("")}
              </div>
              ${componentSupportsCode(selected) ? `<button class="ghost" type="button" id="openAlgorithmCode">查看代码并测试</button>` : ""}
              <button class="danger" id="deleteComponentBtn">删除组件</button>
            ` : ""}
            ${renderRunResultPanel()}
          `}
        </div>
      </section>
      <section class="panel saved-models">
        <h3>已保存模型</h3>
        <div class="saved-list">
          ${models.map((model) => `
            <article class="list-card">
              <div>
                <h3>${escapeHtml(model.name)}</h3>
                <p>${isMachineLearning ? `算法代码 · ${model.components.length || 1} 个模型` : `${escapeHtml(model.mode === "real" ? "真实状态" : "理想状态")} · ${model.components.length} 个组件`}</p>
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
  const isAlgorithm = componentSupportsCode(item);
  return `
    <button class="model-node ${isAlgorithm ? "algorithm-node" : ""} ${state.selectedComponentId === item.id ? "active" : ""}" style="left:${item.x}%; top:${item.y}%;" data-node-id="${item.id}" title="${escapeHtml(item.label)}">
      <span>${escapeHtml(item.icon)}</span>
      <small>${escapeHtml(item.label)}</small>
    </button>
  `;
}

function renderModelCodePanel() {
  const algorithm = modelCodeDefinition();
  if (!algorithm) return "";
  const code = state.modelCodeDraft || algorithm.code || "";
  return `
    <div class="model-code-panel" role="dialog" aria-label="${escapeHtml(algorithm.title)}代码测试">
      <div class="model-code-head">
        <div>
          <strong>${escapeHtml(algorithm.title)}</strong>
          <span>${escapeHtml(algorithm.chapter)}</span>
        </div>
        <div class="model-code-tools">
          <button class="primary" type="button" id="runModelCodeBtn" ${state.modelCodeRunning ? "disabled" : ""}>${state.modelCodeRunning ? "运行中..." : "运行测试"}</button>
          <button class="mini" type="button" id="repairModelCodeBtn" ${state.modelCodeRunning ? "disabled" : ""}>Run + repair</button>
          <button class="mini" type="button" id="closeModelCodeBtn">关闭</button>
        </div>
      </div>
      <textarea id="modelCodeEditor" spellcheck="false">${escapeHtml(code)}</textarea>
      <p class="hint">代码可直接修改；点击右上角“运行测试”后，后端会调用 Python 执行当前代码，stdout/stderr 会显示在画布下方“运行结果”区域。</p>
    </div>
  `;
}

function formatVerifiedRunResult(run) {
  if (!run) return "";
  if (run.output) return String(run.output);
  const exitCode = Number.isFinite(Number(run.exitCode)) ? Number(run.exitCode) : 0;
  const durationMs = Number.isFinite(Number(run.durationMs)) ? Number(run.durationMs) : 0;
  const lines = [`执行状态：生成后预检完成（退出码 ${exitCode}）`];
  if (run.pythonCommand) lines.push(`Python：${run.pythonCommand}`);
  lines.push(`耗时：${durationMs} ms`);
  if (String(run.stdout || "").trim()) lines.push(`\n[stdout]\n${String(run.stdout).trimEnd()}`);
  if (String(run.stderr || "").trim()) lines.push(`\n[stderr]\n${String(run.stderr).trimEnd()}`);
  return lines.join("\n");
}

function installGeneratedAlgorithm(payload, prompt) {
  const title = payload.title || compactText(prompt, 30) || "AI生成算法";
  const verifiedOutput = formatVerifiedRunResult(payload.verifiedRun);
  const component = {
    id: `cmp_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    type: "ml-ai-generated",
    icon: "AI",
    label: title,
    kind: "customAlgorithm",
    x: 50,
    y: 42,
    props: {
      code: payload.code || "",
      chapter: payload.chapter || "AI生成算法",
      prompt,
      generationSource: payload.sourceType || "",
      citations: payload.citations || [],
      explanation: payload.explanation || null,
      workflow: payload.workflow || [],
      experiment: payload.experiment || null,
      verifiedRun: payload.verifiedRun || null,
      repairHistory: payload.repairHistory || [],
      repairAttempts: payload.repairAttempts || 0,
      runResult: verifiedOutput
    }
  };
  state.modelComponents = [component];
  state.selectedComponentId = component.id;
  state.loadedModelId = null;
  state.modelCodeType = component.type;
  state.modelCodeComponentId = component.id;
  state.modelCodeDraft = component.props.code;
  state.modelCodeRan = Boolean(verifiedOutput);
  state.modelRunResult = verifiedOutput;
  state.modelExperimentRecord = payload.experiment || null;
}

async function runCurrentModelCode(options = {}) {
  const autoRepair = Boolean(options.autoRepair);
  const runButton = document.getElementById("runModelCodeBtn");
  const repairButton = document.getElementById("repairModelCodeBtn");
  const resultOutput = document.querySelector(".run-result-panel pre");
  const setRunResult = (text) => {
    state.modelRunResult = text;
    if (resultOutput) resultOutput.textContent = text;
  };
  const editor = document.getElementById("modelCodeEditor");
  const draft = editor ? editor.value : state.modelCodeDraft;
  state.modelCodeDraft = draft;
  const definition = modelCodeDefinition();
  const component = state.modelComponents.find((item) => item.id === state.modelCodeComponentId);
  if (component) {
    component.props = component.props && typeof component.props === "object" ? component.props : {};
    component.props.code = draft;
  }
  if (!String(draft || "").trim()) {
    setRunResult("Run failed: code is empty. Please generate or enter Python code first.");
    state.modelCodeRan = true;
    return null;
  }
  state.modelCodeRunning = true;
  if (runButton) {
    runButton.disabled = true;
    runButton.textContent = "Running...";
  }
  if (repairButton) {
    repairButton.disabled = true;
    repairButton.textContent = autoRepair ? "Repairing..." : "Run + repair";
  }
  setRunResult(autoRepair ? "Running code; if it fails, auto repair will retry..." : "Running code...");
  try {
    const payload = await api("/api/model-code/run", {
      method: "POST",
      body: {
        userId: state.user.id,
        subject: state.modelSubject,
        title: definition?.title || component?.label || "Custom algorithm code",
        code: draft,
        prompt: component?.props?.prompt || state.modelAlgorithmPrompt || definition?.title || "",
        codeMode: state.modelCodeMode,
        difficulty: state.modelDifficulty,
        autoRepair,
        maxRepairAttempts: 2
      }
    });
    state.modelCodeRan = true;
    const nextCode = payload.repairedCode || draft;
    if (payload.repairedCode) {
      state.modelCodeDraft = payload.repairedCode;
      if (editor) editor.value = payload.repairedCode;
    }
    setRunResult(payload.output || "Program finished without output. Use print(...) to show test results.");
    const current = state.modelComponents.find((item) => item.id === state.modelCodeComponentId);
    if (current) {
      current.props = current.props && typeof current.props === "object" ? current.props : {};
      current.props.code = nextCode;
      current.props.runResult = state.modelRunResult;
      current.props.lastExitCode = payload.exitCode;
      current.props.lastDurationMs = payload.durationMs;
      current.props.lastRunAt = new Date().toISOString();
      current.props.workflow = payload.workflow || current.props.workflow || [];
      current.props.repairHistory = payload.repairHistory || current.props.repairHistory || [];
      current.props.repairAttempts = payload.repairAttempts || 0;
    }
    return payload;
  } catch (error) {
    state.modelCodeRan = true;
    setRunResult(`Run API error

[stderr]
${error.message}`);
    return null;
  } finally {
    state.modelCodeRunning = false;
    if (runButton) {
      runButton.disabled = false;
      runButton.textContent = "Run test";
    }
    if (repairButton) {
      repairButton.disabled = false;
      repairButton.textContent = "Run + repair";
    }
  }
}

function bindModelPage() {
  document.getElementById("modelSubject")?.addEventListener("change", (event) => {
    state.modelSubject = event.target.value;
    state.modelMode = state.modelSubject === "机器学习" ? "algorithm" : "ideal";
    state.modelComponents = [];
    state.selectedComponentId = null;
    state.loadedModelId = null;
    state.modelRunResult = "";
    state.modelGenerationInfo = null;
    resetModelCodeState();
    renderContent();
  });
  document.getElementById("mathFunctionForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.mathFunctionExpression = String(form.get("expression") || "").trim();
    state.mathFunctionXMin = String(form.get("xMin") || "-10").trim();
    state.mathFunctionXMax = String(form.get("xMax") || "10").trim();
    renderContent();
  });
  document.getElementById("mathFunctionExample")?.addEventListener("click", () => {
    state.mathFunctionExpression = "sin(x) + 0.5*cos(2*x)";
    state.mathFunctionXMin = "-10";
    state.mathFunctionXMax = "10";
    renderContent();
  });
  document.getElementById("openBlankAlgorithmCanvas")?.addEventListener("click", () => {
    createBlankAlgorithmCanvas();
    renderContent();
    showToast("空白算法画布已打开，可修改代码后运行测试");
  });
  document.getElementById("aiAlgorithmForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const prompt = String(form.get("prompt") || "").trim();
    if (!prompt) return showToast("??????????", "error");
    state.modelAlgorithmPrompt = prompt;
    state.modelCodeMode = String(form.get("codeMode") || "teaching");
    state.modelDifficulty = String(form.get("difficulty") || "standard");
    state.modelAlgorithmGenerating = true;
    state.modelRunResult = "???????????????...";
    state.modelExperimentRecord = null;
    state.modelGenerationInfo = {
      sourceLabel: "???",
      summary: "????????????????????",
      workflow: [
        { label: "Course search tool", status: "running", detail: "Searching course materials and graph" },
        { label: "Code generation tool", status: "pending", detail: "Waiting for course context" },
        { label: "Python sandbox runner", status: "pending", detail: "Run after generation" },
        { label: "Error repair tool", status: "pending", detail: "Repair if execution fails" }
      ]
    };
    renderContent();
    try {
      const payload = await api("/api/model-code/generate", {
        method: "POST",
        body: {
          userId: state.user.id,
          subject: state.modelSubject || "????",
          prompt,
          codeMode: state.modelCodeMode,
          difficulty: state.modelDifficulty,
          maxRepairAttempts: 2
        }
      });
      installGeneratedAlgorithm(payload, prompt);
      const sourceLabels = {
        course: "??????",
        openai: "?? OpenAI",
        local: "??????"
      };
      state.modelGenerationInfo = {
        sourceLabel: sourceLabels[payload.sourceType] || "????",
        summary: payload.summary || (payload.sourceType === "course" ? "??????????????????" : "???????????"),
        citations: payload.citations || [],
        workflow: payload.workflow || [],
        explanation: payload.explanation || null
      };
      state.modelExperimentRecord = payload.experiment || null;
      renderContent();
      await runCurrentModelCode();
    } catch (error) {
      state.modelRunResult = `????

[stderr]
${error.message}`;
      state.modelGenerationInfo = {
        sourceLabel: "????",
        summary: error.message
      };
      showToast(error.message, "error");
      renderContent();
    } finally {
      state.modelAlgorithmGenerating = false;
      renderContent();
    }
  });
  document.querySelectorAll("[data-model-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.modelMode = button.dataset.modelMode;
      renderContent();
    });
  });
  document.querySelectorAll("[data-open-model-template], [data-run-model-template], [data-edit-model-template]").forEach((button) => {
    button.addEventListener("click", async () => {
      const key = button.dataset.openModelTemplate || button.dataset.runModelTemplate || button.dataset.editModelTemplate;
      const shouldRun = Boolean(button.dataset.runModelTemplate);
      const ok = applyModelTemplate(key, {
        openCode: Boolean(button.dataset.editModelTemplate),
        runExample: shouldRun
      });
      if (!ok) return showToast("模板不存在", "error");
      renderContent();
      if (shouldRun) {
        await runCurrentModelCode();
        showToast("示例代码已真实运行");
        return;
      }
      showToast("模板已打开");
    });
  });
  document.querySelectorAll("[data-component-type]").forEach((button) => {
    button.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", button.dataset.componentType);
    });
    button.addEventListener("dblclick", () => {
      if (!mlAlgorithmForType(button.dataset.componentType)) return;
      openModelCode(button.dataset.componentType);
      renderContent();
    });
  });
  const canvas = document.getElementById("modelCanvas");
  canvas?.addEventListener("dragover", (event) => event.preventDefault());
  canvas?.addEventListener("drop", (event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData("text/plain");
    const meta = modelComponentMeta(type);
    if (!meta) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(4, Math.min(92, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(8, Math.min(88, ((event.clientY - rect.top) / rect.height) * 100));
    const component = {
      id: `cmp_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      type: meta.type,
      icon: meta.icon,
      label: meta.label,
      kind: meta.kind || "component",
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      props: { ...meta.defaults }
    };
    state.modelComponents.push(component);
    state.selectedComponentId = component.id;
    if (componentSupportsCode(component)) openModelCode(component.type, component.id);
    renderContent();
  });
  document.querySelectorAll("[data-node-id]").forEach((node) => {
    node.addEventListener("click", (event) => {
      const nodeId = node.dataset.nodeId;
      const target = state.modelComponents.find((item) => item.id === nodeId);
      if (event.detail >= 2 && componentSupportsCode(target)) {
        openModelCode(target.type, target.id);
        renderContent();
        return;
      }
      state.selectedComponentId = nodeId;
      window.setTimeout(() => {
        if (state.selectedComponentId === nodeId) renderContent();
      }, 160);
    });
    node.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const target = state.modelComponents.find((item) => item.id === node.dataset.nodeId);
      if (!componentSupportsCode(target)) return;
      openModelCode(target.type, target.id);
      renderContent();
    });
    node.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      state.selectedComponentId = node.dataset.nodeId;
      const target = state.modelComponents.find((item) => item.id === node.dataset.nodeId);
      const rect = canvas.getBoundingClientRect();
      let dragged = false;
      const move = (moveEvent) => {
        dragged = true;
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
        if (dragged) renderContent();
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
  document.getElementById("openAlgorithmCode")?.addEventListener("click", () => {
    const selected = state.modelComponents.find((item) => item.id === state.selectedComponentId);
    if (!componentSupportsCode(selected)) return;
    openModelCode(selected.type, selected.id);
    renderContent();
  });
  document.getElementById("closeModelCodeBtn")?.addEventListener("click", () => {
    persistOpenModelCodeDraft();
    resetModelCodeState();
    renderContent();
  });
  document.getElementById("runModelCodeBtn")?.addEventListener("click", async (event) => {
    event.preventDefault();
    await runCurrentModelCode();
  });
  document.getElementById("repairModelCodeBtn")?.addEventListener("click", async (event) => {
    event.preventDefault();
    await runCurrentModelCode({ autoRepair: true });
  });
  document.getElementById("clearModelCanvas")?.addEventListener("click", () => {
    state.modelComponents = [];
    state.selectedComponentId = null;
    state.loadedModelId = null;
    state.modelRunResult = "";
    state.modelGenerationInfo = null;
    resetModelCodeState();
    renderContent();
  });
  document.getElementById("downloadDraftModel")?.addEventListener("click", () => {
    if (!hasModelDraft()) return showToast("请先在画布中添加模型或打开算法代码", "error");
    persistOpenModelCodeDraft();
    downloadJson(`${state.modelSubject}-模型草稿.json`, {
      name: "未命名模型",
      subject: state.modelSubject,
      mode: state.modelSubject === "机器学习" ? "algorithm" : state.modelMode,
      components: modelDraftComponents()
    });
  });
  document.getElementById("saveModelForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    if (!name) return showToast("请填写模型名称", "error");
    if (!hasModelDraft()) return showToast("请先在画布中添加模型或打开算法代码", "error");
    persistOpenModelCodeDraft();
    const components = modelDraftComponents();
    try {
      const payload = await api("/api/models", {
        method: "POST",
        body: {
          id: state.loadedModelId,
          userId: state.user.id,
          name,
          subject: state.modelSubject,
          mode: state.modelSubject === "机器学习" ? "algorithm" : state.modelMode,
          components,
          experiment: currentModelExperimentRecord(),
          notes: form.get("notes")
        }
      });
      if (state.modelSubject === "机器学习") {
        state.modelComponents = [];
        state.selectedComponentId = null;
        state.loadedModelId = null;
        state.modelRunResult = "";
        state.modelGenerationInfo = null;
        resetModelCodeState();
      } else {
        state.loadedModelId = payload.model.id;
      }
      await loadState();
      renderShell();
      showToast(state.modelSubject === "机器学习" ? "算法代码已保存，画布已清空" : "模型已保存");
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
      state.modelMode = model.subject === "机器学习" ? "algorithm" : model.mode;
      state.modelComponents = normalizeLoadedModelComponents(model);
      state.selectedComponentId = state.modelComponents[0]?.id || null;
      state.modelGenerationInfo = null;
      state.modelExperimentRecord = model.experiment || null;
      if (model.experiment) {
        state.modelCodeMode = model.experiment.codeMode || state.modelCodeMode;
        state.modelDifficulty = model.experiment.difficulty || state.modelDifficulty;
        state.modelAlgorithmPrompt = model.experiment.prompt || state.modelAlgorithmPrompt;
      }
      resetModelCodeState();
      if (model.subject === "机器学习") {
        const codeComponent = state.modelComponents.find((component) => componentSupportsCode(component));
        if (codeComponent) {
          state.selectedComponentId = codeComponent.id;
          openModelCode(codeComponent.type, codeComponent.id);
        }
      }
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

function renderChatToolBar(friends) {
  const threads = state.data.chatThreads || [];
  const groupCount = threads.filter((thread) => thread.type === "group").length;
  const incomingCount = chatPendingCount();
  return `
    <section class="workbench-title chat-title">
      <div>
        <h2>站内消息</h2>
        <p>${friends.length} 位好友 · ${groupCount} 个群 · ${threads.length} 个会话${incomingCount ? ` · ${incomingCount} 条待处理` : ""}</p>
      </div>
      <div class="chat-top-actions">
        <button class="chat-top-button ${incomingCount ? "has-dot" : ""}" type="button" data-chat-tool="pending">
          待处理${incomingCount ? `<span>${incomingCount}</span>` : ""}
        </button>
        <button class="chat-top-button" type="button" data-chat-tool="contacts">通讯录</button>
        <button class="primary" type="button" data-chat-tool="friend">添加好友</button>
        <button class="mini" type="button" data-chat-tool="group">创建群聊</button>
      </div>
    </section>
  `;
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
    ${renderChatToolBar(friends)}
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

function renderClassPage() {
  if (state.user.role !== "teacher") return emptyBlock("学生端不显示班级管理。");
  const classes = state.data.classes || [];
  const active = classes.find((klass) => klass.id === state.selectedClassId) || classes[0];
  if (active && !state.selectedClassId) state.selectedClassId = active.id;
  if (!active) state.classManageOpen = false;
  const students = active ? (active.studentIds || []).map((id) => state.data.users.find((user) => user.id === id)).filter(Boolean) : [];
  const applications = active?.applications || [];
  const totalStudentIds = new Set(classes.flatMap((klass) => klass.studentIds || []));
  const totalApplications = classes.reduce((sum, klass) => sum + (klass.applications || []).filter((item) => item.status === "pending").length, 0);
  return state.classManageOpen && active
    ? renderTeacherClassDetail(active, students, applications)
    : renderTeacherClassList(classes, active, totalStudentIds, totalApplications);
}

function renderTeacherClassList(classes, active, totalStudentIds, totalApplications) {
  return `
    <div class="class-page-shell class-course-shell">
      <section class="course-page-tabs class-course-tabs" role="tablist" aria-label="班级管理">
        <button type="button" class="active">我管理的班级</button>
      </section>
      <section class="class-course-toolbar">
        <form id="createClassForm" class="class-course-create">
          <button class="primary" type="submit">${iconSvg("users")} 新建班级</button>
          <input name="name" placeholder="班级名称" required />
          <select name="subject">${subjectOptions(state.user.subject || "物理")}</select>
        </form>
        <div class="class-course-summary inline-stats">
          <span>${classes.length}<small>班级</small></span>
          <span>${totalStudentIds.size}<small>总学生</small></span>
          <span>${totalApplications}<small>待审核</small></span>
        </div>
      </section>
      <section class="class-course-board">
        ${classes.length ? `
          <div class="class-course-grid">
            ${classes.map((klass) => {
              const count = (klass.studentIds || []).length;
              const pending = (klass.applications || []).filter((item) => item.status === "pending").length;
              return `
                <article class="class-course-card ${active?.id === klass.id ? "active" : ""}" data-class-card="${escapeHtml(klass.id)}" tabindex="0" role="button" title="双击进入管理班级">
                  <div class="class-course-card-main">
                    <span>${escapeHtml(klass.subject)}</span>
                    <strong>${escapeHtml(klass.name)}</strong>
                  </div>
                  <div class="class-course-card-meta">
                    <span>${count} 人</span>
                    <span>${escapeHtml(klass.inviteCode)}</span>
                    <span>${pending} 申请</span>
                  </div>
                  <button class="mini" type="button" data-open-class="${escapeHtml(klass.id)}">管理</button>
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
    </div>
  `;
}

function renderTeacherClassDetail(active, students, applications) {
  const pending = applications.filter((item) => item.status === "pending").length;
  return `
    <div class="class-page-shell class-detail-shell">
      <section class="panel class-active-panel class-detail-head">
        <div>
          <h3>${escapeHtml(active.name)} · ${escapeHtml(active.subject)}</h3>
          <p class="hint">邀请码：${escapeHtml(active.inviteCode)} · 学生可用邀请码或班级 ID 申请加入。</p>
        </div>
        <div class="class-active-actions">
          <button class="class-stat-button" type="button" data-class-tool="roster"><strong>${students.length}</strong><span>学生</span></button>
          <article><strong>${escapeHtml(active.inviteCode)}</strong><span>邀请码</span></article>
          <button class="class-stat-button" type="button" data-class-tool="import"><strong>导入</strong><span>学生</span></button>
          <button class="class-stat-button" type="button" data-class-tool="applications"><strong>${pending}</strong><span>待审核</span></button>
          <button class="mini" type="button" data-class-back>返回</button>
          <button class="danger" type="button" data-delete-class="${active.id}" data-class-name="${escapeHtml(active.name)}">解散班级</button>
        </div>
      </section>
      ${renderTeacherClassFeatureGrid(active)}
      ${renderClassToolModal(active, applications, students)}
    </div>
  `;
}

function renderTeacherClassFeatureGrid(active) {
  const features = [
    { key: "ai", icon: "bot", label: "AI助教" },
    { key: "classroom", icon: "school", label: "AI课堂" },
    { key: "homework", icon: "clipboard", label: "作业管理" },
    { key: "graph", icon: "network", label: "知识图谱" },
    { key: "materials", icon: "files", label: "课程资料" },
    { key: "learning", icon: "target", label: "学情" }
  ];
  return `
    <section class="class-feature-grid" aria-label="班级功能">
      ${features.map((item) => `
        <button class="class-feature-button" type="button" data-class-feature="${item.key}" data-class-id="${escapeHtml(active.id)}" data-class-subject="${escapeHtml(active.subject || "")}">
          ${iconSvg(item.icon, item.label)}
          <strong>${escapeHtml(item.label)}</strong>
        </button>
      `).join("")}
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
  document.getElementById("createClassForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const payload = await api("/api/classes", {
        method: "POST",
        body: { teacherId: state.user.id, name: form.get("name"), subject: form.get("subject") }
      });
      state.selectedClassId = payload.class.id;
      state.classManageOpen = true;
      state.classTool = null;
      await loadState();
      renderShell();
      showToast("班级已创建");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.querySelectorAll("[data-class-card]").forEach((card) => {
    const openClass = () => {
      state.selectedClassId = card.dataset.classCard;
      state.classManageOpen = true;
      state.classTool = null;
      renderContent();
    };
    card.addEventListener("click", (event) => {
      if (event.target.closest("[data-open-class]")) return;
      state.selectedClassId = card.dataset.classCard;
      state.classTool = null;
      renderContent();
    });
    card.addEventListener("dblclick", openClass);
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      openClass();
    });
  });
  document.querySelectorAll("[data-open-class]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedClassId = button.dataset.openClass;
      state.classManageOpen = true;
      state.classTool = null;
      renderContent();
    });
  });
  document.querySelectorAll("[data-class-back]").forEach((button) => {
    button.addEventListener("click", () => {
      state.classManageOpen = false;
      state.classTool = null;
      renderContent();
    });
  });
  document.querySelectorAll("[data-class]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedClassId = button.dataset.class;
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
  document.querySelectorAll("[data-class-feature]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.classFeature;
      const classId = button.dataset.classId || state.selectedClassId || "";
      const classSubject = button.dataset.classSubject || "";
      state.aiClassId = classId;
      state.classTool = null;
      if (classSubject) {
        state.aiSubject = classSubject;
        state.graphSubject = classSubject;
        state.materialSubjectFilter = classSubject;
      }
      if (action === "homework") {
        state.selectedClassId = classId;
        state.page = "homework";
      } else if (action === "graph") {
        state.page = "graph";
      } else if (action === "materials") {
        state.page = "materials";
      } else {
        state.page = "ai";
        state.aiMode = action === "ai" ? "qa" : "plan";
        state.aiTaskKey = action === "classroom" ? "classroom_generation" : action === "learning" ? "class_analysis" : "qa";
        state.aiTeacherTask = state.aiTaskKey === "qa" ? "lesson_plan" : state.aiTaskKey;
      }
      await loadState();
      renderShell();
    });
  });
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
          <label>班级<select disabled><option>请先创建班级</option></select></label>
          <label>标题<input placeholder="作业标题" disabled /></label>
          <label>作业内容<textarea rows="4" placeholder="可填写文字说明" disabled></textarea></label>
          <button class="primary" type="button" disabled>发布作业</button>
          <p class="hint">请先创建班级。</p>
        </form>
      </section>
      </div>
    `;
  }
  const activeClassId = state.selectedClassId || classes[0]?.id || "";
  const homework = (state.data.homework || []).filter((item) => !activeClassId || item.classId === activeClassId);
  const submissions = state.data.submissions || [];
  const board = homeworkBoardColumns(homework, submissions, classes);
  return `
    <div class="teacher-homework-workspace">
    <section class="panel homework-create-panel compact-homework-create">
      <div class="split-head">
        <h3>布置作业</h3>
        <label class="compact-label">班级<select id="homeworkClassSelect">${classes.map((klass) => `<option value="${klass.id}" ${klass.id === activeClassId ? "selected" : ""}>${escapeHtml(klass.name)}</option>`).join("")}</select></label>
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
              ${column.items.slice(0, 8).map((item) => `<button type="button" data-board-homework="${item.homework.id}" ${item.submission ? `data-view-submission="${item.submission.id}"` : ""}>${escapeHtml(item.label)}<small>${escapeHtml(item.meta)}</small></button>`).join("") || `<p class="hint">暂无</p>`}
            </div>
          </section>
        `).join("")}
      </div>
    </section>
    <section class="panel homework-published-panel">
      <div class="split-head">
        <h3>已发布作业</h3>
        <span>${homework.length} 份</span>
      </div>
      <div class="saved-list homework-published-list">
        ${homework.map((item) => renderTeacherHomeworkItem(item, submissions)).join("") || emptyBlock("该班级暂无作业")}
      </div>
    </section>
    </div>
    ${state.homeworkModal ? renderSubmissionModal() : ""}
    ${state.teacherHomeworkDetailId ? renderTeacherHomeworkDetailModal() : ""}
  `;
}

function homeworkBoardColumns(homework, submissions, classes) {
  const studentCount = (homeworkItem) => classes.find((klass) => klass.id === homeworkItem.classId)?.studentIds?.length || 0;
  const byHomework = (homeworkItem) => submissions.filter((sub) => sub.homeworkId === homeworkItem.id);
  const columns = [
    { key: "unsubmitted", title: "待提交", items: [] },
    { key: "ai", title: "待 AI 建议", items: [] },
    { key: "confirm", title: "待教师确认", items: [] },
    { key: "done", title: "已完成", items: [] },
    { key: "recheck", title: "需要复批", items: [] }
  ];
  homework.forEach((item) => {
    const itemSubs = byHomework(item);
    const missing = Math.max(0, studentCount(item) - itemSubs.length);
    if (missing) columns[0].items.push({ homework: item, label: item.title, meta: `${missing} 人未提交` });
    itemSubs.forEach((sub) => {
      const student = state.data.users.find((user) => user.id === sub.studentId);
      const entry = { homework: item, submission: sub, label: `${student?.name || sub.studentId} · ${item.title}`, meta: fmtTime(sub.updatedAt || sub.createdAt) };
      if (sub.status === "review_pending") columns[2].items.push({ ...entry, meta: `AI 建议 ${sub.aiSuggestedScore ?? "-"} 分` });
      else if (sub.status === "graded") columns[3].items.push({ ...entry, meta: `${sub.score ?? "-"} 分` });
      else if (sub.status === "needs_recheck") columns[4].items.push(entry);
      else columns[1].items.push(entry);
    });
  });
  return columns;
}

function renderTeacherHomeworkItem(item, submissions) {
  const itemSubmissions = submissions.filter((sub) => sub.homeworkId === item.id);
  const graded = itemSubmissions.filter((sub) => sub.status === "graded").length;
  const reviewPending = itemSubmissions.filter((sub) => sub.status === "review_pending").length;
  return `
    <article class="list-card homework-teacher-card" data-teacher-homework="${item.id}">
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(compactText(item.description || "无文字说明", 82))}</p>
        <small>${fmtTime(item.createdAt)} · 提交 ${itemSubmissions.length} 份 · 已确认 ${graded} 份${reviewPending ? ` · 待确认 ${reviewPending} 份` : ""}</small>
        <div class="mini-submission-row">
          ${itemSubmissions.slice(0, 3).map((sub) => {
            const student = state.data.users.find((user) => user.id === sub.studentId);
            const label = sub.status === "graded" ? `${sub.score}分` : sub.status === "review_pending" ? `AI建议${sub.aiSuggestedScore ?? "-"}分` : "待批改";
            return `<button class="mini" type="button" data-view-submission="${sub.id}">${escapeHtml(student?.name || sub.studentId)} ${escapeHtml(label)}</button>`;
          }).join("") || `<span class="hint">暂无提交</span>`}
        </div>
      </div>
      <div class="card-actions">
        <button class="mini" type="button" data-edit-homework="${item.id}">查看/修改</button>
        <button class="mini danger" type="button" data-delete-homework="${item.id}">删除</button>
      </div>
    </article>
  `;
}

function renderTeacherHomeworkDetailModal() {
  const homework = (state.data.homework || []).find((item) => item.id === state.teacherHomeworkDetailId);
  if (!homework) return "";
  const classes = state.data.classes || [];
  const submissions = (state.data.submissions || []).filter((sub) => sub.homeworkId === homework.id);
  return `
    <div class="modal-backdrop">
      <section class="modal large">
        <button class="modal-close" id="closeTeacherHomeworkModal">×</button>
        <h2>${escapeHtml(homework.title)}</h2>
        <div class="review-layout">
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
          <div class="stack">
            <h3>提交与批改</h3>
            <div class="submission-grid compact-submission-grid">
              ${submissions.map((sub) => renderSubmissionCard(homework, sub)).join("") || emptyBlock("暂无学生提交。")}
            </div>
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderSubmissionCard(homework, submission) {
  const student = state.data.users.find((user) => user.id === submission.studentId);
  const statusLabel = submission.status === "graded"
    ? `已确认 ${submission.score} 分`
    : submission.status === "review_pending"
      ? `AI建议 ${submission.aiSuggestedScore ?? "-"} 分，待确认`
      : "待批改";
  return `
    <article class="submission-card">
      <h3>${escapeHtml(homework.title)}</h3>
      <p>${escapeHtml(student?.name || submission.studentId)} · ${escapeHtml(statusLabel)}</p>
      <small>${fmtTime(submission.updatedAt)}</small>
      <div class="actions">
        <button class="mini" data-view-submission="${submission.id}">查看/确认批改</button>
        <button class="mini primary" data-ai-grade="${submission.id}">生成 AI 建议</button>
      </div>
    </article>
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
            <button class="primary" type="submit">确认最终成绩</button>
          </form>
        </div>
      </section>
    </div>
  `;
}

function bindTeacherHomeworkPage() {
  bindDashboardPageLinks();
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
          rubric: form.get("rubric"),
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
  document.querySelectorAll("[data-teacher-homework]").forEach((card) => {
    card.addEventListener("dblclick", () => {
      state.teacherHomeworkDetailId = card.dataset.teacherHomework;
      renderContent();
    });
  });
  document.querySelectorAll("[data-edit-homework]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      state.teacherHomeworkDetailId = button.dataset.editHomework;
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
  const classes = state.data.classes || [];
  const hasClasses = classes.length > 0;
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
    <div class="student-homework-shell ${hasClasses ? "list-state" : "join-state"}">
    <section class="panel student-join-class-panel">
      <div class="split-head">
        <div>
          <h3>${hasClasses ? "已加入班级" : "加入班级后查看作业"}</h3>
          <p class="hint">${hasClasses ? "可在这里退出不需要的班级，也可以继续输入邀请码加入其他班级。" : "输入老师提供的邀请码或班级 ID，加入后会同步显示作业和师生消息；资料只展示老师公开为学生可检索的内容。"}</p>
        </div>
        <span>${hasClasses ? `${classes.length} 个班级` : "等待加入"}</span>
      </div>
      <form id="joinClassForm" class="join-class-form">
        <input name="classCode" placeholder="输入班级邀请码 / 班级 ID" required />
        <button class="primary" type="submit">加入班级</button>
      </form>
      <div class="student-class-membership">
        ${renderStudentClassMembershipList(classes)}
      </div>
    </section>
    <section class="homework-list compact-homework-list">
      ${homeworkList || emptyBlock(hasClasses ? "当前班级还没有老师发布作业。可以先进入 AI 助教或知识图谱继续学习。" : "尚未加入班级。教师资料只有公开为学生可检索时才会显示；班级作业需要加入后查看。")}
    </section>
    ${state.homeworkDetailId ? renderStudentHomeworkModal() : ""}
    </div>
  `;
}

function renderStudentClassMembershipList(classes = []) {
  if (!classes.length) {
    return emptyBlock("尚未加入班级。加入后可以在这里退出，也可以继续输入邀请码加入其他班级。");
  }
  return `
    <div class="table-list class-membership-list">
      ${classes.map((klass) => `
        <div>
          <span class="class-membership-main">
            <strong>${escapeHtml(klass.name)}</strong>
            <small>${escapeHtml(klass.subject)} · ${escapeHtml(klass.inviteCode)}</small>
          </span>
          <span class="class-membership-meta">${(klass.studentIds || []).length} 人</span>
          <button class="mini danger" type="button" data-leave-class="${klass.id}" data-class-name="${escapeHtml(klass.name)}">退出</button>
        </div>
      `).join("")}
    </div>
  `;
}

function renderStudentCoursesPage() {
  if (state.user.role !== "student") return emptyBlock("教师端不显示我的课程。");
  const classes = state.data.classes || [];
  const homework = state.data.homework || [];
  const submissions = state.data.submissions || [];
  const completedHomeworkIds = new Set(submissions.filter((item) => item.studentId === state.user.id).map((item) => item.homeworkId));
  const active = classes.find((klass) => klass.id === state.studentCourseClassId);
  if (active) return renderStudentCourseDetail(active, homework, completedHomeworkIds);
  return `
    <div class="student-courses-shell">
      <section class="course-page-tabs student-course-tabs" role="tablist" aria-label="我的课程">
        <button type="button" class="active">我学的课</button>
      </section>
      <section class="student-course-toolbar">
        <form id="joinClassForm" class="join-class-form">
          <input name="classCode" placeholder="输入班级邀请码 / 班级 ID" required />
          <button class="primary" type="submit">加入班级</button>
        </form>
        <div class="inline-stats student-course-stats">
          <span>${classes.length}<small>课程</small></span>
          <span>${homework.length}<small>作业</small></span>
          <span>${completedHomeworkIds.size}<small>已提交</small></span>
        </div>
      </section>
      <section class="student-course-board">
        ${classes.length ? `
          <div class="student-course-grid">
            ${classes.map((klass) => {
              const teacher = (state.data.users || []).find((user) => user.id === klass.teacherId);
              const classHomework = homework.filter((item) => item.classId === klass.id);
              const submitted = classHomework.filter((item) => completedHomeworkIds.has(item.id)).length;
              return `
                <article class="student-course-card" data-student-course-card="${escapeHtml(klass.id)}" tabindex="0" role="button" title="双击进入班级">
                  <div class="student-course-card-head">
                    <span>${escapeHtml(klass.subject)}</span>
                    <button class="mini danger" type="button" data-leave-class="${escapeHtml(klass.id)}" data-class-name="${escapeHtml(klass.name)}">退出</button>
                  </div>
                  <strong>${escapeHtml(klass.name)}</strong>
                  <p>教师：${escapeHtml(teacher?.name || klass.teacherId || "未设置")}</p>
                  <div class="student-course-card-meta">
                    <span>${(klass.studentIds || []).length} 人</span>
                    <span>${classHomework.length} 作业</span>
                    <span>${submitted} 已提交</span>
                  </div>
                </article>
              `;
            }).join("")}
          </div>
        ` : `
          <div class="student-course-empty">
            <strong>暂无课程</strong>
          </div>
        `}
      </section>
    </div>
  `;
}

function renderStudentCourseDetail(active, homework, completedHomeworkIds) {
  const classHomework = homework.filter((item) => item.classId === active.id);
  const submitted = classHomework.filter((item) => completedHomeworkIds.has(item.id)).length;
  const teacher = (state.data.users || []).find((user) => user.id === active.teacherId);
  const features = [
    { key: "ai", icon: "bot", label: "AI助教" },
    { key: "classroom", icon: "school", label: "课堂" },
    { key: "homework", icon: "clipboard", label: "作业" },
    { key: "graph", icon: "network", label: "图谱" },
    { key: "lab", icon: "lab", label: "实验室" },
    { key: "record", icon: "target", label: "学习记录" }
  ];
  return `
    <div class="student-courses-shell student-course-detail-shell">
      <section class="panel class-active-panel student-course-detail-head">
        <div>
          <h3>${escapeHtml(active.name)} · ${escapeHtml(active.subject)}</h3>
          <p class="hint">教师：${escapeHtml(teacher?.name || active.teacherId || "未设置")}</p>
        </div>
        <div class="class-active-actions">
          <article><strong>${(active.studentIds || []).length}</strong><span>学生</span></article>
          <article><strong>${classHomework.length}</strong><span>作业</span></article>
          <article><strong>${submitted}</strong><span>已提交</span></article>
          <button class="mini" type="button" data-student-course-back>返回</button>
        </div>
      </section>
      <section class="class-feature-grid student-course-feature-grid" aria-label="班级学习功能">
        ${features.map((item) => `
          <button class="class-feature-button" type="button" data-student-course-action="${item.key}" data-class-id="${escapeHtml(active.id)}" data-class-subject="${escapeHtml(active.subject || "")}">
            ${iconSvg(item.icon, item.label)}
            <strong>${escapeHtml(item.label)}</strong>
          </button>
        `).join("")}
      </section>
    </div>
  `;
}

function bindStudentCoursesPage() {
  document.getElementById("joinClassForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("classCode") || "").trim();
    if (!code) return showToast("请输入班级邀请码或班级 ID", "error");
    try {
      const payload = await api(`/api/classes/${encodeURIComponent(code)}/apply`, {
        method: "POST",
        body: { studentId: state.user.id }
      });
      await loadState();
      renderShell();
      showToast(payload.application?.status === "pending" ? "申请已提交，等待教师同意" : "已加入班级");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.querySelectorAll("[data-leave-class]").forEach((button) => {
    button.addEventListener("click", async () => {
      const className = button.dataset.className || "该班级";
      if (!confirm(`确认退出「${className}」？\n\n退出后将不再看到该班级的作业和资料。`)) return;
      try {
        await api(`/api/classes/${encodeURIComponent(button.dataset.leaveClass)}/students/${encodeURIComponent(state.user.id)}`, {
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
  document.querySelectorAll("[data-student-course-card]").forEach((card) => {
    const openCourse = () => {
      state.studentCourseClassId = card.dataset.studentCourseCard;
      renderContent();
    };
    card.addEventListener("dblclick", (event) => {
      if (event.target.closest("[data-leave-class]")) return;
      openCourse();
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      openCourse();
    });
  });
  document.querySelectorAll("[data-student-course-back]").forEach((button) => {
    button.addEventListener("click", () => {
      state.studentCourseClassId = null;
      renderContent();
    });
  });
  document.querySelectorAll("[data-student-course-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.studentCourseAction;
      const classSubject = button.dataset.classSubject || "";
      if (classSubject) {
        state.aiSubject = classSubject;
        state.graphSubject = classSubject;
        state.modelSubject = MODEL_LABS[classSubject] ? classSubject : state.modelSubject;
      }
      if (action === "homework") state.page = "homework";
      else if (action === "graph") state.page = "graph";
      else if (action === "lab") state.page = "models";
      else if (action === "record") state.page = "profile";
      else {
        state.page = "ai";
        state.aiMode = action === "classroom" ? "guided" : "qa";
        state.aiTaskKey = state.aiMode;
      }
      await loadState();
      renderShell();
    });
  });
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
  document.getElementById("joinClassForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("classCode") || "").trim();
    if (!code) return showToast("请输入班级邀请码或班级 ID", "error");
    try {
      const payload = await api(`/api/classes/${encodeURIComponent(code)}/apply`, {
        method: "POST",
        body: { studentId: state.user.id }
      });
      await loadState();
      renderShell();
      showToast(payload.application?.status === "pending" ? "申请已提交，等待教师同意" : "已加入班级");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.querySelectorAll("[data-leave-class]").forEach((button) => {
    button.addEventListener("click", async () => {
      const className = button.dataset.className || "该班级";
      if (!confirm(`确认退出「${className}」？\n\n退出后将不再看到该班级的作业和资料。`)) return;
      try {
        await api(`/api/classes/${encodeURIComponent(button.dataset.leaveClass)}/students/${encodeURIComponent(state.user.id)}`, {
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

function renderAdminPage() {
  if (state.user.role !== "admin") return emptyBlock("只有管理员可以访问数据导出。");
  const report = state.adminExport?.report || null;
  const summary = report?.summary || {};
  const sections = report?.sections || [];
  return `
    <div class="admin-export-shell">
      <section class="workbench-title admin-export-title">
        <div>
          <h2>管理员数据导出</h2>
          <p>导出 HTML / PDF / JSON / CSV，内容限定为匿名学生学习数据和教师评价指导记录。</p>
        </div>
        <div class="actions compact-actions">
          <button class="mini" type="button" data-admin-refresh>刷新数据</button>
        </div>
      </section>
      ${report ? `
        <section class="dashboard-stats compact admin-export-stats">
          ${renderDashboardStat("匿名学生", summary.students || 0, `${summary.classes || 0} 个班级`)}
          ${renderDashboardStat("学习事件", summary.learningEvents || 0, "学习周期时间线")}
          ${renderDashboardStat("作业/测验", Number(summary.homeworkResults || 0) + Number(summary.testResults || 0), "成绩与结果")}
          ${renderDashboardStat("反思/指导", Number(summary.reflections || 0) + Number(summary.teacherGuidance || 0), "摘要记录")}
        </section>
        <section class="panel admin-export-panel">
          <div class="split-head">
            <div>
              <h3>导出格式</h3>
              <p class="hint">PDF 会打开打印页，可在浏览器打印对话框中保存为 PDF。</p>
            </div>
            <div class="actions compact-actions admin-export-actions">
              <button class="primary" type="button" data-admin-export="html">HTML</button>
              <button class="primary" type="button" data-admin-export="pdf">PDF</button>
              <button class="mini" type="button" data-admin-export="json">JSON</button>
              <button class="mini" type="button" data-admin-export="csv">CSV</button>
            </div>
          </div>
          <div class="admin-export-grid">
            ${sections.map(renderAdminExportSection).join("")}
          </div>
        </section>
      ` : `
        <section class="panel admin-export-panel">
          <div class="split-head">
            <h3>导出数据</h3>
            <button class="primary" type="button" data-admin-refresh>加载数据</button>
          </div>
          ${emptyBlock("正在加载管理员导出数据。")}
        </section>
      `}
    </div>
  `;
}

async function loadAdminExportPreview() {
  const payload = await api("/api/admin/export?format=json");
  state.adminExport = payload;
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
      await loadAdminExportPreview();
      renderContent();
      showToast("导出数据已刷新");
    } catch (error) {
      showToast(error.message, "error");
    }
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
  if (!state.adminExport) {
    loadAdminExportPreview()
      .then(() => renderContent())
      .catch((error) => showToast(error.message, "error"));
  }
}

function renderProfilePage() {
  const isStudent = state.user.role === "student";
  const classes = state.data.classes || [];
  const activePanel = state.profilePanel;
  const studentSummary = isStudent ? studentClassSummary(classes) : "";
  return `
    <div class="profile-page-shell">
      <section class="workbench-title profile-title">
        <div>
          <h2>个人信息</h2>
          <p>ID ${escapeHtml(state.user.id)} · ${roleName(state.user.role)} · ${escapeHtml(isStudent ? studentSummary : (state.user.subject || "未设置学科"))}</p>
        </div>
        <div class="actions compact-actions">
          <button class="primary" type="button" data-profile-panel="edit">编辑资料</button>
          ${isStudent ? `<button class="mini" type="button" data-profile-panel="join">加入班级</button>` : `<button class="mini" type="button" data-dashboard-page="classes">班级管理</button>`}
        </div>
      </section>
      <section class="panel profile-summary-panel">
        <div class="profile-summary-grid">
          <article><span>姓名</span><strong>${escapeHtml(state.user.name)}</strong></article>
          <article><span>身份</span><strong>${roleName(state.user.role)}</strong></article>
          <article><span>${isStudent ? "班级" : "学科"}</span><strong>${escapeHtml(isStudent ? studentSummary : (state.user.subject || "未设置"))}</strong></article>
          <article><span>联系方式</span><strong>${escapeHtml(state.user.email || state.user.phone || "未填写")}</strong></article>
        </div>
      </section>
      ${activePanel ? `
      <div class="modal-backdrop">
      <section class="modal compact-modal">
        <button class="modal-close" id="closeProfilePanel">×</button>
        ${activePanel === "edit" ? `
        <h2>编辑资料</h2>
        <form id="profileForm" class="stack">
          <label>8 位 ID<input value="${state.user.id}" disabled /></label>
          <label>身份<input value="${roleName(state.user.role)}" disabled /></label>
          <label>姓名<input name="name" value="${escapeHtml(state.user.name)}" /></label>
          <label>${isStudent ? "班级" : "学科"}<input name="${isStudent ? "className" : "subject"}" value="${escapeHtml(isStudent ? (state.user.className || "") : (state.user.subject || ""))}" /></label>
          <label>邮箱<input name="email" value="${escapeHtml(state.user.email || "")}" /></label>
          <label>电话<input name="phone" value="${escapeHtml(state.user.phone || "")}" /></label>
          <button class="primary" type="submit">保存资料</button>
        </form>
        ` : ""}
        ${activePanel === "join" && isStudent ? `
          <h2>加入班级</h2>
          <form id="joinClassForm" class="stack">
            <label>班级邀请码或班级 ID<input name="classCode" placeholder="向老师获取班级邀请码" /></label>
            <button class="primary" type="submit">申请加入</button>
          </form>
          <div class="student-class-membership">
            ${renderStudentClassMembershipList(classes)}
          </div>
        ` : ""}
      </section>
      </div>` : ""}
    </div>
  `;
}

function bindProfilePage() {
  bindDashboardPageLinks();
  document.querySelectorAll("[data-profile-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      state.profilePanel = button.dataset.profilePanel;
      renderContent();
    });
  });
  document.getElementById("closeProfilePanel")?.addEventListener("click", () => {
    state.profilePanel = null;
    renderContent();
  });
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
      state.profilePanel = null;
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
      state.profilePanel = null;
      await loadState();
      renderShell();
      showToast(payload.application.reason);
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.querySelectorAll("[data-leave-class]").forEach((button) => {
    button.addEventListener("click", async () => {
      const className = button.dataset.className || "该班级";
      if (!confirm(`确认退出「${className}」？\n\n退出后将不再看到该班级的作业和资料。`)) return;
      try {
        await api(`/api/classes/${encodeURIComponent(button.dataset.leaveClass)}/students/${encodeURIComponent(state.user.id)}`, {
          method: "DELETE"
        });
        state.profilePanel = null;
        await loadState();
        renderShell();
        showToast(`已退出「${className}」`);
      } catch (error) {
        showToast(error.message, "error");
      }
    });
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
