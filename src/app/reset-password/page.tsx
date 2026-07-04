import ResetClient from "./ResetClient";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold text-navy-800">비밀번호 재설정</h1>
        <p className="mt-2 text-sm text-slate-500">새 비밀번호를 입력해 주세요. (8자 이상, 영문+숫자)</p>
        <ResetClient token={token || ""} />
      </div>
    </div>
  );
}
