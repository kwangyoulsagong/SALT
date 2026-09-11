export const PORTFOLIO_MESSAGES = {
  loading: "Loading...",
  loadFailed: "분석 데이터를 불러오는 중 에러가 발생했습니다.",
  heading: "투자 분석",
  lastWeekCaption: "지난주 대비",
  /** 원문 오타(`덜 썻어요`)를 유지한다 — 문구 수정은 F000 의 범위다 (FR-36). */
  differenceLabel: (difference: number) => `${difference}% 덜 썻어요`,
  stockHeading: "주식",
  mismatchedShape:
    "데이터 형식이 올바르지 않거나 배열 길이가 일치하지 않습니다.",
  mismatchedCategory: "카테고리가 일치하지 않습니다.",
} as const;
