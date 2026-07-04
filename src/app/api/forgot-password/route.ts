import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb, nowIso } from "@/lib/db";
import { verifyCsrf } from "@/lib/csrf";
import { getCompanyByBiz } from "@/lib/company";
import { normalizeBizRegNo, isValidBizRegNo, isValidEmail } from "@/lib/validation";
import { sendPasswordReset } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await verifyCsrf(req)))
    return NextResponse.json({ ok: false, message: "보안 토큰이 유효하지 않습니다." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const biz = normalizeBizRegNo(String(body.bizRegNo || ""));
  const email = String(body.email || "").trim();

  // 형식 오류만 즉시 반환. 그 외에는 계정 열거 방지를 위해 항상 동일 응답.
  if (!isValidBizRegNo(biz) || !isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, message: "사업자등록번호와 이메일을 정확히 입력해 주세요." },
      { status: 400 }
    );
  }

  const company = getCompanyByBiz(biz);
  if (company && company.recovery_email.trim().toLowerCase() === email.toLowerCase()) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = Date.now() + 60 * 60 * 1000; // 60분
    getDb()
      .prepare(
        "INSERT INTO password_resets (company_id, token_hash, expires_at, used, created_at) VALUES (?, ?, ?, 0, ?)"
      )
      .run(company.id, tokenHash, expiresAt, nowIso());
    const base = process.env.APP_BASE_URL || "http://localhost:3000";
    try {
      await sendPasswordReset({ to: company.recovery_email, link: `${base}/reset-password?token=${token}` });
    } catch (e) {
      console.error("재설정 메일 발송 실패:", e);
    }
  }

  return NextResponse.json({
    ok: true,
    message:
      "입력하신 정보가 일치하는 경우, 등록된 이메일로 비밀번호 재설정 링크를 발송했습니다. 메일함을 확인해 주세요.",
  });
}
