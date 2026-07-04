// 접수 데이터 초기화 스크립트 (실서비스 오픈 전 테스트 데이터 정리용).
//   node scripts/reset-data.mjs           → 안내만 표시 (안전)
//   node scripts/reset-data.mjs --yes     → 실제 초기화 실행
//
// 삭제 대상: companies / submissions / attachments / submission_history /
//            password_resets 의 모든 행 + 업로드 파일. 접수번호(AUTOINCREMENT)도 1부터 재시작.
// 유지 대상: 관리자 계정(admins), 설정(settings, 접수기간 등).

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const confirmed = process.argv.includes("--yes") || process.env.CONFIRM === "YES";
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
const DB_PATH = path.join(DATA_DIR, "apply-ax.db");

if (!confirmed) {
  console.log("⚠️  이 스크립트는 모든 접수 데이터와 업로드 파일을 삭제하고, 접수번호를 1부터 다시 시작하게 합니다.");
  console.log("    · 삭제: 회사/접수/첨부/수정이력/재설정토큰 + 업로드 파일");
  console.log("    · 유지: 관리자 계정, 설정(접수기간 등)");
  console.log("");
  console.log("    실행하려면:  node scripts/reset-data.mjs --yes");
  process.exit(0);
}

if (!fs.existsSync(DB_PATH)) {
  console.error("DB 파일을 찾을 수 없습니다:", DB_PATH);
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma("foreign_keys = OFF");

const tables = ["submission_history", "attachments", "submissions", "companies", "password_resets"];
const tx = db.transaction(() => {
  for (const t of tables) {
    db.prepare(`DELETE FROM ${t}`).run();
    // AUTOINCREMENT 카운터 리셋 → 다음 행부터 id 1 시작
    db.prepare("DELETE FROM sqlite_sequence WHERE name = ?").run(t);
  }
});
tx();
db.close();

// 업로드 파일 제거 (.gitkeep 제외)
let removed = 0;
if (fs.existsSync(UPLOAD_DIR)) {
  for (const f of fs.readdirSync(UPLOAD_DIR)) {
    if (f === ".gitkeep") continue;
    try {
      fs.unlinkSync(path.join(UPLOAD_DIR, f));
      removed++;
    } catch {
      /* 무시 */
    }
  }
}

console.log(`✅ 초기화 완료. 업로드 파일 ${removed}개 삭제. 다음 접수부터 접수번호가 1번부터 시작됩니다.`);
console.log("   (관리자 계정과 설정은 그대로 유지됩니다.)");
