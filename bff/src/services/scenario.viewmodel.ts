/**
 * 시나리오 뷰모델 — **순수 함수**(F017 v4 순서 1 · `BFF-REQ-052` FR-4 개정 · 서버 `SRV-REQ-053` FR-10).
 *
 * 서버 시나리오 칸(패널 응답 `scenario.horizons` — 칸별 BFF 경로는 2026-11-13 은퇴, F017 v4 1e)이 칸마다 출처를 정했다 — 모델 확률(소유자 + 시험을 넘은 칸) 또는 과거 실제 결과. BFF 가 하는 일:
 *
 * 1. **지평 넷(1h · 4h · 1d · 5d)을 늘 준다 · 칸이 비지 않는다.** 서버가 빠뜨렸거나 숫자 모양이 틀린 칸은 `tier: defect`
 *    (숫자 없이 "아직 n번뿐" 자리) — 숫자를 지어내지 않는다
 * 2. **모델 칸은 막을 수만 있고 열 수는 없다.** `source: model` 인데 확률 · 범위 · 틀리는 선 · 성적 · 빗나간 사례 중 하나라도
 *    비었으면 그 칸은 모델 확률로 나가지 않는다(`defect` + `contract_incomplete`). `model` 을 만드는 경로가 없다
 * 3. 화면 재료만 정리한다 — 두 출처가 같은 칸 이름(`upOutOf100` · `range` · `invalidation`)을 쓰게 · 빌려 온 지평의 이름
 *
 * 하지 않는 것: 확률 · 가격 · 원화 계산(공통 수용 기준 3) · 조건 판정 · 문구.
 */

export const SCENARIO_HORIZONS = ["1h", "4h", "1d", "5d"] as const;
export type ScenarioHorizon = (typeof SCENARIO_HORIZONS)[number];
export type ScenarioTier = "now" | "usual" | "longer" | "defect";

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

/** 과거 실제 결과의 근거 — 어느 조건 · 표본 */
export interface ScenarioBasis {
  /** 지금 성립한 조건. 평소 값이면 null */
  condition: { id: string; phrase: string } | null;
  sample: number;
  sampleEffective: number;
  sampleDays: number;
  /** 같은 지평 평소 — 100번 중 */
  usualUpOutOf100: number | null;
  differsFromUsual: "higher" | "lower" | null;
}

export interface ScenarioHorizonView {
  horizon: ScenarioHorizon;
  label: string;
  /** `model` = 시험을 넘은 모델 확률(소유자) · `base_rate` = 과거 실제 결과 */
  source: "model" | "base_rate";
  /** 어느 단을 썼나 — `defect` 면 숫자 칸이 전부 null */
  tier: ScenarioTier;
  /** 숫자를 빌려 온 지평과 그 이름("다음 거래일 종가까지"). 제 지평 값이면 null */
  fallbackFrom: ScenarioHorizon | null;
  fallbackLabel: string | null;
  /** 100번 중 오른 번(분모 100 고정) — 모델이면 확률 × 100 반올림 */
  upOutOf100: number | null;
  /** 100번 중 몇 번 사이(Wilson 95%) — 과거 실제 결과만 */
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
  /** 소유자에게만 — 모델 확률이 이 칸에 안 나오는 이유와 시험 성적 */
  modelBlocked: { reason: string; track: ScenarioTrack | null } | null;
}

export type ScenarioResult =
  | { status: "ok"; symbol: string; market: "crypto" | "kr"; horizons: ScenarioHorizonView[]; disclaimer: string }
  | { status: "unavailable" };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

const LABEL_FALLBACK: Record<ScenarioHorizon, string> = {
  "1h": "다음 1시간",
  "4h": "다음 4시간",
  "1d": "다음 24시간",
  "5d": "다음 5일",
};
const isHorizon = (v: unknown): v is ScenarioHorizon => (SCENARIO_HORIZONS as readonly unknown[]).includes(v);
const int100 = (v: unknown): number | null => {
  const n = num(v);
  return n !== null && Number.isInteger(n) && n >= 0 && n <= 100 ? n : null;
};
const range3 = (raw: unknown): ScenarioHorizonView["range"] => {
  if (!isObj(raw)) return null;
  const [lo, mid, hi] = [num(raw.lowPct), num(raw.midPct), num(raw.highPct)];
  return lo !== null && mid !== null && hi !== null && lo <= mid && mid <= hi ? { lowPct: lo, midPct: mid, highPct: hi } : null;
};

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

const modelBlocked = (raw: unknown): ScenarioHorizonView["modelBlocked"] =>
  isObj(raw) && raw.renderable !== true ? { reason: str(raw.blockedReason) ?? "not_tested", track: track(raw.track) } : null;

const defect = (
  h: ScenarioHorizon,
  label: string,
  basis: ScenarioBasis | null,
  blocked: ScenarioHorizonView["modelBlocked"],
): ScenarioHorizonView => ({
  horizon: h,
  label,
  source: "base_rate",
  tier: "defect",
  fallbackFrom: null,
  fallbackLabel: null,
  upOutOf100: null,
  upRange: null,
  range: null,
  invalidation: null,
  refPrice: null,
  asOf: null,
  pUp: null,
  expiresAt: null,
  track: null,
  basis,
  modelBlocked: blocked,
});

const basisOf = (raw: Obj): ScenarioBasis | null => {
  const sample = num(raw.sample);
  const sampleEffective = num(raw.sampleEffective);
  const sampleDays = num(raw.sampleDays);
  if (sample === null || sampleEffective === null || sampleDays === null) return null;
  const c = isObj(raw.condition) ? raw.condition : null;
  const id = c ? str(c.id) : null;
  const phrase = c ? str(c.phrase) : null;
  return {
    condition: id && phrase ? { id, phrase } : null,
    sample,
    sampleEffective,
    sampleDays,
    usualUpOutOf100: int100(raw.usualUp100),
    differsFromUsual: raw.differsFromUsual === "higher" || raw.differsFromUsual === "lower" ? raw.differsFromUsual : null,
  };
};

/** 모델 확률 칸 — 재료가 하나라도 없으면 null(열지 않는다) */
const modelCell = (h: ScenarioHorizon, label: string, raw: unknown): ScenarioHorizonView | null => {
  if (!isObj(raw) || raw.renderable !== true) return null;
  const pUp = num(raw.pUp);
  const range = range3(raw.range);
  const invalidation = num(raw.invalidation);
  const refPrice = num(raw.refPrice);
  const t = track(raw.track);
  // 성적 · 빗나간 사례가 없으면 확률을 보이지 않는다(공통 수용 기준 1)
  if (pUp === null || pUp < 0 || pUp > 1 || !range || invalidation === null || refPrice === null) return null;
  if (t === null || t.calls === 0 || t.misses.length === 0) return null;
  return {
    horizon: h,
    label,
    source: "model",
    tier: "now",
    fallbackFrom: null,
    fallbackLabel: null,
    upOutOf100: Math.round(pUp * 100),
    upRange: null,
    range,
    invalidation,
    refPrice,
    asOf: str(raw.asOf),
    pUp,
    expiresAt: str(raw.expiresAt),
    track: t,
    basis: null,
    modelBlocked: null,
  };
};

const horizon = (h: ScenarioHorizon, raw: Obj | undefined, labels: ReadonlyMap<string, string>): ScenarioHorizonView => {
  if (!raw) return defect(h, LABEL_FALLBACK[h], null, null);
  const label = str(raw.horizonLabel) ?? LABEL_FALLBACK[h];
  if (raw.source === "model") {
    return modelCell(h, label, raw.model) ?? defect(h, label, null, { reason: "contract_incomplete", track: null });
  }
  const blocked = modelBlocked(raw.model);
  const b = isObj(raw.baseRate) ? raw.baseRate : null;
  const basis = b ? basisOf(b) : null;
  const tier = raw.tier === "now" || raw.tier === "usual" || raw.tier === "longer" ? raw.tier : null;
  const up = b ? int100(b.upCount100) : null;
  const range = b ? range3(b.range) : null;
  // 숫자를 말하는 단인데 비율 · 범위 · 표본 중 하나라도 없으면 결함으로 — 지어내지 않는다
  if (!b || !basis || tier === null || up === null || !range) return defect(h, label, basis, blocked);
  const r = isObj(b.upRange) ? b.upRange : null;
  const [low, high] = r ? [int100(r.low100), int100(r.high100)] : [null, null];
  const from = tier === "longer" && isHorizon(raw.fallbackFrom) ? raw.fallbackFrom : null;
  if (tier === "longer" && from === null) return defect(h, label, basis, blocked);
  return {
    horizon: h,
    label,
    source: "base_rate",
    tier,
    fallbackFrom: from,
    fallbackLabel: from ? (labels.get(from) ?? LABEL_FALLBACK[from]) : null,
    upOutOf100: up,
    upRange: low !== null && high !== null && low <= up && up <= high ? { low, high } : null,
    range,
    invalidation: num(b.invalidation),
    refPrice: num(b.refPrice),
    asOf: str(b.asOf),
    pUp: null,
    expiresAt: null,
    track: null,
    basis,
    modelBlocked: blocked,
  };
};

export const toScenarioViewModel = (raw: unknown): ScenarioResult => {
  if (!isObj(raw) || !Array.isArray(raw.horizons)) return { status: "unavailable" };
  const byKey = new Map<string, Obj>();
  const labels = new Map<string, string>();
  for (const h of raw.horizons) {
    if (!isObj(h) || typeof h.horizon !== "string") continue;
    byKey.set(h.horizon, h);
    const label = str(h.horizonLabel);
    if (label) labels.set(h.horizon, label);
  }
  return {
    status: "ok",
    symbol: str(raw.symbol) ?? "",
    market: raw.market === "kr" ? "kr" : "crypto",
    horizons: SCENARIO_HORIZONS.map((h) => horizon(h, byKey.get(h), labels)),
    disclaimer: str(raw.disclaimer) ?? "",
  };
};
