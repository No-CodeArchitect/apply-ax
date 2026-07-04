// 초기 관리자 계정 3개를 생성하는 시드 스크립트.
//   node scripts/seed-admins.mjs
// 초기 비밀번호는 임의 생성하여 콘솔에 1회 출력하고, must_change_password=true 로 둔다.
// 이미 존재하는 계정은 건너뛴다(재실행 안전).

import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, "apply-ax.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    org_label TEXT NOT NULL,
    must_change_password INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

function randomPassword() {
  // 영문 대소문자 + 숫자 조합 12자리
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[bytes[i] % chars.length];
  // 숫자/영문 최소 1개 보장
  return out.replace(/^(.)/, "A").replace(/(.)$/, "7");
}

const admins = [
  { username: "admin_airi", org_label: "AIRI" },
  { username: "admin_af", org_label: "공군" },
  { username: "admin_snu", org_label: "서울대" },
];

const now = new Date().toISOString();
const insert = db.prepare(
  `INSERT INTO admins (username, password_hash, org_label, must_change_password, created_at, updated_at)
   VALUES (?, ?, ?, 1, ?, ?)`
);
const exists = db.prepare("SELECT id FROM admins WHERE username = ?");

console.log("\n===== 관리자 계정 시드 =====");
let created = 0;
for (const a of admins) {
  if (exists.get(a.username)) {
    console.log(`- ${a.username} : 이미 존재 → 건너뜀`);
    continue;
  }
  const pw = randomPassword();
  const hash = bcrypt.hashSync(pw, 10);
  insert.run(a.username, hash, a.org_label, now, now);
  created++;
  console.log(`- ${a.username} (${a.org_label})`);
  console.log(`    초기 비밀번호: ${pw}`);
}

if (created > 0) {
  console.log(
    "\n※ 위 초기 비밀번호는 다시 표시되지 않습니다. 안전하게 보관하고,\n  최초 로그인 시 반드시 비밀번호를 변경하세요 (must_change_password=true)."
  );
} else {
  console.log("\n생성된 신규 계정이 없습니다.");
}
console.log("============================\n");

// ── (선택) 부트스트랩 재설정 ──────────────────────────────────
// 로그의 초기 비밀번호를 놓쳤거나 맞지 않을 때, 환경변수
// ADMIN_BOOTSTRAP_PASSWORD 값으로 관리자 3계정 비밀번호를 일괄 재설정한다.
// 로그인 후 강제 변경(must_change_password=1)되며, 사용 후에는 변수를 삭제하면 된다.
const bootstrap = process.env.ADMIN_BOOTSTRAP_PASSWORD;
if (bootstrap && bootstrap.length > 0) {
  const hash = bcrypt.hashSync(bootstrap, 10);
  const res = db
    .prepare(
      "UPDATE admins SET password_hash = ?, must_change_password = 1, updated_at = ? WHERE username IN ('admin_airi','admin_af','admin_snu')"
    )
    .run(hash, new Date().toISOString());
  console.log(`[부트스트랩] ADMIN_BOOTSTRAP_PASSWORD 로 관리자 ${res.changes}개 계정의 비밀번호를 재설정했습니다.`);
  console.log("  → 이 비밀번호로 로그인 후 즉시 변경하고, Railway Variables 에서 ADMIN_BOOTSTRAP_PASSWORD 를 삭제하세요.\n");
}

db.close();
