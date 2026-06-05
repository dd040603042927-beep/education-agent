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
  aiMode: "qa",
  aiSubject: "",
  aiChapter: "",
  aiKnowledgePoint: "",
  aiAnswerDepth: "layered",
  modelSubject: "物理",
  modelMode: "ideal",
  modelComponents: [],
  selectedComponentId: null,
  loadedModelId: null,
  modelCodeType: null,
  modelCodeComponentId: null,
  modelCodeDraft: "",
  modelCodeRan: false,
  modelRunResult: "",
  activeThreadId: null,
  selectedMessages: new Set(),
  selectedClassId: null,
  homeworkModal: null,
  homeworkDetailId: null,
  teacherHomeworkDetailId: null,
  materialDetailId: null,
  graphViews: {},
  graphNodeModal: null,
  graphLayer: "overview",
  graphFocusNodeId: null,
  graphSelectedNodeId: null,
  graphSearch: "",
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

const teacherMenus = [
  { key: "graph", icon: "📘", label: "导入书本生成图谱" },
  { key: "ai", icon: "🎓", label: "教学指导（对话）" },
  { key: "materials", icon: "📚", label: "课程资料" },
  { key: "models", icon: "🧠", label: "模型显示" },
  { key: "chat", icon: "☁️", label: "聊天信息" },
  { key: "classes", icon: "🏫", label: "班级管理" },
  { key: "homework", icon: "✏️", label: "作业管理" },
  { key: "profile", icon: "ℹ️", label: "个人信息" }
];

const studentMenus = [
  { key: "graph", icon: "📗", label: "知识图谱" },
  { key: "ai", icon: "☁️", label: "发起对话" },
  { key: "models", icon: "🧠", label: "模型显示" },
  { key: "chat", icon: "☁️", label: "聊天信息" },
  { key: "homework", icon: "📥", label: "作业提交" },
  { key: "profile", icon: "ℹ️", label: "个人信息" }
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
    summary: "用于函数、几何、向量、矩阵、概率和微积分的可视化建模。",
    hint: "拖入函数图像、导数切线、积分区域或矩阵模块，形成题目推导和证明流程。",
    showAxes: true,
    components: [
      { type: "coordinate", icon: "＋", label: "坐标系", subject: "数学", defaults: { xRange: "[-5,5]", yRange: "[-5,5]" } },
      { type: "function-curve", icon: "ƒ", label: "函数图像", subject: "数学", defaults: { expression: "y=x²", domain: "R" } },
      { type: "tangent", icon: "／", label: "导数切线", subject: "数学", defaults: { point: "x=1", slope: "2" } },
      { type: "integral-area", icon: "∫", label: "积分面积", subject: "数学", defaults: { interval: "[0,1]", integrand: "x²" } },
      { type: "vector", icon: "⇀", label: "向量", subject: "数学", defaults: { vector: "(3,4)", length: "5" } },
      { type: "matrix", icon: "矩", label: "矩阵", subject: "数学", defaults: { matrix: "[[1,2],[3,4]]", determinant: "-2" } },
      { type: "geometry", icon: "△", label: "几何图形", subject: "数学", defaults: { shape: "三角形", theorem: "勾股定理" } },
      { type: "probability", icon: "P", label: "概率分布", subject: "数学", defaults: { distribution: "Bin(n,p)", expectation: "np" } },
      { type: "proof-step", icon: "证", label: "证明步骤", subject: "数学", defaults: { claim: "待证命题", method: "反证法/归纳法" } },
      { type: "math-formula", icon: "Σ", label: "公式块", subject: "数学", defaults: { formula: "a²+b²=c²", condition: "直角三角形" } }
    ]
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
    summary: "从《动手学机器学习》常见监督学习、无监督学习和深度学习算法中选择模型并查看代码。",
    hint: "拖入算法节点保存实验设计；双击左侧算法或画布节点，可在画布中打开代码并运行内置测试。",
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

const ML_ALGORITHM_MODELS = {
  "ml-knn": {
    title: "K近邻分类",
    chapter: "监督学习 · 基于实例的分类",
    result: "测试结果：k=5，Iris 测试集准确率约 0.97；预测样本 [5.1, 3.5, 1.4, 0.2] -> setosa。",
    code: `from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import KNeighborsClassifier

iris = load_iris()
X_train, X_test, y_train, y_test = train_test_split(
    iris.data, iris.target, test_size=0.25, random_state=42, stratify=iris.target
)
scaler = StandardScaler()
X_train = scaler.fit_transform(X_train)
X_test = scaler.transform(X_test)

model = KNeighborsClassifier(n_neighbors=5)
model.fit(X_train, y_train)
print("accuracy:", round(model.score(X_test, y_test), 3))
print("predict:", iris.target_names[model.predict(scaler.transform([[5.1, 3.5, 1.4, 0.2]]))[0]])`
  },
  "ml-linear-regression": {
    title: "线性回归",
    chapter: "监督学习 · 回归与最小二乘",
    result: "测试结果：在合成线性数据上 R2 约 0.99，参数接近 w=[3.0,-2.0]，b=5.0。",
    code: `import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score

rng = np.random.default_rng(7)
X = rng.normal(size=(120, 2))
y = 3.0 * X[:, 0] - 2.0 * X[:, 1] + 5.0 + rng.normal(scale=0.12, size=120)

model = LinearRegression()
model.fit(X, y)
pred = model.predict(X)
print("coef:", np.round(model.coef_, 2))
print("intercept:", round(model.intercept_, 2))
print("r2:", round(r2_score(y, pred), 3))`
  },
  "ml-logistic-regression": {
    title: "逻辑回归",
    chapter: "监督学习 · 线性分类模型",
    result: "测试结果：乳腺癌数据集准确率约 0.97，输出类别概率可解释为置信度。",
    code: `from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

data = load_breast_cancer()
X_train, X_test, y_train, y_test = train_test_split(
    data.data, data.target, test_size=0.25, random_state=1, stratify=data.target
)
model = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000))
model.fit(X_train, y_train)
print("accuracy:", round(model.score(X_test, y_test), 3))
print("probability:", model.predict_proba(X_test[:1]).round(3).tolist())`
  },
  "ml-decision-tree": {
    title: "决策树",
    chapter: "监督学习 · 树模型与可解释规则",
    result: "测试结果：Iris 数据集准确率约 0.93；模型可输出特征划分规则。",
    code: `from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier, export_text

iris = load_iris()
X_train, X_test, y_train, y_test = train_test_split(
    iris.data, iris.target, test_size=0.25, random_state=42, stratify=iris.target
)
model = DecisionTreeClassifier(max_depth=4, random_state=42)
model.fit(X_train, y_train)
print("accuracy:", round(model.score(X_test, y_test), 3))
print(export_text(model, feature_names=iris.feature_names, max_depth=2))`
  },
  "ml-random-forest": {
    title: "随机森林",
    chapter: "集成学习 · Bagging 与特征重要性",
    result: "测试结果：Iris 数据集准确率约 0.95；可查看每个特征的重要性。",
    code: `from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier

iris = load_iris()
X_train, X_test, y_train, y_test = train_test_split(
    iris.data, iris.target, test_size=0.25, random_state=0, stratify=iris.target
)
model = RandomForestClassifier(n_estimators=120, max_depth=5, random_state=0)
model.fit(X_train, y_train)
print("accuracy:", round(model.score(X_test, y_test), 3))
print("feature_importance:", model.feature_importances_.round(3).tolist())`
  },
  "ml-svm": {
    title: "支持向量机",
    chapter: "监督学习 · 间隔最大化与核函数",
    result: "测试结果：标准化后 Iris 数据集准确率约 0.97；支持 RBF 核处理非线性边界。",
    code: `from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

iris = load_iris()
X_train, X_test, y_train, y_test = train_test_split(
    iris.data, iris.target, test_size=0.25, random_state=3, stratify=iris.target
)
model = make_pipeline(StandardScaler(), SVC(kernel="rbf", C=1.0, gamma="scale"))
model.fit(X_train, y_train)
print("accuracy:", round(model.score(X_test, y_test), 3))`
  },
  "ml-kmeans": {
    title: "K-Means 聚类",
    chapter: "无监督学习 · 原型聚类",
    result: "测试结果：三簇合成数据轮廓系数约 0.78；输出每个样本的簇标签。",
    code: `from sklearn.datasets import make_blobs
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

X, _ = make_blobs(n_samples=180, centers=3, cluster_std=0.55, random_state=8)
model = KMeans(n_clusters=3, n_init=10, random_state=8)
labels = model.fit_predict(X)
print("centers:", model.cluster_centers_.round(2).tolist())
print("silhouette:", round(silhouette_score(X, labels), 3))
print("labels:", labels[:12].tolist())`
  },
  "ml-pca": {
    title: "主成分分析 PCA",
    chapter: "无监督学习 · 降维与特征压缩",
    result: "测试结果：Iris 降到 2 维后累计解释方差约 0.96，可用于可视化和降噪。",
    code: `from sklearn.datasets import load_iris
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA

iris = load_iris()
X = StandardScaler().fit_transform(iris.data)
pca = PCA(n_components=2)
Z = pca.fit_transform(X)
print("shape:", Z.shape)
print("explained_variance_ratio:", pca.explained_variance_ratio_.round(3).tolist())
print("first_point:", Z[0].round(3).tolist())`
  },
  "ml-naive-bayes": {
    title: "朴素贝叶斯",
    chapter: "概率学习 · 条件独立假设",
    result: "测试结果：Iris 数据集准确率约 0.95；模型输出后验概率。",
    code: `from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import GaussianNB

iris = load_iris()
X_train, X_test, y_train, y_test = train_test_split(
    iris.data, iris.target, test_size=0.25, random_state=5, stratify=iris.target
)
model = GaussianNB()
model.fit(X_train, y_train)
print("accuracy:", round(model.score(X_test, y_test), 3))
print("posterior:", model.predict_proba(X_test[:1]).round(3).tolist())`
  },
  "ml-gmm": {
    title: "高斯混合模型 GMM",
    chapter: "概率模型 · EM 算法",
    result: "测试结果：三簇数据拟合后输出均值、协方差和软聚类概率。",
    code: `from sklearn.datasets import make_blobs
from sklearn.mixture import GaussianMixture

X, _ = make_blobs(n_samples=160, centers=3, cluster_std=0.7, random_state=9)
model = GaussianMixture(n_components=3, covariance_type="full", random_state=9)
model.fit(X)
print("means:", model.means_.round(2).tolist())
print("weights:", model.weights_.round(3).tolist())
print("probability:", model.predict_proba(X[:2]).round(3).tolist())`
  },
  "ml-mlp": {
    title: "多层感知机 MLP",
    chapter: "神经网络 · 前向传播与反向传播",
    result: "测试结果：两层 MLP 在标准化 Iris 数据集准确率约 0.97。",
    code: `from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.neural_network import MLPClassifier

iris = load_iris()
X_train, X_test, y_train, y_test = train_test_split(
    iris.data, iris.target, test_size=0.25, random_state=11, stratify=iris.target
)
model = make_pipeline(
    StandardScaler(),
    MLPClassifier(hidden_layer_sizes=(64, 32), activation="relu", max_iter=900, random_state=11)
)
model.fit(X_train, y_train)
print("accuracy:", round(model.score(X_test, y_test), 3))`
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
  state.modelRunResult = "";
  state.graphViews = {};
  state.graphNodeModal = null;
  state.graphFocusNodeId = null;
  state.graphSelectedNodeId = null;
  state.graphSearch = "";
  state.graphJob = null;
  state.conversationContextMenu = null;
  state.graphUploadAbort = null;
  state.graphGenerationCanceled = false;
  state.selectedMessages.clear();
  state.searchResults = [];
}

async function loadState() {
  if (!state.user) return;
  const payload = await api("/api/state");
  state.data = payload.state;
  state.user = payload.state.user;
  localStorage.setItem("edu-user", JSON.stringify(state.user));
  if (!state.selectedClassId && state.data.classes.length) state.selectedClassId = state.data.classes[0].id;
  if (!state.selectedGraphId && state.data.knowledgeGraphs.length) state.selectedGraphId = state.data.knowledgeGraphs[0].id;
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
      <div class="nav-subtitle">历史对话</div>
      <div class="nav-conversation-list">
        ${conversations.map((conv) => `
          <button class="${state.activeConversationId === conv.id ? "active" : ""}" data-sidebar-conversation="${conv.id}" title="双击打开，右键删除">
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
          <label>账号 ID 或姓名<input name="account" autocomplete="username" placeholder="建议使用 8 位 ID，重名用户必须用 ID" required /></label>
          <label>密码<input name="password" type="password" autocomplete="current-password" placeholder="示例账号密码：123456" required /></label>
          <button class="primary wide" type="submit">进入平台</button>
          <p class="hint">2 天内刷新页面会自动保持登录。用户名允许重复，系统分配的 8 位 ID 永远唯一。</p>
          <p class="hint">内置教师：20260001 / 123456；内置学生：20260002 / 123456。</p>
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
      state.page = "graph";
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
      state.page = "graph";
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
  const teacherSide = isTeacherLike();
  const menus = teacherSide ? teacherMenus : studentMenus;
  const classes = state.data?.classes || [];
  if (state.page === "history") state.page = "ai";
  app.innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <div class="side-brand">
          <strong>${teacherSide ? "📖 教学中枢" : "📚 学习索引"}</strong>
          <span>${escapeHtml(state.user.name)}（${roleName(state.user.role)}）</span>
          <small>ID：${state.user.id}</small>
        </div>
        <div class="section-label">${teacherSide ? "教师端" : "学生端"}</div>
        <nav class="nav">
          ${menus.map((item) => `
            <button class="nav-item ${state.page === item.key ? "active" : ""}" data-page="${item.key}">
              <span>${item.icon}</span>${item.label}
            </button>
            ${item.key === "ai" ? renderSidebarConversations() : ""}
          `).join("")}
        </nav>
        <div class="profile-mini">
          <strong>${teacherSide ? "🏫 我的信息" : "👤 我的信息"}</strong>
          <dl>
            <dt>姓名：</dt><dd>${escapeHtml(state.user.name)}</dd>
            <dt>${teacherSide ? "学科：" : "班级："}</dt><dd>${escapeHtml(teacherSide ? (state.user.subject || "未设置") : (state.user.className || "未加入"))}</dd>
            <dt>班级数：</dt><dd>${classes.length || 0}</dd>
          </dl>
        </div>
        <button id="logoutBtn" class="ghost wide">退出登录</button>
      </aside>
      <main class="main">
        <header class="topbar">
          <div>
            <strong>🧠 智慧教育智能体平台</strong>
            <span>${teacherSide ? "面向备课、授课、班级与作业闭环" : "面向学习、练习、模型与作业提交"}</span>
          </div>
        </header>
        <section id="content" class="content"></section>
      </main>
      <div class="floating-tools">
        <button title="刷新数据" id="refreshBtn">↻</button>
        <button title="回到知识图谱" data-page="graph">✦</button>
      </div>
      ${renderConversationContextMenu()}
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
  document.querySelectorAll("[data-sidebar-conversation]").forEach((button) => {
    button.addEventListener("dblclick", async () => {
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
        page: "graph",
        activeConversationId: null,
        activeThreadId: null
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
  if (state.user?.role === "student" && state.page === "materials") state.page = "graph";
  const main = document.querySelector(".main");
  main?.classList.toggle("ai-main", state.page === "ai");
  main?.classList.toggle("model-main", state.page === "models");
  main?.classList.toggle("ml-model-main", state.page === "models" && state.modelSubject === "机器学习");
  const contentClasses = ["content"];
  if (state.page === "ai") contentClasses.push("ai-content");
  if (state.page === "models") contentClasses.push("model-content");
  if (state.page === "models" && state.modelSubject === "机器学习") contentClasses.push("ml-model-content");
  if (state.page === "graph" && state.user?.role === "student") contentClasses.push("student-graph-content");
  if (state.page === "materials") contentClasses.push("materials-content");
  if (state.page === "homework") contentClasses.push("homework-content");
  content.className = contentClasses.join(" ");
  const pageMap = {
    graph: renderGraphPage,
    ai: renderAiPage,
    materials: renderMaterialsPage,
    models: renderModelPage,
    chat: renderChatPage,
    classes: renderClassPage,
    homework: isTeacherLike() ? renderTeacherHomeworkPage : renderStudentHomeworkPage,
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
    materials: bindMaterialsPage,
    models: bindModelPage,
    chat: bindChatPage,
    classes: bindClassPage,
    homework: isTeacherLike() ? bindTeacherHomeworkPage : bindStudentHomeworkPage,
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

function renderTeacherGraphPage() {
  const graphs = graphListForCurrentRole();
  const selected = graphs.find((graph) => graph.id === state.selectedGraphId) || graphs[0];
  const draft = state.graphDraft || {};
  return `
    <div class="grid two graph-form-grid">
      <section class="panel graph-form-card">
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
          <div class="actions">
            <button class="primary" type="submit">🚀 生成图谱</button>
            <button class="ghost" type="button" id="sampleGraphBtn">生成示例</button>
          </div>
        </form>
        <div id="graphProgressMount">${renderGraphProgress()}</div>
      </section>
      <section class="panel import-graph-panel graph-form-card">
        <h3>直接导入图谱</h3>
        <form id="importGraphForm" class="stack import-graph-form">
          <div class="form-grid">
            <label>学科<input name="subject" placeholder="例如：物理、线性代数、机器学习" /></label>
            <label>图谱名称<input name="title" placeholder="导入图谱名称" /></label>
          </div>
          <label>图谱 JSON 文件<input name="graph" type="file" accept=".json" required /></label>
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
        <div class="inline-stats">
          <span>${graphs.length}<small>账号可见图谱</small></span>
          <span>${graphs.filter((item) => item.global).length}<small>总图谱</small></span>
        </div>
      </div>
      ${renderGraphLearningWorkspace(graphs, selected, "teacher")}
    </section>
    ${renderGraphNodeModal()}
  `;
}

function renderStudentGraphPage() {
  const graphs = graphListForCurrentRole();
  const selected = graphs.find((graph) => graph.id === state.selectedGraphId) || graphs[0];
  return `
    <section class="panel student-graph-full">
      ${renderGraphLearningWorkspace(graphs, selected, "student")}
    </section>
    ${renderGraphNodeModal()}
  `;
}

function renderGraphLearningWorkspace(graphs, selected, mode = "teacher") {
  return `
    <div class="graph-workspace graph-learning-workspace">
      ${renderGraphControlPanel(graphs, selected, mode)}
      <div class="graph-canvas">${selected ? renderGraphViewer(selected) : emptyBlock(mode === "student" ? "请选择其他学科查看可用图谱。" : "选择一个图谱后将在这里渲染。")}</div>
      ${renderGraphDetailPanel(selected, mode)}
    </div>
  `;
}

function renderGraphControlPanel(graphs, graph, mode = "teacher") {
  const filterSet = graphFilterSet();
  const layer = state.graphLayer || "overview";
  return `
    <aside class="graph-control-panel">
      ${mode === "student" ? `
        <section class="graph-control-block compact-subject">
          <strong>学科</strong>
          <select id="studentGraphSubject">${subjectOptions(state.graphSubject)}</select>
        </section>
      ` : ""}
      <section class="graph-control-block">
        <strong>三层图谱视图</strong>
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
      <section class="graph-control-block">
        <strong>图谱列表</strong>
        <div class="graph-list compact">${graphs.map(graphCard).join("") || emptyBlock(mode === "student" ? `数据库中暂未找到「${escapeHtml(state.graphSubject)}」图谱。` : "还没有图谱，请先生成或导入。")}</div>
      </section>
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
  const learningPath = graphShortestLearningPath(graph, node, context);
  const weaknesses = graphWeaknessAttribution(graph, node);
  const localSubgraph = graphLocalSubgraphSummary(graph, node, context);
  const points = enrichedNodePoints(graph, node, context).slice(0, 5);
  const learner = node.learnerState || {};
  const mastery = Number(learner.mastery);
  const masteryWidth = Number.isFinite(mastery) ? clamp(mastery, 0, 1) * 100 : 0;
  const resources = Array.isArray(node.resources) ? node.resources : [];
  const prerequisiteLabels = context.incoming
    .filter(isPrerequisiteLink)
    .map((link) => (graph.nodes || []).find((item) => item.id === link.source)?.label || link.source)
    .slice(0, 6);
  const nextLabels = context.children.map((item) => item.label).slice(0, 6);
  const sourceText = resources.length
    ? resources.slice(0, 3).map((item) => `${resourceTypeLabel(item.type)}：${item.title || "课程资料"}`).join("；")
    : `${graph.title} · ${node.ontology?.layer || "课程图谱节点"}`;
  return `
    <aside class="graph-detail-panel">
      <div class="detail-head">
        <span>${mode === "student" ? "学生视图" : "教师视图"}</span>
        <h3>${escapeHtml(node.label)}</h3>
        <p>${escapeHtml((context.path || []).map((item) => item.label).join(" / ") || graph.title)}</p>
      </div>
      <div class="node-chip-row">
        <span class="node-chip">${escapeHtml(node.ontology?.layer || "知识点")}</span>
        <span class="node-chip">${escapeHtml(node.cognitive?.bloom || "理解")}</span>
        <span class="node-chip ${graphNodeHasWeakness(node) ? "" : "strong"}">${escapeHtml(learner.status || "待诊断")} ${percentText(learner.mastery)}</span>
      </div>
      <section class="detail-card">
        <strong>掌握度与诊断</strong>
        <div class="mastery-meter"><span style="width:${masteryWidth}%"></span></div>
        <p>${escapeHtml(learner.evidence || (mode === "student" ? "根据提问、练习和错题记录更新掌握情况。" : "教师可结合班级错题和问答记录查看薄弱点。"))}</p>
      </section>
      <section class="detail-card">
        <strong>前置 / 后续</strong>
        <p>前置：${escapeHtml(prerequisiteLabels.length ? prerequisiteLabels.join("、") : context.parent?.label || "暂无明确前置")}</p>
        <p>后续：${escapeHtml(nextLabels.length ? nextLabels.join("、") : "暂无下级节点，可生成练习巩固。")}</p>
      </section>
      <section class="detail-card">
        <strong>课程资料引用</strong>
        <p>${escapeHtml(sourceText)}</p>
      </section>
      <section class="detail-card">
        <strong>常见错误</strong>
        <p>${escapeHtml(node.misconception || "注意区分概念边界、适用条件和相邻知识点的关系。")}</p>
      </section>
      <section class="detail-card">
        <strong>推荐学习路径</strong>
        <p>${escapeHtml(learningPath.join(" → ") || node.label)}</p>
      </section>
      <section class="detail-card">
        <strong>薄弱点追溯</strong>
        <p>${escapeHtml(weaknesses.map((item) => `${item.label}（${percentText(item.mastery)}）`).join("；") || "暂无薄弱点记录。")}</p>
      </section>
      <section class="detail-card">
        <strong>GraphRAG 局部子图</strong>
        <p>节点：${escapeHtml(localSubgraph.nodes.join("、") || node.label)}</p>
        <p>关系：${escapeHtml(localSubgraph.relations.join("、") || "层级包含")}</p>
      </section>
      <section class="detail-card">
        <strong>知识点解释</strong>
        ${points.map((point) => `<p>${escapeHtml(point)}</p>`).join("")}
      </section>
      <div class="detail-actions">
        <button class="mini" type="button" data-graph-node-action="explain">讲解</button>
        <button class="mini" type="button" data-graph-node-action="exercise">出题</button>
        <button class="mini" type="button" data-graph-node-action="path">学习路径</button>
        <button class="mini" type="button" data-graph-node-action="compare">对比</button>
      </div>
      ${renderGraphLegend()}
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

function graphNodeHasWeakness(node) {
  const status = String(node?.learnerState?.status || "");
  const mastery = Number(node?.learnerState?.mastery);
  return status.includes("未") || status.includes("薄弱") || (Number.isFinite(mastery) && mastery < 0.45);
}

function graphNodeBadges(node) {
  const badges = [];
  if ((node?.resources || []).length || Number(node?.sourceCount || 0) > 0) badges.push("文");
  if (Number(node?.questionCount || node?.assessment?.questionCount || 0) > 0 || /题|练习/.test(String(node?.label || ""))) badges.push("题");
  if (Number(node?.mistakeCount || node?.assessment?.mistakeCount || 0) > 0 || graphNodeHasWeakness(node)) badges.push("错");
  return badges.slice(0, 3);
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
  const validFocus = nodesById.has(state.graphFocusNodeId) ? state.graphFocusNodeId : null;
  const validSelected = nodesById.has(state.graphSelectedNodeId) ? state.graphSelectedNodeId : null;
  const focusId = validFocus || validSelected;

  if (query) {
    nodes.forEach((node) => {
      if (!graphTextMatchesNode(node, query)) return;
      graphAddAncestors(ids, node.id, parents);
      graphAddChildren(ids, node.id, children, 18);
      graphAddNeighbors(ids, graph, node.id, 28);
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
  const stateText = String(node?.learnerState?.status || "");
  const mastery = Number(node?.learnerState?.mastery);
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
  return `
    <div class="graph-viewer" data-graph-viewer="${graph.id}">
      <div class="graph-toolbar">
        <button class="mini" data-graph-zoom="out">缩小</button>
        <button class="mini" data-graph-zoom="reset">重置</button>
        <button class="mini" data-graph-zoom="in">放大</button>
        <span>${stats.nodes || 0}/${stats.totalNodes || 0} 节点 · ${stats.links || 0}/${stats.totalLinks || 0} 关系 · 双击节点展开邻域</span>
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
  const childLabels = context.children.map((item) => item.label).slice(0, 12);
  const relationLines = context.relationLines.slice(0, 10);
  const ontology = node.ontology || {};
  const cognitive = node.cognitive || {};
  const learner = node.learnerState || {};
  const assessment = node.assessment || {};
  const graphRag = node.graphRag || {};
  const navigation = node.navigation || {};
  const competencies = Array.isArray(node.competencies) ? node.competencies : [];
  const resources = Array.isArray(node.resources) ? node.resources : [];
  const learningPath = graphShortestLearningPath(graph, node, context);
  const weaknesses = graphWeaknessAttribution(graph, node);
  const localSubgraph = graphLocalSubgraphSummary(graph, node, context);
  const graphKeywords = Array.isArray(graphRag.keywords)
    ? graphRag.keywords
    : String(graphRag.keywords || node.label).split(/[、，,\s/]+/).filter(Boolean);
  const mastery = Number(learner.mastery);
  const masteryWidth = Number.isFinite(mastery) ? clamp(mastery, 0, 1) * 100 : 0;
  return `
    <div class="modal-backdrop">
      <section class="modal graph-node-modal">
        <button class="modal-close" id="closeGraphNodeModal">×</button>
        <h2>${escapeHtml(node.label)}</h2>
        <p class="hint">${escapeHtml(graph.title)} · ${escapeHtml(graph.subject)}</p>
        ${node.details ? `<p class="answer-box">${escapeHtml(node.details)}</p>` : ""}
        <div class="node-chip-row">
          <span class="node-chip">${escapeHtml(ontology.layer || "知识节点")}</span>
          <span class="node-chip">${escapeHtml(cognitive.bloom || "理解")}层级</span>
          <span class="node-chip">${escapeHtml(learner.status || "待诊断")} ${percentText(learner.mastery)}</span>
          ${graph.meta?.graphRagReady || graph.meta?.graphRag?.ready ? `<span class="node-chip strong">GraphRAG 可检索</span>` : ""}
        </div>
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
        <div class="node-edu-grid">
          <article>
            <strong>多维本体</strong>
            <p>领域：${escapeHtml(ontology.domain || graph.subject || "通用")}；类型：${escapeHtml(ontology.type || "knowledge-point")}；父节点：${escapeHtml(ontology.parent || context.parent?.label || "根节点")}。</p>
          </article>
          <article>
            <strong>布鲁姆认知</strong>
            <p>${escapeHtml(cognitive.objective || `围绕「${node.label}」完成理解、应用和迁移。`)}</p>
          </article>
          <article>
            <strong>学习者认知热力</strong>
            <div class="mastery-meter"><span style="width:${masteryWidth}%"></span></div>
            <p>${escapeHtml(learner.status || "待诊断")}，掌握度 ${percentText(learner.mastery)}，权重 ${escapeHtml(learner.weight ?? "待计算")}。${escapeHtml(learner.evidence || "后续可接入做题、提问和停留时间实时更新。")}</p>
          </article>
          <article>
            <strong>考察属性</strong>
            <p>考频：${escapeHtml(assessment.examFrequency || "待统计")}；难度：${escapeHtml(assessment.difficulty ?? "待统计")}；区分度：${escapeHtml(assessment.discrimination ?? "待统计")}。</p>
          </article>
        </div>
        <div class="node-relations">
          <h3>核心素养与教学资源</h3>
          <div class="node-chip-row">${(competencies.length ? competencies : ["问题解决"]).map((item) => `<span class="node-chip">${escapeHtml(item)}</span>`).join("")}</div>
          ${resources.length ? `
            <div class="node-resource-list">
              ${resources.slice(0, 6).map((item) => `
                <article>
                  <strong>${escapeHtml(resourceTypeLabel(item.type))}</strong>
                  <p>${escapeHtml(item.title || "教学资源")}：${escapeHtml(item.use || "用于复习、讲解或迁移练习。")}</p>
                </article>
              `).join("")}
            </div>
          ` : ""}
        </div>
        <div class="node-relations">
          <h3>GraphRAG 局部子图</h3>
          <p>检索角色：${escapeHtml(graphRag.retrievalRole || "retrieval-concept")}；关键词：${escapeHtml((graphKeywords.length ? graphKeywords : [node.label]).join("、"))}。</p>
          <p>局部节点：${escapeHtml(localSubgraph.nodes.join("、") || node.label)}。</p>
          <p>关系类型：${escapeHtml(localSubgraph.relations.join("、") || "层级包含")}。</p>
          <p>${escapeHtml(localSubgraph.prompt)}</p>
        </div>
        <div class="node-relations">
          <h3>学习导航与薄弱点归因</h3>
          <p>最短学习路径：${escapeHtml(learningPath.join(" → ") || node.label)}。</p>
          <p>薄弱点追溯：${escapeHtml(weaknesses.map((item) => `${item.label}（${item.status}，${percentText(item.mastery)}）`).join("；"))}。</p>
          <p>${escapeHtml(navigation.shortestPathHint || `优先沿前置依赖和章节关系学习「${node.label}」。`)}</p>
          <p>${escapeHtml(navigation.weaknessTraceHint || node.misconception || "若相关题目出错，先回看前置节点和易混淆概念。")}</p>
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
      status: item.learnerState?.status || "待诊断",
      mastery: Number(item.learnerState?.mastery ?? 0.5)
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
        state.graphSelectedNodeId = nodeEl.dataset.nodeId;
        renderContent();
      }, 180);
    });
    nodeEl.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      if (nodeClickTimer) clearTimeout(nodeClickTimer);
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

async function generateGraphFromUploadedFile({ file, subject, title, sourceText, sourceName, extractor }) {
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
    started = { upload: await uploadFileInChunks(file, ({ index, totalChunks, uploadedBytes }) => {
      if (state.graphGenerationCanceled) throw graphCancelError();
      state.graphJob = {
        status: "running",
        stage: "上传文件",
        progress: Math.min(32, 4 + Math.floor((uploadedBytes / file.size) * 28)),
        message: `已上传 ${index}/${totalChunks} 个分块，${formatBytes(uploadedBytes)} / ${formatBytes(file.size)}。`,
        meta: { sourceName: file.name, fileSize: file.size, extractor }
      };
      refreshGraphProgress();
    }, state.graphUploadAbort.signal) };

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

  const currentGraph = state.data.knowledgeGraphs.find((item) => item.id === state.selectedGraphId)
    || graphListForCurrentRole()[0];

  document.querySelectorAll("[data-graph-layer]").forEach((button) => {
    button.addEventListener("click", () => {
      state.graphLayer = button.dataset.graphLayer || "overview";
      renderContent();
    });
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

  document.querySelectorAll("[data-graph-relation]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      state.graphRelationFilters = Array.from(document.querySelectorAll("[data-graph-relation]:checked"))
        .map((item) => item.dataset.graphRelation);
      renderContent();
    });
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
    button.addEventListener("click", () => {
      const actionText = {
        explain: "已定位知识点，可在教学指导中生成分层讲解。",
        exercise: "已定位知识点，可基于当前子图生成练习题。",
        path: "已根据前置关系生成推荐学习路径。",
        compare: "请选择另一个易混淆节点后生成对比讲解。"
      }[button.dataset.graphNodeAction] || "已记录当前知识点操作。";
      showToast(actionText);
    });
  });

  document.querySelectorAll("[data-select-graph]").forEach((card) => {
    card.addEventListener("click", () => {
      state.selectedGraphId = card.dataset.selectGraph;
      state.graphFocusNodeId = null;
      state.graphSelectedNodeId = null;
      state.graphSearch = "";
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
        state.graphFocusNodeId = null;
        state.graphSelectedNodeId = null;
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
    state.graphFocusNodeId = null;
    state.graphSelectedNodeId = null;
    state.graphSearch = "";
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
    "study-plan": "plan"
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
  const dynamicSubjects = Array.from(new Set((state.data?.courseMaterials || []).map((item) => item.subject).filter(Boolean)));
  const merged = Array.from(new Set(dynamicSubjects.concat(subjects)));
  return [`<option value="" ${!selected ? "selected" : ""}>全部课程</option>`]
    .concat(merged.map((subject) => `<option value="${escapeHtml(subject)}" ${subject === selected ? "selected" : ""}>${escapeHtml(subject)}</option>`))
    .join("");
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
  const actions = Array.isArray(message.actions) && message.actions.length
    ? message.actions
    : [
      { type: "simplify", label: "讲得更简单", mode: "explain" },
      { type: "example", label: "举个例子", mode: "explain" },
      { type: "quiz", label: "给我一道题", mode: "practice" },
      { type: "hint", label: "只给提示", mode: "guided" },
      { type: "sources", label: "显示来源" },
      { type: "wrong-note", label: "加入错题本" },
      { type: "mastered", label: "标记已掌握" }
    ];
  return `
    <div class="bubble-actions">
      ${actions.slice(0, 7).map((action) => `
        <button type="button" data-ai-action="${escapeHtml(action.type)}" data-ai-message="${escapeHtml(message.id)}" data-ai-action-mode="${escapeHtml(action.mode || "")}" data-ai-action-prompt="${escapeHtml(action.prompt || "")}">
          ${escapeHtml(action.label)}
        </button>
      `).join("")}
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

function renderAiMessage(message) {
  const citations = Array.isArray(message.citations) ? message.citations : [];
  const confidence = message.confidence ? `<small class="answer-source">可靠性：${escapeHtml(message.confidence)}${citations.length ? ` · 引用 ${citations.length} 条` : ""}</small>` : "";
  const content = message.role === "assistant" ? compactAnswerContent(message.content) : message.content;
  return `
    <div class="bubble ${message.role}">
      <span>${message.role === "assistant" ? "AI" : "我"}</span>
      ${renderAiMessageMeta(message)}
      <p>${escapeMultiline(content)}</p>
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
  const avg = Number(summary.average || 0);
  return `
    <section class="ai-side-card profile-card">
      <h3>学习画像</h3>
      <div class="ai-side-card-body">
        <div class="profile-meter"><span style="width:${clamp(avg * 100, 8, 100)}%"></span></div>
        <p>${escapeHtml(profile.level || "基础")} · 提问 ${profile.questionCount || 0} 次 · 练习 ${profile.practiceCount || 0} 次 · 学习 ${profile.studyMinutes || 0} 分钟</p>
        <div class="node-chip-row">
          ${(weak.length ? weak : [{ topic: "暂无明显薄弱点", status: "继续观察" }]).slice(0, 4).map((item) => `<span class="node-chip">${escapeHtml(item.topic)} ${item.score !== undefined ? percentText(item.score) : ""}</span>`).join("")}
        </div>
        ${strong.length ? `<p class="hint">优势：${escapeHtml(strong.map((item) => item.topic).join("、"))}</p>` : ""}
      </div>
    </section>
    <section class="ai-side-card wrong-note-card">
      <h3>错题本</h3>
      <div class="ai-side-card-body">
        ${wrongNotes.slice(0, 8).map((note) => `
          <article class="mini-note">
            <strong>${escapeHtml(note.topic)}</strong>
            <p>${escapeHtml(note.analysis || note.recommendation || "建议复习相关前置知识。")}</p>
          </article>
        `).join("") || `<p class="hint">暂无错题记录。AI 批改或低置信问答会自动形成错题线索。</p>`}
      </div>
    </section>
  `;
}

function renderMaterialsPage() {
  const materials = state.data.courseMaterials || [];
  return `
    <div class="grid two materials-grid materials-full-grid">
      <section class="panel material-panel">
        <div class="split-head">
          <h3>资料入库</h3>
          <span>初始表单为空</span>
        </div>
        <form id="materialUploadForm" class="stack">
          <div class="form-grid">
            <label>学科<input name="subject" placeholder="例如：机器学习、操作系统、计算机组成原理" required autocomplete="off" /></label>
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
      <section class="panel material-library-panel">
        <div class="split-head">
          <h3>课程资料库</h3>
          <div class="inline-stats">
            <span>${materials.length}<small>可检索资料</small></span>
            <span>${materials.reduce((sum, item) => sum + Number(item.chunkCount || 0), 0)}<small>检索片段</small></span>
          </div>
        </div>
        <div class="material-list">
          ${materials.slice(0, 18).map((item) => `
            <article data-view-material="${item.id}">
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(item.subject)} · ${item.chunkCount} 个片段 · ${item.characters} 字</span>
                <small>${escapeHtml(item.sourceName || "课程资料")} · ${fmtTime(item.createdAt)}</small>
              </div>
              ${item.ownerId === state.user.id ? `<button class="mini danger" data-delete-material="${item.id}">删除</button>` : ""}
            </article>
          `).join("") || emptyBlock("还没有课程资料。上传文件或粘贴内容后会在这里显示。")}
        </div>
      </section>
    </div>
    ${state.materialDetailId ? renderMaterialDetailModal() : ""}
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
      renderShell();
      showToast(`课程资料已入库：${payload.material.chunkCount} 个检索片段`);
    } catch (error) {
      if (status) status.textContent = "";
      showToast(error.message, "error");
    }
  });
  document.querySelectorAll("[data-delete-material]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("确认删除这份课程资料？")) return;
      try {
        await api(`/api/materials/${button.dataset.deleteMaterial}?userId=${state.user.id}`, { method: "DELETE" });
        await loadState();
        renderShell();
        showToast("课程资料已删除");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
  document.querySelectorAll("[data-view-material]").forEach((card) => {
    card.addEventListener("dblclick", () => {
      state.materialDetailId = card.dataset.viewMaterial;
      renderContent();
    });
  });
  document.getElementById("closeMaterialModal")?.addEventListener("click", () => {
    state.materialDetailId = null;
    renderContent();
  });
}

function renderMaterialsPanel() {
  const materials = state.data.courseMaterials || [];
  return `
    <section class="panel material-panel">
      <div class="split-head">
        <h3>课程资料库</h3>
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

function renderAiContextRail(active) {
  const materials = state.data.courseMaterials || [];
  const graphs = graphListForCurrentRole();
  const analytics = state.data.learningAnalytics || {};
  const panel = latestAssistantMessage(active)?.learningPanel || {};
  const focus = panel.graphFocus;
  return `
    <aside class="ai-context-rail">
      <section class="ai-side-card">
        <h3>课程资料</h3>
        <div class="ai-side-card-body context-card-body">
          ${materials.slice(0, 5).map((item) => `
            <article class="context-mini-item">
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.subject)} · ${item.chunkCount} 个片段</span>
            </article>
          `).join("") || `<p class="hint">教师端可在“课程资料”页面入库教材、课件、讲义和扫描版 PDF。</p>`}
        </div>
      </section>
      <section class="ai-side-card">
        <h3>图谱联动</h3>
        <div class="ai-side-card-body context-card-body">
          ${focus ? `
            <article class="graph-focus-mini">
              <strong>${escapeHtml(focus.label)}</strong>
              <span>${escapeHtml(focus.graphTitle || "知识图谱")}</span>
              ${focus.path?.length ? `<p>${escapeHtml(focus.path.join(" → "))}</p>` : ""}
              <button type="button" class="mini" data-ai-open-graph="${escapeHtml(focus.graphId || "")}" data-ai-open-node="${escapeHtml(focus.nodeId || "")}">打开图谱焦点</button>
            </article>
          ` : `
            ${graphs.slice(0, 4).map((graph) => `
              <article class="context-mini-item">
                <strong>${escapeHtml(graph.title)}</strong>
                <span>${escapeHtml(graph.subject)} · ${(graph.nodes || []).length} 节点</span>
              </article>
            `).join("") || `<p class="hint">提问命中知识点后，这里会显示图谱焦点。</p>`}
          `}
        </div>
      </section>
      <section class="ai-side-card">
        <h3>学习线索</h3>
        <div class="ai-side-card-body context-card-body">
          ${(analytics.recommendations || []).slice(0, 4).map((item) => `<p>${escapeHtml(item)}</p>`).join("") || `<p class="hint">系统会根据问答、练习、批改更新学习建议。</p>`}
        </div>
      </section>
    </aside>
  `;
}

function renderAgentTracePanel(active) {
  const assistant = latestAssistantMessage(active);
  const panel = assistant?.learningPanel || {};
  const citations = panel.citations || assistant?.citations || [...(active?.messages || [])].reverse().find((message) => message.citations?.length)?.citations || [];
  const run = (state.data.agentRuns || [])[0];
  return `
    <aside class="ai-side">
      <section class="ai-side-card citation-card">
        <h3>引用来源</h3>
        <div class="ai-side-card-body">${renderCitationList(citations)}</div>
      </section>
      <section class="ai-side-card">
        <h3>相关知识点</h3>
        <div class="ai-side-card-body">${renderPanelChipList(panel.relatedKnowledgePoints, "本轮尚未定位知识点。")}</div>
      </section>
      <section class="ai-side-card">
        <h3>前置知识 / 易混淆</h3>
        <div class="ai-side-card-body">
          ${renderPanelChipList([...(panel.prerequisites || []), ...(panel.misconceptions || [])], "暂无明确前置或易混淆节点。")}
        </div>
      </section>
      <section class="ai-side-card">
        <h3>推荐练习</h3>
        <div class="ai-side-card-body">${renderLearningPanelList(panel.recommendedExercises, "完成本轮问答后会生成练习建议。")}</div>
      </section>
      <section class="ai-side-card">
        <h3>掌握度</h3>
        <div class="ai-side-card-body">${renderMasteryPanel(panel.mastery)}</div>
      </section>
      <section class="ai-side-card">
        <h3>学习建议</h3>
        <div class="ai-side-card-body">${renderLearningPanelList(panel.suggestions || state.data.learningAnalytics?.recommendations, "暂无学习建议。")}</div>
      </section>
      <section class="ai-side-card trace-card">
        <h3>智能体执行</h3>
        <div class="ai-side-card-body">
          ${(run?.steps || ["意图识别", "课程知识库检索", "知识图谱关联", "生成与校验"]).map((step, index) => `<p><strong>${index + 1}.</strong> ${escapeHtml(step)}</p>`).join("")}
        </div>
      </section>
      ${renderLearningProfilePanel()}
    </aside>
  `;
}

function aiPromptPlaceholder(isTeacher) {
  return isTeacher
    ? "输入课程问题、出题要求、教学设计或复习安排"
    : "输入概念问题、提示模式、练习要求或学习计划";
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

function renderAiPage() {
  const isTeacher = isTeacherLike();
  const conversations = state.data.conversations || [];
  const active = conversations.find((conv) => conv.id === state.activeConversationId) || conversations[0];
  if (active && !state.activeConversationId) {
    state.activeConversationId = active.id;
    state.aiMode = normalizeAiModeClient(active.mode || state.aiMode);
  }
  const modeTitle = aiModeLabel(state.aiMode || active?.mode);
  return `
    <div class="chat-layout ai-workbench">
      ${renderAiContextRail(active)}
      <section class="panel chat-panel ai-chat-panel">
        <div class="ai-chat-toolbar">
          <div class="ai-session-meta">
            <strong>${isTeacher ? "教学指导" : "学习对话"}</strong>
            <span>${active ? `${(active.messages || []).length} 条消息` : "新会话"} · ${escapeHtml(modeTitle)} · ${escapeHtml(aiDepthLabel(state.aiAnswerDepth))}</span>
          </div>
          <button id="newConversationBtn" class="primary">新建对话</button>
        </div>
        <div class="ai-control-bar">
          <label>当前课程
            <select id="aiSubjectSelect">${materialSubjectOptions(state.aiSubject)}</select>
          </label>
          <label>当前章节
            <input id="aiChapterInput" value="${escapeHtml(state.aiChapter)}" placeholder="可选：第 3 章 存储系统" autocomplete="off" />
          </label>
          <label>当前知识点
            <input id="aiKnowledgeInput" value="${escapeHtml(state.aiKnowledgePoint)}" placeholder="可选：Cache 直接映射" autocomplete="off" />
          </label>
          <label>回答深度
            ${renderAiDepthTabs()}
          </label>
        </div>
        ${renderAiModeTabs()}
        <div class="ai-active-title">
          <strong>${escapeHtml(active?.title || "新的对话")}</strong>
          <span>${active ? fmtTime(active.updatedAt) : "尚未开始"}</span>
        </div>
        <div class="message-stream" id="aiMessages">
          ${(active?.messages || []).map(renderAiMessage).join("") || `<div class="bubble assistant"><span>AI</span><p>${isTeacher ? "先上传课程资料，再输入教学目标或课堂问题，我会基于资料生成可追溯建议。" : "先上传或选择课程资料，再问我概念、章节总结或题目思路，我会给出引用来源。"}</p></div>`}
        </div>
        <div class="ai-quick-bar">
          <button type="button" data-ai-draft="explain">讲解</button>
          <button type="button" data-ai-draft="guided">提示</button>
          <button type="button" data-ai-draft="full">完整答案</button>
          <button type="button" data-ai-draft="practice">出题</button>
          <button type="button" data-ai-draft="grade">批改</button>
          <button type="button" data-ai-draft="plan">复习计划</button>
        </div>
        <form id="aiForm" class="composer rich-composer ai-composer">
          <div class="ai-input-tools">
            <button type="button" data-ai-tool="image">上传图片题目</button>
            <button type="button" data-ai-tool="pdf">上传 PDF</button>
            <button type="button" data-ai-tool="knowledge">选择知识点</button>
            <button type="button" data-ai-tool="wrong">选择错题</button>
            <button type="button" data-ai-tool="voice">语音输入</button>
          </div>
          <input name="prompt" placeholder="${escapeHtml(aiPromptPlaceholder(isTeacher))}" />
          <button class="primary" type="submit">发送</button>
        </form>
      </section>
      ${renderAgentTracePanel(active)}
    </div>
  `;
}

function bindAiPage() {
  const syncAiControls = () => {
    state.aiSubject = document.getElementById("aiSubjectSelect")?.value || state.aiSubject || "";
    state.aiChapter = document.getElementById("aiChapterInput")?.value || "";
    state.aiKnowledgePoint = document.getElementById("aiKnowledgeInput")?.value || "";
  };
  const active = activeAiConversation();
  const findMessage = (id) => (active?.messages || []).find((message) => message.id === id);
  const submitPrompt = async (prompt, explicitMode = "") => {
    const cleanPrompt = String(prompt || "").trim();
    if (!cleanPrompt) return;
    syncAiControls();
    const inferredMode = inferAiModeFromPrompt(cleanPrompt, isTeacherLike());
    const selectedMode = normalizeAiModeClient(explicitMode || state.aiMode);
    const mode = explicitMode ? selectedMode : (selectedMode && selectedMode !== "qa" ? selectedMode : inferredMode);
    state.aiMode = mode;
    const payload = await api("/api/ai/chat", {
      method: "POST",
      body: {
        userId: state.user.id,
        conversationId: state.activeConversationId,
        mode,
        subject: state.aiSubject || "通用",
        chapter: state.aiChapter,
        knowledgePoint: state.aiKnowledgePoint,
        answerDepth: state.aiAnswerDepth,
        prompt: cleanPrompt
      }
    });
    state.activeConversationId = payload.conversation.id;
    await loadState();
    renderShell();
  };
  document.getElementById("newConversationBtn")?.addEventListener("click", async () => {
    try {
      const payload = await api("/api/conversations", {
        method: "POST",
        body: { userId: state.user.id, mode: "qa", title: "新的对话" }
      });
      state.activeConversationId = payload.conversation.id;
      state.aiMode = "qa";
      await loadState();
      renderShell();
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  document.querySelectorAll("[data-ai-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      syncAiControls();
      state.aiMode = button.dataset.aiMode;
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
  ["aiSubjectSelect", "aiChapterInput", "aiKnowledgeInput"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", syncAiControls);
    document.getElementById(id)?.addEventListener("input", syncAiControls);
  });
  const stream = document.getElementById("aiMessages");
  if (stream) stream.scrollTop = stream.scrollHeight;
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
      const input = document.querySelector("#aiForm input[name='prompt']");
      const topic = state.aiKnowledgePoint || "当前知识点";
      const map = {
        explain: { mode: "explain", depth: "layered", prompt: `请分层讲解「${topic}」，包含定义、例子和易错点。` },
        guided: { mode: "guided", depth: "brief", prompt: `请用提示模式引导我理解「${topic}」，不要直接给完整答案。` },
        full: { mode: "explain", depth: "full", prompt: `请给出「${topic}」的完整解析，包含资料依据、步骤、例子和练习。` },
        practice: { mode: "practice", depth: "layered", prompt: `请根据「${topic}」生成 3 道练习题，并附答案解析。` },
        grade: { mode: "grade", depth: "layered", prompt: `请按批改模式检查我关于「${topic}」的答案，并指出错因和修改建议。` },
        plan: { mode: "plan", depth: "layered", prompt: `请围绕「${topic}」生成复习路径和每日练习安排。` }
      };
      const draft = map[button.dataset.aiDraft];
      if (!draft) return;
      state.aiMode = draft.mode;
      state.aiAnswerDepth = draft.depth;
      const preservedPrompt = input?.value || "";
      const shouldFill = !input || !input.value.trim();
      renderContent();
      const nextInput = document.querySelector("#aiForm input[name='prompt']");
      if (nextInput) nextInput.value = shouldFill ? draft.prompt : preservedPrompt;
      nextInput?.focus();
    });
  });
  document.querySelectorAll("[data-ai-tool]").forEach((button) => {
    button.addEventListener("click", () => {
      const tool = button.dataset.aiTool;
      if (tool === "knowledge") {
        const latest = latestAssistantMessage(activeAiConversation());
        const point = latest?.knowledgePoints?.[0] || latest?.learningPanel?.relatedKnowledgePoints?.[0]?.label || "";
        if (point) {
          state.aiKnowledgePoint = point;
          renderContent();
          return;
        }
      }
      showToast("该入口已预留。当前可先在课程资料页上传 PDF/Word/PPTX，或在输入框粘贴题目文字。");
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
      result: component.props?.expectedResult || component.props?.runResult || base?.result || "模拟运行完成：代码已载入，可继续接入 Python 执行环境返回真实指标。"
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
      expectedResult: definition.result || ""
    }
  }];
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
      <p>${result ? escapeHtml(result) : "暂无运行结果。双击机器学习算法节点，修改代码后点击运行测试。"}</p>
    </div>
  `;
}

function renderModelPage() {
  const models = (state.data.models || []).filter((model) => model.subject === state.modelSubject);
  const selected = state.modelComponents.find((item) => item.id === state.selectedComponentId);
  const lab = labConfigForSubject(state.modelSubject);
  const palette = paletteForSubject(state.modelSubject);
  const isMachineLearning = state.modelSubject === "机器学习";
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
        <div class="palette">
          ${palette.map((item) => `
            <button draggable="true" class="palette-item ${item.kind === "algorithm" ? "algorithm-item" : ""}" data-component-type="${item.type}" title="${item.kind === "algorithm" ? "双击查看代码，或拖入画布保存实验" : "拖入画布"}">
              <span>${item.icon}</span>${item.label}
            </button>
          `).join("")}
        </div>
        <form id="saveModelForm" class="stack">
          <label>模型名称<input name="name" value="${escapeHtml(models.find((model) => model.id === state.loadedModelId)?.name || "")}" placeholder="${isMachineLearning ? "例如：KNN分类实验" : "例如：斜面小车运动模型"}" /></label>
          <label>说明<textarea name="notes" rows="3" placeholder="记录参数、题目来源或使用场景"></textarea></label>
          <button class="primary" type="submit" ${canSaveOrDownload ? "" : "disabled"}>${isMachineLearning ? "保存算法代码" : "保存模型"}</button>
          <button class="ghost" type="button" id="downloadDraftModel" ${canSaveOrDownload ? "" : "disabled"}>${isMachineLearning ? "下载算法代码" : "下载当前模型"}</button>
          <button class="ghost" type="button" id="clearModelCanvas">清空画布</button>
          ${canSaveOrDownload ? "" : `<p class="hint">请先把模型或算法节点拖入画布，再保存或下载。</p>`}
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
          <button class="primary" type="button" id="runModelCodeBtn">运行测试</button>
          <button class="mini" type="button" id="closeModelCodeBtn">关闭</button>
        </div>
      </div>
      <textarea id="modelCodeEditor" spellcheck="false">${escapeHtml(code)}</textarea>
      <p class="hint">代码可直接修改；点击右上角“运行测试”后，结果会显示在画布下方“运行结果”区域。</p>
    </div>
  `;
}

function bindModelPage() {
  document.getElementById("modelSubject")?.addEventListener("change", (event) => {
    state.modelSubject = event.target.value;
    state.modelMode = state.modelSubject === "机器学习" ? "algorithm" : "ideal";
    state.modelComponents = [];
    state.selectedComponentId = null;
    state.loadedModelId = null;
    state.modelRunResult = "";
    resetModelCodeState();
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
  document.getElementById("runModelCodeBtn")?.addEventListener("click", () => {
    const editor = document.getElementById("modelCodeEditor");
    const draft = editor ? editor.value : state.modelCodeDraft;
    state.modelCodeDraft = draft;
    const definition = modelCodeDefinition();
    const result = definition?.result || "模拟运行完成：代码已载入，可继续接入 Python 执行环境返回真实指标。";
    state.modelCodeRan = true;
    state.modelRunResult = result;
    const component = state.modelComponents.find((item) => item.id === state.modelCodeComponentId);
    if (component) {
      component.props = component.props && typeof component.props === "object" ? component.props : {};
      component.props.code = draft;
      component.props.runResult = result;
    }
    renderContent();
  });
  document.getElementById("clearModelCanvas")?.addEventListener("click", () => {
    state.modelComponents = [];
    state.selectedComponentId = null;
    state.loadedModelId = null;
    state.modelRunResult = "";
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
          notes: form.get("notes")
        }
      });
      if (state.modelSubject === "机器学习") {
        state.modelComponents = [];
        state.selectedComponentId = null;
        state.loadedModelId = null;
        state.modelRunResult = "";
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
    <aside class="panel chat-directory-panel">
      ${renderFriendRequestPanel()}
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
        <h3>会话</h3>
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
        <button class="danger" id="deleteSelectedMessages">删除选中记录</button>
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

function renderChatInfoPanel(active, friends) {
  if (!active) return `<aside class="panel chat-info-panel">${emptyBlock("选择会话后显示详情。")}</aside>`;
  if (active.type === "direct") {
    const friendId = directFriendId(active);
    const friend = chatUser(friendId);
    return `
      <aside class="panel chat-info-panel">
        <h3>好友信息</h3>
        <div class="profile-mini chat-profile-card">
          <strong>${escapeHtml(friend?.name || friendId)}</strong>
          <span>ID：${escapeHtml(friendId)}</span>
          <span>身份：${friend ? roleName(friend.role) : "-"}</span>
        </div>
        <button class="danger wide" data-delete-friend="${friendId}">删除好友</button>
      </aside>
    `;
  }
  const owner = chatUser(active.ownerId);
  const isOwner = active.ownerId === state.user.id;
  const pendingIds = new Set(groupPendingInvites(active).map((invite) => invite.toUserId));
  const availableFriends = friends.filter((friend) => !active.memberIds.includes(friend.id) && !pendingIds.has(friend.id));
  const pending = groupPendingInvites(active);
  return `
    <aside class="panel chat-info-panel">
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
    </aside>
  `;
}

function renderChatPage() {
  const threads = state.data.chatThreads || [];
  const active = threads.find((thread) => thread.id === state.activeThreadId) || threads[0];
  const friends = state.data.friends || [];
  if (active && !state.activeThreadId) state.activeThreadId = active.id;
  return `
    ${renderChatActionCards(friends)}
    <div class="chat-layout standard">
      ${renderChatSidebar(friends, threads, active)}
      ${renderChatMain(active)}
      ${renderChatInfoPanel(active, friends)}
    </div>
  `;
}

function friendRequestToast(payload) {
  if (payload.status === "already_friends") return "你们已经是好友";
  if (payload.status === "accepted_reverse") return "已通过对方的好友申请";
  return "好友申请已发送，等待对方通过";
}

function bindChatPage() {
  document.getElementById("addFriendForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const payload = await api("/api/friends", { method: "POST", body: { userId: state.user.id, target: form.get("target"), message: form.get("message") } });
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
    <div class="grid two homework-full-grid">
      <section class="panel homework-create-panel">
        <h3>布置作业</h3>
        <form id="createHomeworkForm" class="stack">
          <label>班级<select name="classId">${classes.map((klass) => `<option value="${klass.id}" ${klass.id === activeClassId ? "selected" : ""}>${escapeHtml(klass.name)} · ${escapeHtml(klass.subject)}</option>`).join("")}</select></label>
          <label>标题<input name="title" placeholder="作业标题" /></label>
          <label>作业内容<textarea name="description" rows="4" placeholder="可填写文字说明"></textarea></label>
          <label>上传作业图片/视频<input name="attachments" type="file" multiple accept="image/*,video/*" /></label>
          <label>参考答案<textarea name="answer" rows="4" placeholder="用于 AI 批改匹配"></textarea></label>
          <label>评分标准<textarea name="rubric" rows="4" placeholder="每行一个评分项，例如：核心概念 35分：说明关键定义和条件"></textarea></label>
          <button class="primary" type="submit">发布作业</button>
        </form>
      </section>
      <section class="panel homework-published-panel">
        <div class="split-head">
          <h3>已发布作业</h3>
          <label class="compact-label">班级<select id="homeworkClassSelect">${classes.map((klass) => `<option value="${klass.id}" ${klass.id === activeClassId ? "selected" : ""}>${escapeHtml(klass.name)}</option>`).join("")}</select></label>
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
  return `
    <section class="homework-list compact-homework-list">
      ${homework.map((item) => {
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
      }).join("") || emptyBlock("当前班级还没有老师发布作业。")}
    </section>
    ${state.homeworkDetailId ? renderStudentHomeworkModal() : ""}
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
