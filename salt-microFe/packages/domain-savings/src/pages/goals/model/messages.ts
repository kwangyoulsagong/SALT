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

  list: "목표",
  preview: "고른 목표",
  previewEmpty: "왼쪽에서 목표를 고르면 여기에 보여요",
  openDetail: "자세히 보기",
  deposit: "넣기",
  /** 사이드 이름 — 도구 문구는 `widgets/goal-tools` */
  tools: "저축 도구",
  /** 목표가 없을 때(2026-11-20 — 한 줄만 있던 빈 화면을 템플릿 고르기로, 리서치: 목적 템플릿 카드 + 예시 + 행동) */
  start: {
    title: "어떤 돈을 모을까요?",
    description: "고르면 금액과 기한으로 매달 넣을 돈을 계산해 드려요. 계산은 서버가 해요.",
    templatesLabel: "목표 템플릿",
    /** 템플릿 한 줄 설명 — 무엇을 모으는 칸인지만(금액 · 권유 0) */
    hints: {
      wedding: "식 · 예물 · 신혼 살림",
      housing: "보증금 · 이사 · 계약금",
      first_car: "차값 · 등록 · 보험",
      travel: "항공 · 숙소 · 여행 경비",
      emergency: "갑자기 필요한 돈",
      childbirth: "출산 · 육아 준비",
      other: "이름을 직접 정해요",
    },
    sampleTitle: "목표를 만들면 이렇게 보여요",
    sample: "예시",
    sampleRows: ["목표 하나", "목표 둘"],
  },
} as const;
