"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getCsrfToken } from "@/lib/client";

export default function DeleteSubmissionButton({
  submissionId,
  label,
  redirectTo,
  className,
}: {
  submissionId: number;
  label: string; // 확인창에 표시할 대상 (예: "접수 #3 · 테스트기업")
  redirectTo?: string; // 삭제 후 이동할 경로 (없으면 목록 새로고침)
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`${label}\n\n이 접수 건을 삭제하시겠습니까?\n첨부파일도 함께 삭제되며 복구할 수 없습니다.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/submissions/${submissionId}`, {
        method: "DELETE",
        headers: { "x-csrf-token": getCsrfToken() },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      } else {
        alert(data.message || "삭제에 실패했습니다.");
      }
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={busy}
      className={
        className ||
        "inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      }
    >
      {busy ? "삭제 중…" : "삭제"}
    </button>
  );
}
