/**
 * 계획 준수 판정 — FEATURE-009 FR-11 · FR-12 (`SRV-REQ-038` FR-9).
 *
 * ## 판정은 정보 라벨이다
 *
 * 아무것도 막지 않는다. 사용자는 라벨을 고칠 수 있고(`userAdherenceLabel`), 원본 판정은 그대로 남는다(W06).
 * 수동 입력이라 매도 기록이 늦게 들어올 수 있다 — 배치가 매번 다시 판정하므로 늦게 적은 매도도 반영된다.
 *
 * ## 기준 시각 — 일봉 종가(KST 09:00 = UTC 00:00 경계)
 *
 * 업비트 일봉의 경계다(`forecast.v_daily_close`). 장중 터치는 보지 않는다. 종가가 손절가 아래로 닫힌 뒤
 * **하루(24시간)** 안에 이 매수분을 판 기록이 없으면 `stop_not_honored` 다. 하루는 "다음 날 아침에 팔았다"를
 * 위반으로 치지 않기 위한 유예다. 유예가 아직 안 끝났으면 그 조건은 판정하지 않는다.
 *
 * ## 우선순위 — 가장 비싼 위반 하나
 *
 * 라벨 칸이 하나다. `stop_not_honored` > `stop_slipped` > `size_exceeded` > `honored`.
 */

import Decimal from "decimal.js";

import type { LotTrace } from "./tradeLedger";
import type { AdherenceLabel, TradePlan } from "./tradePlan";

const DAY_MS = 24 * 60 * 60 * 1000;
/** 손절가 아래로 닫힌 뒤 매도를 기다리는 시간 */
export const STOP_GRACE_MS = DAY_MS;
/** 매도가가 손절가보다 이만큼 이상 낮으면 `stop_slipped` (FR-11 "손절가 −5% 이하") */
export const STOP_SLIP_RATE = new Decimal("0.05");

/** 닫힌 일봉. `openTime` 은 UTC 00:00(= KST 09:00), 종가는 `openTime + 1일` 에 확정된다 */
export interface DailyBar {
  openTime: Date;
  close: Decimal;
}

export interface AdherenceJudgement {
  planId: string;
  /** `null` 이면 판정할 기준이 없다(손절가 · 계획 수량 둘 다 없음 · 매도 계획 · 거래 없음) */
  label: AdherenceLabel | null;
  /** 이 매수분을 다 팔았고 유예도 끝났다 — 더 바뀌지 않는다 */
  final: boolean;
}

export const barCloseTime = (bar: DailyBar): Date => new Date(bar.openTime.getTime() + DAY_MS);

/**
 * 거래에 연결된 매수 계획 하나를 판정한다.
 *
 * @param lot 연결된 매수의 되감기 흔적. 없으면(거래가 지워졌거나 코인이 아님) 판정하지 않는다
 * @param bars 그 종목 닫힌 일봉(시간순)
 */
export const judgeAdherence = (
  plan: Pick<TradePlan, "id" | "side" | "stopPrice" | "plannedQuantity">,
  lot: LotTrace | undefined,
  bars: DailyBar[],
  now: Date
): AdherenceJudgement => {
  const none = { planId: plan.id, label: null, final: false };
  if (plan.side !== "buy" || !lot) return none;
  if (plan.stopPrice === null && plan.plannedQuantity === null) return none;

  const boughtAt = lot.buy.transactionDate;
  const windowEnd = lot.closedAt ?? now;
  let label: AdherenceLabel = "honored";
  let pending = false;

  if (plan.stopPrice !== null) {
    const stop = plan.stopPrice;
    const breach = bars.find((bar) => {
      const closeAt = barCloseTime(bar);
      return closeAt > boughtAt && closeAt <= windowEnd && bar.close.lt(stop);
    });

    if (breach) {
      const deadline = barCloseTime(breach).getTime() + STOP_GRACE_MS;
      const soldInTime = lot.consumedBy.some((sale) => sale.at.getTime() <= deadline);
      if (soldInTime) {
        // 판 시점이 유예 안이다
      } else if (now.getTime() > deadline) {
        label = "stop_not_honored";
      } else {
        pending = true;
      }
    }

    const slipFloor = stop.times(new Decimal(1).minus(STOP_SLIP_RATE));
    if (label === "honored" && lot.consumedBy.some((sale) => sale.price.lte(slipFloor))) {
      label = "stop_slipped";
    }
  }

  if (
    label === "honored" &&
    plan.plannedQuantity !== null &&
    new Decimal(lot.buy.quantity).gt(plan.plannedQuantity)
  ) {
    label = "size_exceeded";
  }

  return { planId: plan.id, label, final: lot.closedAt !== null && !pending };
};

/** 사용자가 고친 라벨이 있으면 그것, 없으면 원본 판정 */
export const effectiveAdherence = (
  plan: Pick<TradePlan, "adherenceLabel" | "userAdherenceLabel">
): AdherenceLabel | null => plan.userAdherenceLabel ?? plan.adherenceLabel;

export const isViolation = (label: AdherenceLabel | null): boolean =>
  label !== null && label !== "honored";
