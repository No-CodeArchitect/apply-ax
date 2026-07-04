// 입력 검증 유틸리티 (클라이언트/서버 공용)

/** 사업자등록번호에서 숫자만 추출 */
export function normalizeBizRegNo(raw: string): string {
  return (raw ?? "").replace(/[^0-9]/g, "");
}

/** 10자리 숫자인지 검증 (국세청 체크섬까지 검증) */
export function isValidBizRegNo(raw: string): boolean {
  const n = normalizeBizRegNo(raw);
  if (!/^\d{10}$/.test(n)) return false;
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(n[i]) * weights[i];
  sum += Math.floor((Number(n[8]) * 5) / 10);
  const check = (10 - (sum % 10)) % 10;
  return check === Number(n[9]);
}

/** 표시용 포맷 000-00-00000 */
export function formatBizRegNo(raw: string): string {
  const n = normalizeBizRegNo(raw);
  if (n.length !== 10) return raw;
  return `${n.slice(0, 3)}-${n.slice(3, 5)}-${n.slice(5)}`;
}

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v ?? "").trim());
}

export function isValidPhone(v: string): boolean {
  const n = (v ?? "").replace(/[^0-9]/g, "");
  return n.length >= 9 && n.length <= 11;
}

/** 비밀번호 정책: 8자 이상, 영문+숫자 포함 */
export function passwordIssue(pw: string): string | null {
  if (!pw || pw.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw))
    return "비밀번호는 영문과 숫자를 모두 포함해야 합니다.";
  return null;
}

export function requireText(v: string, label: string, max = 5000): string | null {
  const t = (v ?? "").trim();
  if (!t) return `${label} 항목을 입력해 주세요.`;
  if (t.length > max) return `${label} 항목이 너무 깁니다.`;
  return null;
}
