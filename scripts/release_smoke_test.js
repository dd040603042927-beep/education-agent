const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const PORT = Number(process.env.TEST_PORT || 5199);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const CALLBACK_TOKEN = "smoke-callback-token";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      "content-type": "application/json",
      ...(options.cookie ? { cookie: options.cookie } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function requestBinary(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method || "POST",
    headers: {
      "content-type": "application/octet-stream",
      ...(options.cookie ? { cookie: options.cookie } : {}),
      ...(options.headers || {})
    },
    body: options.body
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function requestText(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      ...(options.cookie ? { cookie: options.cookie } : {})
    }
  });
  return { response, text: await response.text() };
}

async function requestFirstSseEvent(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method || "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream", ...(options.cookie ? { cookie: options.cookie } : {}) },
    body: JSON.stringify(options.body || {})
  });
  const reader = response.body.getReader();
  const startedAt = Date.now();
  const first = await reader.read();
  const elapsedMs = Date.now() - startedAt;
  const firstChunk = new TextDecoder().decode(first.value || new Uint8Array());
  while (!(await reader.read()).done) {}
  return { response, elapsedMs, firstChunk };
}

function startMockDify() {
  const requests = [];
  let missingStudentModel = false;
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const bodyText = Buffer.concat(chunks).toString("utf8");
      const body = bodyText ? JSON.parse(bodyText) : {};
      requests.push({ method: req.method, url: req.url, headers: req.headers, body });
      if (req.method === "POST" && req.url === "/v1/embeddings") {
        const inputs = Array.isArray(body.input) ? body.input : [body.input];
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: inputs.map((input, index) => ({ index, embedding: [String(input || "").length, String(input || "").includes("KNN") ? 1 : 0, 1] })) }));
        return;
      }
      if (req.method === "POST" && req.url === "/v1/chat/completions") {
        if (missingStudentModel && body.messages?.some((message) => String(message.content || "").includes("学生问题"))) {
          res.writeHead(404, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: { message: "model 'smoke-chat-model' not found", type: "not_found_error" } }));
          return;
        }
        if (body.messages?.some((message) => String(message.content || "").includes("课程学习路径设计助手"))) {
          const learningPath = {
            subject: "机器学习",
            title: "模型生成学习路径 smoke",
            nodes: [
              { id: "smoke_path_knn", label: "KNN 最近邻分类", group: "topic", level: 2, details: "依据距离度量选取 K 个最近邻，并通过多数投票完成分类。", knowledgePoints: ["距离度量", "多数投票"], learningGoal: "能说明 KNN 分类步骤及其适用条件。", prerequisites: [], misconceptions: ["KNN 训练阶段会拟合显式参数"], diagnosticQuestions: ["KNN 如何为新样本确定类别？"], remediationResources: ["复习距离计算和多数投票"], verificationQuestions: ["特征量纲不同时为何应先标准化？"], masteryStandard: "能正确说明邻居选择与投票流程。" },
              { id: "smoke_path_scaling", label: "特征标准化", group: "topic", level: 2, details: "将不同量纲的特征缩放到可比较的尺度，避免距离被大数值特征主导。", knowledgePoints: ["特征尺度", "距离影响"], learningGoal: "能解释标准化对基于距离算法的影响。", prerequisites: ["KNN 最近邻分类"], misconceptions: ["标准化会改变样本类别"], diagnosticQuestions: ["量纲差异如何影响欧氏距离？"], remediationResources: ["比较标准化前后的距离"], verificationQuestions: ["标准化是否会改变特征间的相对排序？"], masteryStandard: "能解释标准化的目的和边界。" }
            ],
            links: [{ source: "smoke_path_knn", target: "smoke_path_scaling", label: "学习顺序", type: "prerequisite", pedagogy: "先理解算法再分析尺度影响" }]
          };
          for (let index = 3; index <= 6; index += 1) {
            const id = `smoke_path_topic_${index}`;
            learningPath.nodes.push({ ...learningPath.nodes[1], id, label: `KNN 扩展知识 ${index}`, prerequisites: [learningPath.nodes[index - 2].label] });
            learningPath.links.push({ source: learningPath.nodes[index - 2].id, target: id, label: "学习顺序", type: "prerequisite", pedagogy: "按先修顺序推进" });
          }
          learningPath.nodes[1].prerequisites = [learningPath.nodes[0].label];
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(learningPath) } }] }));
          return;
        }
        if (body.model === "qwen4-max" && body.enable_thinking !== false) {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ choices: [{ message: { content: "", reasoning_content: "模型仍在推理。" } }] }));
          return;
        }
        if (body.messages?.some((message) => String(message.content || "").includes("生成三道练习题 smoke"))) {
          const questions = [1, 2, 3].map((number) => `第${number}题：说明 KNN 如何使用距离完成分类。\nA. 最近邻投票\nB. 梯度下降\nC. 聚类中心\nD. 随机猜测\n答案：A\n解析：KNN 按距离选择邻居并通过多数投票分类。`).join("\n\n");
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ answer: questions, topic_label: "KNN", next_questions: [] }) } }] }));
          return;
        }
        const answer = [
          "## 直接回答",
          "KNN 的核心思想是根据距离选择 K 个最近邻，分类时用投票、回归时用平均或加权平均完成预测。",
          "",
          "## 依据与例子",
          "在特征尺度差异较大时，应先标准化，避免某个特征主导距离计算。",
          "",
          "## 易错提醒",
          "KNN 是基于样本邻近关系的监督学习方法，不会通过训练阶段拟合显式参数。",
          "",
          "## 下一步自检问题",
          "为什么 KNN 通常需要标准化？"
        ].join("\n");
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                answer,
                topic_label: "KNN",
                mastery_score: null,
                mastery_level: "未诊断",
                error_tags: [],
                missing_points: [],
                next_questions: ["为什么 KNN 通常需要标准化？"]
              })
            }
          }]
        }));
        return;
      }
      if (req.method !== "POST" || req.url !== "/v1/workflows/run") {
        res.writeHead(404, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "not found" }));
        return;
      }
      const inputs = body.inputs || {};
      const evidence = [
        {
          id: "E1",
          type: "material",
          title: "教师端课程资料",
          quote: "KNN 根据距离选取最近邻，并通过投票或平均完成预测。",
          ragChannel: "project"
        }
      ];
      const finalAnswer = [
        "## 知识点定位",
        "KNN（置信度 1）",
        "",
        "## 掌握度",
        "未诊断，得分 0",
        "",
        "## 标准解释",
        "KNN 的核心思想是根据距离找到最相似的 K 个训练样本，分类时多数投票，回归时取平均或加权平均。",
        "",
        "## 诊断反馈",
        "未提供学生自我理解，当前为知识问答模式，暂不进行掌握度扣分诊断。",
        "",
        "## 追问题",
        "1. KNN 为什么通常需要标准化？"
      ].join("\n");
      const structured = {
        topic_label: "KNN",
        topic_probability: 1,
        top_topic_candidates: [{ topic: "KNN", probability: 1 }],
        mastery_score: 0,
        mastery_level: "未诊断",
        error_tags: [],
        missing_points: ["未提供学生自我理解，当前仅生成标准解释。"],
        rag_evidence: evidence,
        final_answer: finalAnswer,
        question: inputs.question || "",
        request_user_id: inputs.request_user_id || "",
        request_user_role: inputs.request_user_role || "",
        assistant_task: inputs.assistant_task || "",
        assistant_task_label: inputs.assistant_task_label || "",
        subject: inputs.subject || "",
        chapter: inputs.chapter || "",
        knowledge_point: inputs.knowledge_point || ""
      };
      const callbackPayload = {
        student_id: inputs.student_id || "",
        class_id: inputs.class_id || "",
        conversation_id: inputs.conversation_id || "",
        request_id: inputs.request_id || "",
        sync_mode: inputs.sync_mode || "",
        request_user_id: inputs.request_user_id || "",
        request_user_role: inputs.request_user_role || "",
        assistant_task: inputs.assistant_task || "",
        assistant_task_label: inputs.assistant_task_label || "",
        subject: inputs.subject || "",
        chapter: inputs.chapter || "",
        knowledge_point: inputs.knowledge_point || "",
        question: inputs.question || "",
        student_answer: inputs.student_answer || "",
        topic_label: "KNN",
        mastery_score: 0,
        mastery_level: "未诊断",
        error_tags: [],
        missing_points: ["未提供学生自我理解，当前仅生成标准解释。"],
        rag_evidence: evidence,
        final_answer: finalAnswer,
        structured_result: structured
      };
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        workflow_run_id: "wf-smoke",
        task_id: "task-smoke",
        data: {
          status: "succeeded",
          outputs: {
            final_answer: finalAnswer,
            structured_json: JSON.stringify(structured),
            callback_payload: JSON.stringify(callbackPayload),
            rag_evidence: JSON.stringify(evidence),
            topic_label: "KNN",
            topic_probability: 1,
            mastery_score: 0,
            mastery_level: "未诊断",
            error_tags: JSON.stringify([])
          }
        }
      }));
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, requests, baseUrl: `http://127.0.0.1:${server.address().port}/v1`, setMissingStudentModel: (value) => { missingStudentModel = value; } });
    });
  });
}

async function waitForReady() {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    try {
      const { response, payload } = await request("/api/healthz");
      if (response.ok && payload.ok) return;
    } catch {
      // server not ready yet
    }
    await sleep(300);
  }
  throw new Error("server did not become ready");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assetVersionFromHomepage(html, assetName) {
  const match = String(html || "").match(new RegExp(`/${assetName.replace(".", "\\.")}\\?v=([^"']+)`));
  assert(match?.[1], `homepage should reference ${assetName} with a version query`);
  return match[1];
}

async function uploadTextFile(cookie, userId, fileName, text) {
  const buffer = Buffer.from(text, "utf8");
  const started = await request("/api/uploads/start", {
    method: "POST",
    cookie,
    body: { userId, fileName, fileType: "text/plain", size: buffer.length }
  });
  assert(started.response.status === 201 && started.payload.upload?.id, `upload session should start for ${fileName}`);
  const chunk = await requestBinary(`/api/uploads/${started.payload.upload.id}/chunk?index=0&offset=0`, {
    cookie,
    body: buffer
  });
  assert(chunk.response.ok && chunk.payload.upload?.received === buffer.length, `upload chunk should complete for ${fileName}`);
  return started.payload.upload;
}

async function waitForGraphJob(jobId, cookie) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const jobResult = await request(`/api/graphs/jobs/${jobId}`, { cookie });
    const job = jobResult.payload.job;
    if (job?.status === "complete") return job;
    if (job?.status === "failed") throw new Error(job.error || job.message || "graph generation failed");
    await sleep(250);
  }
  throw new Error(`graph job ${jobId} did not complete`);
}

async function waitForBackgroundJob(jobId, cookie) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const result = await request(`/api/jobs/${jobId}`, { cookie });
    const job = result.payload.job;
    if (job?.status === "complete") return job;
    if (job?.status === "failed") throw new Error(job.error || "background job failed");
    await sleep(250);
  }
  throw new Error(`background job ${jobId} did not complete`);
}

async function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "education-agent-smoke-"));
  const mockDify = await startMockDify();
  const serverEnv = {
      ...process.env,
      PORT: String(PORT),
      HOST: "127.0.0.1",
      DATA_DIR: path.join(tempRoot, "data"),
      STORAGE_DRIVER: process.env.TEST_STORAGE_DRIVER || "sqlite",
      DATABASE_URL: path.join(tempRoot, "data", "education.db"),
      LOG_DIR: path.join(tempRoot, "logs"),
      BACKUP_DIR: path.join(tempRoot, "backups"),
      SESSION_SECRET: "release-smoke-test-secret",
      COOKIE_SECURE: "false",
      EMBEDDING_PROVIDER: "openai",
      EMBEDDING_API_KEY: "embedding-smoke-key",
      EMBEDDING_BASE_URL: mockDify.baseUrl,
      EMBEDDING_MODEL: "smoke-embedding"
  };
  let child = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: serverEnv,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  try {
    await waitForReady();

    const health = await request("/api/healthz");
    assert(health.payload.storageDriver === (process.env.TEST_STORAGE_DRIVER || "sqlite"), "health must report the selected storage driver");
    if (health.payload.storageDriver === "sqlite") {
      assert(health.payload.storagePath === path.join(tempRoot, "data", "education.db"), "SQLite smoke test must use its isolated database");
    }

    const homepage = await requestText("/");
    assert(homepage.response.ok, "homepage should load");
    assert(homepage.response.headers.get("cache-control")?.includes("no-store"), "homepage should disable stale static cache");
    const appAssetVersion = assetVersionFromHomepage(homepage.text, "app.js");
    const styleAssetVersion = assetVersionFromHomepage(homepage.text, "styles.css");
    assert(appAssetVersion === styleAssetVersion, "app and style assets should use the same cache-busting version");
    const appBundle = await requestText(`/app.js?v=${appAssetVersion}`);
    assert(appBundle.response.ok, "app bundle should load with version query");
    assert(appBundle.response.headers.get("cache-control")?.includes("no-store"), "app bundle should disable stale static cache");
    assert(appBundle.text.includes("renderTeacherHomePage") && appBundle.text.includes("renderStudentHomePage"), "app bundle should contain role dashboards");
    assert(appBundle.text.includes("以 AI 伦理守边界、以学术诚信留证据、以成长性评价看见进步"), "student home should connect AI ethics, academic integrity, and growth evaluation");
    assert(appBundle.text.includes("async function apiStream") && appBundle.text.includes('accept: "text/event-stream"'), "AI chat should consume the server-sent event response");
    const removedModuleKey = ["class", "room"].join("");
    const removedModulePascal = ["Class", "room"].join("");
    assert(!appBundle.text.includes(`render${removedModulePascal}Page`) && !appBundle.text.includes(`renderTeacher${removedModulePascal}Page`) && !appBundle.text.includes(`renderStudent${removedModulePascal}Page`), "removed module pages should stay out of the app bundle");
    assert(!appBundle.text.includes(`key: "${removedModuleKey}"`) && !appBundle.text.includes(`data-dashboard-page="${removedModuleKey}"`), "removed module navigation and dashboard entry should stay out");
    assert(!appBundle.text.includes(`data-material-${removedModuleKey}`), "removed material action should stay out of the app bundle");
    assert(!appBundle.text.includes(`data-graph-node-action="${removedModuleKey}"`), "removed graph action should stay out of the app bundle");
    assert(!appBundle.text.includes("ai-history-rail"), "AI page should not render a separate left history rail");
    assert(appBundle.text.includes("renderChatActionCards"), "app bundle should contain the unified chat action cards");
    assert(appBundle.text.includes("创建并发送邀请"), "app bundle should contain approval-based group creation UI");
    assert(appBundle.text.includes('data-chat-tool="pending"') && appBundle.text.includes('data-chat-tool="contacts"'), "chat page should expose pending and contacts as top toolbar actions");
    assert(appBundle.text.includes("class-management-grid") && appBundle.text.includes("class-management-row") && appBundle.text.includes("data-inline-class-tool"), "class management should render inline class controls");
    const classLearningPage = appBundle.text.match(/function renderClassLearningPage\(\) \{[\s\S]*?\n\}/)?.[0] || "";
    assert(!classLearningPage.includes("|| classes[0]") && !classLearningPage.includes("state.selectedClassId = active.id"), "teacher class analytics must not auto-select the first class");
    assert(!appBundle.text.includes("${renderChatInfoPanel(active, friends)}"), "chat layout should not render the old fixed right info rail");
    assert(!appBundle.text.includes("chat-action-head"), "app bundle should not contain the old chat action header");
    assert(!appBundle.text.includes("面向备课、授课、班级与作业闭环"), "top bar should not contain the old teacher subtitle");
    assert(!appBundle.text.includes("内置教师：20260001"), "release login should not expose demo account credentials");
    assert(!appBundle.text.includes("该入口已预留"), "release UI should not include reserved fake-entry prompts");

    const anonymousState = await request("/api/state");
    assert(anonymousState.response.status === 401, "anonymous /api/state should be rejected");

    const adminLogin = await request("/api/auth/login", {
      method: "POST",
      body: { account: "20260000", password: "123456" }
    });
    const adminCookie = String(adminLogin.response.headers.get("set-cookie") || "").split(";")[0];
    assert(adminLogin.response.ok && adminLogin.payload.user?.role === "admin", "built-in admin should be able to log in");
    const adminExport = await request("/api/admin/export?format=json", { cookie: adminCookie });
    assert(adminExport.response.ok && adminExport.payload.report?.summary?.students >= 1, "admin export should load after RBAC");
    assert(adminExport.payload.report?.sections?.some((section) => section.title === "匿名学生列表"), "admin export should include anonymous student list");
    const adminOverview = await request("/api/admin/overview", { cookie: adminCookie });
    assert(adminOverview.response.ok && adminOverview.payload.overview?.summary?.teachers >= 1, "admin overview should include teacher data");
    assert(adminOverview.payload.overview?.sections?.some((section) => section.key === "users") && adminOverview.payload.overview?.sections?.some((section) => section.key === "conversations"), "admin overview should cover student and teacher business data");
    assert(!JSON.stringify(adminOverview.payload.overview).includes("passwordHash"), "admin overview must not expose password hashes");
    const adminCsvExport = await request("/api/admin/export?format=csv", { cookie: adminCookie });
    assert(adminCsvExport.response.ok && adminCsvExport.payload.fileName?.endsWith(".csv") && adminCsvExport.payload.content?.includes("学习周期时间线"), "admin CSV export should include required sections");
    const adminModelBeforeSave = await request("/api/admin/model-config", { cookie: adminCookie });
    assert(adminModelBeforeSave.response.ok && adminModelBeforeSave.payload.config?.configured === false, "model configuration should start empty and be admin-only");
    const adminModelSave = await request("/api/admin/model-config", {
      method: "PUT",
      cookie: adminCookie,
      body: { provider: "openai-compatible", baseUrl: mockDify.baseUrl, model: "smoke-chat-model", timeoutMs: 25000, apiKey: "admin-smoke-key" }
    });
    assert(adminModelSave.response.ok && adminModelSave.payload.config?.configured, "admin should be able to save the shared model configuration");
    assert(!JSON.stringify(adminModelSave.payload.config).includes("admin-smoke-key"), "model configuration responses must not expose API keys");
    const adminModelTest = await request("/api/admin/model-config/test", { method: "POST", cookie: adminCookie, body: {} });
    assert(adminModelTest.response.ok && adminModelTest.payload.model === "smoke-chat-model", "admin should be able to test the saved model configuration");

    const weakRegister = await request("/api/auth/register", {
      method: "POST",
      body: { name: "密码测试", password: "123", role: "teacher", subject: "数学" }
    });
    assert(weakRegister.response.status === 400, "weak registration password should be rejected");

    const duplicateRegister = await request("/api/auth/register", {
      method: "POST",
      body: { name: "烟测新增教师", password: "123456", role: "teacher", subject: "机器学习" }
    });
    assert(duplicateRegister.response.status === 201 && duplicateRegister.payload.user?.id, "unique registration should succeed");
    const duplicateRegistrationAttempt = await request("/api/auth/register", {
      method: "POST",
      body: { name: "烟测新增教师", password: "123456", role: "teacher", subject: "机器学习" }
    });
    assert(duplicateRegistrationAttempt.response.status === 400, "a second registration with the same username should be rejected");
    const duplicateUserId = duplicateRegister.payload.user.id;
    const registerSetCookie = String(duplicateRegister.response.headers.get("set-cookie") || "");
    const duplicateTeacherCookie = registerSetCookie.split(";")[0];
    assert(registerSetCookie.includes("edu_session=") && registerSetCookie.includes("Max-Age=172800"), "registration should auto-login with 2-day session cookie");
    assert(duplicateRegister.payload.state?.user?.id === duplicateUserId, "registration should return the new user's initial state");
    assert(duplicateRegister.payload.state.knowledgeGraphs.length === 0, "registered teacher initial state should not inherit graphs");
    assert(duplicateRegister.payload.state.courseMaterials.length === 0, "registered teacher initial state should not inherit materials");

    const duplicateNameLogin = await request("/api/auth/login", {
      method: "POST",
      body: { account: "黄豆", password: "123456" }
    });
    assert(duplicateNameLogin.response.ok, "an existing unique username should remain usable for login");

    const idNameLogin = await request("/api/auth/login", {
      method: "POST",
      body: { account: `${duplicateUserId}-烟测新增教师`, password: "123456" }
    });
    assert(idNameLogin.response.ok && idNameLogin.payload.ok, "ID-name account format should login by the unique ID");

    const newTeacherLogin = await request("/api/auth/login", {
      method: "POST",
      body: { account: duplicateUserId, password: "123456" }
    });
    assert(newTeacherLogin.response.ok && newTeacherLogin.payload.ok, "new duplicate-name teacher should login by ID");
    const newTeacherState = newTeacherLogin.payload.state;
    assert(newTeacherState.knowledgeGraphs.length === 0, "new registered teacher should not inherit global graphs");
    assert(newTeacherState.courseMaterials.length === 0, "new registered teacher should not inherit global course materials");
    assert(newTeacherState.classes.length === 0, "new registered teacher should start without classes");
    assert(newTeacherState.homework.length === 0, "new registered teacher should start without homework");
    assert(newTeacherState.conversations.length === 0, "new registered teacher should start without conversations");
    assert(newTeacherState.friends.length === 0 && newTeacherState.chatThreads.length === 0, "new registered teacher should start without friends or chats");
    const removedModelsApi = await request(`/api/models?userId=${duplicateUserId}`, { cookie: duplicateTeacherCookie });
    assert(removedModelsApi.response.status === 404, "removed model lab API should remain unavailable");
    const removedModelCodeApi = await request("/api/model-code/run", {
      method: "POST",
      cookie: duplicateTeacherCookie,
      body: { userId: duplicateUserId, code: "print('removed')" }
    });
    assert(removedModelCodeApi.response.status === 404, "removed model code API should remain unavailable");


    const studentRegister = await request("/api/auth/register", {
      method: "POST",
      body: { name: "同名测试学生", password: "123456", role: "student", className: "未加入" }
    });
    assert(studentRegister.response.status === 201 && studentRegister.payload.user?.id, "new student registration should succeed");
    const newStudentLogin = await request("/api/auth/login", {
      method: "POST",
      body: { account: studentRegister.payload.user.id, password: "123456" }
    });
    assert(newStudentLogin.response.ok && newStudentLogin.payload.ok, "new student should login by ID");
    const newStudentId = studentRegister.payload.user.id;
    const newStudentCookie = String(newStudentLogin.response.headers.get("set-cookie") || "").split(";")[0];
    const newStudentState = newStudentLogin.payload.state;
    const removedLearningPartnerApi = await request("/api/learning-partner/plans", {
      method: "POST",
      cookie: newStudentCookie,
      body: { userId: newStudentId, materialId: "removed-feature" }
    });
    assert(removedLearningPartnerApi.response.status === 404, "legacy learning partner plan API should remain removed");
    assert(newStudentState.knowledgeGraphs.length === 0, "new registered student should not see private teacher graphs by default");
    assert(newStudentState.courseMaterials.some((item) => item.global && item.subject === "机器学习"), "new registered student should see teacher-published global course materials");
    assert(newStudentState.classes.length === 0, "new registered student should start without classes");
    assert(newStudentState.homework.length === 0, "new registered student should start without homework");
    assert(newStudentState.friends.length === 0 && newStudentState.chatThreads.length === 0, "new registered student should start without friends or chats");

    const publicMlMaterial = newStudentState.courseMaterials.find((item) => item.global && item.subject === "机器学习" && item.chunkCount > 0);
    assert(publicMlMaterial, "new registered student should have a usable public machine learning material for knowledge tests");
    const partnerGraphs = await request("/api/learning-partner/graphs", { cookie: newStudentCookie });
    assert(partnerGraphs.response.ok && partnerGraphs.payload.graphs?.length === 0, "learning partner should require a selected class with a published learning path");
    const knowledgeQuiz = await request("/api/knowledge-tests/generate", {
      method: "POST",
      cookie: newStudentCookie,
      body: {
        subject: "机器学习",
        materialId: publicMlMaterial.id,
        count: 4
      }
    });
    assert(knowledgeQuiz.response.ok, "student knowledge test generation should use visible teacher materials");
    assert((knowledgeQuiz.payload.quiz?.questions || []).length >= 3, "knowledge test should generate multiple material-grounded questions");
    assert((knowledgeQuiz.payload.quiz?.citations || []).some((item) => item.type === "material" && item.global), "knowledge test should expose teacher material citations");
    const quizQuestion = knowledgeQuiz.payload.quiz.questions[0];
    const quizAnswer = [
      `首先，${quizQuestion.topic}需要结合资料中的关键点说明。`,
      `本题答案覆盖 ${quizQuestion.expectedKeywords.slice(0, 8).join("、")}。`,
      "其次，需要说明定义、条件、步骤、作用和一个例子，最后给出结论。"
    ].join("");
    const knowledgeEvaluation = await request("/api/knowledge-tests/evaluate", {
      method: "POST",
      cookie: newStudentCookie,
      body: {
        quizId: knowledgeQuiz.payload.quiz.id,
        subject: "机器学习",
        materialId: publicMlMaterial.id,
        question: quizQuestion,
        answer: quizAnswer,
        attempts: [],
        questionCount: knowledgeQuiz.payload.quiz.questions.length
      }
    });
    assert(knowledgeEvaluation.response.ok, "student knowledge test answer should be evaluated");
    assert(knowledgeEvaluation.payload.result?.overall?.accuracy > 0, "knowledge test evaluation should return cumulative accuracy");
    assert(knowledgeEvaluation.payload.result?.overall?.masteryLevel, "knowledge test evaluation should return a mastery level");
    const afterKnowledgeTestState = await request("/api/state", { cookie: newStudentCookie });
    assert(afterKnowledgeTestState.payload.state.learningAnalytics?.profile?.mastery?.[quizQuestion.topic], "knowledge test should update the student's learning profile mastery");

    const publicMaterialChat = await request("/api/ai/chat", {
      method: "POST",
      cookie: newStudentCookie,
      body: {
        userId: newStudentId,
        subject: "机器学习",
        mode: "qa",
        prompt: "KNN 的核心思想是什么？"
      }
    });
    assert(publicMaterialChat.response.ok, "student AI chat should call the backend model");
    const publicMaterialAssistant = publicMaterialChat.payload.messages?.find((message) => message.role === "assistant");
    const studentCitations = publicMaterialAssistant?.citations || [];
    const studentRetrieved = publicMaterialAssistant?.retrieved || [];
    assert(studentCitations.length > 0, "student AI chat should expose teacher-uploaded citation sources");
    assert(studentCitations.some((item) => item.subject === "机器学习" && item.global), "student AI chat citations should include visible machine learning teacher materials");
    assert(studentCitations.every((item) => item.contentSha256 && item.verification?.status === "verified"), "local retrieval citations must include a verifiable source hash and exact-quote verification");
    assert(studentRetrieved.length > 0, "student AI chat should expose retrieved source chunks for citation display");
    assert(studentRetrieved.some((item) => item.scoreDetail?.embedding === true), "student retrieval should use the configured real embedding provider");
    assert(publicMaterialAssistant?.workflow?.name === "学生画像驱动课程问答助手", "student AI chat should return the native model trace");
    const publicMaterialAnswer = String(publicMaterialAssistant?.content || "");
    assert(publicMaterialAnswer.includes("## 直接回答") && publicMaterialAnswer.includes("KNN"), "student AI chat should return the model answer");
    assert(publicMaterialAnswer.includes("## 易错提醒") && publicMaterialAnswer.includes("## 下一步自检问题"), "student AI chat answer should retain the required learning structure");
    assert(publicMaterialAssistant?.workflowResult?.topic_label, "student AI chat should expose a native structured topic result");
    assert(publicMaterialAssistant?.workflowResult?.source === "admin-configured-model", "student AI chat should use the administrator-configured model");
    const nativeModelRun = mockDify.requests.find((item) => item.method === "POST" && item.url === "/v1/chat/completions" && item.body.messages?.some((message) => String(message.content || "").includes("学生问题")));
    assert(nativeModelRun, "mock model should receive the student chat completion");
    assert(nativeModelRun.headers.authorization === "Bearer admin-smoke-key", "student model request should use the administrator API key");
    assert(nativeModelRun.body.model === "smoke-chat-model", "student model request should use the administrator model selection");
    const nativePrompt = nativeModelRun.body.messages?.map((item) => item.content).join("\n") || "";
    assert(nativePrompt.includes("学生画像摘要"), "student model prompt should include the current learning profile");
    assert(nativePrompt.includes("课程证据") && nativePrompt.includes("[S1]"), "student model prompt should include retrieved course evidence");
    for (let index = 1; index <= 3; index += 1) {
      const repeatedQa = await request("/api/ai/chat", {
        method: "POST",
        cookie: newStudentCookie,
        body: { userId: newStudentId, subject: "机器学习", mode: "qa", prompt: `连续问答验收 ${index}：KNN 的核心思想是什么？` }
      });
      const repeatedAnswer = repeatedQa.payload.messages?.find((message) => message.role === "assistant");
      assert(repeatedQa.response.ok && repeatedAnswer?.content.includes("## 下一步自检问题") && repeatedAnswer?.workflowResult?.source === "admin-configured-model", `QA response ${index} should be complete and preserve model trace data`);
    }
    const streamedChat = await requestFirstSseEvent("/api/ai/chat", {
      cookie: newStudentCookie,
      body: { userId: newStudentId, subject: "机器学习", mode: "qa", prompt: "流式首事件验收：KNN 是什么？", stream: true }
    });
    assert(streamedChat.response.ok && streamedChat.response.headers.get("content-type")?.includes("text/event-stream"), "AI chat should return SSE when requested");
    assert(streamedChat.elapsedMs < 2000 && streamedChat.firstChunk.includes("event: progress"), "AI chat should send its first SSE event within two seconds");
    for (let index = 1; index <= 3; index += 1) {
      const practice = await request("/api/ai/chat", {
        method: "POST",
        cookie: adminCookie,
        body: { userId: "20260001", subject: "机器学习", teacherTask: "quiz_generation", mode: "practice", prompt: `生成三道练习题 smoke（第 ${index} 次），每题提供选项、答案和解析。` }
      });
      const practiceAnswer = practice.payload.messages?.find((message) => message.role === "assistant")?.content || "";
      assert(practice.response.ok && [1, 2, 3].every((number) => practiceAnswer.includes(`第${number}题`) && practiceAnswer.includes("答案：A") && practiceAnswer.includes("解析：")), `practice response ${index} should include three complete questions, answers, and explanations`);
    }
    mockDify.setMissingStudentModel(true);
    const missingStudentModelChat = await request("/api/ai/chat", {
      method: "POST",
      cookie: newStudentCookie,
      body: { userId: newStudentId, subject: "机器学习", mode: "auto", prompt: "解释 KNN 的核心思想" }
    });
    assert(missingStudentModelChat.response.status === 404 && missingStudentModelChat.payload.error?.includes("模型接口返回 404"), "missing model errors should preserve the model service response");
    mockDify.setMissingStudentModel(false);
    const qwenModelSave = await request("/api/admin/model-config", {
      method: "PUT",
      cookie: adminCookie,
      body: { provider: "openai-compatible", baseUrl: mockDify.baseUrl, model: "qwen4-max", timeoutMs: 25000, apiKey: "admin-smoke-key" }
    });
    assert(qwenModelSave.response.ok, "admin should be able to save a Qwen model configuration");
    const qwenStudentChat = await request("/api/ai/chat", {
      method: "POST",
      cookie: newStudentCookie,
      body: { userId: newStudentId, subject: "机器学习", mode: "qa", prompt: "解释 KNN 的核心思想" }
    });
    assert(qwenStudentChat.response.ok, "student AI chat should disable Qwen thinking and receive a final answer");
    const qwenModelRun = mockDify.requests.find((item) => item.method === "POST" && item.url === "/v1/chat/completions" && item.body.model === "qwen4-max");
    assert(qwenModelRun?.body.enable_thinking === false, "Qwen model requests should explicitly disable thinking mode");
    const restoreModel = await request("/api/admin/model-config", {
      method: "PUT",
      cookie: adminCookie,
      body: { provider: "openai-compatible", baseUrl: mockDify.baseUrl, model: "smoke-chat-model", timeoutMs: 25000, apiKey: "admin-smoke-key" }
    });
    assert(restoreModel.response.ok, "smoke test should restore the default mock model");
    const studentAssistantHtml = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");
    assert(studentAssistantHtml.includes("直接问问题，也可以粘贴答案、推导过程或代码。"), "student assistant should expose one free-form prompt instead of task selection");
    assert(studentAssistantHtml.includes("本轮回答依据") && studentAssistantHtml.includes("data-ai-example"), "student assistant should show concise answer context and one follow-up action");

    const queuedChat = await request("/api/ai/jobs", {
      method: "POST",
      cookie: newStudentCookie,
      body: { userId: newStudentId, subject: "机器学习", mode: "auto", prompt: "KNN 为什么需要标准化？" }
    });
    assert(queuedChat.response.status === 202 && queuedChat.payload.job?.id, "AI requests should be accepted as recoverable background jobs");
    const completedChat = await waitForBackgroundJob(queuedChat.payload.job.id, newStudentCookie);
    assert(completedChat.result?.conversation?.id && completedChat.result?.messages?.some((message) => message.role === "assistant"), "completed AI job should persist and return its conversation result");

    const blockedCheating = await request("/api/ai/chat", {
      method: "POST",
      cookie: newStudentCookie,
      body: { userId: newStudentId, subject: "机器学习", mode: "qa", prompt: "请替我完成考试试卷" }
    });
    const blockedAnswer = blockedCheating.payload.messages?.find((message) => message.role === "assistant");
    assert(blockedCheating.response.ok && blockedAnswer?.confidence === "blocked", "education safety routing should intercept academic-integrity requests");

    const login = await request("/api/auth/login", {
      method: "POST",
      body: { account: "20260001", password: "123456" }
    });
    assert(login.response.ok && login.payload.ok, "teacher login should succeed");
    const cookie = String(login.response.headers.get("set-cookie") || "").split(";")[0];
    const loginSetCookie = String(login.response.headers.get("set-cookie") || "");
    assert(cookie.includes("edu_session="), "login should set session cookie");
    assert(loginSetCookie.includes("Max-Age=172800"), "login cookie should use 2-day idle max age");

    const state = await request("/api/state", { cookie });
    assert(state.response.ok && state.payload.state?.user?.id === "20260001", "session state should resolve current user");
    const refreshedCookie = String(state.response.headers.get("set-cookie") || "");
    assert(refreshedCookie.includes("edu_session=") && refreshedCookie.includes("Max-Age=172800"), "authenticated state should refresh 2-day session cookie");
    assert(state.payload.state.user.subject === "机器学习", "seed teacher should default to the machine learning course example");
    const mlMaterial = state.payload.state.courseMaterials.find((item) => item.subject === "机器学习" && item.title.includes("动手学机器学习"));
    assert(mlMaterial && mlMaterial.chunkCount > 0, "machine learning seed material should be searchable");
    const mlGraph = state.payload.state.knowledgeGraphs.find((item) => item.subject === "机器学习" && item.title.includes("动手学机器学习"));
    assert(mlGraph && mlGraph.nodes.length >= 30 && mlGraph.links.length >= 20, "machine learning seed graph should be available");
    const knnNode = mlGraph.nodes.find((node) => /K\s*近邻|KNN|最近邻/i.test(node.label)) || mlGraph.nodes.find((node) => /机器学习|监督学习/.test(node.label)) || mlGraph.nodes[0];
    assert(knnNode?.id, "machine learning graph should expose an actionable node");

    const graphUploadA = await uploadTextFile(cookie, "20260001", "ml-multifile-a.txt", [
      "机器学习多文件图谱 A",
      "KNN 通过距离度量寻找最近的 K 个样本，分类任务使用多数投票。",
      "关键步骤包括选择 K 值、标准化特征、计算距离和汇总邻居标签。"
    ].join("\n"));
    const graphUploadB = await uploadTextFile(cookie, "20260001", "ml-multifile-b.txt", [
      "机器学习多文件图谱 B",
      "逻辑回归使用 sigmoid 函数输出类别概率，适合二分类任务。",
      "KNN 与逻辑回归的差异包括训练方式、决策边界和特征尺度敏感性。"
    ].join("\n"));
    const multiFileGraphStart = await request("/api/graphs/generate-upload", {
      method: "POST",
      cookie,
      body: {
        userId: "20260001",
        subject: "机器学习",
        title: "多文件汇总图谱 smoke",
        sourceName: "ml-multifile-a.txt、ml-multifile-b.txt",
        sourceText: "汇总生成 KNN、逻辑回归、距离度量、标准化、二分类等节点，并建立对比关系。",
        uploadIds: [graphUploadA.id, graphUploadB.id]
      }
    });
    assert(multiFileGraphStart.response.status === 202 && multiFileGraphStart.payload.job?.id, "multi-file graph generation should create one graph job");
    const multiFileGraphJob = await waitForGraphJob(multiFileGraphStart.payload.job.id, cookie);
    assert(multiFileGraphJob.meta?.fileCount === 2, "multi-file graph job should keep the source file count");
    assert((multiFileGraphJob.meta?.sourceFiles || []).length === 2, "multi-file graph job should keep both source files");
    assert(multiFileGraphJob.meta?.extraction?.fileCount === 2, "multi-file graph extraction should aggregate both files");
    const afterMultiGraphState = await request("/api/state", { cookie });
    const multiFileGraph = afterMultiGraphState.payload.state.knowledgeGraphs.find((item) => item.id === multiFileGraphJob.graphId);
    assert(multiFileGraph?.nodes?.length > 0, "multi-file graph generation should save one merged graph");
    assert(multiFileGraph.publishStatus === "draft", "generated knowledge graphs should remain drafts until a teacher publishes them");

    const learningPathGeneration = await request("/api/graphs/generate", {
      method: "POST",
      cookie,
      body: {
        userId: "20260001",
        subject: "机器学习",
        title: "模型生成学习路径 smoke",
        sourceName: "KNN 学习资料",
        sourceText: "KNN 根据距离选择最近邻，通过多数投票分类。特征量纲差异会影响距离，因此需要理解特征标准化。",
        extractor: "configured-model-learning-path"
      }
    });
    assert(learningPathGeneration.response.status === 201, "teacher should generate a learning path with the configured model");
    const generatedLearningPath = learningPathGeneration.payload.graph;
    assert(generatedLearningPath?.nodes?.length >= 6 && generatedLearningPath.links?.length >= 5, "model output should be saved as a learning path with at least six ordered nodes");
    for (let index = 2; index <= 3; index += 1) {
      const repeatedPath = await request("/api/graphs/generate", {
        method: "POST",
        cookie,
        body: {
          userId: "20260001",
          subject: "机器学习",
          title: `模型生成学习路径 smoke ${index}`,
          sourceName: "KNN 学习资料",
          sourceText: "KNN 根据距离选择最近邻，通过多数投票分类。特征量纲差异会影响距离，因此需要理解特征标准化。",
          extractor: "configured-model-learning-path"
        }
      });
      assert(repeatedPath.response.status === 201 && repeatedPath.payload.graph?.nodes?.length >= 6, `learning path generation ${index} should succeed with more than five nodes`);
    }
    assert(generatedLearningPath.publishStatus === "draft" && generatedLearningPath.sourceMaterialId, "generated learning path should be saved as a draft with its source material");
    const learningPathModelRun = mockDify.requests.find((item) => item.method === "POST" && item.url === "/v1/chat/completions" && item.body.messages?.some((message) => String(message.content || "").includes("课程学习路径设计助手")));
    assert(learningPathModelRun?.headers.authorization === "Bearer admin-smoke-key" && learningPathModelRun.body.model === "smoke-chat-model", "learning-path generation should use the administrator-configured model");
    assert(learningPathModelRun.body.messages.some((message) => String(message.content || "").includes("KNN 根据距离")), "teacher-provided learning material should be sent to the configured model");

    const publishMultiFileGraph = await request(`/api/graphs/${multiFileGraph.id}/publish`, {
      method: "POST",
      cookie,
      body: { userId: "20260001" }
    });
    assert(publishMultiFileGraph.response.ok && publishMultiFileGraph.payload.graph?.publishStatus === "published", "teacher should publish only a graph with complete atomic-node coverage");
    const studentGraphsAfterPublish = await request("/api/learning-partner/graphs", { cookie: newStudentCookie });
    assert(studentGraphsAfterPublish.response.ok && !studentGraphsAfterPublish.payload.graphs?.some((graph) => graph.id === multiFileGraph.id), "students without a selected learning class should not see teacher class graphs");

    const graphActionChats = [
      {
        mode: "explain",
        answerDepth: "layered",
        prompt: `请基于课程资料和知识图谱，分层讲解「${knnNode.label}」。请包含定义、算法流程、关键条件、例子和常见误区。`
      },
      {
        mode: "practice",
        answerDepth: "layered",
        prompt: `请基于课程资料和当前图谱节点「${knnNode.label}」生成课堂练习题，包含答案解析。`
      },
      {
        mode: "plan",
        answerDepth: "layered",
        prompt: `请根据知识图谱前置关系，为「${knnNode.label}」生成学习路径。`
      },
      {
        mode: "explain",
        answerDepth: "full",
        prompt: `请对比「${knnNode.label}」与「逻辑回归」，说明适用场景、关键假设、参数影响和易混淆点。`
      }
    ];
    const graphWorkflowRunStart = mockDify.requests.length;
    for (const actionChat of graphActionChats) {
      const actionResult = await request("/api/ai/chat", {
        method: "POST",
        cookie,
        body: {
          userId: "20260001",
          subject: "机器学习",
          chapter: "《动手学机器学习》知识图谱",
          knowledgePoint: knnNode.label,
          graphId: mlGraph.id,
          nodeId: knnNode.id,
          ...actionChat
        }
      });
      assert(actionResult.response.ok, `graph AI action ${actionChat.mode} should succeed`);
      const assistant = actionResult.payload.messages?.find((message) => message.role === "assistant");
      assert(assistant?.content && assistant.learningPanel, "graph AI action should return assistant content and learning panel");
      assert((assistant.citations || []).length || actionResult.payload.conversation?.messages?.some((message) => message.citations?.length), "graph AI action should attach course or graph citations");
    }
    const graphModelRuns = mockDify.requests
      .slice(graphWorkflowRunStart)
      .filter((item) => item.method === "POST" && item.url === "/v1/chat/completions" && item.body.messages?.some((message) => String(message.content || "").includes("教师：")));
    assert(graphModelRuns.length >= graphActionChats.length, "teacher graph AI actions should call the administrator-configured model");
    assert(graphModelRuns.every((run) => run.headers.authorization === "Bearer admin-smoke-key" && run.body.model === "smoke-chat-model"), "teacher AI actions should share the administrator model configuration");

    const friendRequest = await request("/api/friends", {
      method: "POST",
      cookie,
      body: { userId: "20260001", target: newStudentId, message: "chat smoke test" }
    });
    assert(friendRequest.response.status === 201 && friendRequest.payload.request?.status === "pending", "friend add should create pending request");
    const newStudentPendingState = await request("/api/state", { cookie: newStudentCookie });
    assert(newStudentPendingState.payload.state.friendRequests.some((item) => item.id === friendRequest.payload.request.id && item.toUserId === newStudentId), "friend request should be visible to recipient");

    const acceptedFriend = await request(`/api/friend-requests/${friendRequest.payload.request.id}/respond`, {
      method: "POST",
      cookie: newStudentCookie,
      body: { userId: newStudentId, action: "accept" }
    });
    assert(acceptedFriend.response.ok && acceptedFriend.payload.request.status === "accepted", "recipient should accept friend request");
    const acceptedStudentState = acceptedFriend.payload.state;
    assert(acceptedStudentState.friends.some((item) => item.id === "20260001"), "accepted friend request should create friendship");
    assert(acceptedStudentState.chatThreads.some((item) => item.type === "direct" && item.memberIds.includes("20260001")), "accepted friend request should create direct chat");

    const groupCreate = await request("/api/chat/groups", {
      method: "POST",
      cookie,
      body: { ownerId: "20260001", name: "Smoke Group", memberIds: [newStudentId] }
    });
    assert(groupCreate.response.status === 201 && groupCreate.payload.thread?.id, "group creation should succeed");
    assert(groupCreate.payload.thread.memberIds.length === 1 && groupCreate.payload.thread.memberIds[0] === "20260001", "invited members should not join group before approval");
    assert(groupCreate.payload.invites.length === 1 && groupCreate.payload.invites[0].status === "pending", "group creation should create pending invite");

    const groupInviteId = groupCreate.payload.invites[0].id;
    const studentInviteState = await request("/api/state", { cookie: newStudentCookie });
    assert(studentInviteState.payload.state.chatInvites.some((item) => item.id === groupInviteId && item.toUserId === newStudentId), "group invite should be visible to recipient");

    const acceptedInvite = await request(`/api/chat/invites/${groupInviteId}/respond`, {
      method: "POST",
      cookie: newStudentCookie,
      body: { userId: newStudentId, action: "accept" }
    });
    assert(acceptedInvite.response.ok && acceptedInvite.payload.invite.status === "accepted", "recipient should accept group invite");
    assert(acceptedInvite.payload.thread.memberIds.includes(newStudentId), "accepted group invite should add member");

    const groupMessage = await request("/api/chat/messages", {
      method: "POST",
      cookie: newStudentCookie,
      body: { threadId: groupCreate.payload.thread.id, fromUserId: newStudentId, content: "hello group" }
    });
    assert(groupMessage.response.status === 201 && groupMessage.payload.message?.id, "accepted group member should send group message");

    const dissolvedGroup = await request(`/api/chat/groups/${groupCreate.payload.thread.id}`, {
      method: "DELETE",
      cookie,
      body: { userId: "20260001" }
    });
    assert(dissolvedGroup.response.ok, "group owner should dissolve group");

    const tampered = await request("/api/ai/chat", {
      method: "POST",
      cookie,
      body: { userId: "20260002", prompt: "伪造学生身份提问", mode: "qa" }
    });
    assert(tampered.response.status === 403, "tampered userId should be rejected");

    const tamperedTeacher = await request("/api/classes", {
      method: "POST",
      cookie,
      body: { teacherId: "20260000", name: "越权班级", subject: "数学" }
    });
    assert(tamperedTeacher.response.status === 403, "tampered teacherId should be rejected");

    const executableUpload = await request("/api/uploads/start", {
      method: "POST",
      cookie,
      body: { userId: "20260001", fileName: "evil.exe", fileType: "application/x-msdownload", size: 32 }
    });
    assert(executableUpload.response.status === 415, "executable upload should be rejected");

    const chat = await request("/api/ai/chat", {
      method: "POST",
      cookie,
      body: { userId: "20260001", prompt: "请解释课程资料中的核心知识点", mode: "explain", subject: "通用" }
    });
    assert(chat.response.ok && chat.payload.messages?.[1]?.learningPanel, "AI chat should return learning panel");

    const createdClass = await request("/api/classes", {
      method: "POST",
      cookie,
      body: { teacherId: "20260001", name: "烟测班级", subject: "物理" }
    });
    assert(createdClass.response.status === 201 && createdClass.payload.class?.id, "teacher should create a class before assigning homework");

    const classPrivateMaterial = await request("/api/materials", {
      method: "POST",
      cookie,
      body: {
        userId: "20260001",
        subject: "物理",
        title: "烟测班级非公开资料",
        sourceText: "这是一份只应教师可见的班级内部资料。",
        global: false,
        classId: createdClass.payload.class.id
      }
    });
    assert(classPrivateMaterial.response.status === 201 && classPrivateMaterial.payload.material?.id, "teacher should create a private class material");

    const createdHomework = await request("/api/homework", {
      method: "POST",
      cookie,
      body: {
        teacherId: "20260001",
        classId: createdClass.payload.class.id,
        title: "牛顿第二定律应用题",
        description: "请解释 F=ma 在水平面匀加速运动中的含义，并完成一道自拟例题。",
        answer: "力等于质量与加速度的乘积。解题时先受力分析，再列出 F=ma，结合运动学公式求解。"
      }
    });
    assert(createdHomework.response.status === 201 && createdHomework.payload.homework?.id, "teacher should create homework from an explicit operation");
    const homeworkId = createdHomework.payload.homework.id;

    const studentLogin = await request("/api/auth/login", {
      method: "POST",
      body: { account: "20260002", password: "123456" }
    });
    assert(studentLogin.response.ok && studentLogin.payload.ok, "student login should succeed");
    const studentCookie = String(studentLogin.response.headers.get("set-cookie") || "").split(";")[0];
    const studentOverview = await request("/api/admin/overview", { cookie: studentCookie });
    assert(studentOverview.response.status === 403, "students must not access the administrator overview");

    const classApply = await request(`/api/classes/${createdClass.payload.class.id}/apply`, {
      method: "POST",
      cookie: studentCookie,
      body: { studentId: "20260002" }
    });
    assert(classApply.response.ok && classApply.payload.application?.status === "pending", "student outside imported roster should wait for teacher approval");

    const approveClassApply = await request(`/api/classes/${createdClass.payload.class.id}/applications/${classApply.payload.application.id}`, {
      method: "POST",
      cookie,
      body: { teacherId: "20260001", action: "accept" }
    });
    assert(approveClassApply.response.ok && approveClassApply.payload.application?.status === "approved", "teacher should approve the class join request before homework submission");

    const secondClass = await request("/api/classes", {
      method: "POST",
      cookie: duplicateTeacherCookie,
      body: { teacherId: duplicateUserId, name: "烟测第二班", subject: "数学" }
    });
    assert(secondClass.response.status === 201 && secondClass.payload.class?.id, "teacher should create a second class");

    const rejectedGraphSync = await request(`/api/graphs/${multiFileGraph.id}/sync-classes`, {
      method: "POST",
      cookie,
      body: { userId: "20260001", classIds: [secondClass.payload.class.id] }
    });
    assert(rejectedGraphSync.response.status === 403, "teacher should not sync a graph to another teacher's class");

    const graphSync = await request(`/api/graphs/${multiFileGraph.id}/sync-classes`, {
      method: "POST",
      cookie,
      body: { userId: "20260001", classIds: [createdClass.payload.class.id] }
    });
    assert(graphSync.response.ok && graphSync.payload.graph?.syncedClassIds?.includes(createdClass.payload.class.id), "teacher should sync a published graph to a managed class");
    const learningPathSync = await request(`/api/graphs/${generatedLearningPath.id}/sync-classes`, {
      method: "POST",
      cookie,
      body: { userId: "20260001", classIds: [createdClass.payload.class.id] }
    });
    assert(learningPathSync.response.ok && learningPathSync.payload.graph?.publishStatus === "published" && learningPathSync.payload.graph.syncedClassIds?.includes(createdClass.payload.class.id), "teacher should publish and sync a generated learning path to a managed class");

    const secondClassApply = await request(`/api/classes/${secondClass.payload.class.inviteCode}/apply`, {
      method: "POST",
      cookie: studentCookie,
      body: { studentId: "20260002" }
    });
    assert(secondClassApply.response.ok && secondClassApply.payload.application?.status === "pending", "student should need approval when joining a second class by invite code");

    const approveSecondClassApply = await request(`/api/classes/${secondClass.payload.class.id}/applications/${secondClassApply.payload.application.id}`, {
      method: "POST",
      cookie: duplicateTeacherCookie,
      body: { teacherId: duplicateUserId, action: "accept" }
    });
    assert(approveSecondClassApply.response.ok && approveSecondClassApply.payload.application?.status === "approved", "teacher should approve the second class join request");

    const multiClassState = await request("/api/state", { cookie: studentCookie });
    const joinedClassIds = new Set((multiClassState.payload.state.classes || []).map((item) => item.id));
    assert(joinedClassIds.has(createdClass.payload.class.id) && joinedClassIds.has(secondClass.payload.class.id), "student state should include multiple joined classes");
    assert(!multiClassState.payload.state.courseMaterials.some((item) => item.id === classPrivateMaterial.payload.material.id), "joining a class should not expose private teacher class materials");

    const selectEmptyLearningClass = await request("/api/student/learning-class", {
      method: "PUT",
      cookie: studentCookie,
      body: { classId: secondClass.payload.class.id }
    });
    assert(selectEmptyLearningClass.response.ok, "student should select an enrolled class with no teacher materials");
    assert(selectEmptyLearningClass.payload.state.courseMaterials.length === 0, "a learning class without teacher materials should expose no course materials");
    assert(selectEmptyLearningClass.payload.state.knowledgeGraphs.length === 0, "a learning class without teacher materials should expose no knowledge graphs");
    assert(selectEmptyLearningClass.payload.state.homework.length === 0, "a learning class without teacher materials should expose no practice tasks");

    const leaveSecondClass = await request(`/api/classes/${secondClass.payload.class.id}/students/20260002`, {
      method: "DELETE",
      cookie: studentCookie
    });
    assert(leaveSecondClass.response.ok && leaveSecondClass.payload.removed === true, "student should leave one joined class");

    const afterLeaveSecondState = await request("/api/state", { cookie: studentCookie });
    const afterLeaveClassIds = new Set((afterLeaveSecondState.payload.state.classes || []).map((item) => item.id));
    assert(afterLeaveClassIds.has(createdClass.payload.class.id) && !afterLeaveClassIds.has(secondClass.payload.class.id), "leaving one class should keep other class memberships");

    const selectLearningClass = await request("/api/student/learning-class", {
      method: "PUT",
      cookie: studentCookie,
      body: { classId: createdClass.payload.class.id }
    });
    assert(selectLearningClass.response.ok && selectLearningClass.payload.user?.learningClassId === createdClass.payload.class.id, "student should select a joined class before learning");
    const refreshedLearningClass = await request("/api/state", { cookie: studentCookie });
    assert(refreshedLearningClass.payload.state?.user?.learningClassId === createdClass.payload.class.id, "refreshing state must preserve the student-selected learning class");
    assert(selectLearningClass.payload.state.courseMaterials.some((item) => item.id === classPrivateMaterial.payload.material.id), "selected learning class should expose its class materials");
    assert(selectLearningClass.payload.state.homework.some((item) => item.id === homeworkId), "selected learning class should expose its homework");
    assert(selectLearningClass.payload.state.knowledgeGraphs.some((item) => item.id === multiFileGraph.id), "selected learning class should expose its synced graph");
    assert(selectLearningClass.payload.state.knowledgeGraphs.some((item) => item.id === generatedLearningPath.id), "students learning in the selected class should see the teacher-generated learning path");
    const classPartnerPaths = await request("/api/learning-partner/graphs", { cookie: studentCookie });
    assert(classPartnerPaths.response.ok && classPartnerPaths.payload.graphs?.some((path) => path.id === generatedLearningPath.id), "learning partner should list only the selected class's published learning paths");
    assert(!classPartnerPaths.payload.graphs?.some((path) => path.id === multiFileGraph.id), "learning partner should not treat a knowledge graph as a learning path");
    const classPartnerSnapshot = await request(`/api/learning-partner/graphs/${generatedLearningPath.id}`, { cookie: studentCookie });
    assert(classPartnerSnapshot.response.ok, "learning partner should load a selected class learning path");
    assert(classPartnerSnapshot.payload.nodes.find((node) => node.id === "smoke_path_knn")?.status === "available", "the first learning-path node should be available");
    assert(classPartnerSnapshot.payload.nodes.find((node) => node.id === "smoke_path_scaling")?.status === "locked", "a dependent learning-path node should remain locked");
    const partnerStart = await request(`/api/learning-partner/graphs/${generatedLearningPath.id}/nodes/smoke_path_knn/start`, {
      method: "POST",
      cookie: studentCookie
    });
    assert(partnerStart.response.ok && partnerStart.payload.nodes.find((node) => node.id === "smoke_path_knn")?.status === "learning", "starting a class learning-path node should persist its progress");
    const partnerQuiz = await request(`/api/learning-partner/graphs/${generatedLearningPath.id}/nodes/smoke_path_knn/quiz`, {
      method: "POST",
      cookie: studentCookie
    });
    assert(partnerQuiz.response.ok && partnerQuiz.payload.quiz?.questions?.length === 3, "a learning-path node should generate three assessment questions");
    const partnerSubmit = await request(`/api/learning-partner/graphs/${generatedLearningPath.id}/nodes/smoke_path_knn/submit`, {
      method: "POST",
      cookie: studentCookie,
      body: {
        quizId: partnerQuiz.payload.quiz.id,
        answers: partnerQuiz.payload.quiz.questions.map((question) => ({ questionId: question.id, answer: "KNN 按距离选择最近的 K 个邻居，通过多数投票完成分类。" }))
      }
    });
    assert(partnerSubmit.response.ok && Number.isFinite(Number(partnerSubmit.payload.result?.score)), "learning partner assessment should accept answers and return a score");

    const submitted = await request(`/api/homework/${homeworkId}/submit`, {
      method: "POST",
      cookie: studentCookie,
      body: {
        studentId: "20260002",
        answerText: "F=ma 表示合外力等于质量乘加速度。解题时要先受力分析，再建立坐标轴列牛顿第二定律，并结合运动学公式求解。"
      }
    });
    assert(submitted.response.ok && submitted.payload.submission?.id, "student homework submission should succeed");
    const submissionId = submitted.payload.submission.id;

    const aiGrade = await request(`/api/submissions/${submissionId}/ai-grade`, {
      method: "POST",
      cookie,
      body: { teacherId: "20260001" }
    });
    assert(aiGrade.response.ok, "AI grade suggestion should succeed");
    assert(aiGrade.payload.submission.status === "review_pending", "AI grading should require teacher confirmation");
    assert(Number.isFinite(Number(aiGrade.payload.submission.aiSuggestedScore)), "AI grading should return suggested score");
    assert(Array.isArray(aiGrade.payload.submission.feedback?.rubricResults), "AI grading should return rubric results");

    const confirmed = await request(`/api/submissions/${submissionId}/manual-grade`, {
      method: "POST",
      cookie,
      body: { teacherId: "20260001", score: aiGrade.payload.submission.aiSuggestedScore, comment: "确认 AI 建议，答案覆盖主要步骤。" }
    });
    assert(confirmed.response.ok, "teacher confirmation should succeed");
    assert(confirmed.payload.submission.status === "graded", "confirmed grade should become official");
    assert(confirmed.payload.submission.confirmedBy === "20260001", "confirmed grade should record teacher");

    const intervention = await request(`/api/classes/${createdClass.payload.class.id}/interventions`, {
      method: "POST",
      cookie,
      body: {
        teacherId: "20260001",
        topic: "牛顿第二定律受力分析",
        errorTag: "受力分析遗漏",
        description: "完成受力图、列式过程和反思。",
        resources: ["受力分析例题", "变式复测题"],
        groups: [{ tier: "补基础", studentIds: ["20260002"] }, { tier: "巩固", studentIds: [] }, { tier: "进阶", studentIds: [] }]
      }
    });
    assert(intervention.response.status === 201 && intervention.payload.plan?.id, "teacher should confirm and publish a tiered intervention");
    assert(intervention.payload.homework.length === 1 && intervention.payload.homework[0].targetStudentIds.includes("20260002"), "tiered intervention should create a targeted task");
    const interventionHomeworkId = intervention.payload.homework[0].id;

    const targetedSubmission = await request(`/api/homework/${interventionHomeworkId}/submit`, {
      method: "POST",
      cookie: studentCookie,
      body: { studentId: "20260002", answerText: "我先画出物体受力图，再选定方向列出合外力等于质量乘加速度，并检查每个力是否遗漏。" }
    });
    assert(targetedSubmission.response.status === 201, "assigned student should submit their tiered intervention task");
    const targetedConfirmed = await request(`/api/submissions/${targetedSubmission.payload.submission.id}/manual-grade`, {
      method: "POST",
      cookie,
      body: { teacherId: "20260001", score: 95, comment: "受力分析完整，作为复测成绩确认。" }
    });
    assert(targetedConfirmed.response.ok && targetedConfirmed.payload.submission.status === "graded", "teacher should confirm the intervention retest");
    const interventionState = await request("/api/state", { cookie });
    const savedPlan = interventionState.payload.state.interventionPlans.find((item) => item.id === intervention.payload.plan.id);
    assert(savedPlan?.metrics?.retestedCount === 1, "confirmed intervention grade should record a retest");
    assert(savedPlan?.metrics?.improvedCount === 1, "retest score should be compared with the intervention baseline");

    const classLearningAnalytics = await request(`/api/classes/${createdClass.payload.class.id}/learning-analytics`, { cookie });
    assert(classLearningAnalytics.response.ok, "teacher should load class learning analytics");
    assert(classLearningAnalytics.payload.analytics?.students?.some((student) => student.id === "20260002"), "class learning analytics should include enrolled students");
    const classStudentProfile = await request(`/api/classes/${createdClass.payload.class.id}/students/20260002/learning-profile`, { cookie });
    assert(classStudentProfile.response.ok && classStudentProfile.payload.student?.id === "20260002", "teacher should drill into an enrolled student's learning profile");

    const removeClassStudent = await request(`/api/classes/${createdClass.payload.class.id}/students/20260002`, {
      method: "DELETE",
      cookie
    });
    assert(removeClassStudent.response.ok && removeClassStudent.payload.removed === true, "teacher should remove a student from their class");

    const afterRemovalTeacherState = await request("/api/state", { cookie });
    const afterRemovalClass = afterRemovalTeacherState.payload.state.classes.find((item) => item.id === createdClass.payload.class.id);
    assert(afterRemovalClass && !afterRemovalClass.studentIds.includes("20260002"), "removed student should disappear from teacher class roster");

    const afterRemovalStudentState = await request("/api/state", { cookie: studentCookie });
    assert(!afterRemovalStudentState.payload.state.classes.some((item) => item.id === createdClass.payload.class.id), "removed student should no longer see the class");
    assert(!afterRemovalStudentState.payload.state.homework.some((item) => item.id === homeworkId), "removed student should no longer see class homework");

    const persistenceConversation = await request("/api/conversations", {
      method: "POST",
      cookie: studentCookie,
      body: { userId: "20260002", mode: "qa", title: "重启持久化验收" }
    });
    assert(persistenceConversation.response.ok && persistenceConversation.payload.conversation?.id, "conversation should be saved before restart");
    const beforeRestartStudentState = await request("/api/state", { cookie: studentCookie });
    assert(beforeRestartStudentState.payload.state.conversations.some((item) => item.id === persistenceConversation.payload.conversation.id), "new conversation should be persisted before restart");
    child.kill();
    await new Promise((resolve) => child.once("exit", resolve));
    child = spawn(process.execPath, ["server.js"], { cwd: process.cwd(), env: serverEnv, stdio: ["ignore", "pipe", "pipe"] });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    await waitForReady();
    const persistedStudentState = await request("/api/state", { cookie: studentCookie });
    assert(persistedStudentState.response.ok && persistedStudentState.payload.state.conversations.some((item) => item.id === persistenceConversation.payload.conversation.id), "conversation data should survive a complete service restart");
    const persistedTeacherState = await request("/api/state", { cookie });
    assert(persistedTeacherState.response.ok && persistedTeacherState.payload.state.classes.some((item) => item.id === createdClass.payload.class.id), "class data should survive a complete service restart");
    assert(persistedTeacherState.payload.state.knowledgeGraphs.some((item) => item.id === generatedLearningPath.id), "learning path data should survive a complete service restart");

    const logout = await request("/api/auth/logout", { method: "POST", cookie, body: {} });
    assert(logout.response.ok && logout.payload.ok, "logout should succeed");

    console.log("release smoke test passed");
  } finally {
    child.kill();
    mockDify.server.close();
    await sleep(300);
    fs.rmSync(tempRoot, { recursive: true, force: true });
    if (stderr.trim()) console.error(stderr.trim());
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
