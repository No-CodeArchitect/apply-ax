import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { attachmentsFor, type SubmissionListRow } from "@/lib/adminQuery";
import { taskTitle, DOC_TYPES } from "@/lib/tasks";
import { formatBizRegNo } from "@/lib/validation";
import { formatDateTime } from "@/lib/format";
import { logAdminActivity } from "@/lib/activity";
import AdminNav from "../../AdminNav";
import DeleteSubmissionButton from "../../DeleteSubmissionButton";

export const dynamic = "force-dynamic";

export default async function SubmissionDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.mustChange) redirect("/admin/change-password");

  const { id } = await params;
  const sub = getDb().prepare("SELECT * FROM submissions WHERE id = ?").get(Number(id)) as
    | SubmissionListRow
    | undefined;
  if (!sub) notFound();

  const atts = attachmentsFor(sub.id);
  const historyCount = (
    getDb()
      .prepare("SELECT COUNT(*) as c FROM submission_history WHERE submission_id = ?")
      .get(sub.id) as { c: number }
  ).c;

  logAdminActivity({
    adminId: session.adminId,
    username: session.username,
    action: "view_detail",
    targetId: sub.id,
  });

  const docLabel = (key: string) => DOC_TYPES.find((d) => d.key === key)?.label || key;

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value || "-"}</dd>
    </div>
  );

  return (
    <div>
      <AdminNav orgLabel={session.orgLabel} username={session.username} />
      <div className="container-page py-8">
        <div className="mb-4 text-sm text-slate-500">
          <Link href="/admin" className="underline">대시보드</Link> · 접수 상세
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-navy-800">접수 #{sub.id}</h1>
            <span className="badge bg-navy-100 text-navy-700">{taskTitle(sub.task_id)}</span>
          </div>
          <DeleteSubmissionButton
            submissionId={sub.id}
            label={`접수 #${sub.id} · ${taskTitle(sub.task_id)} · ${sub.company_name}`}
            redirectTo="/admin"
          />
        </div>
        <p className="mt-1 text-sm text-slate-500">
          제출 {formatDateTime(sub.created_at)} · 최종수정 {formatDateTime(sub.updated_at)} · 수정이력 {historyCount}회
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="card p-6 lg:col-span-2">
            <h2 className="text-base font-semibold text-navy-800">기업 · 지원 정보</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="사업자등록번호" value={formatBizRegNo(sub.biz_reg_no)} />
              <Field label="상호(기업명)" value={sub.company_name} />
              <Field label="대표자명" value={sub.ceo_name} />
              <Field label="제출자(담당자)" value={sub.applicant_name} />
              <Field label="연락처" value={sub.phone} />
              <Field label="이메일" value={sub.email} />
            </dl>
            <div className="mt-5 space-y-4">
              <div>
                <div className="text-xs text-slate-500">지원 사유</div>
                <p className="mt-1 whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm text-slate-800">
                  {sub.reason}
                </p>
              </div>
              <div>
                <div className="text-xs text-slate-500">보유 기술 / 실적</div>
                <p className="mt-1 whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm text-slate-800">
                  {sub.tech_experience}
                </p>
              </div>
            </div>
          </div>

          <div className="card h-fit p-6">
            <h2 className="text-base font-semibold text-navy-800">첨부 서류</h2>
            {atts.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">첨부된 파일이 없습니다.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {atts.map((a) => (
                  <li key={a.id} className="rounded-md border border-slate-200 p-3">
                    <div className="text-xs font-semibold text-navy-700">{docLabel(a.file_type)}</div>
                    <a
                      href={`/api/admin/download/${a.id}`}
                      className="mt-1 block truncate text-sm text-navy-600 hover:underline"
                      title={a.file_name}
                    >
                      {a.file_name}
                    </a>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      {(a.size / 1024 / 1024).toFixed(2)} MB · {formatDateTime(a.uploaded_at)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
