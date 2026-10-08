/**
 * 판정 성적표 문구 (F010 슬라이스 3 · `FE-REQ-040` FR-6 · `i18n-policy.md`).
 *
 * 성적 4요소 — **기간 · 표본 · 기준 대비 · 빗나간 사례**를 한 줄씩 늘 같이 쓴다(리서치 §9-3). 표본이 부족하면 적중률 숫자를
 * 감추되 **감춘 이유를 보인다** — 그것이 신뢰다. 좋다 · 나쁘다 · 믿어도 된다 같은 평가 문장은 없다.
 */
export const SCOREBOARD_MESSAGES = {
  heading: "판정 성적표",
  description: "관찰 기간이 끝난 종목 판단만 채점해요. 모든 사용자에게 같은 표예요",
  /** 서버 `signalType` → 이름. 매핑 없는 코드는 줄을 그리지 않는다 */
  signalTypes: {
    "scalp.review_short_opportunity": "단타 · 기회 후보",
    "scalp.wait": "단타 · 관망",
    "scalp.avoid": "단타 · 지금은 피하기",
    "long_term.review_accumulation": "장기 · 모아가기 후보",
    "long_term.wait": "장기 · 관망",
    "long_term.avoid": "장기 · 지금은 피하기",
  } as Record<string, string | undefined>,
  /** 자산군 머리(F011 FR-65) — 두 자산군이 같이 올 때만 그린다. 표본을 섞지 않고 나란히 둔다 */
  assetClasses: { crypto: "코인", kr_stock: "국내 주식" },
  sample: (count: number) => `채점 ${count}회`,
  /** 서버가 표본 부족이라고 한 그룹 — 적중률을 그리지 않는 이유 */
  lowSample: "아직 채점 표본이 적어 적중률을 보이지 않아요",
  winRate: (rate: string) => `적중 ${rate}`,
  excess: (points: string) => `늘 같은 행동 대비 ${points}`,
  avgReturn: (rate: string) => `평균 ${rate}`,
  horizon: (hours: number) => (hours % 24 === 0 ? `판단 뒤 ${hours / 24}일 기준` : `판단 뒤 ${hours}시간 기준`),
  missesHeading: "최근 빗나간 판정",
  missLine: (label: string, rate: string) => `${label} → 관찰 기간 ${rate}`,
  noMisses: "아직 빗나간 판정 기록이 없어요",
  empty: "관찰 기간이 끝난 판단이 아직 없어요. 단타는 하루, 장기는 30일 뒤부터 채점돼요",
  unavailable: "지금은 판정 성적표를 불러올 수 없어요",
  signedOut: "로그인하면 판정 성적표를 볼 수 있어요",
  generatedAt: (at: string) => `${at} 기준`,
} as const;
