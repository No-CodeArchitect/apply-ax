import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// 업로드 파일 저장 및 검증. DB 에는 경로만 저장하며, 추후 S3 등으로 교체하기 쉽도록
// 저장 로직을 이 모듈에 격리한다.
// UPLOAD_DIR 환경변수가 있으면 그 경로에 업로드 파일을 저장한다 (영구 디스크용).
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
export const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB

const ALLOWED_EXT = ["pdf", "hwp", "hwpx", "doc", "docx"] as const;

function ext(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

// 확장자별 허용 시그니처(매직바이트)
function signatureOk(buf: Buffer, extension: string): boolean {
  const isPdf = buf.length >= 4 && buf.toString("ascii", 0, 4) === "%PDF";
  const isZip = buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b; // PK (docx, hwpx)
  const isOle =
    buf.length >= 8 &&
    buf[0] === 0xd0 &&
    buf[1] === 0xcf &&
    buf[2] === 0x11 &&
    buf[3] === 0xe0; // OLE 복합문서 (doc, hwp)
  switch (extension) {
    case "pdf":
      return isPdf;
    case "docx":
    case "hwpx":
      return isZip;
    case "doc":
      return isOle;
    case "hwp":
      // 구형 hwp 는 OLE, 일부는 자체 시그니처 → OLE 또는 "HWP Document" 텍스트 허용
      return isOle || buf.toString("binary", 0, 16).includes("HWP");
    default:
      return false;
  }
}

export interface StoredFile {
  file_name: string;
  file_path: string; // uploads 기준 상대경로
  size: number;
}

export interface UploadResult {
  ok: boolean;
  error?: string;
  stored?: StoredFile;
}

/** FormData 의 File 을 검증 후 저장한다. 빈 파일이면 ok=true, stored=undefined. */
export async function saveUpload(file: File | null): Promise<UploadResult> {
  if (!file || file.size === 0) return { ok: true };
  const extension = ext(file.name);
  if (!ALLOWED_EXT.includes(extension as (typeof ALLOWED_EXT)[number])) {
    return { ok: false, error: `허용되지 않는 파일 형식입니다: ${file.name} (PDF/HWP/HWPX/DOC/DOCX 만 가능)` };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: `파일당 20MB 를 초과할 수 없습니다: ${file.name}` };
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (!signatureOk(buf, extension)) {
    return { ok: false, error: `파일 내용이 확장자와 일치하지 않습니다(위조 의심): ${file.name}` };
  }

  try {
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const rand = crypto.randomBytes(12).toString("hex");
    const storedName = `${Date.now()}_${rand}.${extension}`;
    const abs = path.join(UPLOAD_DIR, storedName);
    await fs.promises.writeFile(abs, buf);
    return {
      ok: true,
      stored: { file_name: file.name, file_path: storedName, size: file.size },
    };
  } catch (e) {
    console.error("[files] 저장 실패:", UPLOAD_DIR, (e as Error).message);
    return { ok: false, error: "첨부파일을 서버에 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}

/** 저장된 파일의 절대 경로 (다운로드용). 디렉토리 이탈 방지. */
export function resolveUploadPath(relPath: string): string | null {
  const safe = path.basename(relPath); // 경로 조작 방지
  const abs = path.join(UPLOAD_DIR, safe);
  if (!abs.startsWith(UPLOAD_DIR)) return null;
  if (!fs.existsSync(abs)) return null;
  return abs;
}

export function deleteUpload(relPath: string): void {
  const abs = resolveUploadPath(relPath);
  if (abs) {
    try {
      fs.unlinkSync(abs);
    } catch {
      /* 무시 */
    }
  }
}
