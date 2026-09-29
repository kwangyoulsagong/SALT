/**
 * 확률 없는 목표 비중 안내 — F010 슬라이스 5 (`SRV-REQ-024` FR-182~186 · 사전등록 `target-weight@1`).
 *
 * ## 규칙 — 방향 판단이 없다
 *
 * 역변동성 배분 → 묶음 σ(상관 1 가정, 상한) → 노출 = min(1, 목표 σ ÷ 묶음 σ) → 한 종목 상한, 남는 몫은 현금.
 * 노출이 1 보다 작으면 결과는 w_i = 목표 σ ÷ (n × σ_i) 다(종목마다 w·σ 가 같다). `salt-forecast` `domain/target_weight.py`
 * 와 **같은 식**이고, 두 테스트가 같은 고정 벡터를 쓴다 — 화면 비중과 과거 성적(`targetWeightRecord`)이 같은 규칙이어야
 * 과거 성적이 이 비중의 성적이 된다.
 *
 * ## 이것은 "추천"이 아니라 "비중 안내"다
 *
 * 규칙은 오를 종목을 고르지 않는다. 사용자가 이미 고른 종목(보유) + BTC · ETH 를 변동성만으로 나눈다. 부족 · 초과는
 * 계산 결과일 뿐 지시가 아니다 — 결과는 숫자와 상태 코드뿐이고 문장은 화면이 고른다(공통 수용 기준 2 · 4).
 * 기대 R · 켈리 · 확률은 넣지 않는다 — 보정 확률이 자격을 얻지 못했다(`meta-model@1` · `@2`).
 *
 * ## 무효화 3조건
 *
 * 1. 만료 — 다음 월요일 00:00 UTC(09:00 KST). 백테스트가 매주 월요일에 맞췄다
 * 2. σ 급변 — 계산에 쓴 σ 가 ±25% 밖으로 움직이면(`SIGMA_DRIFT_LIMIT`) 이 비중은 낡았다
 * 3. 손절선 — 기준가 × exp(−σ_20일). 익절 계획(`profitPlan` 변동성 계획)과 같은 −1σ
 */

import Decimal from "decimal.js";

import { Money } from "../../../shared/domain";
import { VOLATILITY_PLAN } from "./profitPlan";
import { SIZING_FEE_RATE_PER_SIDE } from "./sizing";

/** 보유가 없어도 안내하는 코어 — 리서치 §4-3 4 · 사용자 결정 2026-09-29 */
export const TARGET_WEIGHT_CORE_SYMBOLS = ["BTC", "ETH"] as const;
/** 업비트 원화 마켓 최소 주문 금액. 차가 이보다 작으면 "맞음" — 실제로 맞출 수 없는 차를 부족 · 초과로 부르지 않는다 */
export const TARGET_WEIGHT_MIN_ORDER_KRW = 5000;
export const SIGMA_DRIFT_LIMIT = new Decimal("0.25");
const DAY_MS = 24 * 60 * 60 * 1000;

/** σ 목록 → 목표 비중(같은 순서). σ 가 없거나 0 이하인 칸은 0 — 대상에서 빠진다. 합 ≤ 1 */
export const targetWeights = (sigmas: Array<Decimal | null>, target: Decimal, cap: Decimal): Decimal[] => {
  const ok = sigmas.map((sigma) => sigma !== null && sigma.isFinite() && sigma.gt(0));
  const count = ok.filter(Boolean).length;
  if (count === 0) return sigmas.map(() => new Decimal(0));
  const inverseSum = sigmas.reduce<Decimal>(
    (sum, sigma, i) => (ok[i] ? sum.plus(new Decimal(1).div(sigma!)) : sum),
    new Decimal(0)
  );
  // 역변동성 비중 s_i = (1/σ_i) / Σ(1/σ_j), 묶음 σ = Σ s_i σ_i = n / Σ(1/σ_j)
  const sleeve = new Decimal(count).div(inverseSum);
  const exposure = Decimal.min(1, target.div(sleeve));
  return sigmas.map((sigma, i) =>
    ok[i] ? Decimal.min(cap, exposure.times(new Decimal(1).div(sigma!)).div(inverseSum)) : new Decimal(0)
  );
};

/** 다음 월요일 00:00 UTC. 월요일 00:00 정각이면 그 다음 주 */
export const nextWeeklyRebalance = (now: Date): Date => {
  const day = now.getUTCDay(); // 0 = 일요일
  const daysAhead = ((8 - day) % 7) || 7;
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(midnight + daysAhead * DAY_MS);
};

export type TargetWeightBasis = "investable_capital" | "crypto_value";
export type TargetWeightRowStatus = "under" | "over" | "at";
export type TargetWeightExcludedReason = "volatility_unavailable" | "price_unavailable";

export interface TargetWeightInput {
  /** 사용자가 적은 투자금(현금 포함). 없으면 `null` — 코인 평가금 합을 전체로 본다 */
  investableCapital: Money | null;
  holdings: Array<{ symbol: string; quantity: Decimal; value: Money }>;
  /** 대상 종목 현재가(원). 없는 종목은 키가 없다 */
  prices: ReadonlyMap<string, Money>;
  /** 연 σ · BTC 베타. 막혔거나 낡은 종목은 σ 가 `null` */
  risk: ReadonlyMap<string, { sigma: Decimal | null; btcBeta: number | null; asOf: Date }>;
  targetVolatility: Decimal;
  maxSingleAssetWeight: Decimal;
  /** 이번 달 남은 손실 예산(원). 예산이 없거나 모르면 `null` */
  monthlyBudgetRemaining: Money | null;
  now: Date;
}

export interface TargetWeightRow {
  symbol: string;
  held: boolean;
  core: boolean;
  sigma: Decimal;
  btcBeta: number | null;
  price: Money;
  targetWeight: Decimal;
  currentWeight: Decimal;
  /** 목표 − 지금(양수 = 부족) */
  gapWeight: Decimal;
  targetValue: Money;
  currentValue: Money;
  gapValue: Money;
  /** 차를 수량으로(양수 = 부족). 반올림은 응답이 한다 */
  gapQuantity: Decimal;
  status: TargetWeightRowStatus;
  /** 무효화 3 — 기준가 × exp(−σ_20일) */
  stopPrice: Money;
  /** 목표 비중만큼 들고 손절선에 닿으면(양쪽 수수료 포함, 갭 가정 없음) */
  lossAtStop: Money;
  /** 무효화 2 — 이 σ 범위 밖이면 다시 계산 */
  sigmaBand: { low: Decimal; high: Decimal };
  volatilityAsOf: Date;
}

export interface TargetWeightGuide {
  /** `no_capital` — 투자금도 코인 보유도 없어 비중을 원으로 옮길 수 없다. 목표 비중(%)만 뜻이 있다 */
  status: "ok" | "no_capital";
  basis: TargetWeightBasis;
  capital: Money;
  /** 적은 투자금이 코인 평가금 합보다 작다 — 투자금 대신 평가금 합을 전체로 썼다 */
  capitalBelowHoldings: boolean;
  rows: TargetWeightRow[];
  excluded: Array<{ symbol: string; held: boolean; reason: TargetWeightExcludedReason; currentValue: Money }>;
  totals: {
    targetExposure: Decimal;
    /** 코인 평가금 합 ÷ 전체(빠진 종목 포함) */
    currentExposure: Decimal;
    /** 묶음 σ(상관 1) — 역변동성 비중으로 섞은 σ */
    sleeveSigma: Decimal | null;
    /** Σ 목표 비중 × 베타. 베타 없는 종목은 빼고 `betaCoveredWeight` 로 알린다 */
    targetBetaSum: Decimal | null;
    betaCoveredWeight: Decimal | null;
    lossAtStopTotal: Money;
    /** 모두 손절선에 닿으면 ÷ 이번 달 남은 예산 */
    lossAtStopMonthlyBudgetRatio: Decimal | null;
  };
  expiresAt: Date;
  /** 계산에 쓴 σ 중 가장 오래된 기준 시각 */
  volatilityAsOf: Date | null;
}

const ratio = (a: Money, b: Money): Decimal => (b.isZero() ? new Decimal(0) : a.toDecimal().div(b.toDecimal()));

export const buildTargetWeightGuide = (input: TargetWeightInput): TargetWeightGuide => {
  const held = new Map(input.holdings.map((holding) => [holding.symbol.toUpperCase(), holding]));
  const symbols = [...new Set([...TARGET_WEIGHT_CORE_SYMBOLS, ...held.keys()])];
  const cryptoValue = input.holdings.reduce((sum, holding) => sum.plus(holding.value), Money.krw(0));

  const capitalBelowHoldings =
    input.investableCapital !== null && input.investableCapital.compare(cryptoValue) < 0;
  const basis: TargetWeightBasis = input.investableCapital ? "investable_capital" : "crypto_value";
  const capital =
    input.investableCapital && !capitalBelowHoldings ? input.investableCapital : cryptoValue;

  const excluded: TargetWeightGuide["excluded"] = [];
  const eligible: Array<{ symbol: string; sigma: Decimal; price: Money }> = [];
  for (const symbol of symbols) {
    const currentValue = held.get(symbol)?.value ?? Money.krw(0);
    const sigma = input.risk.get(symbol)?.sigma ?? null;
    const price = input.prices.get(symbol) ?? null;
    if (sigma === null) excluded.push({ symbol, held: held.has(symbol), reason: "volatility_unavailable", currentValue });
    else if (price === null || !price.toDecimal().gt(0))
      excluded.push({ symbol, held: held.has(symbol), reason: "price_unavailable", currentValue });
    else eligible.push({ symbol, sigma, price });
  }

  const weights = targetWeights(
    eligible.map((row) => row.sigma),
    input.targetVolatility,
    input.maxSingleAssetWeight
  );
  const sqrtHorizon = new Decimal(VOLATILITY_PLAN.horizonDays).div(VOLATILITY_PLAN.annualDays).sqrt();
  const minOrder = new Decimal(TARGET_WEIGHT_MIN_ORDER_KRW);

  const rows: TargetWeightRow[] = eligible.map((row, i) => {
    const targetWeight = weights[i];
    const currentValue = held.get(row.symbol)?.value ?? Money.krw(0);
    const currentWeight = ratio(currentValue, capital);
    const targetValue = capital.scale(targetWeight);
    const gapValue = targetValue.minus(currentValue);
    const sigmaH = row.sigma.times(sqrtHorizon);
    const stopPrice = row.price.scale(sigmaH.times(-VOLATILITY_PLAN.stop).exp());
    const fees = row.price.plus(stopPrice).scale(SIZING_FEE_RATE_PER_SIDE);
    const lossPerUnit = row.price.minus(stopPrice).plus(fees);
    const risk = input.risk.get(row.symbol)!;
    return {
      symbol: row.symbol,
      held: held.has(row.symbol),
      core: (TARGET_WEIGHT_CORE_SYMBOLS as readonly string[]).includes(row.symbol),
      sigma: row.sigma,
      btcBeta: risk.btcBeta,
      price: row.price,
      targetWeight,
      currentWeight,
      gapWeight: targetWeight.minus(currentWeight),
      targetValue,
      currentValue,
      gapValue,
      gapQuantity: gapValue.toDecimal().div(row.price.toDecimal()),
      status: gapValue.toDecimal().abs().lt(minOrder) ? "at" : gapValue.isNegative() ? "over" : "under",
      stopPrice,
      lossAtStop: lossPerUnit.scale(targetValue.toDecimal().div(row.price.toDecimal())),
      sigmaBand: {
        low: row.sigma.times(new Decimal(1).minus(SIGMA_DRIFT_LIMIT)),
        high: row.sigma.times(new Decimal(1).plus(SIGMA_DRIFT_LIMIT)),
      },
      volatilityAsOf: risk.asOf,
    };
  });

  const targetExposure = weights.reduce((sum, w) => sum.plus(w), new Decimal(0));
  const inverseSum = eligible.reduce((sum, row) => sum.plus(new Decimal(1).div(row.sigma)), new Decimal(0));
  const withBeta = rows.filter((row) => row.btcBeta !== null && Number.isFinite(row.btcBeta));
  const betaCovered = withBeta.reduce((sum, row) => sum.plus(row.targetWeight), new Decimal(0));
  const lossAtStopTotal = rows.reduce((sum, row) => sum.plus(row.lossAtStop), Money.krw(0));
  const asOfs = rows.map((row) => row.volatilityAsOf.getTime());

  return {
    status: capital.isZero() ? "no_capital" : "ok",
    basis,
    capital,
    capitalBelowHoldings,
    rows,
    excluded,
    totals: {
      targetExposure,
      currentExposure: ratio(cryptoValue, capital),
      sleeveSigma: eligible.length ? new Decimal(eligible.length).div(inverseSum) : null,
      targetBetaSum: withBeta.length
        ? withBeta.reduce((sum, row) => sum.plus(row.targetWeight.times(row.btcBeta!)), new Decimal(0))
        : null,
      betaCoveredWeight: targetExposure.gt(0) ? betaCovered.div(targetExposure) : null,
      lossAtStopTotal,
      lossAtStopMonthlyBudgetRatio:
        input.monthlyBudgetRemaining && input.monthlyBudgetRemaining.toDecimal().gt(0)
          ? ratio(lossAtStopTotal, input.monthlyBudgetRemaining)
          : null,
    },
    expiresAt: nextWeeklyRebalance(input.now),
    volatilityAsOf: asOfs.length ? new Date(Math.min(...asOfs)) : null,
  };
};
