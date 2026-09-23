import type { ReportExitPlan } from "@repo/core/coach";
import { Badge } from "@repo/ui/badge";
import { Text } from "@repo/ui/text";

import { formatPrice } from "@/shared/lib";

import { describePriceGap } from "../lib";
import { COACH_MESSAGES } from "../model";
import {
  gapCaption,
  rowHeader,
  statTerm,
  table,
  tableCaption,
  td,
  th,
} from "./CoachDetail.css";
import { exitPlanBlock, exitPlanHead, recommendationSymbol } from "./CoachReport.css";

const { report: REPORT, zone: ZONE } = COACH_MESSAGES;

/**
 * 익절 플랜 — 보유 종목별 3단계 (`FE-REQ-026` E · FR-40~45).
 *
 * 가격 · 현재가와의 차이는 전부 서버 값이다(`FE-REQ-027` FR-12). 차이는 **금액과 위 · 아래**로만
 * 말하고 % 로 바꾸지 않는다(D13). 추세 유지는 가격이 아니라 조건이라 조건 문장 한 줄이다 —
 * 매핑이 없는 조건 코드는 그 행을 그리지 않는다(FR-23).
 *
 * 표마다 `예측 아님` 을 붙인다 — 가격이 적힌 표는 목표처럼 읽힌다(FR-43).
 */
export const ExitPlanList = ({ plans }: { plans: readonly ReportExitPlan[] }) => {
  if (plans.length === 0) return <Text color="tertiary">{REPORT.noHoldings}</Text>;

  return (
    <>
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
          <div key={plan.symbol} className={exitPlanBlock}>
            <div className={exitPlanHead}>
              <p className={recommendationSymbol}>{plan.symbol}</p>
              <span className={statTerm}>
                {REPORT.currentPrice(formatPrice(plan.currentPrice))}
              </span>
            </div>
            <table className={table}>
              <caption className={tableCaption}>
                {REPORT.exitPlanCaption}{" "}
                <Badge size="sm" tone="neutral">
                  {COACH_MESSAGES.notPrediction}
                </Badge>
              </caption>
              <thead>
                <tr>
                  <th scope="col" className={th}>{REPORT.exitPlanColumns.stage}</th>
                  <th scope="col" className={th}>{REPORT.exitPlanColumns.price}</th>
                </tr>
              </thead>
              <tbody>
                {stages.map(({ key, label, stage }) => (
                  <tr key={key}>
                    <th scope="row" className={rowHeader}>{label}</th>
                    <td className={td}>
                      {ZONE.price(formatPrice(stage.price))}
                      <span className={gapCaption}>{describePriceGap(stage.priceGap)}</span>
                    </td>
                  </tr>
                ))}
                {trendHold && (
                  <tr>
                    <th scope="row" className={rowHeader}>{REPORT.exitStages.trendHold}</th>
                    <td className={td}>{trendHold}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
};

export default ExitPlanList;
