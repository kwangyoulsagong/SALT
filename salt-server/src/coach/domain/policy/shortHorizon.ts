/**
 * 단타 방향 확률 — 시나리오 카드(F017 v2 단계 5 · `SRV-REQ-053` FR-5 · `FEATURE-017` FR-4). 소유자 전용(`ADR-003`).
 *
 * 숫자는 전부 예측 뷰(`forecast.v_short_horizon_cell` · `v_short_horizon_card`, 사전등록 `short-direction@1`)가 정한다.
 * **서버는 시험을 다시 하지 않는다** — 여기 있는 것은 "읽은 값을 화면에 내도 되나"뿐이다:
 * 칸(시장 × 지평)이 시험을 통과했고 · 시험이 3일 안이고 · 그 종목 예측이 만료 전이면 확률을 싣는다. 아니면 확률 · 범위 · 무효선은
 * `null` 이고 이유 하나(`blockedReason`)만 — 대칭 범위로 바꿔 채우지 않는다(사용자 *"상하 표준 범위면 고양이도 다 저렇게 생각하지"*).
 * 시험 성적(`track`)은 막혀도 싣는다 — "왜 방향을 말하지 않나"의 근거다. 출처(`backtest` · `live`)는 칸마다 하나, 합치지 않는다.
 */

/**
 * 사전등록 @2 — @1(365일 기후값 기준 · 날짜 안 셔플)이 시간봉에서 실력을 부풀렸다. @2 는 같은 기간을 이미 봤으므로 시험 통과는
 * 라이브 원장 발행 허가일 뿐이고, 화면 확률은 예측 배치가 정한 `live_ready`(등록 뒤 라이브 확신 ≥ 300 · 늘 오른다보다 나음 하한 > 0) 뒤
 */
export const SHORT_DIRECTION_KEY = "short-direction@2";
export const SCENARIO_HORIZONS = ["1h", "4h", "1d"] as const;
export type ScenarioHorizon = (typeof SCENARIO_HORIZONS)[number];
export type ScenarioMarket = "crypto" | "kr";

/** 칸 사유(예측 시험 — 사전등록 [decision] 순서) + 서버가 붙이는 셋 */
export const SCENARIO_BLOCKED_REASONS = [
  /** 라벨을 종목마다 8~30일 미뤄도 '실력'이 남는다 — 결과 무효(@2) */
  "placebo_failed",
  /** @1 의 셔플 점검 — @1 행을 읽을 일은 없지만 값 목록은 DB CHECK 와 같게 */
  "shuffle_failed",
  "no_skill",
  "miscalibrated",
  "no_edge_confident",
  "cost",
  "insufficient_history",
  "live_underperforms",
  /** 시험은 넘었지만 등록 뒤 라이브 성적이 아직 증명 전(확신 300 · 늘 오른다보다 나음) — 확률 없이 과거 검산 성적만 */
  "awaiting_live",
  /** 칸은 통과했는데 이 종목 예측이 없다 — 시험한 범위(코인 거래대금 상위 50 · 국내 상위 200) 밖 */
  "outside_universe",
  /** 예측이 만료됐거나 칸 시험이 3일 넘게 안 돌았다 */
  "stale",
  /** 칸 시험 행이 없다(배치가 아직 안 돌았다 · 모르는 값) */
  "not_tested",
] as const;
export type ScenarioBlockedReason = (typeof SCENARIO_BLOCKED_REASONS)[number];

/** 이보다 오래된 시험은 믿지 않는다 — 매일 배치가 3일 못 돌면 ✗ */
export const SCENARIO_CELL_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
/** 확신 구간 — 사전등록 [metrics] confident. 화면이 "확신할 때만 셌어요"를 말할 근거 */
export const SCENARIO_CONFIDENT = { up: 0.55, down: 0.45 } as const;

const HORIZON_LABEL: Record<ScenarioMarket, Record<ScenarioHorizon, string>> = {
  crypto: { "1h": "다음 1시간", "4h": "다음 4시간", "1d": "다음 24시간" },
  kr: { "1h": "다음 1시간", "4h": "다음 4시간", "1d": "다음 거래일 종가까지" },
};

/** `v_short_horizon_cell` 한 행 — 읽은 그대로 */
export interface ShortHorizonCellRow {
  market: ScenarioMarket;
  horizon: string;
  asOf: Date;
  modelVersion: string | null;
  status: string;
  blockedReason: string | null;
  /** 화면 허가 — 예측 배치가 정한다(서버는 라이브 표본을 다시 세지 않는다) */
  liveReady: boolean;
  windowFrom: Date | null;
  windowTo: Date | null;
  evalRows: number;
  trackOrigin: string;
  confidentCalls: number;
  confidentHits: number;
  alwaysUpHits: number;
  misses: unknown;
}

/** `v_short_horizon_card` 한 행(종목 × 지평 최신) — 읽은 그대로 */
export interface ShortHorizonPredictionRow {
  horizon: string;
  asOf: Date;
  modelVersion: string;
  pUp: number;
  q10: number;
  q50: number;
  q90: number;
  refPrice: number;
  invalidation: number;
  expiresAt: Date;
  renderable: boolean;
  blockedReason: string | null;
}

export interface ScenarioMiss {
  asOf: string;
  symbol: string;
  pUp: number;
  /** 실제 수익(%) — ln 수익을 화면 % 로 */
  realizedPct: number;
}

export interface ScenarioTrack {
  origin: "backtest" | "live";
  /** 확신 구간(p ≥ 0.55 · ≤ 0.45)에서 말한 수 · 맞힌 수 · 같은 때 '늘 오른다'가 맞은 수 */
  calls: number;
  hits: number;
  alwaysUpHits: number;
  window: { from: string; to: string } | null;
  misses: ScenarioMiss[];
}

export interface ScenarioHorizonView {
  horizon: ScenarioHorizon;
  horizonLabel: string;
  renderable: boolean;
  blockedReason: ScenarioBlockedReason | null;
  /** 아래 셋은 renderable 일 때만 — 아니면 null */
  pUp: number | null;
  /** 기준 가격 대비 %(하위 10 · 중앙 · 상위 10) — 비대칭은 데이터가 정한다 */
  range: { lowPct: number; midPct: number; highPct: number } | null;
  invalidation: number | null;
  refPrice: number | null;
  asOf: string | null;
  expiresAt: string | null;
  track: ScenarioTrack | null;
}

const isHorizon = (h: string): h is ScenarioHorizon => (SCENARIO_HORIZONS as readonly string[]).includes(h);
const isReason = (r: string | null): r is ScenarioBlockedReason =>
  r !== null && (SCENARIO_BLOCKED_REASONS as readonly string[]).includes(r);
const pct = (logReturn: number) => Math.round((Math.exp(logReturn) - 1) * 10_000) / 100;

const misses = (raw: unknown): ScenarioMiss[] =>
  Array.isArray(raw)
    ? raw.flatMap((m: unknown) => {
        if (typeof m !== "object" || m === null) return [];
        const { asOf, symbol, pUp, realized } = m as Record<string, unknown>;
        if (typeof asOf !== "string" || typeof symbol !== "string" || typeof pUp !== "number" || typeof realized !== "number")
          return []; // 모양이 다르면 버린다 — 지어내지 않는다
        return [{ asOf, symbol, pUp, realizedPct: pct(realized) }];
      })
    : [];

const track = (cell: ShortHorizonCellRow): ScenarioTrack | null =>
  cell.status === "not_tested" || cell.evalRows === 0
    ? null
    : {
        origin: cell.trackOrigin === "live" ? "live" : "backtest",
        calls: cell.confidentCalls,
        hits: cell.confidentHits,
        alwaysUpHits: cell.alwaysUpHits,
        window:
          cell.windowFrom && cell.windowTo
            ? { from: cell.windowFrom.toISOString(), to: cell.windowTo.toISOString() }
            : null,
        misses: misses(cell.misses),
      };

/**
 * 칸 하나 + 그 종목 예측 하나 → 화면 지평 하나. 막힘 순서: 칸 없음 → 칸 늦음 → 칸 못 넘음 → 라이브 증명 전 → 예측 없음 → 예측 만료/버전 다름.
 */
export const toScenarioHorizon = (
  market: ScenarioMarket,
  horizon: ScenarioHorizon,
  cell: ShortHorizonCellRow | undefined,
  prediction: ShortHorizonPredictionRow | undefined,
  now: Date
): ScenarioHorizonView => {
  const blocked = (reason: ScenarioBlockedReason, withTrack: ShortHorizonCellRow | undefined): ScenarioHorizonView => ({
    horizon,
    horizonLabel: HORIZON_LABEL[market][horizon],
    renderable: false,
    blockedReason: reason,
    pUp: null,
    range: null,
    invalidation: null,
    refPrice: null,
    asOf: null,
    expiresAt: null,
    track: withTrack ? track(withTrack) : null,
  });
  if (!cell) return blocked("not_tested", undefined);
  if (now.getTime() - cell.asOf.getTime() > SCENARIO_CELL_MAX_AGE_MS) return blocked("stale", cell);
  if (cell.status !== "pass") return blocked(isReason(cell.blockedReason) ? cell.blockedReason : "not_tested", cell);
  if (!cell.liveReady) return blocked("awaiting_live", cell);
  if (!prediction) return blocked("outside_universe", cell);
  const expired = prediction.expiresAt.getTime() <= now.getTime();
  if (!prediction.renderable || expired || prediction.modelVersion !== cell.modelVersion) return blocked("stale", cell);
  return {
    horizon,
    horizonLabel: HORIZON_LABEL[market][horizon],
    renderable: true,
    blockedReason: null,
    pUp: prediction.pUp,
    range: { lowPct: pct(prediction.q10), midPct: pct(prediction.q50), highPct: pct(prediction.q90) },
    invalidation: prediction.invalidation,
    refPrice: prediction.refPrice,
    asOf: prediction.asOf.toISOString(),
    expiresAt: prediction.expiresAt.toISOString(),
    track: track(cell),
  };
};

/** 시장 칸 행 · 종목 예측 행 → 지평 셋(늘 셋 — 없는 칸은 not_tested) */
export const toScenarioHorizons = (
  market: ScenarioMarket,
  cells: readonly ShortHorizonCellRow[],
  predictions: readonly ShortHorizonPredictionRow[],
  now: Date
): ScenarioHorizonView[] =>
  SCENARIO_HORIZONS.map((h) =>
    toScenarioHorizon(
      market,
      h,
      cells.find((c) => c.market === market && isHorizon(c.horizon) && c.horizon === h),
      predictions.find((p) => p.horizon === h),
      now
    )
  );
