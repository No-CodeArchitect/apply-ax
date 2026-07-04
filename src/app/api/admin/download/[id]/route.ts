import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { getAdminSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { resolveUploadPath } from "@/lib/files";
import { logAdminActivity } from "@/lib/activity";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await ctx.params;
  const att = getDb()
    .prepare("SELECT * FROM attachments WHERE id = ?")
    .get(Number(id)) as
    | { id: number; submission_id: number; file_name: string; file_path: string }
    | undefined;

  if (!att) return NextResponse.json({ ok: false, message: "파일을 찾을 수 없습니다." }, { status: 404 });

  const abs = resolveUploadPath(att.file_path);
  if (!abs) return NextResponse.json({ ok: false, message: "파일이 존재하지 않습니다." }, { status: 404 });

  logAdminActivity({
    adminId: session.adminId,
    username: session.username,
    action: "download_attachment",
    targetId: att.submission_id,
    detail: att.file_name,
  });

  const data = fs.readFileSync(abs);
  const encoded = encodeURIComponent(att.file_name);
  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
    },
  });
}
