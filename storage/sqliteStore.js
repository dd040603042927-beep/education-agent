const fs = require("fs");
const path = require("path");

function resolveSqlitePath(value, fallbackPath) {
  const raw = String(value || "").trim();
  if (!raw) return fallbackPath;
  if (raw.startsWith("file:")) return path.resolve(raw.slice("file:".length));
  return path.resolve(raw);
}

function jsonText(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function toScore(value) {
  if (value === null || value === undefined || value === "") return null;
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  if (score > 1 && score <= 100) return Number((score / 100).toFixed(4));
  return Math.max(0, Math.min(1, Number(score.toFixed(4))));
}

function createSqliteStore(options) {
  const {
    sqlitePath,
    schemaPath,
    ensureDataDir,
    initialData,
    normalizeData
  } = options;

  let DatabaseSync;
  try {
    ({ DatabaseSync } = require("node:sqlite"));
  } catch (error) {
    throw new Error("SQLite storage requires Node.js with node:sqlite support. Use STORAGE_DRIVER=json or run the migration with a newer Node.js runtime.");
  }

  const dbPath = resolveSqlitePath(sqlitePath, path.join(process.cwd(), "data", "education.db"));
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (typeof ensureDataDir === "function") ensureDataDir();

  const sqlite = new DatabaseSync(dbPath);
  sqlite.exec("PRAGMA journal_mode = WAL;");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  sqlite.exec(schemaSql);

  const readState = sqlite.prepare("SELECT value_json FROM app_state WHERE key = ?");
  const writeState = sqlite.prepare(`
    INSERT INTO app_state (key, value_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
  `);

  function syncLearningTables(db) {
    sqlite.exec("DELETE FROM diagnosis_results;");
    sqlite.exec("DELETE FROM student_mastery;");
    sqlite.exec("DELETE FROM learning_events;");

    const insertEvent = sqlite.prepare(`
      INSERT OR IGNORE INTO learning_events (
        id, student_id, class_id, teacher_id, subject, event_type, source,
        knowledge_point, graph_id, node_id, homework_id, submission_id,
        score, duration_seconds, payload_json, idempotency_key, occurred_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertDiagnosis = sqlite.prepare(`
      INSERT OR REPLACE INTO diagnosis_results (
        id, student_id, event_id, topic, mastery_score, mastery_level,
        error_tags_json, missing_points_json, evidence_json, final_answer,
        model_or_workflow, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMastery = sqlite.prepare(`
      INSERT INTO student_mastery (
        student_id, subject, knowledge_point, graph_id, node_id, score,
        status, evidence_count, last_event_id, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(student_id, subject, knowledge_point) DO UPDATE SET
        graph_id = excluded.graph_id,
        node_id = excluded.node_id,
        score = excluded.score,
        status = excluded.status,
        evidence_count = excluded.evidence_count,
        last_event_id = excluded.last_event_id,
        updated_at = excluded.updated_at
    `);

    (db.learningEvents || []).forEach((item) => {
      insertEvent.run(
        item.id,
        item.studentId || item.student_id || "",
        item.classId || item.class_id || "",
        item.teacherId || item.teacher_id || "",
        item.subject || "",
        item.eventType || item.event_type || "unknown",
        item.source || "",
        item.knowledgePoint || item.knowledge_point || "",
        item.graphId || item.graph_id || "",
        item.nodeId || item.node_id || "",
        item.homeworkId || item.homework_id || "",
        item.submissionId || item.submission_id || "",
        toScore(item.score),
        Number.isFinite(Number(item.durationSeconds || item.duration_seconds)) ? Number(item.durationSeconds || item.duration_seconds) : null,
        jsonText(item.payload || {}),
        item.idempotencyKey || item.idempotency_key || "",
        item.occurredAt || item.occurred_at || item.createdAt || "",
        item.createdAt || item.created_at || ""
      );
    });

    const eventIds = new Set((db.learningEvents || []).map((item) => item.id).filter(Boolean));
    (db.diagnosisResults || []).forEach((item) => {
      const eventId = item.eventId || item.event_id || "";
      insertDiagnosis.run(
        item.id,
        item.studentId || item.student_id || "",
        eventIds.has(eventId) ? eventId : null,
        item.topic || "",
        toScore(item.masteryScore ?? item.mastery_score),
        item.masteryLevel || item.mastery_level || "",
        jsonText(item.errorTags || item.error_tags || []),
        jsonText(item.missingPoints || item.missing_points || []),
        jsonText(item.evidence || []),
        item.finalAnswer || item.final_answer || "",
        item.modelOrWorkflow || item.model_or_workflow || "",
        item.createdAt || item.created_at || ""
      );
    });

    (db.studentMastery || []).forEach((item) => {
      insertMastery.run(
        item.studentId || item.student_id || "",
        item.subject || "",
        item.knowledgePoint || item.knowledge_point || "",
        item.graphId || item.graph_id || "",
        item.nodeId || item.node_id || "",
        toScore(item.score),
        item.status || "",
        Number(item.evidenceCount || item.evidence_count || 0),
        item.lastEventId || item.last_event_id || "",
        item.updatedAt || item.updated_at || ""
      );
    });
  }

  function read() {
    const row = readState.get("db");
    if (!row) {
      const seeded = initialData();
      write(seeded);
      return seeded;
    }
    const db = JSON.parse(row.value_json);
    if (typeof normalizeData === "function" && normalizeData(db)) write(db);
    return db;
  }

  function write(db) {
    const updatedAt = new Date().toISOString();
    sqlite.exec("BEGIN IMMEDIATE;");
    try {
      writeState.run("db", JSON.stringify(db, null, 2), updatedAt);
      syncLearningTables(db);
      sqlite.exec("COMMIT;");
    } catch (error) {
      sqlite.exec("ROLLBACK;");
      throw error;
    }
  }

  function metadata() {
    return {
      driver: "sqlite",
      label: "sqlite-app-state+learning-tables",
      path: dbPath
    };
  }

  return { read, write, metadata };
}

module.exports = { createSqliteStore, resolveSqlitePath };
