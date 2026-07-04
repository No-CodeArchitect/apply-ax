import ForgotClient from "./ForgotClient";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  const support = process.env.SUPPORT_CONTACT || "운영 담당자에게 문의해 주세요.";
  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold text-navy-800">비밀번호 찾기</h1>
        <p className="mt-2 text-sm text-slate-500">
          접수 시 등록한 사업자등록번호와 이메일을 입력하면 재설정 링크를 보내드립니다.
        </p>
        <ForgotClient support={support} />
      </div>
    </div>
  );
}
