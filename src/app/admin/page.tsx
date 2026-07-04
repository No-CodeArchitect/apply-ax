import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/session";
import { querySubmissions, taskCounts, attachmentsFor } from "@/lib/adminQuery";
import { TASKS, taskTitle } from "@/lib/tasks";
import { getApplicationStatus } from "@/lib/settings";
import { formatDateTime } from "@/lib/format";
import { formatBizRegNo } from "@/lib/validation";
import { logAdminActivity } from "@/lib/activity";
import AdminNav from "./AdminNav";
import SubmissionsTable from "./SubmissionsTable";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ task?: string; from?: string; to?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.mustChange) redirect("/admin/change-password");

  const sp = await searchParams;
  const task = sp.task ? Number(sp.task) : null;
  const filters = { task, from: sp.from || null, to: sp.to || null };
  const rows = querySubmissions(filters);
  const tableRows = rows.map((r) => ({
    id: r.id,
    taskTitle: taskTitle(r.task_id),
    bizRegNo: formatBizRegNo(r.biz_reg_no),
    companyName: r.company_name,
    ceoName: r.ceo_name,
    applicantName: r.applicant_name,
    phone: r.phone,
    email: r.email,
    reason: r.reason,
    techExperience: r.tech_experience,
    createdAt: r.created_at,
    attachments: attachmentsFor(r.id).map((a) => ({
      id: a.id,
      fileName: a.file_name,
      fileType: a.file_type,
      size: a.size,
    })),
  }));
  const counts = taskCounts();
  const total = counts[1] + counts[2] + counts[3];
  const status = getApplicationStatus();

  logAdminActivity({
    adminId: session.adminId,
    username: session.username,
    action: "view_list",
    detail: `rows=${rows.length}${task ? ` task=${task}` : ""}`,
  });

  // 현재 필터를 쿼리스트링으로 (내보내기 링크에 사용)
  const qs = new URLSearchParams();
  if (task) qs.set("task", String(task));
  if (sp.from) qs.set("from", sp.from);
  if (sp.to) qs.set("to", sp.to);
  const query = qs.toString();

  return (
    <div>
      <AdminNav orgLabel={session.orgLabel} username={session.username} />
      <div className="container-page py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-navy-800">접수 대시보드</h1>
            <p className="mt-1 text-sm text-slate-500">
              접수 기간 {formatDateTime(status.window.start)} ~ {formatDateTime(status.window.end)} ·{" "}
              {status.phase === "open" ? "진행 중" : status.phase === "before" ? "접수 예정" : "마감"}
            </p>
          </div>
          <div className="flex gap-2">
            <a href={`/api/admin/export${query ? `?${query}` : ""}`} className="btn-primary">
              엑셀 내보내기
            </a>
            <a href={`/api/admin/download-all${query ? `?${query}` : ""}`} className="btn-outline">
              첨부 일괄 다운로드(zip)
            </a>
          </div>
        </div>

        {/* 요약 카드 */}
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <div className="card p-5">
            <div className="text-xs text-slate-500">전체 접수</div>
            <div className="mt-1 text-3xl font-bold text-navy-800">{total}</div>
          </div>
          {TASKS.map((t) => (
            <div key={t.id} className="card p-5">
              <div className="text-xs text-slate-500">과제 {t.id} · {t.short}</div>
              <div className="mt-1 text-3xl font-bold text-navy-800">{counts[t.id]}</div>
            </div>
          ))}
        </div>

        {/* 필터 */}
        <form method="get" className="card mt-6 flex flex-wrap items-end gap-3 p-4">
          <div>
            <label className="label">과제</label>
            <select name="task" defaultValue={task ? String(task) : ""} className="input w-48">
              <option value="">전체</option>
              {TASKS.map((t) => (
                <option key={t.id} value={t.id}>{t.id}. {t.short}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">접수일(시작)</label>
            <input type="date" name="from" defaultValue={sp.from || ""} className="input" />
          </div>
          <div>
            <label className="label">접수일(끝)</label>
            <input type="date" name="to" defaultValue={sp.to || ""} className="input" />
          </div>
          <button type="submit" className="btn-primary">필터 적용</button>
          <Link href="/admin" className="btn-ghost">초기화</Link>
        </form>

        {/* 목록 (행 클릭 시 상세·첨부 펼침) */}
        <SubmissionsTable rows={tableRows} />

        <p className="mt-4 text-xs text-slate-400">
          ※ 본 시스템은 접수·데이터 관리 전용입니다. 배점·순위 등 심사 기능은 제공하지 않습니다.
        </p>
      </div>
    </div>
  );
}
