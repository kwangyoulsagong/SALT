/**
 * 시나리오 카드 문구 — 단타 방향 확률(F017 v2 단계 5 · `FE-REQ-064` FR-4 · `ADR-003` 소유자 전용).
 *
 * 금지(공통 수용 기준 4): 확신 표현 · "오릅니다/내립니다" 단정 · "파세요/사세요" · 목표가 · 호재 · 악재.
 * 확률은 늘 기준 집합과 같이 말한다("이렇게 말한 때 100번 중 n번") — 숫자 혼자 나가지 않는다.
 */
export const SCENARIO_MESSAGES = {
  heading: "다음 몇 시간 시나리오",
  horizonGroupLabel: "기간 고르기",
  horizons: { "1h": "1시간", "4h": "4시간", "1d": "1일" } as const,
  upProbability: "오를 확률",
  oddsLine: (up: number) => `이렇게 말한 때 100번 중 ${up}번쯤 올랐어요 · ${100 - up}번 내렸어요`,
  rangeLine: (label: string, low: string, high: string, mid: string) =>
    `${label} 가격은 보통 ${low} ~ ${high} 사이였어요(가운데 ${mid})`,
  rangeLabel: "10번 중 8번 들어온 폭",
  invalidation: (price: string) => `${price} 아래로 내려가면 이 시나리오는 빗나간 쪽이에요`,
  trackHeading: (origin: "backtest" | "live") => (origin === "live" ? "실제 성적" : "과거 검산 성적"),
  trackLine: (calls: number, hits: number) => `확신할 때 ${calls.toLocaleString("ko-KR")}번 말해 ${hits.toLocaleString("ko-KR")}번 맞혔어요`,
  trackThis: "이 시나리오",
  trackAlwaysUp: "늘 오른다",
  trackWindow: (from: string, to: string) => `${from} ~ ${to} · 확신 = 오를 확률 55% 이상 또는 45% 이하`,
  missesSummary: "빗나간 때",
  missLine: (date: string, symbol: string, p: string, realized: string) => `${date} ${symbol} — 오를 확률 ${p}였는데 ${realized}`,
  blockedTitle: "지금은 방향이 안 보여요",
  blockedTrack: (calls: number, hitRate: string, alwaysUp: string) =>
    `시험 성적: 확신할 때 ${calls.toLocaleString("ko-KR")}번 중 ${hitRate} 맞힘 · 늘 오른다 ${alwaysUp}`,
  reasons: {
    no_skill: "시험에서 '늘 오른다'보다 잘 맞히지 못했어요",
    miscalibrated: "말한 확률과 실제 결과가 맞지 않았어요",
    no_edge_confident: "확신할 때도 '늘 오른다'보다 더 맞히지 못했어요",
    cost: "수수료를 빼면 남는 게 없었어요",
    placebo_failed: "시험 점검을 통과하지 못해 결과를 쓰지 않아요",
    shuffle_failed: "시험 점검을 통과하지 못해 결과를 쓰지 않아요",
    awaiting_live: "과거 검산은 넘었지만, 실제로 낸 예측 성적이 쌓일 때까지 확률은 보여 드리지 않아요",
    insufficient_history: "국내 장중 기록이 아직 짧아 이 기간은 시험하지 않았어요",
    live_underperforms: "실제로 써 보니 '늘 오른다'보다 못해서 껐어요",
    outside_universe: "시험한 종목(거래가 많은 종목) 밖이에요",
    stale: "최근 예측이 아직 없어요",
    not_tested: "아직 시험 결과가 없어요",
    contract_incomplete: "성적이나 빗나간 사례가 빠져 있어 보여 드리지 않아요",
  } as Record<string, string>,
  unavailable: "시나리오를 불러오지 못했어요",
} as const;
