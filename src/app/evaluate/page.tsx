"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

interface ReviewerInfo {
  name: string;
  group: string;
  org: string | null;
}

const GROUP_LABEL: Record<string, string> = {
  snu: "서울대학교",
  airforce: "대한민국 공군",
  aihub: "AI허브",
};

function EvaluateEntry() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reviewer, setReviewer] = useState<ReviewerInfo | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/evaluate/auth?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setReviewer(data.reviewer);
          setLoading(false);
        } else {
          setError(data.message || "인증에 실패했습니다.");
          setLoading(false);
        }
      })
      .catch(() => {
        setError("서버 오류가 발생했습니다.");
        setLoading(false);
      });
  }, [token]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const res = await fetch("/api/evaluate/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.ok) {
        router.replace("/evaluate/tasks");
      } else {
        setError(data.message || "인증에 실패했습니다.");
        setConfirming(false);
      }
    } catch {
      setError("서버 오류가 발생했습니다.");
      setConfirming(false);
    }
  };

  if (token && loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-navy-200 border-t-navy-700" />
          <p className="mt-4 text-sm text-slate-600">인증 중입니다...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="card mx-4 max-w-md p-8 text-center">
          <div className="text-3xl">&#x26A0;&#xFE0F;</div>
          <h1 className="mt-3 text-lg font-bold text-navy-800">접속 오류</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <p className="mt-4 text-xs text-slate-400">
            문제가 지속되면 사무국에 문의해 주세요.
          </p>
        </div>
      </div>
    );
  }

  if (reviewer) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="card mx-4 w-full max-w-md p-8">
          <h1 className="text-center text-lg font-bold text-navy-800">
            심사위원 본인 확인
          </h1>
          <p className="mt-2 text-center text-sm text-slate-500">
            2026년 민군협력 AI 연구개발사업 서면평가
          </p>

          <div className="mt-6 rounded-lg border border-navy-100 bg-navy-50/50 p-5">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">성명</dt>
                <dd className="font-semibold text-navy-800">{reviewer.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">소속 구분</dt>
                <dd className="font-semibold text-navy-800">
                  {GROUP_LABEL[reviewer.group] || reviewer.group}
                </dd>
              </div>
              {reviewer.org && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">소속 기관</dt>
                  <dd className="font-semibold text-navy-800">{reviewer.org}</dd>
                </div>
              )}
            </dl>
          </div>

          <p className="mt-5 text-center text-sm text-slate-600">
            위 정보가 본인이 맞으시면 아래 버튼을 눌러 평가를 시작해 주세요.
          </p>

          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="btn-primary mt-5 w-full"
          >
            {confirming ? "접속 중..." : "본인이 맞습니다 — 평가 시작"}
          </button>

          <p className="mt-4 text-center text-xs text-slate-400">
            본인이 아니거나 정보가 다른 경우, 사무국에 문의해 주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="card mx-4 max-w-md p-8 text-center">
        <h1 className="text-lg font-bold text-navy-800">심사위원 평가 시스템</h1>
        <p className="mt-2 text-sm text-slate-600">
          이메일로 받으신 평가 링크를 통해 접속해 주세요.
        </p>
        <p className="mt-4 text-xs text-slate-400">
          링크를 받지 못하셨다면 사무국에 문의해 주세요.
        </p>
      </div>
    </div>
  );
}

export default function EvaluatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-navy-200 border-t-navy-700" />
        </div>
      }
    >
      <EvaluateEntry />
    </Suspense>
  );
}
