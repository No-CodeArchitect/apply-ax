import { cookies } from "next/headers";
import { signToken, verifyToken } from "./auth";

export const REVIEWER_COOKIE = "ax_reviewer_session";

export interface ReviewerSession {
  kind: "reviewer";
  reviewerId: number;
  name: string;
  affiliationGroup: string;
}

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export async function setReviewerSession(s: Omit<ReviewerSession, "kind">) {
  const token = await signToken({ ...s, kind: "reviewer" }, "12h");
  (await cookies()).set(REVIEWER_COOKIE, token, { ...cookieBase, maxAge: 60 * 60 * 12 });
}

export async function getReviewerSession(): Promise<ReviewerSession | null> {
  const token = (await cookies()).get(REVIEWER_COOKIE)?.value;
  if (!token) return null;
  const p = await verifyToken<ReviewerSession>(token);
  return p && p.kind === "reviewer" ? p : null;
}

export async function clearReviewerSession() {
  (await cookies()).delete(REVIEWER_COOKIE);
}
