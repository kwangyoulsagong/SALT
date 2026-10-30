/** 경계 이름 · 최소 높이. 추천 카드 자리(스켈레톤)와 같게 둔다(`FE-REQ-029` FR-72) */
export const COACH_REPORT_PAGE = {
  blockName: "코치 리포트",
  blockMinHeight: 320,
} as const;

/** 판정 근거 상세 경계 — 리포트와 같은 최소 높이(성적 칸 자리) */
export const SIGNAL_EVIDENCE_PAGE = {
  blockName: "판정 근거",
  blockMinHeight: 320,
} as const;
