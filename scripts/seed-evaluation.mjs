// 평가 모듈 더미 데이터 시드 스크립트
//   node scripts/seed-evaluation.mjs
//
// 생성 내용:
//   - 심사위원 10명 (서울대4 + 공군4 + AI허브2)
//   - 더미 지원기업 3개 (companies) + 지원서 6개 (submissions, 과제별 2개씩)
//   - 더미 PDF 첨부파일 6개
//   - 매직링크 토큰 10개 (위원별 1개, 만료: 2026-07-31)
//
// 기존 데이터를 건드리지 않음 (INSERT OR IGNORE).
// 재실행 안전.

import Database from "better-sqlite3";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, "apply-ax.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const now = new Date().toISOString();

// ── 0. 평가 모듈 테이블 생성 (migrate 역할) ────────────────────
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
  CREATE TABLE IF NOT EXISTS reviewers (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    name              TEXT NOT NULL,
    affiliation_group TEXT NOT NULL,
    org               TEXT,
    title             TEXT,
    email             TEXT UNIQUE,
    phone             TEXT,
    created_at        TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS reviewer_tokens (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    reviewer_id       INTEGER NOT NULL REFERENCES reviewers(id),
    token             TEXT NOT NULL UNIQUE,
    expires_at        TEXT NOT NULL,
    used              INTEGER NOT NULL DEFAULT 0,
    created_at        TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_reviewer_tokens_token ON reviewer_tokens(token);
  CREATE TABLE IF NOT EXISTS evaluation_criteria (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    code              TEXT NOT NULL UNIQUE,
    label             TEXT NOT NULL,
    max_score         INTEGER NOT NULL,
    sort_order        INTEGER NOT NULL,
    description       TEXT
  );
  CREATE TABLE IF NOT EXISTS evaluations (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    reviewer_id       INTEGER NOT NULL REFERENCES reviewers(id),
    submission_id     INTEGER NOT NULL REFERENCES submissions(id),
    criteria_id       INTEGER NOT NULL REFERENCES evaluation_criteria(id),
    score             INTEGER,
    updated_at        TEXT NOT NULL,
    UNIQUE(reviewer_id, submission_id, criteria_id)
  );
  CREATE INDEX IF NOT EXISTS idx_evaluations_reviewer ON evaluations(reviewer_id);
  CREATE INDEX IF NOT EXISTS idx_evaluations_submission ON evaluations(submission_id);
  CREATE TABLE IF NOT EXISTS evaluation_submits (
    reviewer_id       INTEGER NOT NULL REFERENCES reviewers(id),
    submission_id     INTEGER NOT NULL REFERENCES submissions(id),
    is_final          INTEGER NOT NULL DEFAULT 0,
    submitted_at      TEXT,
    comment           TEXT,
    unlocked_at       TEXT,
    unlocked_by       TEXT,
    PRIMARY KEY (reviewer_id, submission_id)
  );
`);

// 평가 항목 시드
const criteriaDefaults = [
  { code: "tech", label: "기술 역량 및 접근방법", max_score: 35, sort_order: 1 },
  { code: "capability", label: "수행 역량", max_score: 35, sort_order: 2 },
  { code: "security", label: "보안 및 관리체계", max_score: 10, sort_order: 3 },
  { code: "execution", label: "사업추진체계", max_score: 10, sort_order: 4 },
  { code: "scalability", label: "사업화 가능성", max_score: 10, sort_order: 5 },
];
const insertCriteria = db.prepare(
  "INSERT OR IGNORE INTO evaluation_criteria (code, label, max_score, sort_order) VALUES (?, ?, ?, ?)"
);
for (const c of criteriaDefaults) insertCriteria.run(c.code, c.label, c.max_score, c.sort_order);

// ── 1. 심사위원 10명 ─────────────────────────────────────────
const reviewers = [
  { name: "김교수", group: "snu", org: "서울대학교 컴퓨터공학부", title: "교수", email: "reviewer1@test.example.com" },
  { name: "이교수", group: "snu", org: "서울대학교 전기정보공학부", title: "교수", email: "reviewer2@test.example.com" },
  { name: "박교수", group: "snu", org: "서울대학교 산업공학과", title: "교수", email: "reviewer3@test.example.com" },
  { name: "최교수", group: "snu", org: "서울대학교 데이터사이언스대학원", title: "교수", email: "reviewer4@test.example.com" },
  { name: "정대령", group: "airforce", org: "공군본부 정보화기획과", title: "대령", email: "reviewer5@test.example.com" },
  { name: "한중령", group: "airforce", org: "공군본부 전력기획과", title: "중령", email: "reviewer6@test.example.com" },
  { name: "유중령", group: "airforce", org: "공군 작전사령부", title: "중령", email: "reviewer7@test.example.com" },
  { name: "송소령", group: "airforce", org: "공군 군수사령부", title: "소령", email: "reviewer8@test.example.com" },
  { name: "강연구원", group: "aihub", org: "서울AI허브", title: "선임연구원", email: "reviewer9@test.example.com" },
  { name: "윤연구원", group: "aihub", org: "서울AI허브", title: "연구원", email: "reviewer10@test.example.com" },
];

const insertReviewer = db.prepare(
  `INSERT OR IGNORE INTO reviewers (name, affiliation_group, org, title, email, created_at)
   VALUES (?, ?, ?, ?, ?, ?)`
);
const existsReviewer = db.prepare("SELECT id FROM reviewers WHERE email = ?");

console.log("\n===== 심사위원 시드 =====");
const reviewerIds = [];
for (const r of reviewers) {
  const existing = existsReviewer.get(r.email);
  if (existing) {
    console.log(`  - ${r.name} (${r.group}): 이미 존재 → 건너뜀`);
    reviewerIds.push(existing.id);
    continue;
  }
  const result = insertReviewer.run(r.name, r.group, r.org, r.title, r.email, now);
  reviewerIds.push(result.lastInsertRowid);
  console.log(`  - ${r.name} (${r.group}, ${r.org})`);
}

// ── 2. 매직링크 토큰 ─────────────────────────────────────────
const insertToken = db.prepare(
  `INSERT OR IGNORE INTO reviewer_tokens (reviewer_id, token, expires_at, created_at)
   VALUES (?, ?, ?, ?)`
);
const existsToken = db.prepare("SELECT id FROM reviewer_tokens WHERE reviewer_id = ?");

console.log("\n===== 매직링크 토큰 =====");
const tokens = [];
for (let i = 0; i < reviewerIds.length; i++) {
  const rid = reviewerIds[i];
  if (existsToken.get(rid)) {
    const t = db.prepare("SELECT token FROM reviewer_tokens WHERE reviewer_id = ?").get(rid);
    tokens.push(t.token);
    console.log(`  - ${reviewers[i].name}: 이미 존재 → 건너뜀`);
    continue;
  }
  const token = crypto.randomBytes(48).toString("hex");
  tokens.push(token);
  insertToken.run(rid, token, "2026-07-31T23:59:59+09:00", now);
  console.log(`  - ${reviewers[i].name}: /evaluate?token=${token.slice(0, 16)}...`);
}

// ── 3. 더미 지원기업 + 지원서 ─────────────────────────────────
const dummyCompanies = [
  { biz: "000-00-00001", name: "(주)더미테크", ceo: "홍길동", email: "dummy1@test.example.com" },
  { biz: "000-00-00002", name: "(주)에이아이솔루션", ceo: "김철수", email: "dummy2@test.example.com" },
  { biz: "000-00-00003", name: "(주)스마트디펜스", ceo: "이영희", email: "dummy3@test.example.com" },
];

const insertCompany = db.prepare(
  `INSERT OR IGNORE INTO companies (biz_reg_no, password_hash, recovery_email, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?)`
);
const existsCompany = db.prepare("SELECT id FROM companies WHERE biz_reg_no = ?");

// 더미 PDF 생성 (최소한의 유효 PDF)
function createDummyPdf(companyName, taskId) {
  const taskNames = { 1: "ADTO 전투계획", 2: "이동표적(TEL) 추적", 3: "표적 자동식별" };
  const content = `${companyName} - 과제${taskId}: ${taskNames[taskId]} 연구개발계획서`;
  // 최소 유효 PDF (텍스트 표시)
  const textObj = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  const pagesObj = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
  const encodedText = Buffer.from(content).toString("binary");
  const streamContent = `BT /F1 16 Tf 50 700 Td (${encodedText}) Tj ET`;
  const streamLen = Buffer.byteLength(streamContent);
  const pageObj = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`;
  const streamObj = `4 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream\nendobj\n`;
  const fontObj = `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  offsets.push(Buffer.byteLength(pdf));
  pdf += textObj;
  offsets.push(Buffer.byteLength(pdf));
  pdf += pagesObj;
  offsets.push(Buffer.byteLength(pdf));
  pdf += pageObj;
  offsets.push(Buffer.byteLength(pdf));
  pdf += streamObj;
  offsets.push(Buffer.byteLength(pdf));
  pdf += fontObj;

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "binary");
}

console.log("\n===== 더미 지원기업 + 지원서 =====");
const pwHash = bcrypt.hashSync("dummy1234", 10);

// 각 기업이 2개 과제에 지원하는 시나리오
const submissions = [
  { companyIdx: 0, taskId: 1 },
  { companyIdx: 1, taskId: 1 },
  { companyIdx: 0, taskId: 2 },
  { companyIdx: 2, taskId: 2 },
  { companyIdx: 1, taskId: 3 },
  { companyIdx: 2, taskId: 3 },
];

const insertSub = db.prepare(
  `INSERT OR IGNORE INTO submissions
   (company_id, biz_reg_no, task_id, company_name, ceo_name, applicant_name, phone, email, reason, tech_experience, status, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?)`
);
const existsSub = db.prepare("SELECT id FROM submissions WHERE biz_reg_no = ? AND task_id = ?");

const insertAtt = db.prepare(
  `INSERT OR IGNORE INTO attachments (submission_id, file_name, file_path, file_type, size, uploaded_at)
   VALUES (?, ?, ?, ?, ?, ?)`
);
const existsAtt = db.prepare("SELECT id FROM attachments WHERE submission_id = ? AND file_type = ?");

for (const s of submissions) {
  const c = dummyCompanies[s.companyIdx];
  let companyRow = existsCompany.get(c.biz);
  if (!companyRow) {
    const res = insertCompany.run(c.biz, pwHash, c.email, now, now);
    companyRow = { id: res.lastInsertRowid };
    console.log(`  기업 생성: ${c.name}`);
  }

  let subRow = existsSub.get(c.biz, s.taskId);
  if (!subRow) {
    const res = insertSub.run(
      companyRow.id, c.biz, s.taskId, c.name, c.ceo, c.ceo,
      "010-0000-0000", c.email,
      `과제${s.taskId} 지원 사유: AI 기술을 활용한 국방 분야 기여`,
      "AI/ML 관련 연구개발 경험 다수 보유",
      now, now
    );
    subRow = { id: res.lastInsertRowid };
    console.log(`  지원서 생성: ${c.name} → 과제${s.taskId}`);
  }

  // 더미 PDF 첨부
  if (!existsAtt.get(subRow.id, "proposal")) {
    const pdfBuf = createDummyPdf(c.name, s.taskId);
    const fileName = `연구개발계획서_${c.name}_과제${s.taskId}.pdf`;
    const storedName = `${Date.now()}_${crypto.randomBytes(12).toString("hex")}.pdf`;
    const absPath = path.join(UPLOAD_DIR, storedName);
    fs.writeFileSync(absPath, pdfBuf);
    insertAtt.run(subRow.id, fileName, storedName, "proposal", pdfBuf.length, now);
    console.log(`    첨부: ${fileName} (${pdfBuf.length} bytes)`);
  }

  if (!existsAtt.get(subRow.id, "biz_license")) {
    const pdfBuf = createDummyPdf(c.name + " 회사소개", s.taskId);
    const fileName = `회사소개자료_${c.name}.pdf`;
    const storedName = `${Date.now()}_${crypto.randomBytes(12).toString("hex")}.pdf`;
    const absPath = path.join(UPLOAD_DIR, storedName);
    fs.writeFileSync(absPath, pdfBuf);
    insertAtt.run(subRow.id, fileName, storedName, "biz_license", pdfBuf.length, now);
    console.log(`    첨부: ${fileName}`);
  }
}

// ── 4. 접속 URL 출력 ─────────────────────────────────────────
console.log("\n===== 테스트용 매직링크 URL =====");
for (let i = 0; i < reviewerIds.length; i++) {
  console.log(`  ${reviewers[i].name} (${reviewers[i].group}):`);
  console.log(`    http://localhost:3000/evaluate?token=${tokens[i]}`);
}

console.log("\n===== 지원서 현황 =====");
const allSubs = db.prepare("SELECT id, task_id, company_name FROM submissions ORDER BY task_id, id").all();
for (const s of allSubs) {
  console.log(`  과제${s.task_id}: ${s.company_name} (id=${s.id})`);
}

console.log("\n더미 데이터 시드 완료.\n");
db.close();
