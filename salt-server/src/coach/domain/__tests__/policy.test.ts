import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_MAX_SINGLE_ASSET_WEIGHT,
  MIN_RISK_REWARD_RATIO,
  PreflightCheckKey,
  PreflightMode,
  PreflightSeverity,
  PreflightWarningCode,
  ProfitPlanStageKey,
  ProfitPlanStatus,
  buildProfitPlanWarnings,
  calculatePreflight,
  calculateProfitPlan,
} from "../policy";

/**
 * **특성화 테스트**다 — 옳은 값을 정의하는 것이 아니라 **지금 값을 고정**한다.
 *
 * NFR 정정(`SRV-REQ-006`)에 근거가 있다: DB 가 비어 있어 응답 스냅샷이 성립하지 않는다.
 * 위험한 것은 DB 접근이 아니라 계산이므로, 이관 전 산술을 숫자로 못 박아 두고 옮긴다.
 *
 * 기대값은 **이관 전 코드의 산술을 손으로 푼 값**이다. 여기 있는 숫자가 바뀌면
 * 그것은 리팩터가 동작을 바꿨다는 뜻이고, **바뀌어야 하는 경우에도 여기서 한 번 걸린다.**
 */

const price = (value: number) => Number(value.toFixed(2));

describe("calculateProfitPlan — 특성화", () => {
  it("수익률 10% 이하면 손절선이 평균가 기준(×0.92)이다", () => {
    const plan = calculateProfitPlan({
      currentPrice: 1200,
      averageBuyPrice: 1000,
      unrealizedProfitRate: 5,
    });
    const stop = plan.stages.find((s) => s.key === ProfitPlanStageKey.ProtectLoss);
    assert.equal(stop?.price, price(1000 * 0.92)); // 920
    assert.equal(plan.status, ProfitPlanStatus.HoldPlan);
  });

  it("수익률 10% 초과면 손절선이 현재가 기준(×0.94)으로 올라간다", () => {
    const plan = calculateProfitPlan({
      currentPrice: 1200,
      averageBuyPrice: 1000,
      unrealizedProfitRate: 10.1,
    });
    const stop = plan.stages.find((s) => s.key === ProfitPlanStageKey.ProtectLoss);
    assert.equal(stop?.price, price(1200 * 0.94)); // 1128
  });

  it("경계: 정확히 10% 는 평균가 기준이다 (초과 비교다)", () => {
    const plan = calculateProfitPlan({
      currentPrice: 1200,
      averageBuyPrice: 1000,
      unrealizedProfitRate: 10,
    });
    const stop = plan.stages.find((s) => s.key === ProfitPlanStageKey.ProtectLoss);
    assert.equal(stop?.price, price(1000 * 0.92));
  });

  it("수익률 15% 이상이면 1차 익절이 현재가다", () => {
    const plan = calculateProfitPlan({
      currentPrice: 1500,
      averageBuyPrice: 1000,
      unrealizedProfitRate: 15,
    });
    const first = plan.stages.find((s) => s.key === ProfitPlanStageKey.FirstProfit);
    assert.equal(first?.price, 1500);
  });

  it("수익률 15% 미만이면 1차 익절이 평균가 ×1.12 다", () => {
    const plan = calculateProfitPlan({
      currentPrice: 1100,
      averageBuyPrice: 1000,
      unrealizedProfitRate: 14.99,
    });
    const first = plan.stages.find((s) => s.key === ProfitPlanStageKey.FirstProfit);
    assert.equal(first?.price, price(1000 * 1.12)); // 1120
  });

  it("2차 익절은 항상 평균가 ×1.25 다", () => {
    const plan = calculateProfitPlan({
      currentPrice: 9999,
      averageBuyPrice: 1000,
      unrealizedProfitRate: 100,
    });
    const second = plan.stages.find((s) => s.key === ProfitPlanStageKey.TrendHold);
    assert.equal(second?.price, price(1000 * 1.25)); // 1250
  });

  it("현재가 0 은 평균가로 대체된다 — 원문의 `||` 동작", () => {
    const plan = calculateProfitPlan({
      currentPrice: 0,
      averageBuyPrice: 800,
      unrealizedProfitRate: 20,
    });
    assert.equal(plan.currentPrice, 800);
    const stop = plan.stages.find((s) => s.key === ProfitPlanStageKey.ProtectLoss);
    assert.equal(stop?.price, price(800 * 0.94)); // 752 — 20 > 10 이므로 현재가(=평균가) 기준
  });

  it("상태 경계 4구간", () => {
    const statusAt = (rate: number) =>
      calculateProfitPlan({
        currentPrice: 1000,
        averageBuyPrice: 1000,
        unrealizedProfitRate: rate,
      }).status;

    assert.equal(statusAt(20), ProfitPlanStatus.TakeProfitReview);
    assert.equal(statusAt(19.99), ProfitPlanStatus.RaiseStopReview);
    assert.equal(statusAt(8), ProfitPlanStatus.RaiseStopReview);
    assert.equal(statusAt(7.99), ProfitPlanStatus.HoldPlan);
    assert.equal(statusAt(-7.99), ProfitPlanStatus.HoldPlan);
    assert.equal(statusAt(-8), ProfitPlanStatus.StopLossReview);
  });

  it("단계 비율은 0.25 · 0.25 · 0.5 다", () => {
    const plan = calculateProfitPlan({
      currentPrice: 1000,
      averageBuyPrice: 1000,
      unrealizedProfitRate: 0,
    });
    assert.deepEqual(
      plan.stages.map((s) => s.ratio),
      [0.25, 0.25, 0.5]
    );
  });

  it("경고는 구간마다 하나씩, 없으면 기본 문구", () => {
    assert.equal(buildProfitPlanWarnings(20).length, 1);
    assert.equal(buildProfitPlanWarnings(-8).length, 1);
    assert.match(buildProfitPlanWarnings(0)[0], /계획 유지/);
  });
});

describe("calculatePreflight — 특성화", () => {
  const base = {
    entryPrice: 100,
    takeProfitPrices: [130],
    amount: 1000,
    mode: PreflightMode.Scalp,
    totalValue: 9000,
    existingSymbolValue: 0,
    maxSingleAssetWeight: DEFAULT_MAX_SINGLE_ASSET_WEIGHT,
    priceUpdatedAt: null,
    now: new Date("2026-09-11T00:00:00Z"),
  };

  it("손익비 = 기대수익률 / 손절률, 소수 2자리", () => {
    const result = calculatePreflight({ ...base, stopPrice: 90 });
    // stopLossRate = (100-90)/100 = 0.1, rewardRate = (130-100)/100 = 0.3
    assert.equal(result.stopLossRate, 0.1);
    assert.equal(result.riskRewardRatio, 3);
  });

  it("최대손실 = 금액 × 손절률, 최대손실률은 진입 후 총액 기준", () => {
    const result = calculatePreflight({ ...base, stopPrice: 90 });
    assert.equal(result.maxLossAmount, 100); // 1000 × 0.1
    assert.equal(result.projectedTotalValue, 10000);
    assert.equal(result.maxLossRate, 0.01); // 100 / 10000
  });

  it("진입 후 비중 = (기존 + 금액) / (총액 + 금액)", () => {
    const result = calculatePreflight({
      ...base,
      stopPrice: 90,
      existingSymbolValue: 1000,
    });
    assert.equal(result.projectedSymbolValue, 2000);
    assert.equal(result.projectedWeight, 0.2); // 2000 / 10000
  });

  it("총액이 0 이면 비중을 1 로 본다 — 첫 진입이 전량이다", () => {
    const result = calculatePreflight({
      ...base,
      stopPrice: 90,
      amount: 0,
      totalValue: 0,
    });
    assert.equal(result.projectedWeight, 1);
    assert.equal(result.maxLossRate, null);
  });

  it("손절가가 없으면 손절률·최대손실이 null 이고 손익비도 계산되지 않는다", () => {
    const result = calculatePreflight({ ...base, stopPrice: undefined });
    assert.equal(result.stopLossRate, null);
    assert.equal(result.maxLossAmount, null);
    assert.equal(result.riskRewardRatio, null);
  });

  it("손절가 없음: scalp 은 danger, long_term 은 warning", () => {
    const scalp = calculatePreflight({ ...base, mode: PreflightMode.Scalp });
    const longTerm = calculatePreflight({
      ...base,
      mode: PreflightMode.LongTerm,
    });
    const severityOf = (r: ReturnType<typeof calculatePreflight>) =>
      r.warnings.find(
        (w) => w.code === PreflightWarningCode.MissingStopPrice
      )?.severity;

    assert.equal(severityOf(scalp), PreflightSeverity.Danger);
    assert.equal(severityOf(longTerm), PreflightSeverity.Warning);
  });

  it("손익비가 최소 기준 미만이면 경고 + 체크 실패", () => {
    const result = calculatePreflight({
      ...base,
      stopPrice: 90,
      takeProfitPrices: [110], // reward 0.1 / stop 0.1 = 1.0
    });
    assert.equal(result.riskRewardRatio, 1);
    assert.ok(
      result.warnings.some(
        (w) => w.code === PreflightWarningCode.WeakRiskReward
      )
    );
    assert.equal(
      result.checklist.find((c) => c.key === PreflightCheckKey.RiskReward)
        ?.passed,
      false
    );
  });

  it("경계: 손익비가 정확히 최소 기준이면 통과다", () => {
    const result = calculatePreflight({
      ...base,
      stopPrice: 90,
      takeProfitPrices: [115], // 0.15 / 0.1 = 1.5
    });
    assert.equal(result.riskRewardRatio, MIN_RISK_REWARD_RATIO);
    assert.equal(
      result.warnings.some(
        (w) => w.code === PreflightWarningCode.WeakRiskReward
      ),
      false
    );
  });

  it("비중 한도를 넘으면 danger 경고 + 체크 실패", () => {
    const result = calculatePreflight({
      ...base,
      stopPrice: 90,
      amount: 8000,
      totalValue: 2000,
    });
    // 8000 / 10000 = 0.8 > 0.6
    assert.equal(result.projectedWeight, 0.8);
    const warning = result.warnings.find(
      (w) => w.code === PreflightWarningCode.ConcentrationRisk
    );
    assert.equal(warning?.severity, PreflightSeverity.Danger);
    assert.equal(
      result.checklist.find((c) => c.key === PreflightCheckKey.Concentration)
        ?.passed,
      false
    );
  });

  it("시세가 10분보다 오래되면 stale 경고", () => {
    const fresh = calculatePreflight({
      ...base,
      stopPrice: 90,
      priceUpdatedAt: new Date("2026-09-10T23:50:00Z"), // 정확히 10분
    });
    const stale = calculatePreflight({
      ...base,
      stopPrice: 90,
      priceUpdatedAt: new Date("2026-09-10T23:49:59Z"), // 10분 1초
    });
    assert.equal(fresh.stalePrice, false);
    assert.equal(stale.stalePrice, true);
    assert.ok(
      stale.warnings.some((w) => w.code === PreflightWarningCode.StalePrice)
    );
  });

  it("익절가가 없으면 손익비가 null 이다", () => {
    const result = calculatePreflight({
      ...base,
      stopPrice: 90,
      takeProfitPrices: [],
    });
    assert.equal(result.riskRewardRatio, null);
  });

  it("손절률 0(진입가 = 손절가)이면 손익비를 계산하지 않는다 — 0 나눗셈 회피", () => {
    const result = calculatePreflight({ ...base, stopPrice: 100 });
    assert.equal(result.stopLossRate, 0);
    assert.equal(result.riskRewardRatio, null);
  });

  it("체크리스트는 항목 3개 고정이다", () => {
    const result = calculatePreflight({ ...base, stopPrice: 90 });
    assert.deepEqual(
      result.checklist.map((c) => c.key),
      [
        PreflightCheckKey.StopPrice,
        PreflightCheckKey.RiskReward,
        PreflightCheckKey.Concentration,
      ]
    );
  });
});
