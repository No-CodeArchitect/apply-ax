import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

// ─────────────────────────────────────────────────────────────
// SQLite 연결 (파일 기반, 별도 DB 서버 불필요)
// data/apply-ax.db 파일에 저장. 개발 중 HMR 로 인한 다중 연결을 막기 위해
// globalThis 에 캐시한다.
// ─────────────────────────────────────────────────────────────

// DATA_DIR 환경변수가 있으면 그 경로에 DB를 둔다 (Railway 볼륨 등 영구 디스크용).
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "apply-ax.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

declare global {
  // eslint-disable-next-line no-var
  var __applyAxDb: Database.Database | undefined;
}

function createConnection(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      biz_reg_no TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      recovery_email TEXT NOT NULL,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      biz_reg_no TEXT NOT NULL,
      task_id INTEGER NOT NULL,
      company_name TEXT NOT NULL,
      ceo_name TEXT NOT NULL,
      applicant_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      reason TEXT NOT NULL,
      tech_experience TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (biz_reg_no, task_id)
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      size INTEGER NOT NULL DEFAULT 0,
      uploaded_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS submission_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      changed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      org_label TEXT NOT NULL,
      must_change_password INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      username TEXT,
      action TEXT NOT NULL,
      target_id INTEGER,
      detail TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_submissions_biz ON submissions (biz_reg_no);
    CREATE INDEX IF NOT EXISTS idx_submissions_task ON submissions (task_id);
    CREATE INDEX IF NOT EXISTS idx_attachments_sub ON attachments (submission_id);
  `);

  // 기본 설정값 삽입 (없을 때만)
  const defaults: Record<string, string> = {
    application_start_at: "2026-07-06T00:00:00+09:00",
    application_end_at: "2026-07-17T23:59:59+09:00",
    task1_guide: "AI 기반 ADTO 전투계획 작성 모델 — 연구개발계획서, 회사소개자료(사업자등록증 포함)를 첨부해 주세요.",
    task2_guide: "AI 기반 이동표적(TEL) 위치추적 모델 — 연구개발계획서, 회사소개자료(사업자등록증 포함)를 첨부해 주세요.",
    task3_guide: "AI 기반 표적 자동식별 모델 — 연구개발계획서, 회사소개자료(사업자등록증 포함)를 첨부해 주세요.",
  };
  const insertSetting = db.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
  );
  for (const [k, v] of Object.entries(defaults)) insertSetting.run(k, v);
}

export function getDb(): Database.Database {
  if (!global.__applyAxDb) {
    global.__applyAxDb = createConnection();
  }
  return global.__applyAxDb;
}

export const nowIso = () => new Date().toISOString();
