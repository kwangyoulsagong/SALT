/**
 * 시나리오 카드 뷰모델 — **순수 함수**(F017 v2 단계 5 · `BFF-REQ-052` FR-4 · `ADR-003` 소유자 전용).
 *
 * 서버 `GET /api/coach/scenario` 가 이미 칸 게이트를 했다. BFF 가 하는 일:
 *
 * 1. **막을 수만 있고 열 수는 없다.** `renderable: true` 인데 확률 · 범위 · 무효선 · 성적 중 하나라도 비었거나 모양이 틀리면
 *    그 지평만 `contract_incomplete` 로 닫는다. `true` 를 만드는 경로가 없다
 * 2. 지평 셋(1h · 4h · 1d)을 늘 준다 — 서버가 빠뜨린 지평은 `not_tested`
 * 3. 화면 문장의 재료만 정리한다 — "100번 중 n번" 칸 수(`upOutOf100`) · 확신 적중률 · 늘 오른다 비율(분모 = 확신 행)
 *
 * 하지 않는 것: 확률 · 가격 · 원화 계산(공통 수용 기준 3) · 게이트 판정 · 문구.
 */

export const SCENARIO_HORIZONS = ["1h", "4h", "1d"] as const;
export type ScenarioHorizon = (typeof SCENARIO_HORIZONS)[number];

export interface ScenarioTrack {
  origin: "backtest" | "live";
  calls: number;
  hits: number;
  alwaysUpHits: number;
  /** 확신 적중률 · 같은 때 늘 오른다 · 늘 안 오른다 비율(0~1). calls 0 이면 null.
   * '안 오른다' = 내렸거나 그대로(라벨이 r > 0 이라 그대로는 '안 오름'). 오른 비율이 50% 가 아니면 늘 오른다만으로는
   * 기준이 약하다 — 둘 중 큰 쪽이 '늘 같은 쪽을 말하기'의 성적(2026-11-11 @2 진단: 확신 99% 가 '안 오름' 쪽) */
  hitRate: number | null;
  alwaysUpRate: number | null;
  alwaysNotUpRate: number | null;
  window: { from: string; to: string } | null;
  misses: { asOf: string; symbol: string; pUp: number; realizedPct: number }[];
}

export interface ScenarioHorizonView {
  horizon: ScenarioHorizon;
  label: string;
  renderable: boolean;
  blockedReason: string | null;
  pUp: number | null;
  /** 100번 중 오른 번 — pUp × 100 반올림(분모 100 고정) */
  upOutOf100: number | null;
  range: { lowPct: number; midPct: number; highPct: number } | null;
  invalidation: number | null;
  refPrice: number | null;
  asOf: string | null;
  expiresAt: string | null;
  track: ScenarioTrack | null;
}

export type ScenarioResult =
  | { status: "ok"; symbol: string; market: "crypto" | "kr"; horizons: ScenarioHorizonView[]; disclaimer: string }
  | { status: "unavailable" };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

const LABEL_FALLBACK: Record<ScenarioHorizon, string> = { "1h": "다음 1시간", "4h": "다음 4시간", "1d": "다음 24시간" };

const track = (raw: unknown): ScenarioTrack | null => {
  if (!isObj(raw)) return null;
  const calls = num(raw.calls);
  const hits = num(raw.hits);
  const alwaysUpHits = num(raw.alwaysUpHits);
  if (calls === null || hits === null || alwaysUpHits === null || hits > calls || alwaysUpHits > calls) return null;
  const origin = raw.origin === "live" ? "live" : raw.origin === "backtest" ? "backtest" : null;
  if (origin === null) return null;
  const window =
    isObj(raw.window) && str(raw.window.from) && str(raw.window.to)
      ? { from: raw.window.from as string, to: raw.window.to as string }
      : null;
  const misses = (Array.isArray(raw.misses) ? raw.misses : []).flatMap((m) => {
    if (!isObj(m)) return [];
    const asOf = str(m.asOf);
    const symbol = str(m.symbol);
    const pUp = num(m.pUp);
    const realizedPct = num(m.realizedPct);
    return asOf && symbol && pUp !== null && realizedPct !== null ? [{ asOf, symbol, pUp, realizedPct }] : [];
  });
  return {
    origin,
    calls,
    hits,
    alwaysUpHits,
    hitRate: calls > 0 ? hits / calls : null,
    alwaysUpRate: calls > 0 ? alwaysUpHits / calls : null,
    alwaysNotUpRate: calls > 0 ? (calls - alwaysUpHits) / calls : null,
    window,
    misses,
  };
};

const closed = (h: ScenarioHorizon, label: string, reason: string, t: ScenarioTrack | null): ScenarioHorizonView => ({
  horizon: h,
  label,
  renderable: false,
  blockedReason: reason,
  pUp: null,
  upOutOf100: null,
  range: null,
  invalidation: null,
  refPrice: null,
  asOf: null,
  expiresAt: null,
  track: t,
});

const horizon = (h: ScenarioHorizon, raw: Obj | undefined): ScenarioHorizonView => {
  if (!raw) return closed(h, LABEL_FALLBACK[h], "not_tested", null);
  const label = str(raw.horizonLabel) ?? LABEL_FALLBACK[h];
  const t = track(raw.track);
  if (raw.renderable !== true) return closed(h, label, str(raw.blockedReason) ?? "not_tested", t);
  const pUp = num(raw.pUp);
  const r = isObj(raw.range) ? raw.range : null;
  const [lo, mid, hi] = r ? [num(r.lowPct), num(r.midPct), num(r.highPct)] : [null, null, null];
  const invalidation = num(raw.invalidation);
  const refPrice = num(raw.refPrice);
  const ok =
    pUp !== null &&
    pUp >= 0 &&
    pUp <= 1 &&
    lo !== null &&
    mid !== null &&
    hi !== null &&
    lo <= mid &&
    mid <= hi &&
    invalidation !== null &&
    refPrice !== null &&
    t !== null &&
    t.calls > 0 &&
    t.misses.length > 0; // 성적 · 빗나간 사례가 없으면 확률을 보이지 않는다(공통 수용 기준 1)
  if (!ok) return closed(h, label, "contract_incomplete", t);
  return {
    horizon: h,
    label,
    renderable: true,
    blockedReason: null,
    pUp,
    upOutOf100: Math.round(pUp * 100),
    range: { lowPct: lo, midPct: mid, highPct: hi },
    invalidation,
    refPrice,
    asOf: str(raw.asOf),
    expiresAt: str(raw.expiresAt),
    track: t,
  };
};

export const toScenarioViewModel = (raw: unknown): ScenarioResult => {
  if (!isObj(raw) || !Array.isArray(raw.horizons)) return { status: "unavailable" };
  const byKey = new Map<string, Obj>();
  for (const h of raw.horizons) if (isObj(h) && typeof h.horizon === "string") byKey.set(h.horizon, h);
  return {
    status: "ok",
    symbol: str(raw.symbol) ?? "",
    market: raw.market === "kr" ? "kr" : "crypto",
    horizons: SCENARIO_HORIZONS.map((h) => horizon(h, byKey.get(h))),
    disclaimer: str(raw.disclaimer) ?? "",
  };
};
