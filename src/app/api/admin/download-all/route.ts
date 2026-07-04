import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import { getAdminSession } from "@/lib/session";
import { querySubmissions, attachmentsFor, taskTitle } from "@/lib/adminQuery";
import { resolveUploadPath } from "@/lib/files";
import { logAdminActivity } from "@/lib/activity";

export const runtime = "nodejs";

// 파일/폴더명에 쓸 수 없는 문자를 정리
function safe(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
}

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const task = sp.get("task") ? Number(sp.get("task")) : null;
  const rows = querySubmissions({ task, from: sp.get("from"), to: sp.get("to") });

  const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    archive.on("data", (c: Buffer) => chunks.push(c));
    archive.on("warning", (e) => console.warn("archiver:", e));
    archive.on("error", reject);
    archive.on("end", () => resolve(Buffer.concat(chunks)));

    let added = 0;
    for (const r of rows) {
      const atts = attachmentsFor(r.id);
      const folder = safe(`${r.id}_${taskTitle(r.task_id)}_${r.company_name}`);
      for (const a of atts) {
        const abs = resolveUploadPath(a.file_path);
        if (abs) {
          archive.file(abs, { name: `${folder}/${safe(a.file_type)}_${a.file_name}` });
          added++;
        }
      }
    }
    if (added === 0) {
      archive.append("첨부파일이 없습니다.", { name: "README.txt" });
    }
    archive.finalize();
  });

  logAdminActivity({
    adminId: session.adminId,
    username: session.username,
    action: "download_all",
    detail: `submissions=${rows.length}`,
  });

  const filename = `attachments_${new Date().toISOString().slice(0, 10)}.zip`;
  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
