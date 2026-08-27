const fs = require("fs");

function createJsonStore(options) {
  const {
    dbPath,
    ensureDataDir,
    initialData,
    normalizeData,
    writeJson
  } = options;

  if (!dbPath) throw new Error("json storage requires dbPath");
  if (typeof ensureDataDir !== "function") throw new Error("json storage requires ensureDataDir");
  if (typeof initialData !== "function") throw new Error("json storage requires initialData");
  if (typeof writeJson !== "function") throw new Error("json storage requires writeJson");

  function read() {
    ensureDataDir();
    if (!fs.existsSync(dbPath)) {
      writeJson(dbPath, initialData());
    }
    const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    if (typeof normalizeData === "function" && normalizeData(db)) {
      write(db);
    }
    return db;
  }

  function write(db) {
    writeJson(dbPath, db);
  }

  function metadata() {
    return {
      driver: "json",
      label: "json-atomic",
      path: dbPath
    };
  }

  return { read, write, metadata };
}

module.exports = { createJsonStore };
