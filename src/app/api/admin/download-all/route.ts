import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import { getAdminSession } from "@/lib/session";
import { querySubmissions, attachmentsFor } from "@/lib/adminQuery";
import { resolveUploadPath, attachmentDownloadName } from "@/lib/files";
import { logAdminActivity } from "@/lib/activity";

export const runtime = "nodejs";

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
    const usedNames = new Set<string>();
    for (const r of rows) {
      const atts = attachmentsFor(r.id);
      for (const a of atts) {
        const abs = resolveUploadPath(a.file_path);
        if (!abs) continue;
        // 파일명: 상호_원래파일명 (중복 시 _2, _3 … 로 구분)
        let name = attachmentDownloadName(r.company_name, a.file_name);
        if (usedNames.has(name)) {
          const dot = name.lastIndexOf(".");
          const stem = dot > 0 ? name.slice(0, dot) : name;
          const ext = dot > 0 ? name.slice(dot) : "";
          let i = 2;
          while (usedNames.has(`${stem}_${i}${ext}`)) i++;
          name = `${stem}_${i}${ext}`;
        }
        usedNames.add(name);
        archive.file(abs, { name });
        added++;
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
