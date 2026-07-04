import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyCsrf } from "@/lib/csrf";
import { getAdminSession } from "@/lib/session";
import { deleteUpload } from "@/lib/files";
import { logAdminActivity } from "@/lib/activity";

export const runtime = "nodejs";

// 접수 건 삭제 (첨부파일·수정이력 포함). 관리자 전용.
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyCsrf(req)))
    return NextResponse.json({ ok: false, message: "보안 토큰이 유효하지 않습니다." }, { status: 403 });

  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, message: "인증이 필요합니다." }, { status: 401 });

  const { id } = await ctx.params;
  const sid = Number(id);
  const db = getDb();
  const sub = db.prepare("SELECT id, company_name FROM submissions WHERE id = ?").get(sid) as
    | { id: number; company_name: string }
    | undefined;
  if (!sub) return NextResponse.json({ ok: false, message: "접수 건을 찾을 수 없습니다." }, { status: 404 });

  // 삭제 전 첨부 파일 경로 수집
  const files = (
    db.prepare("SELECT file_path FROM attachments WHERE submission_id = ?").all(sid) as {
      file_path: string;
    }[]
  ).map((r) => r.file_path);

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM submission_history WHERE submission_id = ?").run(sid);
    db.prepare("DELETE FROM attachments WHERE submission_id = ?").run(sid);
    db.prepare("DELETE FROM submissions WHERE id = ?").run(sid);
  });
  tx();

  // DB 삭제 후 실제 파일 제거
  for (const f of files) deleteUpload(f);

  logAdminActivity({
    adminId: session.adminId,
    username: session.username,
    action: "delete_submission",
    targetId: sid,
    detail: sub.company_name,
  });

  return NextResponse.json({ ok: true });
}
