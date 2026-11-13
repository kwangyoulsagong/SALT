/**
 * 시나리오 문구 — 모든 종목 · 지평 넷에 늘(F017 v4 순서 1 · `FE-REQ-064` FR-8 · `ADR-010` v4).
 *
 * 금지(공통 수용 기준 4): 확신 표현 · "오릅니다/내립니다" 단정 · "파세요/사세요" · 목표가 · 호재 · 악재.
 * 과거 실제 결과는 **예측이라 부르지 않는다** — "올랐어요"(지난 일)로만 말하고, 횟수와 % 를 같이 쓴다.
 * 모델 확률은 늘 기준 집합과 같이 말한다("이렇게 말한 때 100번 중 n번") — 숫자 혼자 나가지 않는다.
 */
export const SCENARIO_MESSAGES = {
  heading: "다음 시나리오",
  horizonGroupLabel: "기간 고르기",
  horizons: { "1h": "1시간", "4h": "4시간", "1d": "1일", "5d": "5일" } as const,
  source: { base_rate: "과거 실제 결과", model: "모델 확률" } as const,
  asOf: (when: string) => `${when} 기준`,
  // 큰 숫자 줄 — "100번 중" 은 위 줄, 숫자 뒤에 "번 올랐어요 (n%)"
  contextPast: (context: string) => `${context} · 100번 중`,
  contextModel: (label: string) => `${label} · 모델이 본 오를 확률`,
  upSuffix: "번 올랐어요",
  upPct: (up: number) => `(${up}%)`,
  upLabel: (up: number) => `오름 ${up}`,
  // '안 오름' = 내렸거나 그대로 — 라벨이 오름(r > 0)이라 그대로는 오름이 아니다(2026-11-11 @2 진단 — 1시간 11.5% 가 그대로)
  notUpLabel: (notUp: number) => `안 오름(내렸거나 그대로) ${notUp}`,
  // 과거 실제 결과 — 어느 때의 기록인가
  contextCondition: (phrase: string, label: string) => `${phrase} 뒤 · ${label}`,
  contextUsual: (label: string) => `평소 · ${label}`,
  fallback: (own: string, from: string) => `${own} 기록은 아직 없어 '${from}' 기준으로 대신 보여 드려요`,
  upRange: (low: number, high: number) => `기록이 더 쌓여도 100번 중 ${low}~${high}번 사이일 가능성이 커요`,
  differs: (usual: number, side: "higher" | "lower") => `평소(${usual}번)보다 ${side === "higher" ? "많아요" : "적어요"}`,
  usualToo: (usual: number) => `평소에도 ${usual}번이었어요`,
  sample: (days: string, rows: string) => `${days}일 동안의 기록 ${rows}건`,
  defectFew: (n: string) => `비슷한 상황이 아직 ${n}번뿐이에요 — 숫자로 말하기엔 적어요`,
  defectNone: "지금은 과거와 견줄 기록이 없어요",
  // 모델 확률
  oddsLine: (up: number) => `이렇게 말한 때 100번 중 ${up}번쯤 올랐어요 · ${100 - up}번은 안 올랐어요(내렸거나 그대로)`,
  rangeLine: (low: string, high: string, mid: string) => `10번 중 8번은 ${low} ~ ${high} 사이로 움직였어요(가운데 ${mid})`,
  invalidation: (price: string) => `${price} 아래로 내려가면 이 시나리오는 빗나간 쪽이에요`,
  invalidationPast: (price: string) => `${price} 아래면 과거 비슷한 때의 나빴던 10% 쪽이에요`,
  trackHeading: (origin: "backtest" | "live") => (origin === "live" ? "실제 성적" : "과거 검산 성적"),
  trackLine: (calls: number, hits: number) => `확신할 때 ${calls.toLocaleString("ko-KR")}번 말해 ${hits.toLocaleString("ko-KR")}번 맞혔어요`,
  trackThis: "이 시나리오",
  trackAlwaysUp: "늘 오른다",
  trackAlwaysNotUp: "늘 안 오른다",
  trackWindow: (from: string, to: string) => `${from} ~ ${to} · 확신 = 오를 확률 55% 이상 또는 45% 이하`,
  missesSummary: "빗나간 때",
  missLine: (date: string, symbol: string, p: string, realized: string) => `${date} ${symbol} — 오를 확률 ${p}였는데 ${realized}`,
  modelBlockedSummary: "모델 확률은 아직 안 보여요",
  blockedTrack: (calls: number, hitRate: string, alwaysUp: string, alwaysNotUp: string) =>
    `시험 성적: 확신할 때 ${calls.toLocaleString("ko-KR")}번 중 ${hitRate} 맞힘 · 같은 때 늘 오른다 ${alwaysUp} · 늘 안 오른다 ${alwaysNotUp}`,
  reasons: {
    no_skill: "시험에서 '늘 오른다'보다 잘 맞히지 못했어요",
    miscalibrated: "말한 확률과 실제 결과가 맞지 않았어요",
    no_edge_confident: "확신할 때도 '늘 오른다'보다 더 맞히지 못했어요",
    cost: "수수료를 빼면 남는 게 없었어요",
    placebo_failed: "시험 점검을 통과하지 못해 결과를 쓰지 않아요",
    shuffle_failed: "시험 점검을 통과하지 못해 결과를 쓰지 않아요",
    awaiting_live: "실제로 낸 예측을 쌓아 채점하는 중이에요 — 정한 날짜에 증명되면 확률을 보여 드려요",
    insufficient_history: "국내 장중 기록이 아직 짧아 이 기간은 시험하지 않았어요",
    live_underperforms: "실제로 써 보니 '늘 오른다'보다 못해서 껐어요",
    outside_universe: "시험한 종목(거래가 많은 종목) 밖이에요",
    stale: "최근 예측이 아직 없어요",
    not_tested: "아직 시험 결과가 없어요",
    contract_incomplete: "성적이나 빗나간 사례가 빠져 있어 보여 드리지 않아요",
  } as Record<string, string>,
  unavailable: "시나리오를 불러오지 못했어요",
} as const;
