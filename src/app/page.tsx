import Link from "next/link";
import { TASKS } from "@/lib/tasks";
import { getApplicationStatus } from "@/lib/settings";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

function StatusBadge({ phase }: { phase: "before" | "open" | "closed" }) {
  const map = {
    before: { text: "접수 예정", cls: "bg-amber-100 text-amber-800" },
    open: { text: "접수 진행 중", cls: "bg-emerald-100 text-emerald-800" },
    closed: { text: "접수 마감", cls: "bg-slate-200 text-slate-600" },
  } as const;
  const m = map[phase];
  return <span className={`badge ${m.cls}`}>{m.text}</span>;
}

export default function HomePage() {
  const { phase, window } = getApplicationStatus();

  return (
    <div>
      {/* Hero */}
      <section className="bg-navy-800 text-white">
        <div className="container-page py-16 sm:py-20">
          <div className="mb-4">
            <StatusBadge phase={phase} />
          </div>
          <h1 className="text-2xl font-bold leading-snug sm:text-4xl">
            2026년 민군협력 AI 연구개발사업
            <br />
            참여기업(공동연구개발기관) 모집
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-navy-100 sm:text-base">
            서울대학교 산학협력단(공군 AX 협력센터)이 3개 거점 연구과제의 공동연구개발기관을
            모집합니다. 복수 과제 지원이 가능합니다.
          </p>
          <div className="mt-6 rounded-lg bg-navy-900/50 p-4 text-sm">
            <span className="text-navy-200">접수 기간</span>
            <span className="ml-3 font-semibold">
              {formatDateTime(window.start)} ~ {formatDateTime(window.end)}
            </span>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/apply" className="btn-accent">신청하기</Link>
            <Link href="/lookup" className="btn-outline bg-transparent text-white border-white/40 hover:bg-white/10">
              접수 조회·수정
            </Link>
          </div>
        </div>
      </section>

      {/* 과제 소개 */}
      <section className="container-page py-14">
        <h2 className="text-xl font-bold text-navy-800">모집 과제 (3개)</h2>
        <p className="mt-1 text-sm text-slate-500">각 과제별로 개별 접수되며, 복수 지원이 가능합니다.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {TASKS.map((t) => (
            <div key={t.id} className="card p-6">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-navy-100 text-sm font-bold text-navy-700">
                {t.id}
              </div>
              <h3 className="text-base font-semibold text-navy-800">{t.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{t.summary}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 안내 */}
      <section className="container-page pb-16">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="card p-6">
            <h3 className="text-base font-semibold text-navy-800">접수 방법</h3>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-slate-600">
              <li>「신청하기」에서 지원 과제를 선택합니다.</li>
              <li>기업 정보 및 제안서·사업자등록증 등 서류를 첨부합니다.</li>
              <li>사업자등록번호 단위로 비밀번호를 설정하여 제출합니다.</li>
              <li>제출 후 이메일로 접수 완료 안내를 받습니다.</li>
            </ol>
          </div>
          <div className="card p-6">
            <h3 className="text-base font-semibold text-navy-800">조회 및 수정</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              접수 후에는 「접수 조회·수정」에서 사업자등록번호와 비밀번호로 본인 확인 후 접수 내용을
              확인·수정할 수 있습니다. 비밀번호는 사업자등록번호 단위로 통일 관리되어, 여러 과제에
              지원해도 하나의 비밀번호를 사용합니다.
            </p>
            <p className="mt-3 text-xs text-slate-400">
              ※ 접수 마감 이후에는 조회만 가능하며 수정은 제한됩니다.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
