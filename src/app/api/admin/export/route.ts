import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getAdminSession } from "@/lib/session";
import { querySubmissions, taskTitle } from "@/lib/adminQuery";
import { logAdminActivity } from "@/lib/activity";
import { formatBizRegNo } from "@/lib/validation";
import { formatDateTime } from "@/lib/format";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const task = sp.get("task") ? Number(sp.get("task")) : null;
  const rows = querySubmissions({ task, from: sp.get("from"), to: sp.get("to") });

  const wb = new ExcelJS.Workbook();
  wb.creator = "공군 AX 협력센터 접수시스템";
  const ws = wb.addWorksheet("접수목록");
  ws.columns = [
    { header: "접수번호", key: "id", width: 10 },
    { header: "과제", key: "task", width: 32 },
    { header: "사업자등록번호", key: "biz", width: 16 },
    { header: "상호", key: "company", width: 24 },
    { header: "대표자명", key: "ceo", width: 12 },
    { header: "제출자", key: "applicant", width: 12 },
    { header: "연락처", key: "phone", width: 16 },
    { header: "이메일", key: "email", width: 26 },
    { header: "지원사유", key: "reason", width: 40 },
    { header: "보유기술·실적", key: "tech", width: 40 },
    { header: "제출일시", key: "created", width: 20 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF233A5C" } };
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  for (const r of rows) {
    ws.addRow({
      id: r.id,
      task: taskTitle(r.task_id),
      biz: formatBizRegNo(r.biz_reg_no),
      company: r.company_name,
      ceo: r.ceo_name,
      applicant: r.applicant_name,
      phone: r.phone,
      email: r.email,
      reason: r.reason,
      tech: r.tech_experience,
      created: formatDateTime(r.created_at),
    });
  }

  const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;

  logAdminActivity({
    adminId: session.adminId,
    username: session.username,
    action: "export_excel",
    detail: `rows=${rows.length}${task ? ` task=${task}` : ""}`,
  });

  const filename = `applications_${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
