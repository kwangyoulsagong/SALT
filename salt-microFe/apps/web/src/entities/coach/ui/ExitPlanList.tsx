import type { ReportExitPlan } from "@repo/core/coach";
import { Text } from "@repo/ui/text";
import type { ReactNode } from "react";

import { formatPrice } from "@/shared/lib";

import { describePriceGap } from "../lib";
import { COACH_MESSAGES } from "../model";
import {
  holding,
  holdingHead,
  holdingList,
  holdingPrice,
  holdingPriceValue,
  stageCell,
  stageGap,
  stageGrid,
  stageLabel,
  stagePrice,
  trendLabel,
  trendLine,
} from "./CoachReport.css";

const { report: REPORT, zone: ZONE } = COACH_MESSAGES;

interface ExitPlanListProps {
  plans: readonly ReportExitPlan[];
  /**
   * 종목 자리(로고 · 이름). 로고 · 한글 이름은 시세 슬라이스가 갖고 있어 이 엔티티가 부를 수
   * 없다 — 조합하는 위젯이 넣는다. 종목이 나오는 자리에는 로고가 늘 있다
   */
  renderIdentity: (symbol: string, size: "sm" | "md") => ReactNode;
}

/**
 * 익절 플랜 — 보유 종목별 3단계 (`FE-REQ-026` E · FR-40~45 · FR-102).
 *
 * 종목 줄(로고 · 이름 | 현재가) 아래 **가격 두 칸**(손실 제한 · 1차 익절 검토)을 옅은 회색 면으로
 * 나란히 두고, 추세 유지 조건은 가격이 아니라 문장이라 칸 아래 한 줄이다. 칸은 `<dl>` 이다.
 *
 * 가격 · 차이는 전부 서버 값이다(`FE-REQ-027` FR-12). 차이는 **금액과 위 · 아래**로만 말하고
 * % 로 바꾸지 않는다(D13). `예측 아님` 은 섹션 제목 옆 한 번(부르는 쪽).
 */
export const ExitPlanList = ({ plans, renderIdentity }: ExitPlanListProps) => {
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
          <section key={plan.symbol} className={holding} aria-label={plan.symbol}>
            <div className={holdingHead}>
              {renderIdentity(plan.symbol, "md")}
              <span className={holdingPrice}>
                <span className={stageLabel}>{REPORT.currentPriceLabel}</span>
                <span className={holdingPriceValue}>
                  {ZONE.price(formatPrice(plan.currentPrice))}
                </span>
              </span>
            </div>
            <dl className={stageGrid}>
              {stages.map(({ key, label, stage }) => (
                <div key={key} className={stageCell}>
                  <dt className={stageLabel}>{label}</dt>
                  <dd className={stagePrice}>{ZONE.price(formatPrice(stage.price))}</dd>
                  <dd className={stageGap}>{describePriceGap(stage.priceGap)}</dd>
                </div>
              ))}
            </dl>
            {trendHold && (
              <p className={trendLine}>
                <span className={trendLabel}>{REPORT.exitStages.trendHold}</span>
                <span>{trendHold}</span>
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default ExitPlanList;
