import { redirect } from "next/navigation";
import Link from "next/link";
import { getApplicantSession } from "@/lib/session";
import { getApplicationStatus } from "@/lib/settings";
import { getDb } from "@/lib/db";
import { taskTitle, DOC_TYPES } from "@/lib/tasks";
import { formatDateTime } from "@/lib/format";
import EditForm from "./EditForm";

export const dynamic = "force-dynamic";

interface SubRow {
  id: number;
  task_id: number;
  biz_reg_no: string;
  company_name: string;
  ceo_name: string;
  applicant_name: string;
  phone: string;
  email: string;
  reason: string;
  tech_experience: string;
  created_at: string;
  updated_at: string;
}
interface AttRow {
  id: number;
  file_name: string;
  file_type: string;
  size: number;
  uploaded_at: string;
}

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getApplicantSession();
  if (!session) redirect("/lookup");

  const db = getDb();
  const sub = db.prepare("SELECT * FROM submissions WHERE id = ?").get(Number(id)) as
    | SubRow
    | undefined;

  // 본인 접수 건이 아니면 조회 페이지로
  if (!sub || sub.biz_reg_no !== session!.bizRegNo) redirect("/lookup");

  const attachments = db
    .prepare("SELECT id, file_name, file_type, size, uploaded_at FROM attachments WHERE submission_id = ? ORDER BY file_type")
    .all(sub.id) as AttRow[];

  const status = getApplicationStatus();

  if (!status.open) {
    return (
      <div className="container-page py-16">
        <div className="card mx-auto max-w-xl p-8 text-center">
          <h1 className="text-xl font-bold text-navy-800">수정할 수 없습니다</h1>
          <p className="mt-3 text-sm text-slate-600">
            접수가 마감되어 수정이 불가합니다. (조회는 가능합니다.)
          </p>
          <div className="mt-6">
            <Link href="/lookup" className="btn-outline">접수 조회로</Link>
          </div>
        </div>
      </div>
    );
  }

  const attByType: Record<string, AttRow[]> = {};
  for (const dt of DOC_TYPES) attByType[dt.key] = attachments.filter((a) => a.file_type === dt.key);

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 text-sm text-slate-500">
          <Link href="/lookup" className="underline">접수 조회</Link> · 수정
        </div>
        <h1 className="text-2xl font-bold text-navy-800">{taskTitle(sub.task_id)}</h1>
        <p className="mt-1 text-sm text-slate-500">
          접수번호 #{sub.id} · 최초 제출 {formatDateTime(sub.created_at)}
        </p>
        <EditForm
          submission={{
            id: sub.id,
            companyName: sub.company_name,
            ceoName: sub.ceo_name,
            applicantName: sub.applicant_name,
            phone: sub.phone,
            email: sub.email,
            reason: sub.reason,
            techExperience: sub.tech_experience,
          }}
          attachments={DOC_TYPES.map((dt) => ({
            key: dt.key,
            label: dt.label,
            required: dt.required,
            files: attByType[dt.key].map((a) => ({ name: a.file_name, size: a.size })),
          }))}
        />
      </div>
    </div>
  );
}
