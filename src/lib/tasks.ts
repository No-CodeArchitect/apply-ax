// 모집 과제 정의 (3개). 심사 관련 로직은 이 사이트에 존재하지 않는다.
export interface TaskInfo {
  id: number;
  title: string;
  short: string;
  summary: string;
}

export const TASKS: TaskInfo[] = [
  {
    id: 1,
    title: "AI 기반 ADTO 전투계획 작성 모델",
    short: "ADTO 전투계획",
    summary:
      "항공임무명령서(ADTO) 작성을 지원하는 AI 기반 전투계획 자동 생성 모델 개발 과제입니다.",
  },
  {
    id: 2,
    title: "AI 기반 이동표적(TEL) 위치추적 모델",
    short: "이동표적(TEL) 추적",
    summary:
      "이동식 발사대(TEL) 등 이동표적의 위치를 추적·예측하는 AI 모델 개발 과제입니다.",
  },
  {
    id: 3,
    title: "AI 기반 표적 자동식별 모델",
    short: "표적 자동식별",
    summary: "영상·센서 데이터로부터 표적을 자동 식별하는 AI 모델 개발 과제입니다.",
  },
];

export const TASK_IDS = TASKS.map((t) => t.id);

export function getTask(id: number): TaskInfo | undefined {
  return TASKS.find((t) => t.id === id);
}

export function taskTitle(id: number): string {
  return getTask(id)?.title ?? `과제 ${id}`;
}

// 첨부 서류 종류 정의
export interface DocType {
  key: string;
  label: string;
  required: boolean;
}

export const DOC_TYPES: DocType[] = [
  { key: "proposal", label: "제안서", required: true },
  { key: "biz_license", label: "사업자등록증", required: true },
];
