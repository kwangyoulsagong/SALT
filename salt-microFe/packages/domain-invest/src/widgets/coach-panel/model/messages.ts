/** 목록 미리보기 조립 문구(F017 v4 순서 6 · `FE-REQ-064` FR-12). 숫자 · 문장은 서버 값 — 여기는 틀만 */
export const PREVIEW_MESSAGES = {
  /** "다음 시나리오 · 1일 · 과거 실제 결과" — 출처 칩이 결함 칸이면 빠진다 */
  scenarioHeading: (horizon: string, source: string | null) =>
    ["다음 시나리오", horizon, source].filter(Boolean).join(" · "),
  more: "자세히 보기",
  moreLabel: (name: string) => `${name} 자세히 보기`,
} as const;
