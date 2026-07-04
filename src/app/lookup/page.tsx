import LookupClient from "./LookupClient";

export const dynamic = "force-dynamic";

export default function LookupPage() {
  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-navy-800">접수 조회·수정</h1>
        <p className="mt-2 text-sm text-slate-500">
          사업자등록번호와 비밀번호로 본인 확인 후 접수 내역을 조회할 수 있습니다.
        </p>
        <LookupClient />
      </div>
    </div>
  );
}
