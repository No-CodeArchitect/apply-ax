import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "2026 민군협력 AI 연구개발사업 참여기업 모집",
  description:
    "공군 AX 협력센터 · 서울대학교 산학협력단 — 참여기업(공동연구개발기관) 모집 접수 사이트",
};

function BrandLogo() {
  // 로고 placeholder — 추후 /public/logos 의 실제 이미지로 교체 가능
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-navy-700 text-sm font-bold text-white">
        AX
      </div>
      <div className="leading-tight">
        <div className="text-sm font-bold text-navy-800">공군 AX 협력센터</div>
        <div className="text-[11px] text-slate-500">서울대학교 산학협력단</div>
      </div>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col">
        <header className="border-b border-slate-200 bg-white">
          <div className="container-page flex h-16 items-center justify-between">
            <Link href="/" className="focus:outline-none">
              <BrandLogo />
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/apply" className="btn-ghost">신청하기</Link>
              <Link href="/lookup" className="btn-ghost">접수 조회·수정</Link>
              <Link href="/admin/login" className="btn-ghost text-slate-400">관리자</Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-16 border-t border-slate-200 bg-white">
          <div className="container-page py-8 text-xs leading-relaxed text-slate-500">
            <p className="font-semibold text-slate-600">
              공군 AX 거점 · 서울대학교 공군 AX 협력센터
            </p>
            <p className="mt-1">
              본 사이트는 2026년 민군협력 AI 연구개발사업 참여기업(공동연구개발기관) 접수 전용입니다.
            </p>
            <p className="mt-3 text-slate-400">
              © 2026 Seoul National University Industry Foundation. All rights reserved.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
