/**
 * 목표 비중 안내 뷰모델 — **순수 함수** (F010 슬라이스 5 · `BFF-REQ-041`).
 *
 * 서버 `/coach/target-weights`(`SRV-REQ-024` FR-182~186)는 보유 + BTC · ETH 를 변동성만으로 나눈 목표 비중과 지금의 차를
 * 원 · 수량으로 준다. 금액 · 비중 · 판정은 전부 서버 값이다. BFF 가 하는 일:
 *
 * 1. **3종 고지 게이트** — 근거(행마다 σ) · 과거 성적(`record.strategy` · `holdBtc`) · 실패 사례(`missedUpside` ·
 *    `worstMonths` 각 1건 이상) 중 하나라도 없으면 비중을 옮기지 않는다(`blocked`). 서버가 `renderable: false` 여도 같다
 * 2. 깨진 행은 뺀다 — 모르는 `status`, 0~1 밖 비중, σ 없는 행. 0 으로 채우지 않는다
 * 3. `claims`(화면이 쓸 수 있는 문장 조건)는 **서버 값만** 옮긴다. 모르면 `false` — "나았다"는 주장은 서버만 한다
 *
 * 4. **과거 성적 자리** — 서버 `recordSource: "live"` 이고 라이브 요약이 온전할 때(30주 이상 · 누적 수익 · 낙폭 · 실패 주
 *    1건 이상)만 `live`. 하나라도 비면 백테스트 기록으로 남긴다 — 라이브를 반쯤 보이지 않는다(`target-weight@2` [live.display])
 *
 * 하지 않는 것: 비중 · 금액 · 수량 계산, 문장 만들기. 알트는 규칙 밖이다(`target-weight@2` 채택 없음) — 서버가
 * `excluded.reason = no_record` 로 주고 판정 기록(`altShare`)을 같이 준다. 알트 비중은 어디에도 없다.
 *
 * 여기에는 import 가 없다(`symbol-coach.viewmodel.ts` 와 같은 이유).
 */

type Raw = Record<string, unknown>;

const isRecord = (value: unknown): value is Raw =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const str = (value: unknown): string | null => (typeof value === "string" && value !== "" ? value : null);
const rate01 = (value: unknown): number | null => {
  const n = num(value);
  return n !== null && n >= 0 && n <= 1 ? n : null;
};

const ROW_STATUS = ["under", "over", "at", "no_room"] as const;
const EXCLUDED_REASON = ["volatility_unavailable", "price_unavailable", "no_record"] as const;
const LIVE_MIN_WEEKS_FLOOR = 30;
const MONTH = /^\d{4}-\d{2}$/;

export interface TargetWeightRow {
  symbol: string;
  held: boolean;
  core: boolean;
  sigma: number;
  btcBeta: number | null;
  priceKrw: number;
  targetWeight: number;
  currentWeight: number;
  gapWeight: number;
  /** 부족분을 쓸 수 있는 돈 안으로 줄였다(서버 판정) */
  gapCapped: boolean;
  targetValueKrw: number;
  currentValueKrw: number;
  gapValueKrw: number;
  gapQuantity: number;
  status: (typeof ROW_STATUS)[number];
  stopPriceKrw: number | null;
  lossAtStopKrw: number | null;
  sigmaBand: { low: number; high: number } | null;
}

export interface TargetWeightMonth {
  month: string;
  strategy: number;
  btc: number;
  exposure: number | null;
}

export interface TargetWeightRecordView {
  target: number;
  strategy: { cagr: number; vol: number; mdd: number; upside: number; exposureMean: number | null };
  holdBtc: { cagr: number; mdd: number };
  claims: { lessDrawdown: boolean; timing: boolean; targetHit: boolean };
  missedUpside: TargetWeightMonth[];
  worstMonths: TargetWeightMonth[];
  window: { from: string; to: string } | null;
  preregKey: string | null;
  feeRatePerSide: number | null;
}

export interface TargetWeightAltShareView {
  preregKey: string;
  /** `null` = 채택 없음 — 알트에는 목표 비중이 없다 */
  adopted: number | null;
  primaryTarget: number | null;
  candidates: Array<{ altShare: number; deltaCalmar: [number, number, number]; cagr: number | null; coreCagr: number | null }>;
  survivorshipBias: boolean;
}

export interface TargetWeightLiveView {
  target: number;
  firstRebalanceAt: string | null;
  nWeeks: number;
  minWeeks: number;
  nExcluded: number;
  cumReturn: number | null;
  btcCumReturn: number | null;
  mdd: number | null;
  btcMdd: number | null;
  upside: number | null;
  worstWeeks: Array<{ rebalanceAt: string; strategy: number; btc: number }>;
}

export interface TargetWeightView {
  status: "ok" | "no_capital";
  basis: "investable_capital" | "crypto_value";
  capitalKrw: number | null;
  capitalBelowHoldings: boolean;
  rows: TargetWeightRow[];
  excluded: Array<{
    symbol: string;
    held: boolean;
    reason: (typeof EXCLUDED_REASON)[number];
    currentValueKrw: number | null;
  }>;
  totals: {
    targetExposure: number | null;
    currentExposure: number | null;
    cashTargetWeight: number | null;
    targetBetaSum: number | null;
    betaCoveredWeight: number | null;
    lossAtStopTotalKrw: number | null;
    lossAtStopMonthlyBudgetRate: number | null;
    outsideRuleWeight: number | null;
    fundableKrw: number | null;
  };
  targetVolatility: number | null;
  targetVolatilityIsDefault: boolean;
  maxSingleAssetWeight: number | null;
  expiresAt: string | null;
  volatilityAsOf: string | null;
  record: TargetWeightRecordView;
  /** 알트 몫 판정 기록. 서버가 안 주면 `null` — 알트 안내 문장을 쓰지 않는다 */
  altShare: TargetWeightAltShareView | null;
  /** 라이브 원장 진행. 첫 리밸런스 전이면 `null` */
  live: TargetWeightLiveView | null;
  /** 과거 성적 자리에 쓸 것 — `live` 는 `live` 가 온전할 때만 */
  recordSource: "backtest" | "live";
  asOf: string | null;
}

/** `stale_inputs` — 시세 또는 변동성 배치가 멈췄다 · `no_volatility` — σ 가 있는 종목이 없다 · `disclosure_missing` — 3종 고지 미달 */
export type TargetWeightBlockedReason = "no_volatility" | "stale_inputs" | "disclosure_missing";

export type TargetWeightResult =
  | TargetWeightView
  | { status: "blocked"; reason: TargetWeightBlockedReason }
  | { status: "unavailable" };

export class TargetWeightContractError extends Error {
  constructor(field: string) {
    super(`target weight contract broken: ${field}`);
  }
}

const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | null =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null;

const toRow = (raw: unknown): TargetWeightRow | null => {
  if (!isRecord(raw)) return null;
  const symbol = str(raw.symbol);
  const sigma = num(raw.sigma);
  const status = oneOf(raw.status, ROW_STATUS);
  const targetWeight = rate01(raw.targetWeight);
  const currentWeight = num(raw.currentWeight);
  const gapWeight = num(raw.gapWeight);
  const priceKrw = num(raw.priceKrw);
  const targetValueKrw = num(raw.targetValueKrw);
  const currentValueKrw = num(raw.currentValueKrw);
  const gapValueKrw = num(raw.gapValueKrw);
  const gapQuantity = num(raw.gapQuantity);
  // 근거(σ)가 없는 행은 3종 고지의 "근거"가 빠진 것이다
  if (
    !symbol ||
    sigma === null ||
    sigma <= 0 ||
    !status ||
    targetWeight === null ||
    currentWeight === null ||
    gapWeight === null ||
    priceKrw === null ||
    targetValueKrw === null ||
    currentValueKrw === null ||
    gapValueKrw === null ||
    gapQuantity === null
  ) {
    return null;
  }
  const band = isRecord(raw.sigmaBand) ? raw.sigmaBand : null;
  const low = num(band?.low);
  const high = num(band?.high);
  return {
    symbol,
    held: raw.held === true,
    core: raw.core === true,
    sigma,
    btcBeta: num(raw.btcBeta),
    priceKrw,
    targetWeight,
    currentWeight,
    gapWeight,
    gapCapped: raw.gapCapped === true,
    targetValueKrw,
    currentValueKrw,
    gapValueKrw,
    gapQuantity,
    status,
    stopPriceKrw: num(raw.stopPriceKrw),
    lossAtStopKrw: num(raw.lossAtStopKrw),
    sigmaBand: low !== null && high !== null && low < high ? { low, high } : null,
  };
};

const toMonth = (raw: unknown): TargetWeightMonth | null => {
  if (!isRecord(raw)) return null;
  const month = str(raw.month);
  const strategy = num(raw.strategy);
  const btc = num(raw.btc);
  if (!month || !MONTH.test(month) || strategy === null || btc === null) return null;
  return { month, strategy, btc, exposure: rate01(raw.exposure) };
};

const toMonths = (raw: unknown): TargetWeightMonth[] =>
  (Array.isArray(raw) ? raw : []).flatMap((item) => {
    const month = toMonth(item);
    return month ? [month] : [];
  });

/** 과거 성적 · 실패 사례 — 하나라도 없으면 `null`(고지가 빠진 것) */
const toRecord = (raw: unknown, backtest: Raw): TargetWeightRecordView | null => {
  if (!isRecord(raw) || !isRecord(raw.strategy) || !isRecord(backtest.holdBtc)) return null;
  const target = num(raw.target);
  const s = raw.strategy;
  const h = backtest.holdBtc;
  const strategy = {
    cagr: num(s.cagr),
    vol: num(s.vol),
    mdd: num(s.mdd),
    upside: num(s.upside),
    exposureMean: rate01(s.exposureMean),
  };
  const holdBtc = { cagr: num(h.cagr), mdd: num(h.mdd) };
  const missedUpside = toMonths(raw.missedUpside);
  const worstMonths = toMonths(raw.worstMonths);
  if (
    target === null ||
    strategy.cagr === null ||
    strategy.vol === null ||
    strategy.mdd === null ||
    strategy.upside === null ||
    holdBtc.cagr === null ||
    holdBtc.mdd === null ||
    missedUpside.length === 0 ||
    worstMonths.length === 0
  ) {
    return null;
  }
  const claims = isRecord(raw.claims) ? raw.claims : {};
  const window = isRecord(backtest.window) ? backtest.window : null;
  const from = str(window?.from);
  const to = str(window?.to);
  return {
    target,
    strategy: {
      cagr: strategy.cagr,
      vol: strategy.vol,
      mdd: strategy.mdd,
      upside: strategy.upside,
      exposureMean: strategy.exposureMean,
    },
    holdBtc: { cagr: holdBtc.cagr, mdd: holdBtc.mdd },
    // 모르면 false — "덜 빠졌다 · 나았다"는 서버가 판정했을 때만
    claims: {
      lessDrawdown: claims.lessDrawdown === true,
      timing: claims.timing === true,
      targetHit: claims.targetHit === true,
    },
    missedUpside,
    worstMonths,
    window: from && to ? { from, to } : null,
    preregKey: str(backtest.preregKey),
    feeRatePerSide: num(backtest.feeRatePerSide),
  };
};

const toTriple = (raw: unknown): [number, number, number] | null => {
  if (!Array.isArray(raw) || raw.length !== 3) return null;
  const [a, b, c] = raw.map(num);
  return a !== null && b !== null && c !== null ? [a, b, c] : null;
};

const toAltShare = (raw: unknown): TargetWeightAltShareView | null => {
  if (!isRecord(raw)) return null;
  const preregKey = str(raw.preregKey);
  const candidates = (Array.isArray(raw.candidates) ? raw.candidates : []).flatMap((item) => {
    if (!isRecord(item)) return [];
    const altShare = rate01(item.altShare);
    const deltaCalmar = toTriple(item.deltaCalmar);
    return altShare !== null && deltaCalmar
      ? [{ altShare, deltaCalmar, cagr: num(item.cagr), coreCagr: num(item.coreCagr) }]
      : [];
  });
  if (!preregKey || candidates.length === 0) return null;
  const adopted = raw.adopted === null ? null : rate01(raw.adopted);
  // 채택값이 깨졌으면(숫자 아님) 채택으로 보지 않는다
  return {
    preregKey,
    adopted,
    primaryTarget: num(raw.primaryTarget),
    candidates,
    survivorshipBias: raw.survivorshipBias === true,
  };
};

const toLive = (raw: unknown, minWeeks: number): TargetWeightLiveView | null => {
  if (!isRecord(raw)) return null;
  const target = num(raw.target);
  const nWeeks = num(raw.nWeeks);
  if (target === null || nWeeks === null || nWeeks < 0 || !Number.isInteger(nWeeks)) return null;
  const worstWeeks = (Array.isArray(raw.worstWeeks) ? raw.worstWeeks : []).flatMap((item) => {
    if (!isRecord(item)) return [];
    const rebalanceAt = str(item.rebalanceAt);
    const strategy = num(item.strategy);
    const btc = num(item.btc);
    return rebalanceAt && strategy !== null && btc !== null ? [{ rebalanceAt, strategy, btc }] : [];
  });
  return {
    target,
    firstRebalanceAt: str(raw.firstRebalanceAt),
    nWeeks,
    minWeeks,
    nExcluded: num(raw.nExcluded) ?? 0,
    cumReturn: num(raw.cumReturn),
    btcCumReturn: num(raw.btcCumReturn),
    mdd: num(raw.mdd),
    btcMdd: num(raw.btcMdd),
    upside: num(raw.upside),
    worstWeeks,
  };
};

const liveComplete = (live: TargetWeightLiveView | null): boolean =>
  live !== null &&
  live.nWeeks >= live.minWeeks &&
  live.cumReturn !== null &&
  live.btcCumReturn !== null &&
  live.mdd !== null &&
  live.btcMdd !== null &&
  live.worstWeeks.length > 0;

export const toTargetWeightViewModel = (data: Raw): TargetWeightResult => {
  if (!Array.isArray(data.rows)) throw new TargetWeightContractError("rows");
  if (data.orderExecution !== false) throw new TargetWeightContractError("orderExecution");
  // 서버 사유는 아는 값만 옮긴다 — 모르는 값은 지금까지처럼 `no_volatility`(F010 슬라이스 7 · `BFF-REQ-041` FR-7)
  if (data.renderable === false) {
    return { status: "blocked", reason: data.blockedReason === "stale_inputs" ? "stale_inputs" : "no_volatility" };
  }

  const record = toRecord(data.record, isRecord(data.backtest) ? data.backtest : {});
  if (!record) return { status: "blocked", reason: "disclosure_missing" };

  const rows = data.rows.flatMap((item) => {
    const row = toRow(item);
    return row ? [row] : [];
  });
  if (rows.length === 0) return { status: "blocked", reason: "no_volatility" };

  const totals = isRecord(data.totals) ? data.totals : {};
  // 서버가 30 보다 작은 문턱을 보내도 등록 문턱(30) 아래로는 내리지 않는다
  const minWeeks = Math.max(LIVE_MIN_WEEKS_FLOOR, num(data.liveMinWeeks) ?? LIVE_MIN_WEEKS_FLOOR);
  const live = toLive(data.live, minWeeks);
  return {
    status: data.status === "no_capital" ? "no_capital" : "ok",
    basis: data.basis === "investable_capital" ? "investable_capital" : "crypto_value",
    capitalKrw: num(data.capitalKrw),
    capitalBelowHoldings: data.capitalBelowHoldings === true,
    rows,
    excluded: (Array.isArray(data.excluded) ? data.excluded : []).flatMap((item) => {
      if (!isRecord(item)) return [];
      const symbol = str(item.symbol);
      const reason = oneOf(item.reason, EXCLUDED_REASON);
      return symbol && reason
        ? [{ symbol, held: item.held === true, reason, currentValueKrw: num(item.currentValueKrw) }]
        : [];
    }),
    totals: {
      targetExposure: rate01(totals.targetExposure),
      currentExposure: num(totals.currentExposure),
      cashTargetWeight: rate01(totals.cashTargetWeight),
      targetBetaSum: num(totals.targetBetaSum),
      betaCoveredWeight: rate01(totals.betaCoveredWeight),
      lossAtStopTotalKrw: num(totals.lossAtStopTotalKrw),
      lossAtStopMonthlyBudgetRate: num(totals.lossAtStopMonthlyBudgetRate),
      outsideRuleWeight: rate01(totals.outsideRuleWeight),
      fundableKrw: num(totals.fundableKrw),
    },
    targetVolatility: num(data.targetVolatility),
    targetVolatilityIsDefault: data.targetVolatilityIsDefault === true,
    maxSingleAssetWeight: rate01(data.maxSingleAssetWeight),
    expiresAt: str(data.expiresAt),
    volatilityAsOf: str(data.volatilityAsOf),
    record,
    altShare: toAltShare(data.altShare),
    live,
    recordSource: data.recordSource === "live" && liveComplete(live) ? "live" : "backtest",
    asOf: str(data.asOf),
  };
};
