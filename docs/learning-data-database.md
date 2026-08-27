# Learning Data Database Integration

This branch introduces the database landing structure for real learning data while keeping the existing API response shape stable.

## Landing Order

1. Add `learning_events`, `diagnosis_results`, and `student_mastery` schema.
2. Add a storage adapter and keep JSON behavior as the default.
3. Add `scripts/migrate_json_to_sqlite.js` to migrate `data/db.json`.
4. Record the first real learning entry points: Dify callbacks, knowledge tests, teacher-confirmed grading, and wrong notes.
5. Keep `/api/state` returning the current frontend structure.
6. Add admin import jobs later for CSV rosters, exam scores, and classroom interaction logs.
7. Aggregate `learning_events` into `student_mastery`.
8. Revisit PostgreSQL, queues, vector search, and multi-tenant school models after SQLite is proven.

## Storage Modes

The default remains:

```env
STORAGE_DRIVER=json
DATA_DIR=./data
```

SQLite can be enabled after migration:

```env
STORAGE_DRIVER=sqlite
DATABASE_URL=file:./data/education.db
```

The SQLite adapter stores the current app state in `app_state` so existing routes keep working, and it mirrors learning-data arrays into normalized learning tables. This is an incremental bridge, not the final fully relational rewrite.

## Core Tables

`learning_events` is the source of truth for what actually happened. It records AI questions, Dify diagnoses, knowledge-test answers, confirmed homework grades, wrong-note creation, imports, and future classroom/LMS events.

`diagnosis_results` stores structured AI or teacher-assessment outputs tied to a learning event.

`student_mastery` is the current query-friendly mastery snapshot per student, subject, and knowledge point. It should be treated as derived state from `learning_events` and `diagnosis_results`.

## Migration

Run:

```powershell
npm run migrate:sqlite
```

Optional:

```powershell
$env:DATABASE_URL="file:./data/education.db"
npm run migrate:sqlite
```

The migration writes:

- `app_state`: a full copy of the current JSON database.
- `learning_events`: existing events plus legacy events derived from profiles, wrong notes, and graded submissions.
- `diagnosis_results`: existing results plus Dify/agent run structured outputs when available.
- `student_mastery`: existing snapshots plus legacy snapshots derived from `learningProfiles.mastery`.
- `data/migration-report.json`: counts and output path.

## Data Contract

Scores in learning tables are normalized to `0..1`. Display code may still render percentages by multiplying by 100.

Every external import should set an `idempotency_key` or use `external_id_mappings` to avoid duplicate writes.

The frontend should continue to read `/api/state`; backend storage changes should not force immediate SPA rewrites.
