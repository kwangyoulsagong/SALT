/**
 * 시나리오 칸 — BFF 한 장 패널 `GET /api/app/ai-coach/panel` 의 `scenario.horizons`(F017 v4 · `BFF-REQ-052` FR-6 · `FE-REQ-064` FR-8). 칸별 경로 `/scenario` 는 2026-11-13 은퇴.
 *
 * 모든 종목 · 지평 넷(1시간 · 4시간 · 1일 · 5일)에 늘. 칸마다 출처: 과거 실제 결과(`base_rate`) 또는 시험을 넘은 모델 확률
 * (`model` — 소유자만, `ADR-003`). 숫자는 전부 예측 배치와 서버가 정했다 — 화면은 그리기만 한다.
 * 숫자를 말할 수 없는 칸은 `tier: defect`(숫자 칸 전부 `null` · "아직 n번뿐") — 대칭 범위로 채우지 않는다.
 */

export type ScenarioHorizonKey = "1h" | "4h" | "1d" | "5d";
/** 어느 단을 썼나 — 지금 조건 · 평소 · 한 단계 긴 지평 · 결함 */
export type ScenarioTier = "now" | "usual" | "longer" | "defect";

export interface ScenarioTrack {
  /** `backtest` = 과거 검산(시험 기간 OOS) · `live` = 실제로 낸 예측. 합치지 않는다 */
  origin: "backtest" | "live";
  /** 확신 구간(오를 확률 ≥ 55% · ≤ 45%)에서 말한 수 · 맞힌 수 · 같은 때 '늘 오른다'가 맞은 수 */
  calls: number;
  hits: number;
  alwaysUpHits: number;
  hitRate: number | null;
  alwaysUpRate: number | null;
  /** 같은 확신 행에서 늘 '안 오른다'(내렸거나 그대로)를 말했을 때 — 오른 비율이 50% 가 아니면 이쪽이 더 센 기준일 수 있다 */
  alwaysNotUpRate: number | null;
  window: { from: string; to: string } | null;
  misses: { asOf: string; symbol: string; pUp: number; realizedPct: number }[];
}

/** 과거 실제 결과의 근거 — 어느 조건 · 표본 */
export interface ScenarioBasis {
  /** 지금 성립한 조건(서버 문구). 평소 값이면 null */
  condition: { id: string; phrase: string } | null;
  sample: number;
  sampleEffective: number;
  sampleDays: number;
  usualUpOutOf100: number | null;
  /** 예측이 다중검정을 통과시킨 조건만 */
  differsFromUsual: "higher" | "lower" | null;
}

export interface ScenarioHorizonView {
  horizon: ScenarioHorizonKey;
  label: string;
  source: "model" | "base_rate";
  tier: ScenarioTier;
  /** 숫자를 빌려 온 지평과 그 이름 — 제 지평 값이면 null */
  fallbackFrom: ScenarioHorizonKey | null;
  fallbackLabel: string | null;
  /** 100번 중 오른 번(분모 100 고정) */
  upOutOf100: number | null;
  /** 100번 중 몇 번 사이(95%) — 과거 실제 결과만 */
  upRange: { low: number; high: number } | null;
  /** 기준 가격 대비 %(하위 10 · 중앙 · 상위 10) */
  range: { lowPct: number; midPct: number; highPct: number } | null;
  invalidation: number | null;
  refPrice: number | null;
  asOf: string | null;
  /** 모델 확률만 */
  pUp: number | null;
  expiresAt: string | null;
  track: ScenarioTrack | null;
  /** 과거 실제 결과만 */
  basis: ScenarioBasis | null;
  /** 소유자에게만 — 모델 확률이 이 칸에 안 나오는 이유 코드와 시험 성적. 문장은 화면 메시지 표가 고른다 */
  modelBlocked: { reason: string; track: ScenarioTrack | null } | null;
}

// `SymbolScenarioResult`(칸별 시나리오 경로 응답)는 2026-11-13 지웠다 — 칸은 한 장 패널 응답(`coachPanel.ts`) 안에 온다(F017 v4 1e)
