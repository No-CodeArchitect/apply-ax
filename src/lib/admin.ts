import bcrypt from "bcryptjs";
import { getDb, nowIso } from "./db";
import { getAdminSession, type AdminSession } from "./session";

export interface AdminRow {
  id: number;
  username: string;
  password_hash: string;
  org_label: string;
  must_change_password: number;
  created_at: string;
  updated_at: string;
}

export function getAdminByUsername(username: string): AdminRow | undefined {
  return getDb().prepare("SELECT * FROM admins WHERE username = ?").get(username) as
    | AdminRow
    | undefined;
}

export function getAdminById(id: number): AdminRow | undefined {
  return getDb().prepare("SELECT * FROM admins WHERE id = ?").get(id) as AdminRow | undefined;
}

export function verifyAdminPassword(admin: AdminRow, password: string): boolean {
  return bcrypt.compareSync(password, admin.password_hash);
}

export function setAdminPassword(adminId: number, password: string): void {
  const hash = bcrypt.hashSync(password, 10);
  getDb()
    .prepare(
      "UPDATE admins SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?"
    )
    .run(hash, nowIso(), adminId);
}

/** 라우트 핸들러에서 관리자 인증 확인 (미인증이면 null) */
export async function requireAdmin(): Promise<AdminSession | null> {
  return getAdminSession();
}

const EVAL_ADMIN_USERNAMES = ["admin_airi", "admin_snu"];

export function canAccessEvaluation(username: string): boolean {
  return EVAL_ADMIN_USERNAMES.includes(username);
}
