import { cookies } from "next/headers";
import { signToken, verifyToken } from "./auth";

// 신청자용 세션과 관리자용 세션은 쿠키 이름부터 완전히 분리한다.
export const APPLICANT_COOKIE = "ax_applicant_session";
export const ADMIN_COOKIE = "ax_admin_session";

export interface ApplicantSession {
  kind: "applicant";
  companyId: number;
  bizRegNo: string;
}

export interface AdminSession {
  kind: "admin";
  adminId: number;
  username: string;
  orgLabel: string;
  mustChange: boolean;
}

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

// ─── 신청자 세션 ─────────────────────────────────────────────
export async function setApplicantSession(s: Omit<ApplicantSession, "kind">) {
  const token = await signToken({ ...s, kind: "applicant" }, "6h");
  (await cookies()).set(APPLICANT_COOKIE, token, { ...cookieBase, maxAge: 60 * 60 * 6 });
}

export async function getApplicantSession(): Promise<ApplicantSession | null> {
  const token = (await cookies()).get(APPLICANT_COOKIE)?.value;
  if (!token) return null;
  const p = await verifyToken<ApplicantSession>(token);
  return p && p.kind === "applicant" ? p : null;
}

export async function clearApplicantSession() {
  (await cookies()).delete(APPLICANT_COOKIE);
}

// ─── 관리자 세션 ─────────────────────────────────────────────
export async function setAdminSession(s: Omit<AdminSession, "kind">) {
  const token = await signToken({ ...s, kind: "admin" }, "8h");
  (await cookies()).set(ADMIN_COOKIE, token, { ...cookieBase, maxAge: 60 * 60 * 8 });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const p = await verifyToken<AdminSession>(token);
  return p && p.kind === "admin" ? p : null;
}

export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}
