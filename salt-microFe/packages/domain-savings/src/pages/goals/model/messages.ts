/** 목표 목록 화면 문구 — 사실만 */
export const GOALS_PAGE = {
  title: "저축 목표",
  description: "목표마다 매달 얼마 · 언제쯤인지 서버가 계산해요",
  add: "새 목표",
  empty: "아직 목표가 없어요",
  emptyDescription: "템플릿을 고르면 금액과 기한으로 매달 넣을 돈을 계산해 드려요",
  signedOut: "로그인하면 목표를 볼 수 있어요",
  blockName: "저축 목표",
  retry: "다시 불러오기",
  /** 요약 띠(`FE-REQ-060` FR-2) — 값은 서버 `overview` */
  summaryLabel: "저축 요약",
  summary: {
    saved: "모은 돈",
    savedHint: (goals: number) => `목표 ${goals}개`,
    month: (month: string) => `${Number(month.slice(5, 7))}월에 넣은 돈`,
    active: "진행 중 목표",
    activeValue: (n: number) => `${n}개`,
    nearest: "가장 가까운 도달",
    none: "—",
    /** 띠 칸 하나만 실패 — 그 칸만(FR-13 `degraded`) */
    failed: "불러오지 못했어요",
  },
  list: "목표",
  preview: "고른 목표",
  previewEmpty: "왼쪽에서 목표를 고르면 여기에 보여요",
  openDetail: "자세히 보기",
  deposit: "넣기",
  /** 사이드 · 웹뷰 도구 */
  tools: "저축 도구",
  split: "나눠 넣기",
  splitHint: "진행 중 목표가 둘 이상일 때 한 번에 나눠 넣어요",
  postcardsCount: (n: number) => `${n}장`,
} as const;
