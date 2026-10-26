/**
 * 거래 기록 · 계획 · 사이즈 계산 · 리스크 예산 뷰모델 — **순수 함수** (F009 `BFF-REQ-038`).
 *
 * 서버(`SRV-REQ-038`)가 금액 · 비율을 다 계산해 준다. BFF 가 하는 일:
 *
 * 1. **모양을 검사한다.** 숫자 자리에 숫자가 아니면 `null` 이다 — 0 으로 채우지 않는다(0 은 "손실 0원"으로 읽힌다)
 * 2. **못 구한 값의 사유(`unavailable`)를 그대로 옮긴다.** 화면은 사유 코드로 문구를 고른다
 * 3. 필수 식별자(심볼 · 방향 · 상태)가 깨졌으면 `TradeRiskContractError` — 서비스가 `unavailable` 로 바꾼다
 *
 * 하지 않는 것: 금액 · 비율 계산(공통 수용 기준 3) · 판정 · 문구. 퍼센트 문자열도 만들지 않는다 — 표시는 화면 몫.
 */

import { ADHERENCE_LABELS, toTradeBehaviorPreview, type TradeBehaviorPreview } from "./behavior-mirror.viewmodel";

export class TradeRiskContractError extends Error {
  constructor(field: string) {
    super(`trade risk contract broken: ${field}`);
  }
}

type Raw = Record<string, unknown>;

const isRecord = (value: unknown): value is Raw =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const str = (value: unknown): string | null => (typeof value === "string" ? value : null);
/** 0 이하 금액은 "정하지 않음"과 섞이지 않게 `null` — 서버 CHECK 가 0 초과를 지킨다 */
const positive = (value: unknown): number | null => {
  const n = num(value);
  return n !== null && n > 0 ? n : null;
};
const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | null =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null;

/** 서버 Prisma `Decimal` 은 JSON 에서 문자열이다. 숫자 모양이 아니면 `null` */
const decimalLike = (value: unknown): number | null => {
  if (typeof value === "number") return num(value);
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const SIDES = ["buy", "sell"] as const;
export type TradeSide = (typeof SIDES)[number];

// ─── 사이즈 계산 ──────────────────────────────────────────────

const SIZING_STATUSES = ["ok", "stop_not_below_entry", "sell_side"] as const;
const UNAVAILABLE_REASONS = [
  "stop_price_missing",
  "stop_not_below_entry",
  "budget_not_set",
  "no_portfolio_value",
  "monthly_budget_exhausted",
  "insufficient_data",
  "not_applicable_sell",
] as const;
const SIZING_FIELDS = [
  "maxLoss",
  "perTradeBudgetRatio",
  "monthlyBudgetRemainingRatio",
  "referenceMaxQuantity",
  "volTargetWeight",
  "currentWeight",
  "consecutiveLoss",
] as const;
const QUANTITY_LIMITS = ["per_trade_budget", "single_asset_weight"] as const;

export type SizingUnavailableReason = (typeof UNAVAILABLE_REASONS)[number];

/**
 * 국내 주식 매수의 "손절가에서 안 팔리면" 두 줄(F011 `SRV-REQ-040` FR-45). 서버가 손절가 기준으로 계산한 금액을 옮길 뿐이다.
 * 하한가 줄 금액이 깨졌으면 묶음 전체를 `null` — 두 줄 중 하나만 그리면 "이게 최악"으로 읽힌다
 */
export interface GapScenariosView {
  limitDown: { gapRate: number; maxLossKrw: number };
  historicalGap: {
    quantile: number;
    gapRate: number;
    worstGapRate: number;
    sample: number;
    since: string;
    maxLossKrw: number;
  } | null;
  historicalGapUnavailable: "insufficient_data" | null;
  noteCode: "stop_may_not_fill";
}

const toGapScenarios = (raw: unknown): GapScenariosView | null => {
  if (!isRecord(raw)) return null;
  const limitDown = isRecord(raw.limitDown) ? raw.limitDown : null;
  const limitRate = num(limitDown?.gapRate);
  const limitLoss = num(limitDown?.maxLossKrw);
  if (limitRate === null || limitLoss === null) return null;

  const hist = isRecord(raw.historicalGap) ? raw.historicalGap : null;
  const fields = {
    quantile: num(hist?.quantile),
    gapRate: num(hist?.gapRate),
    worstGapRate: num(hist?.worstGapRate),
    sample: num(hist?.sample),
    since: str(hist?.since),
    maxLossKrw: num(hist?.maxLossKrw),
  };
  const historicalGap =
    fields.quantile !== null &&
    fields.gapRate !== null &&
    fields.worstGapRate !== null &&
    fields.sample !== null &&
    fields.since !== null &&
    fields.maxLossKrw !== null
      ? {
          quantile: fields.quantile,
          gapRate: fields.gapRate,
          worstGapRate: fields.worstGapRate,
          sample: fields.sample,
          since: fields.since,
          maxLossKrw: fields.maxLossKrw,
        }
      : null;

  return {
    limitDown: { gapRate: limitRate, maxLossKrw: limitLoss },
    historicalGap,
    // 과거 줄이 없으면 이유가 있어야 화면이 빈자리를 설명한다 — 서버가 말하지 않았어도 "표본 부족"으로 둔다
    historicalGapUnavailable: historicalGap ? null : "insufficient_data",
    noteCode: "stop_may_not_fill",
  };
};
export type SizingField = (typeof SIZING_FIELDS)[number];

export interface SizeCheckView {
  status: "ok";
  symbol: string;
  side: TradeSide;
  sizingStatus: (typeof SIZING_STATUSES)[number];
  maxLossKrw: number | null;
  lossPerUnitKrw: number | null;
  perTradeBudgetRate: number | null;
  monthlyBudgetRemainingRate: number | null;
  monthlyBudgetRemainingKrw: number | null;
  referenceMaxQuantity: { value: number; limitedBy: (typeof QUANTITY_LIMITS)[number] } | null;
  volTargetWeight: number | null;
  currentWeight: number | null;
  projectedWeight: number | null;
  consecutiveLoss: { count: number; amountKrw: number; monthlyBudgetRate: number | null } | null;
  kelly: { full: number; half: number; quarter: number; hasEdge: boolean; noteCode: "edge_estimate_uncertain" } | null;
  unavailable: Partial<Record<SizingField, SizingUnavailableReason>>;
  /** 국내 주식 매수 + 손절가일 때만. 코인 · 매도 · 손절가 없음 · 깨진 모양은 `null` */
  gapScenarios: GapScenariosView | null;
  assumptions: {
    feeRatePerSide: number | null;
    /** 국내 주식 매도 거래세(오늘 매도 기준, 청산 금액에만 — `SRV-REQ-040` FR-44). 코인 · 없는 값은 `null` */
    sellTaxRate: number | null;
    stopGapAssumed: false;
    targetVolatility: number | null;
    targetVolatilityIsDefault: boolean;
    maxSingleAssetWeight: number | null;
  };
  volatilityAsOf: string | null;
  asOf: string | null;
  /** 주문 경로가 없다는 서버 선언. 늘 false — 다른 값이면 계약 깨짐 */
  orderExecution: false;
  /** 입력 중 행동 미리보기(슬라이스 5, `SRV-REQ-038` FR-12). 못 구하거나 깨졌으면 `null` — 사이즈 줄은 그대로 */
  behavior: TradeBehaviorPreview | null;
}

export type SizeCheckResult = SizeCheckView | { status: "unavailable" };

const toUnavailable = (raw: unknown): SizeCheckView["unavailable"] => {
  if (!isRecord(raw)) return {};
  const out: SizeCheckView["unavailable"] = {};
  for (const field of SIZING_FIELDS) {
    const reason = oneOf(raw[field], UNAVAILABLE_REASONS);
    if (reason) out[field] = reason;
  }
  return out;
};

export const toSizeCheckViewModel = (data: Raw): SizeCheckView => {
  const symbol = str(data.symbol);
  const side = oneOf(data.side, SIDES);
  const sizingStatus = oneOf(data.status, SIZING_STATUSES);
  if (!symbol) throw new TradeRiskContractError("symbol");
  if (!side) throw new TradeRiskContractError("side");
  if (!sizingStatus) throw new TradeRiskContractError("status");
  // 주문 경로가 없다(공통 수용 기준 2). 서버가 다른 것을 말하면 옮기지 않는다
  if (data.orderExecution !== false) throw new TradeRiskContractError("orderExecution");

  const ref = isRecord(data.referenceMaxQuantity) ? data.referenceMaxQuantity : null;
  const refValue = num(ref?.value);
  const refLimit = oneOf(ref?.limitedBy, QUANTITY_LIMITS);

  const streak = isRecord(data.consecutiveLoss) ? data.consecutiveLoss : null;
  const streakCount = num(streak?.count);
  const streakAmount = num(streak?.amountKrw);

  const kelly = isRecord(data.kelly) ? data.kelly : null;
  const kellyFull = num(kelly?.full);
  const kellyHalf = num(kelly?.half);
  const kellyQuarter = num(kelly?.quarter);

  const assumptions = isRecord(data.assumptions) ? data.assumptions : {};

  return {
    status: "ok",
    symbol,
    side,
    sizingStatus,
    maxLossKrw: num(data.maxLossKrw),
    lossPerUnitKrw: num(data.lossPerUnitKrw),
    perTradeBudgetRate: num(data.perTradeBudgetRate),
    monthlyBudgetRemainingRate: num(data.monthlyBudgetRemainingRate),
    monthlyBudgetRemainingKrw: num(data.monthlyBudgetRemainingKrw),
    referenceMaxQuantity: refValue !== null && refLimit ? { value: refValue, limitedBy: refLimit } : null,
    volTargetWeight: num(data.volTargetWeight),
    currentWeight: num(data.currentWeight),
    projectedWeight: num(data.projectedWeight),
    consecutiveLoss:
      streakCount !== null && streakAmount !== null
        ? { count: streakCount, amountKrw: streakAmount, monthlyBudgetRate: num(streak?.monthlyBudgetRate) }
        : null,
    kelly:
      kellyFull !== null && kellyHalf !== null && kellyQuarter !== null && typeof kelly?.hasEdge === "boolean"
        ? {
            full: kellyFull,
            half: kellyHalf,
            quarter: kellyQuarter,
            hasEdge: kelly.hasEdge,
            noteCode: "edge_estimate_uncertain",
          }
        : null,
    unavailable: toUnavailable(data.unavailable),
    gapScenarios: toGapScenarios(data.gapScenarios),
    assumptions: {
      feeRatePerSide: num(assumptions.feeRatePerSide),
      sellTaxRate: num(assumptions.sellTaxRate),
      // 갭 가정은 없다 — 서버가 달리 말해도 화면은 "갭 미반영"을 말해야 안전하다
      stopGapAssumed: false,
      targetVolatility: num(assumptions.targetVolatility),
      targetVolatilityIsDefault: assumptions.targetVolatilityIsDefault === true,
      maxSingleAssetWeight: num(assumptions.maxSingleAssetWeight),
    },
    volatilityAsOf: str(data.volatilityAsOf),
    asOf: str(data.asOf),
    orderExecution: false,
    behavior: toTradeBehaviorPreview(data.behavior),
  };
};

// ─── 리스크 예산 ──────────────────────────────────────────────

const GAUGE_STATUSES = ["ok", "exceeded", "budget_not_set", "insufficient_data"] as const;
const BUDGET_UNITS = ["krw", "percent"] as const;
export type GaugeStatus = (typeof GAUGE_STATUSES)[number];

export interface BudgetSetting {
  amount: number;
  unit: (typeof BUDGET_UNITS)[number];
}

export interface RiskBudgetView {
  status: "ok";
  settings: {
    monthlyLossBudget: BudgetSetting | null;
    perTradeMaxLoss: BudgetSetting | null;
    monthlyLossBudgetKrw: number | null;
    perTradeMaxLossKrw: number | null;
    targetVolatility: number | null;
    targetVolatilityIsDefault: boolean;
    /** 한 종목 상한(IPS 3문항의 셋째, 슬라이스 6). 서버 기본 0.6 */
    maxSingleAssetWeight: number | null;
    /** 투자금(현금 포함, 원 — F010 슬라이스 5). 정하지 않았으면 `null` */
    investableCapitalKrw: number | null;
  };
  totalValueKrw: number | null;
  gauges: {
    drawdown: {
      status: GaugeStatus;
      budgetKrw: number | null;
      usedKrw: number | null;
      usedRate: number | null;
      monthPnlKrw: number | null;
      missingCloses: string[];
    };
    concentration: { status: GaugeStatus; topSymbol: string | null; topWeight: number | null; limit: number | null };
    turnover: {
      status: "ok" | "insufficient_data";
      trailingYearTurnover: number | null;
      tradedNotionalKrw: number | null;
      feesYearToDateKrw: number | null;
      tradeCount: number | null;
    };
    /**
     * BTC 베타 합(F010 슬라이스 2 · `BFF-REQ-039` FR-1) — Σ(평가금 비중 × 90일 BTC 베타). 베타를 모르는 종목은 서버가
     * 합에서 빼고 `missingSymbols` 로 알린다. 예산이 없어 `exceeded` 는 없다. 서버가 아직 주지 않으면 `insufficient_data`
     */
    btcBeta: {
      status: GaugeStatus;
      betaSum: number | null;
      btcEquivalentKrw: number | null;
      coveredWeight: number | null;
      missingSymbols: string[];
    };
    /**
     * 보유 합산 변동성(연) 범위(F011 슬라이스 7e · `BFF-REQ-040` FR-25) — `upper` 상관 1 가정 · `realized` 최근 실현 상관.
     * 국내 주식을 들고 있으면 KRX 거래일 축(`krx_trading_day`, 252), 아니면 달력일(365). 판정 없음 — 둘 중 하나라도 없으면
     * `insufficient_data`. 서버가 아직 주지 않아도 `insufficient_data`
     */
    portfolioVolatility: {
      status: GaugeStatus;
      upper: number | null;
      realized: number | null;
      crossCorrelation: number | null;
      grid: "krx_trading_day" | "calendar_day" | null;
      returns: number | null;
      coveredWeight: number | null;
      missingSymbols: string[];
    };
  };
  /**
   * 시장 국면 라벨(F010 슬라이스 2) — **아무것도 막거나 줄이지 않는다.** 사전등록 `regime-gate@1` 이 게이트를 채택하지
   * 않았다(`gateAdopted: false`). 국면 작업이 없거나 낡았으면 서버가 `null`, 깨졌으면 여기서 `null`
   */
  market: MarketRegimeView | null;
  /** 시나리오(슬라이스 6, FR-25). 확률 필드가 없다. 서버가 아직 주지 않거나 깨졌으면 `null` */
  scenarios: ScenariosView | null;
  monthStart: string | null;
  asOf: string | null;
}

export interface ScenariosView {
  status: "ok" | "no_holdings";
  totalValueKrw: number | null;
  /** −10 · −30 · −50% 순. 손실은 음수 원 */
  shocks: Array<{ shock: number; lossKrw: number; valueAfterKrw: number; bySymbol: Array<{ symbol: string; lossKrw: number }> }>;
  /** 과거 구간을 지금 보유에 다시 얹은 손실 */
  episodes: Array<{
    id: string;
    from: string;
    to: string;
    status: "ok" | "insufficient_data";
    lossKrw: number | null;
    returnRate: number | null;
    bySymbol: Array<{ symbol: string; returnRate: number | null; lossKrw: number | null }>;
    missingSymbols: string[];
  }>;
}

export type RiskBudgetResult = RiskBudgetView | { status: "unavailable" };

const MARKET_EVENT_KINDS = ["fomc", "cpi"] as const;

export interface MarketRegimeView {
  asOf: string;
  /** BTC 종가가 200일선 위인가. 200일선이 없으면 `null` — 서버는 그때 `true`(게이트 없음)라 "위에 있다"로 읽히면 안 된다 */
  trendOpen: boolean | null;
  btcClose: number | null;
  btcSma200d: number | null;
  /** HMM 고변동 상태 확률(0~1, forward 필터). 확률 모델 출력이지만 판정 확률이 아니다 */
  highVolProbability: number | null;
  /** 365일 고점 대비 낙폭(0 이하) */
  drawdown365dRate: number | null;
  /**
   * 채택된 게이트가 있는가(`gate.key !== null`). 지금은 늘 false — 화면은 "참고 라벨 · 아무것도 막지 않아요"를 말한다.
   * 게이트가 생기면 새 사전등록 + 서버 상수 커밋이 먼저고, 그때 화면 문구도 같이 바꾼다
   */
  gateAdopted: boolean;
  nextEvent: { kind: (typeof MARKET_EVENT_KINDS)[number]; at: string } | null;
  preregKey: string | null;
}

/** 국면 라벨 — `asOf` 가 없으면 날짜 없는 국면이라 통째로 뺀다 */
export const toMarketRegime = (raw: unknown): MarketRegimeView | null => {
  if (!isRecord(raw)) return null;
  const asOf = str(raw.asOf);
  if (!asOf) return null;
  const gate = isRecord(raw.gate) ? raw.gate : {};
  const next = isRecord(raw.nextEvent) ? raw.nextEvent : null;
  const nextKind = oneOf(next?.kind, MARKET_EVENT_KINDS);
  const nextAt = str(next?.at);
  const sma = num(raw.btcSma200d);
  return {
    asOf,
    trendOpen: sma !== null && typeof raw.trendOpen === "boolean" ? raw.trendOpen : null,
    btcClose: num(raw.btcClose),
    btcSma200d: sma,
    highVolProbability: num(raw.highVolProbability),
    drawdown365dRate: num(raw.drawdown365dRate),
    gateAdopted: str(gate.key) !== null,
    nextEvent: nextKind && nextAt ? { kind: nextKind, at: nextAt } : null,
    preregKey: str(raw.preregKey),
  };
};

const toBudget = (raw: unknown): BudgetSetting | null => {
  if (!isRecord(raw)) return null;
  const amount = num(raw.amount);
  const unit = oneOf(raw.unit, BUDGET_UNITS);
  return amount !== null && unit ? { amount, unit } : null;
};

const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

/**
 * 시나리오 — 줄 단위로 거른다. 금액이 빈 충격 줄은 뺀다(0 원으로 보이면 "손실 없음"으로 읽힌다).
 * 과거 구간은 `ok` 인데 손실이 없으면 `insufficient_data` 로 내린다
 */
export const toScenarios = (raw: unknown): ScenariosView | null => {
  if (!isRecord(raw)) return null;
  const status = oneOf(raw.status, ["ok", "no_holdings"] as const);
  if (!status) return null;
  const shocks = (Array.isArray(raw.shocks) ? raw.shocks : []).flatMap((item) => {
    if (!isRecord(item)) return [];
    const shock = num(item.shock);
    const lossKrw = num(item.lossKrw);
    const valueAfterKrw = num(item.valueAfterKrw);
    if (shock === null || lossKrw === null || valueAfterKrw === null) return [];
    const bySymbol = (Array.isArray(item.bySymbol) ? item.bySymbol : []).flatMap((row) => {
      if (!isRecord(row)) return [];
      const symbol = str(row.symbol);
      const loss = num(row.lossKrw);
      return symbol && loss !== null ? [{ symbol, lossKrw: loss }] : [];
    });
    return [{ shock, lossKrw, valueAfterKrw, bySymbol }];
  });
  const episodes = (Array.isArray(raw.episodes) ? raw.episodes : []).flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = str(item.id);
    const from = str(item.from);
    const to = str(item.to);
    if (!id || !from || !to) return [];
    const lossKrw = num(item.lossKrw);
    const declared = oneOf(item.status, ["ok", "insufficient_data"] as const) ?? "insufficient_data";
    return [
      {
        id,
        from,
        to,
        status: declared === "ok" && lossKrw !== null ? ("ok" as const) : ("insufficient_data" as const),
        lossKrw,
        returnRate: num(item.returnRate),
        bySymbol: (Array.isArray(item.bySymbol) ? item.bySymbol : []).flatMap((row) => {
          if (!isRecord(row)) return [];
          const symbol = str(row.symbol);
          return symbol ? [{ symbol, returnRate: num(row.returnRate), lossKrw: num(row.lossKrw) }] : [];
        }),
        missingSymbols: stringList(item.missingSymbols),
      },
    ];
  });
  return { status, totalValueKrw: num(raw.totalValueKrw), shocks, episodes };
};

/** 게이지 상태가 깨졌으면 "데이터 부족"이다 — "정상"으로 올리지 않는다 */
const gaugeStatus = (value: unknown): GaugeStatus => oneOf(value, GAUGE_STATUSES) ?? "insufficient_data";

export const toRiskBudgetViewModel = (data: Raw): RiskBudgetView => {
  const settings = isRecord(data.settings) ? data.settings : null;
  const gauges = isRecord(data.gauges) ? data.gauges : null;
  if (!settings) throw new TradeRiskContractError("settings");
  if (!gauges) throw new TradeRiskContractError("gauges");
  const drawdown = isRecord(gauges.drawdown) ? gauges.drawdown : {};
  const concentration = isRecord(gauges.concentration) ? gauges.concentration : {};
  const turnover = isRecord(gauges.turnover) ? gauges.turnover : {};
  const btcBeta = isRecord(gauges.btcBeta) ? gauges.btcBeta : {};
  const betaSum = num(btcBeta.betaSum);
  const volatility = isRecord(gauges.portfolioVolatility) ? gauges.portfolioVolatility : {};
  const upper = num(volatility.upper);
  const realized = num(volatility.realized);
  const grid = volatility.grid === "krx_trading_day" || volatility.grid === "calendar_day" ? volatility.grid : null;

  return {
    status: "ok",
    settings: {
      monthlyLossBudget: toBudget(settings.monthlyLossBudget),
      perTradeMaxLoss: toBudget(settings.perTradeMaxLoss),
      monthlyLossBudgetKrw: num(settings.monthlyLossBudgetKrw),
      perTradeMaxLossKrw: num(settings.perTradeMaxLossKrw),
      targetVolatility: num(settings.targetVolatility),
      targetVolatilityIsDefault: settings.targetVolatilityIsDefault === true,
      maxSingleAssetWeight: num(settings.maxSingleAssetWeight),
      investableCapitalKrw: positive(settings.investableCapitalKrw),
    },
    totalValueKrw: num(data.totalValueKrw),
    gauges: {
      drawdown: {
        status: gaugeStatus(drawdown.status),
        budgetKrw: num(drawdown.budgetKrw),
        usedKrw: num(drawdown.usedKrw),
        usedRate: num(drawdown.usedRate),
        monthPnlKrw: num(drawdown.monthPnlKrw),
        missingCloses: Array.isArray(drawdown.missingCloses)
          ? drawdown.missingCloses.filter((item): item is string => typeof item === "string")
          : [],
      },
      concentration: {
        status: gaugeStatus(concentration.status),
        topSymbol: str(concentration.topSymbol),
        topWeight: num(concentration.topWeight),
        limit: num(concentration.limit),
      },
      turnover: {
        status: turnover.status === "ok" ? "ok" : "insufficient_data",
        trailingYearTurnover: num(turnover.trailingYearTurnover),
        tradedNotionalKrw: num(turnover.tradedNotionalKrw),
        feesYearToDateKrw: num(turnover.feesYearToDateKrw),
        tradeCount: num(turnover.tradeCount),
      },
      btcBeta: {
        // 합이 없는데 `ok` 면 "데이터 부족"이다. `exceeded` 는 예산이 없는 게이지라 나올 수 없다 — 옮기지 않는다
        status: betaSum !== null && btcBeta.status === "ok" ? "ok" : "insufficient_data",
        betaSum,
        btcEquivalentKrw: num(btcBeta.btcEquivalentKrw),
        coveredWeight: num(btcBeta.coveredWeight),
        missingSymbols: stringList(btcBeta.missingSymbols),
      },
      portfolioVolatility: {
        // 범위의 두 끝이 다 있어야 `ok` — 한 끝만 보여 주면 범위가 아니다
        status: upper !== null && realized !== null && volatility.status === "ok" ? "ok" : "insufficient_data",
        upper,
        realized,
        crossCorrelation: num(volatility.crossCorrelation),
        grid,
        returns: num(volatility.returns),
        coveredWeight: num(volatility.coveredWeight),
        missingSymbols: stringList(volatility.missingSymbols),
      },
    },
    market: toMarketRegime(data.market),
    scenarios: toScenarios(data.scenarios),
    monthStart: str(data.monthStart),
    asOf: str(data.asOf),
  };
};

// ─── 거래 계획 ────────────────────────────────────────────────


export interface TradePlanView {
  id: string;
  transactionId: string | null;
  symbol: string;
  side: TradeSide;
  stopPrice: number | null;
  targetPrice: number | null;
  plannedQuantity: number | null;
  thesis: string | null;
  invalidation: string | null;
  reviewAt: string | null;
  probabilityUp: number | null;
  /** 진입 전 체크리스트 기록(슬라이스 6) — 보인 질문 태그 · 체크한 태그. 없으면 `null` */
  checklist: { shown: string[]; checked: string[] } | null;
  plannedAt: string;
  /** 거래에 연결돼 손절가 · 계획 수량 · 오를 확률을 바꿀 수 없다(서버 409) */
  locked: boolean;
  /** 준수 판정 — 판정 배치(슬라이스 4) 전에는 늘 `null` */
  adherence: { label: string | null; userLabel: string | null; evaluatedAt: string | null };
}

export const toTradePlanViewModel = (data: Raw): TradePlanView => {
  const id = str(data.id);
  const symbol = str(data.symbol);
  const side = oneOf(data.side, SIDES);
  const plannedAt = str(data.plannedAt);
  if (!id) throw new TradeRiskContractError("plan.id");
  if (!symbol) throw new TradeRiskContractError("plan.symbol");
  if (!side) throw new TradeRiskContractError("plan.side");
  if (!plannedAt) throw new TradeRiskContractError("plan.plannedAt");
  const adherence = isRecord(data.adherence) ? data.adherence : {};

  return {
    id,
    transactionId: str(data.transactionId),
    symbol,
    side,
    stopPrice: num(data.stopPrice),
    targetPrice: num(data.targetPrice),
    plannedQuantity: num(data.plannedQuantity),
    thesis: str(data.thesis),
    invalidation: str(data.invalidation),
    reviewAt: str(data.reviewAt),
    probabilityUp: num(data.probabilityUp),
    checklist: isRecord(data.checklist)
      ? { shown: stringList(data.checklist.shown), checked: stringList(data.checklist.checked) }
      : null,
    plannedAt,
    locked: data.locked === true,
    adherence: {
      label: oneOf(adherence.label, ADHERENCE_LABELS),
      userLabel: oneOf(adherence.userLabel, ADHERENCE_LABELS),
      evaluatedAt: str(adherence.evaluatedAt),
    },
  };
};

export type TradePlanListResult = { status: "ok"; plans: TradePlanView[] } | { status: "unavailable" };

/** 목록은 깨진 행만 뺀다 — 한 행 때문에 카드 전체를 막지 않는다 */
export const toTradePlanList = (data: unknown): TradePlanView[] => {
  if (!Array.isArray(data)) throw new TradeRiskContractError("plans");
  return data.flatMap((item) => {
    if (!isRecord(item)) return [];
    try {
      return [toTradePlanViewModel(item)];
    } catch {
      return [];
    }
  });
};

// ─── 거래 기록 ────────────────────────────────────────────────

export interface RecordedTransactionView {
  id: string;
  /** F011 슬라이스 3b — 서버가 저장한 자산군. 모르는 값은 계약 깨짐 */
  assetType: "crypto" | "kr_stock";
  symbol: string;
  side: TradeSide;
  quantity: number;
  price: number;
  fee: number | null;
  transactionDate: string;
}

/**
 * 거래 + 계획 기록 결과. **거래가 저장되면 성공이다** — 계획이 실패해도 거래를 되돌리지 않는다.
 * 계획만 `unavailable` 이면 화면은 "계획만 다시 저장"을 준다(같은 거래 id 로 `POST /plans`).
 */
export interface RecordTradeResult {
  transaction: RecordedTransactionView;
  plan: { status: "ok"; plan: TradePlanView } | { status: "unavailable" } | { status: "none" };
}

const RECORDABLE_ASSET_TYPES = ["crypto", "kr_stock"] as const;

export const toRecordedTransaction = (data: Raw): RecordedTransactionView => {
  const id = str(data.id);
  const symbol = str(data.symbol);
  const side = oneOf(data.transactionType, SIDES);
  const quantity = decimalLike(data.quantity);
  const price = decimalLike(data.price);
  const date = data.transactionDate instanceof Date ? data.transactionDate.toISOString() : str(data.transactionDate);
  const assetType = oneOf(data.assetType, RECORDABLE_ASSET_TYPES);
  if (!id) throw new TradeRiskContractError("transaction.id");
  if (!assetType) throw new TradeRiskContractError("transaction.assetType");
  if (!symbol) throw new TradeRiskContractError("transaction.symbol");
  if (!side) throw new TradeRiskContractError("transaction.transactionType");
  if (quantity === null || price === null) throw new TradeRiskContractError("transaction.amount");
  if (!date) throw new TradeRiskContractError("transaction.transactionDate");

  return { id, assetType, symbol, side, quantity, price, fee: decimalLike(data.fee), transactionDate: date };
};
