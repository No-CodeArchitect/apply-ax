# apply-ax — 참여기업(공동연구개발기관) 모집 접수 사이트

**2026년 민군협력 AI 연구개발사업** 참여기업 모집 접수를 위한 웹 애플리케이션입니다.
회원가입 없이 **사업자등록번호 + 비밀번호**로 접수·조회·수정하는 접수형 사이트이며,
심사(배점·순위)는 다루지 않고 **접수·데이터 관리**까지만 담당합니다.

- 주관: 서울대학교 산학협력단 (공군 AX 협력센터)
- 모집 과제 3개 (복수 지원 가능)
  1. AI 기반 ADTO 전투계획 작성 모델
  2. AI 기반 이동표적(TEL) 위치추적 모델
  3. AI 기반 표적 자동식별 모델

## 기술 스택

| 구분 | 사용 기술 |
|---|---|
| 프레임워크 | Next.js 15 (App Router, TypeScript) |
| DB | SQLite (better-sqlite3) — `data/apply-ax.db` 파일 기반 |
| 스타일 | Tailwind CSS |
| 비밀번호 해싱 | bcrypt (bcryptjs) |
| 세션 | JWT(jose) 기반 signed cookie — 신청자/관리자 세션 완전 분리 |
| 이메일 | nodemailer (SMTP) |
| 파일 저장 | 로컬 파일시스템 `/uploads` (DB에는 경로만 저장) |
| 엑셀/압축 | exceljs (XLSX), archiver (ZIP) |

## 빠른 시작

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 설정
```bash
cp .env.example .env
```
`.env`에서 최소한 `SESSION_SECRET`을 임의의 긴 문자열로 바꾸세요.
SMTP 값이 비어 있으면 메일은 **콘솔에 출력**되어 개발 중 흐름을 확인할 수 있습니다.

```bash
# SESSION_SECRET 생성 예시
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. 관리자 계정 시드
초기 관리자 3개 계정(`admin_airi`, `admin_af`, `admin_snu`)을 생성합니다.
**초기 비밀번호는 콘솔에 1회만 출력**되며 `must_change_password=true` 로 설정됩니다.
```bash
npm run seed
```
출력된 초기 비밀번호를 안전하게 보관하고, 최초 로그인 후 반드시 변경하세요.

### 4. 개발 서버 실행
```bash
npm run dev
# http://localhost:3000
```

### 5. 프로덕션 빌드
```bash
npm run build
npm start
```

## 주요 경로

| 경로 | 설명 |
|---|---|
| `/` | 메인/랜딩 (사업 개요, 과제 소개, 접수 기간) |
| `/apply` | 신청 접수 (과제 복수 선택, 서류 첨부, 비밀번호 설정/인증) |
| `/lookup` | 접수 조회 (사업자번호+비밀번호 인증, 상호·제출일시·제출자명만 표시) |
| `/edit/[id]` | 접수 수정 (조회 인증 세션 필요, 수정 이력 보존) |
| `/forgot-password` · `/reset-password` | 이메일 기반 비밀번호 재설정 |
| `/admin/login` | 관리자 로그인 |
| `/admin` | 관리자 대시보드 (요약·목록·필터·엑셀/ZIP 내보내기) |
| `/admin/submissions/[id]` | 접수 상세 (첨부 다운로드) |
| `/admin/settings` | 접수 기간·과제 안내 문구 설정 |

## 핵심 정책

- **비밀번호는 사업자등록번호 단위로 통일** — 여러 과제에 지원해도 비밀번호는 하나(`companies` 테이블).
- **중복 접수 차단** — 동일 사업자+동일 과제는 재접수 불가(수정 페이지로 안내), 다른 과제는 신규 접수 허용.
- **접수 조회**는 인증 후에만 노출되며 결과는 상호·제출일시·제출자명만 표시. 상세는 「수정하기」에서 확인.
- **마감 검증은 서버 시각 기준** — 마감 후 신규 접수·수정은 서버에서 자동 차단, 조회는 가능.
- **관리자 심사 기능 없음** — 조회/엑셀·ZIP 내보내기까지만 제공.
- 관리자 3계정 개별 발급 + **활동 로그**(로그인, 목록조회, 상세조회, 다운로드, 내보내기, 설정변경) 기록.

## 보안

- bcrypt 해싱, 평문 저장/로그 금지
- 신청자/관리자 세션 쿠키 이름 완전 분리 (`ax_applicant_session`, `ax_admin_session`)
- `/admin/*` 미들웨어 인증 보호
- 업로드 확장자 화이트리스트(pdf/hwp/hwpx/doc/docx) + 매직바이트(MIME) 검증, 파일당 20MB 제한
- 모든 상태변경 요청에 CSRF 토큰(double-submit) 검증
- 비밀번호 인증 5회 실패 시 10분 잠금

## 데이터/파일 위치

- SQLite DB: `data/apply-ax.db` (git 제외)
- 업로드 파일: `uploads/` (git 제외)

> 운영 배포 시 HTTPS 를 전제로 하며, `data/` 와 `uploads/` 디렉토리는 정기 백업을 권장합니다.
> 파일 저장 로직은 `src/lib/files.ts` 에 격리되어 있어 추후 S3 등으로 교체가 용이합니다.
