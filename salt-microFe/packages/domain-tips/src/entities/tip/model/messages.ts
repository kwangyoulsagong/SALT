/** 금융 팁 글 문구 — 메타 이름 · 띠. 사실만(FEATURE-014 — 권유 · 명령형 0) */
export const TIP_MESSAGES = {
  source: "출처",
  writtenOn: "작성일",
  reviewedOn: "검수일",
  baseYear: "기준 연도",
  validUntil: "유효기한",
  officialLink: "공식 안내 보기",
  needsCheckTitle: "확인 필요",
  needsCheck: "유효기한이 지나 제도가 바뀌었을 수 있어요. 공식 안내로 지금 내용을 확인할 수 있어요",
  revisions: "바뀐 것",
  changesLabel: "앞 판과 달라진 줄",
  changeRemoved: "빠진 줄:",
  changeAdded: "들어온 줄:",
  disclaimer: "공적 제도를 설명하는 글이에요. 상품을 권하거나 가입을 돕지 않아요. 내 경우에 맞는지는 공식 안내로 확인할 수 있어요",
  baseYearValue: (year: number) => `${year}년`,
} as const;
