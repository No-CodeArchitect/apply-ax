import bcrypt from "bcryptjs";
import { getDb, nowIso } from "./db";

export interface CompanyRow {
  id: number;
  biz_reg_no: string;
  password_hash: string;
  recovery_email: string;
  failed_attempts: number;
  locked_until: number | null;
  created_at: string;
  updated_at: string;
}

const MAX_ATTEMPTS = 5;
const LOCK_MS = 10 * 60 * 1000; // 10분

export function getCompanyByBiz(bizRegNo: string): CompanyRow | undefined {
  return getDb()
    .prepare("SELECT * FROM companies WHERE biz_reg_no = ?")
    .get(bizRegNo) as CompanyRow | undefined;
}

export function createCompany(bizRegNo: string, password: string, email: string): CompanyRow {
  const hash = bcrypt.hashSync(password, 10);
  const now = nowIso();
  const info = getDb()
    .prepare(
      `INSERT INTO companies (biz_reg_no, password_hash, recovery_email, failed_attempts, locked_until, created_at, updated_at)
       VALUES (?, ?, ?, 0, NULL, ?, ?)`
    )
    .run(bizRegNo, hash, email, now, now);
  return getDb()
    .prepare("SELECT * FROM companies WHERE id = ?")
    .get(info.lastInsertRowid) as CompanyRow;
}

export interface VerifyResult {
  ok: boolean;
  locked: boolean;
  lockRemainingMs?: number;
  attemptsLeft?: number;
}

/** 비밀번호 검증 + 5회 실패 시 10분 잠금. 성공 시 카운터 초기화. */
export function verifyCompanyPassword(company: CompanyRow, password: string): VerifyResult {
  const db = getDb();
  const now = Date.now();

  if (company.locked_until && company.locked_until > now) {
    return { ok: false, locked: true, lockRemainingMs: company.locked_until - now };
  }

  const match = bcrypt.compareSync(password, company.password_hash);
  if (match) {
    db.prepare(
      "UPDATE companies SET failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?"
    ).run(nowIso(), company.id);
    return { ok: true, locked: false };
  }

  const attempts = company.failed_attempts + 1;
  if (attempts >= MAX_ATTEMPTS) {
    const lockUntil = now + LOCK_MS;
    db.prepare(
      "UPDATE companies SET failed_attempts = ?, locked_until = ?, updated_at = ? WHERE id = ?"
    ).run(attempts, lockUntil, nowIso(), company.id);
    return { ok: false, locked: true, lockRemainingMs: LOCK_MS };
  }

  db.prepare("UPDATE companies SET failed_attempts = ?, updated_at = ? WHERE id = ?").run(
    attempts,
    nowIso(),
    company.id
  );
  return { ok: false, locked: false, attemptsLeft: MAX_ATTEMPTS - attempts };
}

export function updateCompanyPassword(companyId: number, password: string): void {
  const hash = bcrypt.hashSync(password, 10);
  getDb()
    .prepare(
      "UPDATE companies SET password_hash = ?, failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?"
    )
    .run(hash, nowIso(), companyId);
}
