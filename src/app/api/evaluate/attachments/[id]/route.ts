import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getReviewerSession } from "@/lib/reviewerSession";
import { getDb } from "@/lib/db";
import { resolveUploadPath } from "@/lib/files";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  hwp: "application/x-hwp",
  hwpx: "application/x-hwpx",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getReviewerSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await ctx.params;
  const att = getDb()
    .prepare("SELECT id, file_name, file_path FROM attachments WHERE id = ?")
    .get(Number(id)) as { id: number; file_name: string; file_path: string } | undefined;

  if (!att) return NextResponse.json({ ok: false, message: "파일을 찾을 수 없습니다." }, { status: 404 });

  const abs = resolveUploadPath(att.file_path);
  if (!abs) return NextResponse.json({ ok: false, message: "파일이 존재하지 않습니다." }, { status: 404 });

  const ext = path.extname(att.file_name).replace(".", "").toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";

  const data = fs.readFileSync(abs);
  const encoded = encodeURIComponent(att.file_name);
  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
