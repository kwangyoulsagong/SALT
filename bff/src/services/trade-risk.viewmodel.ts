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
  assumptions: {
    feeRatePerSide: number | null;
    stopGapAssumed: false;
    targetVolatility: number | null;
    targetVolatilityIsDefault: boolean;
    maxSingleAssetWeight: number | null;
  };
  volatilityAsOf: string | null;
  asOf: string | null;
  /** 주문 경로가 없다는 서버 선언. 늘 false — 다른 값이면 계약 깨짐 */
  orderExecution: false;
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
    assumptions: {
      feeRatePerSide: num(assumptions.feeRatePerSide),
      // 갭 가정은 없다 — 서버가 달리 말해도 화면은 "갭 미반영"을 말해야 안전하다
      stopGapAssumed: false,
      targetVolatility: num(assumptions.targetVolatility),
      targetVolatilityIsDefault: assumptions.targetVolatilityIsDefault === true,
      maxSingleAssetWeight: num(assumptions.maxSingleAssetWeight),
    },
    volatilityAsOf: str(data.volatilityAsOf),
    asOf: str(data.asOf),
    orderExecution: false,
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
  };
  monthStart: string | null;
  asOf: string | null;
}

export type RiskBudgetResult = RiskBudgetView | { status: "unavailable" };

const toBudget = (raw: unknown): BudgetSetting | null => {
  if (!isRecord(raw)) return null;
  const amount = num(raw.amount);
  const unit = oneOf(raw.unit, BUDGET_UNITS);
  return amount !== null && unit ? { amount, unit } : null;
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

  return {
    status: "ok",
    settings: {
      monthlyLossBudget: toBudget(settings.monthlyLossBudget),
      perTradeMaxLoss: toBudget(settings.perTradeMaxLoss),
      monthlyLossBudgetKrw: num(settings.monthlyLossBudgetKrw),
      perTradeMaxLossKrw: num(settings.perTradeMaxLossKrw),
      targetVolatility: num(settings.targetVolatility),
      targetVolatilityIsDefault: settings.targetVolatilityIsDefault === true,
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
    },
    monthStart: str(data.monthStart),
    asOf: str(data.asOf),
  };
};

// ─── 거래 계획 ────────────────────────────────────────────────

const ADHERENCE_LABELS = ["honored", "stop_not_honored", "stop_slipped", "size_exceeded"] as const;

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

export const toRecordedTransaction = (data: Raw): RecordedTransactionView => {
  const id = str(data.id);
  const symbol = str(data.symbol);
  const side = oneOf(data.transactionType, SIDES);
  const quantity = decimalLike(data.quantity);
  const price = decimalLike(data.price);
  const date = data.transactionDate instanceof Date ? data.transactionDate.toISOString() : str(data.transactionDate);
  if (!id) throw new TradeRiskContractError("transaction.id");
  if (!symbol) throw new TradeRiskContractError("transaction.symbol");
  if (!side) throw new TradeRiskContractError("transaction.transactionType");
  if (quantity === null || price === null) throw new TradeRiskContractError("transaction.amount");
  if (!date) throw new TradeRiskContractError("transaction.transactionDate");

  return { id, symbol, side, quantity, price, fee: decimalLike(data.fee), transactionDate: date };
};
