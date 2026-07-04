import Link from "next/link";
import { getApplicationStatus, getSetting } from "@/lib/settings";
import { TASKS } from "@/lib/tasks";
import { formatDateTime } from "@/lib/format";
import ApplyForm from "./ApplyForm";

export const dynamic = "force-dynamic";

export default function ApplyPage() {
  const status = getApplicationStatus();
  const guides = TASKS.map((t) => ({
    id: t.id,
    title: t.title,
    guide: getSetting(`task${t.id}_guide`) || "",
  }));

  if (!status.open) {
    return (
      <div className="container-page py-16">
        <div className="card mx-auto max-w-xl p-8 text-center">
          <h1 className="text-xl font-bold text-navy-800">
            {status.phase === "before" ? "접수 기간이 아닙니다" : "접수가 마감되었습니다"}
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            접수 기간: {formatDateTime(status.window.start)} ~ {formatDateTime(status.window.end)}
          </p>
          {status.phase === "closed" && (
            <p className="mt-2 text-sm text-slate-500">
              이미 접수하신 경우{" "}
              <Link href="/lookup" className="font-semibold text-navy-700 underline">
                접수 조회
              </Link>{" "}
              페이지에서 확인하실 수 있습니다.
            </p>
          )}
          <div className="mt-6">
            <Link href="/" className="btn-outline">홈으로</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-navy-800">참여기업 신청 접수</h1>
        <p className="mt-2 text-sm text-slate-500">
          접수 마감: {formatDateTime(status.window.end)} · 표시(*)는 필수 항목입니다.
        </p>
        <ApplyForm guides={guides} />
      </div>
    </div>
  );
}
