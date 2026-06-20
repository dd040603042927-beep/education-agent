const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

let DatabaseSync;
try {
  ({ DatabaseSync } = require("node:sqlite"));
} catch (error) {
  console.error("SQLite migration requires Node.js with node:sqlite support.");
  console.error("Current runtime does not expose node:sqlite. Use a newer Node.js runtime or keep STORAGE_DRIVER=json.");
  process.exit(1);
}

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, "data"));
const JSON_DB_PATH = path.resolve(process.env.JSON_DB_PATH || path.join(DATA_DIR, "db.json"));
const SCHEMA_PATH = path.join(ROOT, "storage", "schema.sql");
const REPORT_PATH = path.join(DATA_DIR, "migration-report.json");

function resolveDatabaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return path.join(DATA_DIR, "education.db");
  if (raw.startsWith("file:")) return path.resolve(raw.slice("file:".length));
  return path.resolve(raw);
}

const SQLITE_PATH = resolveDatabaseUrl(process.env.DATABASE_URL || process.env.SQLITE_PATH);

function stamp() {
  return new Date().toISOString();
}

function stableId(prefix, value) {
  const hash = crypto.createHash("sha1").update(String(value || "")).digest("hex").slice(0, 18);
  return `${prefix}_${hash}`;
}

function ensureArray(db, key) {
  if (!Array.isArray(db[key])) db[key] = [];
  return db[key];
}

function normalizeScore(value) {
  if (value === null || value === undefined || value === "") return null;
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  if (score > 1 && score <= 100) return Number((score / 100).toFixed(4));
  return Math.max(0, Math.min(1, Number(score.toFixed(4))));
}

function jsonText(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function userById(db, userId) {
  return (db.users || []).find((user) => user.id === userId) || null;
}

function existingIdSet(items) {
  return new Set(items.map((item) => item.id).filter(Boolean));
}

function deriveLegacyLearningEvents(db) {
  const events = ensureArray(db, "learningEvents").slice();
  const ids = existingIdSet(events);

  (db.learningProfiles || []).forEach((profile) => {
    const user = userById(db, profile.userId);
    Object.entries(profile.mastery || {}).forEach(([topic, mastery]) => {
      const evidenceItems = Array.isArray(mastery?.evidence) && mastery.evidence.length
        ? mastery.evidence
        : [{ text: "legacy mastery snapshot", at: mastery?.updatedAt || profile.updatedAt || stamp() }];
      evidenceItems.forEach((evidence, index) => {
        const id = stableId("legacy_evt", `${profile.userId}:${topic}:${evidence.at || index}:${evidence.text || ""}`);
        if (ids.has(id)) return;
        ids.add(id);
        events.push({
          id,
          studentId: profile.userId,
          classId: "",
          teacherId: "",
          subject: user?.subject || "",
          eventType: "legacy_mastery_evidence",
          source: "legacy_json_migration",
          knowledgePoint: topic,
          graphId: "",
          nodeId: "",
          homeworkId: "",
          submissionId: "",
          score: normalizeScore(mastery?.score),
          durationSeconds: null,
          payload: {
            status: mastery?.status || "",
            evidence: evidence || {}
          },
          idempotencyKey: id,
          occurredAt: evidence?.at || mastery?.updatedAt || profile.updatedAt || stamp(),
          createdAt: stamp()
        });
      });
    });
  });

  (db.wrongNotes || []).forEach((note) => {
    const id = stableId("legacy_evt", `wrong:${note.id || ""}:${note.userId || ""}:${note.createdAt || ""}`);
    if (ids.has(id)) return;
    ids.add(id);
    events.push({
      id,
      studentId: note.userId || "",
      classId: "",
      teacherId: "",
      subject: "",
      eventType: "wrong_note",
      source: note.source || "legacy_json_migration",
      knowledgePoint: note.topic || "",
      graphId: "",
      nodeId: "",
      homeworkId: "",
      submissionId: "",
      score: null,
      durationSeconds: null,
      payload: {
        wrongNoteId: note.id || "",
        question: note.question || "",
        analysis: note.analysis || "",
        recommendation: note.recommendation || ""
      },
      idempotencyKey: id,
      occurredAt: note.createdAt || stamp(),
      createdAt: stamp()
    });
  });

  (db.submissions || []).forEach((submission) => {
    if (submission.status !== "graded" || submission.score === undefined) return;
    const homework = (db.homework || []).find((item) => item.id === submission.homeworkId) || {};
    const id = stableId("legacy_evt", `grade:${submission.id}:${submission.confirmedAt || submission.gradedAt || ""}`);
    if (ids.has(id)) return;
    ids.add(id);
    events.push({
      id,
      studentId: submission.studentId || "",
      classId: homework.classId || "",
      teacherId: homework.teacherId || submission.confirmedBy || "",
      subject: homework.subject || "",
      eventType: "homework_grade",
      source: "legacy_json_migration",
      knowledgePoint: "",
      graphId: "",
      nodeId: "",
      homeworkId: submission.homeworkId || "",
      submissionId: submission.id || "",
      score: normalizeScore(submission.score),
      durationSeconds: null,
      payload: {
        homeworkTitle: homework.title || "",
        comment: submission.comment || "",
        feedback: submission.feedback || null
      },
      idempotencyKey: id,
      occurredAt: submission.confirmedAt || submission.gradedAt || submission.updatedAt || stamp(),
      createdAt: stamp()
    });
  });

  return events;
}

function deriveDiagnosisResults(db) {
  const results = ensureArray(db, "diagnosisResults").slice();
  const ids = existingIdSet(results);

  (db.agentRuns || []).forEach((run) => {
    const workflow = run.workflowResult || {};
    const topic = workflow.topic_label || workflow.topic || (Array.isArray(run.knowledgePoints) ? run.knowledgePoints[0] : "");
    if (!topic) return;
    const rawScore = workflow.mastery_score ?? workflow.masteryScore;
    if (rawScore === undefined && !workflow.mastery_level && !workflow.error_tags && !workflow.missing_points) return;
    const id = stableId("diag", `${run.id || ""}:${run.userId || ""}:${topic}`);
    if (ids.has(id)) return;
    ids.add(id);
    results.push({
      id,
      studentId: run.userId || "",
      eventId: "",
      topic,
      masteryScore: normalizeScore(rawScore),
      masteryLevel: workflow.mastery_level || workflow.masteryLevel || "",
      errorTags: Array.isArray(workflow.error_tags) ? workflow.error_tags : [],
      missingPoints: Array.isArray(workflow.missing_points) ? workflow.missing_points : [],
      evidence: Array.isArray(workflow.rag_evidence) ? workflow.rag_evidence : [],
      finalAnswer: workflow.final_answer || "",
      modelOrWorkflow: run.workflow?.name || workflow.source || run.confidence || "",
      createdAt: run.createdAt || stamp()
    });
  });

  return results;
}

function deriveStudentMastery(db, events) {
  const mastery = ensureArray(db, "studentMastery").slice();
  const byKey = new Map(mastery.map((item) => [`${item.studentId || ""}\u0000${item.subject || ""}\u0000${item.knowledgePoint || ""}`, item]));

  (db.learningProfiles || []).forEach((profile) => {
    const user = userById(db, profile.userId);
    Object.entries(profile.mastery || {}).forEach(([topic, item]) => {
      const subject = user?.subject || "";
      const key = `${profile.userId}\u0000${subject}\u0000${topic}`;
      if (byKey.has(key)) return;
      const related = events
        .filter((event) => event.studentId === profile.userId && event.knowledgePoint === topic)
        .sort((a, b) => String(b.occurredAt || "").localeCompare(String(a.occurredAt || "")));
      byKey.set(key, {
        studentId: profile.userId,
        subject,
        knowledgePoint: topic,
        graphId: "",
        nodeId: "",
        score: normalizeScore(item?.score),
        status: item?.status || "",
        evidenceCount: Array.isArray(item?.evidence) ? item.evidence.length : 0,
        lastEventId: related[0]?.id || "",
        updatedAt: item?.updatedAt || profile.updatedAt || stamp()
      });
    });
  });

  return Array.from(byKey.values());
}

function readJsonDb() {
  if (!fs.existsSync(JSON_DB_PATH)) {
    throw new Error(`JSON database not found: ${JSON_DB_PATH}`);
  }
  const db = JSON.parse(fs.readFileSync(JSON_DB_PATH, "utf8"));
  [
    "users",
    "classes",
    "homework",
    "submissions",
    "learningProfiles",
    "wrongNotes",
    "agentRuns",
    "learningEvents",
    "diagnosisResults",
    "studentMastery"
  ].forEach((key) => ensureArray(db, key));
  return db;
}

function writeSqlite(db, learningEvents, diagnosisResults, studentMastery) {
  fs.mkdirSync(path.dirname(SQLITE_PATH), { recursive: true });
  const sqlite = new DatabaseSync(SQLITE_PATH);
  sqlite.exec("PRAGMA journal_mode = WAL;");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  sqlite.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));

  const writeState = sqlite.prepare(`
    INSERT INTO app_state (key, value_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
  `);
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

  sqlite.exec("BEGIN IMMEDIATE;");
  try {
    sqlite.exec("DELETE FROM diagnosis_results;");
    sqlite.exec("DELETE FROM student_mastery;");
    sqlite.exec("DELETE FROM learning_events;");
    writeState.run("db", JSON.stringify({ ...db, learningEvents, diagnosisResults, studentMastery }, null, 2), stamp());

    learningEvents.forEach((item) => {
      insertEvent.run(
        item.id,
        item.studentId || "",
        item.classId || "",
        item.teacherId || "",
        item.subject || "",
        item.eventType || "unknown",
        item.source || "",
        item.knowledgePoint || "",
        item.graphId || "",
        item.nodeId || "",
        item.homeworkId || "",
        item.submissionId || "",
        normalizeScore(item.score),
        Number.isFinite(Number(item.durationSeconds)) ? Number(item.durationSeconds) : null,
        jsonText(item.payload || {}),
        item.idempotencyKey || "",
        item.occurredAt || item.createdAt || stamp(),
        item.createdAt || stamp()
      );
    });

    const eventIds = new Set(learningEvents.map((item) => item.id).filter(Boolean));
    diagnosisResults.forEach((item) => {
      insertDiagnosis.run(
        item.id,
        item.studentId || "",
        eventIds.has(item.eventId) ? item.eventId : null,
        item.topic || "",
        normalizeScore(item.masteryScore),
        item.masteryLevel || "",
        jsonText(item.errorTags || []),
        jsonText(item.missingPoints || []),
        jsonText(item.evidence || []),
        item.finalAnswer || "",
        item.modelOrWorkflow || "",
        item.createdAt || stamp()
      );
    });

    studentMastery.forEach((item) => {
      insertMastery.run(
        item.studentId || "",
        item.subject || "",
        item.knowledgePoint || "",
        item.graphId || "",
        item.nodeId || "",
        normalizeScore(item.score),
        item.status || "",
        Number(item.evidenceCount || 0),
        item.lastEventId || "",
        item.updatedAt || stamp()
      );
    });

    sqlite.exec("COMMIT;");
  } catch (error) {
    sqlite.exec("ROLLBACK;");
    throw error;
  } finally {
    sqlite.close();
  }
}

function main() {
  const db = readJsonDb();
  const learningEvents = deriveLegacyLearningEvents(db);
  const diagnosisResults = deriveDiagnosisResults(db);
  const studentMastery = deriveStudentMastery(db, learningEvents);
  writeSqlite(db, learningEvents, diagnosisResults, studentMastery);

  const report = {
    createdAt: stamp(),
    sourceJson: JSON_DB_PATH,
    sqlitePath: SQLITE_PATH,
    counts: {
      users: (db.users || []).length,
      classes: (db.classes || []).length,
      homework: (db.homework || []).length,
      submissions: (db.submissions || []).length,
      learningProfiles: (db.learningProfiles || []).length,
      wrongNotes: (db.wrongNotes || []).length,
      agentRuns: (db.agentRuns || []).length,
      learningEvents: learningEvents.length,
      diagnosisResults: diagnosisResults.length,
      studentMastery: studentMastery.length
    }
  };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.log(`migrated ${JSON_DB_PATH}`);
  console.log(`sqlite: ${SQLITE_PATH}`);
  console.log(`report: ${REPORT_PATH}`);
  console.log(JSON.stringify(report.counts, null, 2));
}

main();
