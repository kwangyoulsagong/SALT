import type { ReportExitPlan } from "@repo/core/coach";
import { Text } from "@repo/ui/text";

import { formatPrice } from "@/shared/lib";

import { describePriceGap } from "../lib";
import { COACH_MESSAGES } from "../model";
import {
  holdingHead,
  holdingList,
  holdingSymbol,
  row,
  rowAmount,
  rowCaption,
  rowLabel,
  rowList,
  rowSentence,
  rowValue,
} from "./CoachReport.css";

const { report: REPORT, zone: ZONE } = COACH_MESSAGES;

/**
 * 익절 플랜 — 보유 종목별 3단계 (`FE-REQ-026` E · FR-40~45 · FR-102).
 *
 * 표가 아니라 **목록 행**(`<dl>`)이다 — 왼쪽 단계 이름, 오른쪽 가격, 가격 아래 현재가와의 차이.
 * 열 머리("단계 · 가격")가 없어도 읽히는 두 칸이라 머리를 두면 줄만 는다.
 *
 * 가격 · 차이는 전부 서버 값이다(`FE-REQ-027` FR-12). 차이는 **금액과 위 · 아래**로만 말하고
 * % 로 바꾸지 않는다(D13). 추세 유지는 가격이 아니라 조건이라 문장으로 두고 굵게 쓰지 않는다.
 * `예측 아님` 은 섹션 설명에 한 번 둔다(부르는 쪽) — 종목마다 반복하면 소음이 된다.
 */
export const ExitPlanList = ({ plans }: { plans: readonly ReportExitPlan[] }) => {
  if (plans.length === 0) return <Text color="tertiary">{REPORT.noHoldings}</Text>;

  return (
    <div className={holdingList}>
      {plans.map((plan) => {
        const trendHold = REPORT.trendHoldConditions[plan.trendHold.conditionCode];
        const stages = [
          { key: "stopLoss", label: REPORT.exitStages.stopLoss, stage: plan.stopLoss },
          {
            key: "firstTakeProfit",
            label: REPORT.exitStages.firstTakeProfit,
            stage: plan.firstTakeProfit,
          },
        ] as const;

        return (
          <section key={plan.symbol} aria-label={plan.symbol}>
            <div className={holdingHead}>
              <p className={holdingSymbol}>{plan.symbol}</p>
              <span className={rowCaption}>
                {REPORT.currentPrice(formatPrice(plan.currentPrice))}
              </span>
            </div>
            <dl className={rowList}>
              {stages.map(({ key, label, stage }) => (
                <div key={key} className={row}>
                  <dt className={rowLabel}>{label}</dt>
                  <dd className={rowValue}>
                    <span className={rowAmount}>{ZONE.price(formatPrice(stage.price))}</span>
                    <span className={rowCaption}>{describePriceGap(stage.priceGap)}</span>
                  </dd>
                </div>
              ))}
              {trendHold && (
                <div className={row}>
                  <dt className={rowLabel}>{REPORT.exitStages.trendHold}</dt>
                  <dd className={rowValue}>
                    <span className={rowSentence}>{trendHold}</span>
                  </dd>
                </div>
              )}
            </dl>
          </section>
        );
      })}
    </div>
  );
};

export default ExitPlanList;
