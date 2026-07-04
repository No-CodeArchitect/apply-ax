import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";
import { verifyCsrf } from "@/lib/csrf";
import { updateCompanyPassword } from "@/lib/company";
import { passwordIssue } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await verifyCsrf(req)))
    return NextResponse.json({ ok: false, message: "보안 토큰이 유효하지 않습니다." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const token = String(body.token || "");
  const password = String(body.password || "");
  const passwordConfirm = String(body.passwordConfirm || "");

  const pe = passwordIssue(password);
  if (pe) return NextResponse.json({ ok: false, message: pe }, { status: 400 });
  if (password !== passwordConfirm)
    return NextResponse.json({ ok: false, message: "비밀번호 확인이 일치하지 않습니다." }, { status: 400 });

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM password_resets WHERE token_hash = ? AND used = 0")
    .get(tokenHash) as { id: number; company_id: number; expires_at: number } | undefined;

  if (!row || row.expires_at < Date.now()) {
    return NextResponse.json(
      { ok: false, message: "링크가 만료되었거나 이미 사용되었습니다. 다시 요청해 주세요." },
      { status: 400 }
    );
  }

  updateCompanyPassword(row.company_id, password);
  db.prepare("UPDATE password_resets SET used = 1 WHERE id = ?").run(row.id);
  // 동일 기업의 다른 미사용 토큰도 무효화
  db.prepare("UPDATE password_resets SET used = 1 WHERE company_id = ? AND used = 0").run(row.company_id);

  return NextResponse.json({ ok: true, message: "비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해 주세요." });
}
