import nodemailer from "nodemailer";

// nodemailer 로 메일 발송. SMTP 환경변수가 비어 있으면 콘솔에 내용을 출력하여
// 개발 단계에서도 흐름을 확인할 수 있게 한다.
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  return transporter;
}

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  const from = process.env.SMTP_FROM || "공군 AX 협력센터 <no-reply@example.com>";
  const t = getTransporter();
  if (!t) {
    // SMTP 미설정 시 콘솔로 대체 (비밀번호/토큰 등 민감정보는 링크만 표시)
    console.log("─────────── [MAIL:미설정, 콘솔출력] ───────────");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    console.log("──────────────────────────────────────────────");
    return;
  }
  await t.sendMail({ from, to, subject, html });
}

const shell = (title: string, body: string) => `
  <div style="font-family:'Malgun Gothic',sans-serif;max-width:560px;margin:0 auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
    <div style="background:#233a5c;color:#fff;padding:20px 24px;font-size:16px;font-weight:bold">공군 AX 협력센터 · 참여기업 모집</div>
    <div style="padding:24px;color:#1f2937;font-size:14px;line-height:1.7">
      <h2 style="margin:0 0 16px;font-size:18px;color:#233a5c">${title}</h2>
      ${body}
    </div>
    <div style="padding:16px 24px;background:#f8fafc;color:#64748b;font-size:12px">
      본 메일은 발신 전용입니다. 문의는 접수 사이트의 안내를 참고해 주세요.
    </div>
  </div>`;

export async function sendSubmissionConfirmation(opts: {
  to: string;
  companyName: string;
  taskTitles: string[];
  submittedAt: string;
}) {
  const list = opts.taskTitles.map((t) => `<li>${t}</li>`).join("");
  const html = shell(
    "접수가 정상적으로 완료되었습니다",
    `<p><strong>${opts.companyName}</strong> 님, 아래 과제에 대한 접수가 완료되었습니다.</p>
     <ul>${list}</ul>
     <p>제출일시: <strong>${opts.submittedAt}</strong></p>
     <p>접수 내용은 <a href="${process.env.APP_BASE_URL || ""}/lookup">접수 조회·수정</a> 페이지에서
     사업자등록번호와 비밀번호로 확인·수정하실 수 있습니다.</p>`
  );
  await sendMail(opts.to, "[공군 AX] 참여기업 모집 접수 완료 안내", html);
}

export async function sendPasswordReset(opts: { to: string; link: string }) {
  const html = shell(
    "비밀번호 재설정 안내",
    `<p>아래 링크를 눌러 새 비밀번호를 설정해 주세요. 이 링크는 <strong>60분간</strong> 유효하며 1회만 사용할 수 있습니다.</p>
     <p style="margin:20px 0"><a href="${opts.link}" style="background:#233a5c;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">비밀번호 재설정</a></p>
     <p style="color:#64748b;font-size:12px">링크가 열리지 않으면 아래 주소를 복사해 접속하세요.<br>${opts.link}</p>
     <p style="color:#64748b;font-size:12px">본 요청을 하지 않으셨다면 이 메일을 무시하셔도 됩니다.</p>`
  );
  await sendMail(opts.to, "[공군 AX] 접수 비밀번호 재설정 안내", html);
}
