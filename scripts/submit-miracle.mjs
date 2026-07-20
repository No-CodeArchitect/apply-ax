/**
 * 더미라클소프트 수동 접수 스크립트
 * 실행: node scripts/submit-miracle.mjs
 *
 * Railway 환경변수 MANUAL_SUBMIT_SECRET 를 먼저 설정해야 합니다.
 * 사용 후 해당 환경변수를 삭제하면 엔드포인트가 자동 비활성화됩니다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const BASE = "https://apply-ax.up.railway.app";
const SECRET = process.env.MANUAL_SUBMIT_SECRET;

if (!SECRET) {
  console.error("환경변수 MANUAL_SUBMIT_SECRET 을 설정하세요.");
  process.exit(1);
}

const proposalPath = path.resolve("C:\\Users\\feel_\\Downloads\\1.ADTO_연구개발계획서_상세_더미라클소프트.pdf");
const bizLicensePath = path.resolve("C:\\Users\\feel_\\Downloads\\2.더미라클소프트_회사소개서_2026.0622.pdf");

const proposalBuf = readFileSync(proposalPath);
const bizLicenseBuf = readFileSync(bizLicensePath);

const form = new FormData();
form.append("bizRegNo", "817-81-01390");
form.append("companyName", "주식회사 더미라클소프트");
form.append("ceoName", "홍지수");
form.append("applicantName", "홍지수");
form.append("phone", "010-4730-1069");
form.append("email", "jisu.hong@themiraclesoft.com");
form.append("taskId", "1");
form.append("createdAt", "2026-07-17T23:50:00+09:00");
form.append("reason", "시스템 장애로 인한 예외 접수 (이메일 접수)");
form.append("techExperience", "이메일 접수 — 관리자 수동 입력");
form.append("proposal", new Blob([proposalBuf], { type: "application/pdf" }), "1.ADTO_연구개발계획서_상세_더미라클소프트.pdf");
form.append("biz_license", new Blob([bizLicenseBuf], { type: "application/pdf" }), "2.더미라클소프트_회사소개서_2026.0622.pdf");

console.log("접수 요청 전송 중...");

const res = await fetch(`${BASE}/api/admin/manual-submit`, {
  method: "POST",
  headers: { "x-submit-secret": SECRET },
  body: form,
});

const data = await res.json();
console.log(`Status: ${res.status}`);
console.log("Result:", JSON.stringify(data, null, 2));
