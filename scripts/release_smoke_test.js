const { spawn } = require("child_process");

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
  const child = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(PORT),
      HOST: "127.0.0.1",
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

    const anonymousState = await request("/api/state");
    assert(anonymousState.response.status === 401, "anonymous /api/state should be rejected");

    const login = await request("/api/auth/login", {
      method: "POST",
      body: { account: "20260001", password: "123456" }
    });
    assert(login.response.ok && login.payload.ok, "teacher login should succeed");
    const cookie = String(login.response.headers.get("set-cookie") || "").split(";")[0];
    assert(cookie.includes("edu_session="), "login should set session cookie");

    const state = await request("/api/state", { cookie });
    assert(state.response.ok && state.payload.state?.user?.id === "20260001", "session state should resolve current user");

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

    const logout = await request("/api/auth/logout", { method: "POST", cookie, body: {} });
    assert(logout.response.ok && logout.payload.ok, "logout should succeed");

    console.log("release smoke test passed");
  } finally {
    child.kill();
    if (stderr.trim()) console.error(stderr.trim());
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
