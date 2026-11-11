/**
 * 시나리오 카드 — BFF `GET /api/app/ai-coach/scenario` 응답(F017 v2 단계 5 · `BFF-REQ-052` FR-4 · `ADR-003` 소유자 전용).
 *
 * 다음 1시간 · 4시간 · 1일 오를 확률. 숫자는 전부 예측 시험(사전등록 `short-direction@1`)과 서버가 정했다 — 화면은 그리기만 한다.
 * 막힌 지평은 확률 · 범위 · 무효선이 `null` 이고 이유 코드 하나 — 대칭 범위로 채우지 않는다.
 */

export type ScenarioHorizonKey = "1h" | "4h" | "1d";

export interface ScenarioTrack {
  /** `backtest` = 과거 검산(시험 기간 OOS) · `live` = 실제로 낸 예측. 합치지 않는다 */
  origin: "backtest" | "live";
  /** 확신 구간(오를 확률 ≥ 55% · ≤ 45%)에서 말한 수 · 맞힌 수 · 같은 때 '늘 오른다'가 맞은 수 */
  calls: number;
  hits: number;
  alwaysUpHits: number;
  hitRate: number | null;
  alwaysUpRate: number | null;
  window: { from: string; to: string } | null;
  misses: { asOf: string; symbol: string; pUp: number; realizedPct: number }[];
}

export interface ScenarioHorizonView {
  horizon: ScenarioHorizonKey;
  label: string;
  renderable: boolean;
  /** 막힌 이유 코드(서버 · BFF). 문장은 화면 메시지 표가 고른다 */
  blockedReason: string | null;
  pUp: number | null;
  upOutOf100: number | null;
  /** 기준 가격 대비 %(하위 10 · 중앙 · 상위 10) */
  range: { lowPct: number; midPct: number; highPct: number } | null;
  invalidation: number | null;
  refPrice: number | null;
  asOf: string | null;
  expiresAt: string | null;
  track: ScenarioTrack | null;
}

export type SymbolScenarioResult =
  | { status: "ok"; symbol: string; market: "crypto" | "kr"; horizons: ScenarioHorizonView[]; disclaimer: string }
  | { status: "unavailable" };
