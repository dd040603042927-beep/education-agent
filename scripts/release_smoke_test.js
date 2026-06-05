const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const PORT = Number(process.env.TEST_PORT || 5199);
const BASE_URL = `http://127.0.0.1:${PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      "content-type": "application/json",
      ...(options.cookie ? { cookie: options.cookie } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
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

async function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "education-agent-smoke-"));
  const child = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(PORT),
      HOST: "127.0.0.1",
      DATA_DIR: path.join(tempRoot, "data"),
      LOG_DIR: path.join(tempRoot, "logs"),
      SESSION_SECRET: "release-smoke-test-secret",
      COOKIE_SECURE: "false"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  try {
    await waitForReady();

    const homepage = await requestText("/");
    assert(homepage.response.ok, "homepage should load");
    assert(homepage.response.headers.get("cache-control")?.includes("no-store"), "homepage should disable stale static cache");
    assert(homepage.text.includes("/app.js?v=chat-standard-20260605"), "homepage should reference the standard chat app bundle");
    assert(homepage.text.includes("/styles.css?v=chat-standard-20260605"), "homepage should reference the standard chat styles");
    const appBundle = await requestText("/app.js?v=chat-standard-20260605");
    assert(appBundle.response.ok, "app bundle should load with version query");
    assert(appBundle.response.headers.get("cache-control")?.includes("no-store"), "app bundle should disable stale static cache");
    assert(appBundle.text.includes("renderChatActionCards"), "app bundle should contain the unified chat action cards");
    assert(appBundle.text.includes("创建并发送邀请"), "app bundle should contain approval-based group creation UI");
    assert(!appBundle.text.includes("chat-action-head"), "app bundle should not contain the old chat action header");

    const anonymousState = await request("/api/state");
    assert(anonymousState.response.status === 401, "anonymous /api/state should be rejected");

    const weakRegister = await request("/api/auth/register", {
      method: "POST",
      body: { name: "密码测试", password: "123", role: "teacher", subject: "数学" }
    });
    assert(weakRegister.response.status === 400, "weak registration password should be rejected");

    const duplicateRegister = await request("/api/auth/register", {
      method: "POST",
      body: { name: "黄豆", password: "123456", role: "teacher", subject: "机器学习" }
    });
    assert(duplicateRegister.response.status === 201 && duplicateRegister.payload.user?.id, "duplicate display name registration should succeed");
    const duplicateUserId = duplicateRegister.payload.user.id;
    const registerSetCookie = String(duplicateRegister.response.headers.get("set-cookie") || "");
    assert(registerSetCookie.includes("edu_session=") && registerSetCookie.includes("Max-Age=172800"), "registration should auto-login with 2-day session cookie");
    assert(duplicateRegister.payload.state?.user?.id === duplicateUserId, "registration should return the new user's initial state");
    assert(duplicateRegister.payload.state.knowledgeGraphs.length === 0, "registered teacher initial state should not inherit graphs");
    assert(duplicateRegister.payload.state.courseMaterials.length === 0, "registered teacher initial state should not inherit materials");

    const duplicateNameLogin = await request("/api/auth/login", {
      method: "POST",
      body: { account: "黄豆", password: "123456" }
    });
    assert(duplicateNameLogin.response.status === 409, "duplicate display name login should require unique ID");

    const idNameLogin = await request("/api/auth/login", {
      method: "POST",
      body: { account: `${duplicateUserId}-黄豆`, password: "123456" }
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
    assert(newTeacherState.models.length === 0, "new registered teacher should start without saved models");
    assert(newTeacherState.friends.length === 0 && newTeacherState.chatThreads.length === 0, "new registered teacher should start without friends or chats");

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
    assert(newStudentState.knowledgeGraphs.length === 0, "new registered student should not inherit global graphs");
    assert(newStudentState.courseMaterials.length === 0, "new registered student should not inherit global course materials");
    assert(newStudentState.classes.length === 0, "new registered student should start without classes");
    assert(newStudentState.homework.length === 0, "new registered student should start without homework");
    assert(newStudentState.friends.length === 0 && newStudentState.chatThreads.length === 0, "new registered student should start without friends or chats");

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

    const homeworkId = state.payload.state.homework?.[0]?.id;
    assert(homeworkId, "seed homework should exist");

    const studentLogin = await request("/api/auth/login", {
      method: "POST",
      body: { account: "20260002", password: "123456" }
    });
    assert(studentLogin.response.ok && studentLogin.payload.ok, "student login should succeed");
    const studentCookie = String(studentLogin.response.headers.get("set-cookie") || "").split(";")[0];

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

    const logout = await request("/api/auth/logout", { method: "POST", cookie, body: {} });
    assert(logout.response.ok && logout.payload.ok, "logout should succeed");

    console.log("release smoke test passed");
  } finally {
    child.kill();
    await sleep(300);
    fs.rmSync(tempRoot, { recursive: true, force: true });
    if (stderr.trim()) console.error(stderr.trim());
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
