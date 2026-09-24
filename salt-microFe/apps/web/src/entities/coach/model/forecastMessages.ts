/**
 * 가격 변동 범위 카드 문구 (F008 `FE-REQ-038` · `ADR-003`).
 *
 * 금지(공통 수용 기준 4): 확신 표현 · "오릅니다/내립니다" 단정 · "파세요/사세요" · 목표가.
 * 이름은 "변동 범위 (방향 예측 아님)" — "예측" · "전망"이라 부르지 않는다(FEATURE-008 FR-67).
 */
export const FORECAST_MESSAGES = {
  heading: "변동 범위",
  badge: "방향 예측 아님",
  lead: "과거 가격 움직임으로 만든 범위예요. 90% 확률로 이 안에 있었던 폭입니다.",
  horizon: (weeks: number) => `${weeks}주 뒤`,
  now: "지금",
  weekTick: (weeks: number) => `${weeks}주`,
  live: "실시간",
  livePrice: (price: string) => `현재가 ${price}`,
  legend90: "90% 범위",
  legend50: "가운데 50%",
  legendMedian: "중앙값",
  weekPicker: "기간 고르기",
  readoutRange: "90% 범위",
  readoutMedian: "중앙값",
  tableCaption: "기간별 가격 범위",
  colPeriod: "기간",
  colLow: "하위 5%",
  colMedian: "중앙값",
  colHigh: "상위 5%",
  basePrice: (price: string, date: string) => `기준가 ${price} (${date} 종가)`,

  scenarioLead: (quantity: string) => `이 주에 판다면 — 보유 ${quantity}개 기준 평가금액 변화`,
  colBad: "나쁠 때",
  colGood: "좋을 때",

  trackHeading: "이 범위의 성적",
  trackKind: { backtest: "백테스트", live: "실제 기록" } as const,
  colHit: "실제로 맞은 비율",
  colWidth: "범위 폭",
  colSample: "표본",
  hitValue: (ratio: string) => `${ratio} (목표 90%)`,
  widthVsBaseline: (pct: string, wider: boolean) => `단순 예측보다 ${pct} ${wider ? "넓음" : "좁음"}`,
  widthSame: "단순 예측과 같음",
  sampleValue: (n: number) => `${n}주`,

  missesHeading: "빗나간 때",
  miss: (date: string, realized: string, low: string, high: string) =>
    `${date} — 실제 ${realized} (범위 ${low} ~ ${high})`,

  blockedHeading: "꺼 둔 기간",
  blockedReason: {
    insufficient_sample: "표본이 쌓이는 중",
    miscalibrated: "범위가 실제와 잘 맞지 않아 꺼 둠",
    stale_inputs: "데이터가 오래돼 꺼 둠",
    not_generated: "아직 계산 전",
    no_live_prediction: "아직 계산 전",
    contract_incomplete: "성적 정보가 모자라 꺼 둠",
    failure_cases_missing: "성적 정보가 모자라 꺼 둠",
  } as Record<string, string>,
  blockedFallback: "지금은 보여 드릴 수 없어요",

  unavailable: "변동 범위를 지금 불러올 수 없어요.",
  allBlocked: "지금은 모든 기간이 꺼져 있어요.",
} as const;
