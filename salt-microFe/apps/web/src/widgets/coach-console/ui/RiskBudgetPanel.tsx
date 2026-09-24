"use client";

import { Text } from "@repo/ui/text";

import { CoachBlockSkeleton, CoachDisclosure, RISK_MESSAGES, RiskGaugeList, useRiskBudget } from "@/entities/coach";
import { RiskBudgetForm } from "@/features/set-risk-budget";
import { panel, panelDescription, panelHead, panelTitle } from "@/shared/ui/surface.css";

const { gauge: GAUGE } = RISK_MESSAGES;

/**
 * 리스크 예산 패널 (F009 시나리오 3 · FR-17 · FR-23 · FR-24 · `FE-REQ-039`).
 *
 * 포지션 화면(`position-overview`)이 웹에 아직 없어 **보유 전체를 보는 코치 리포트**에 둔다 — 새 화면 0개.
 * 리포트 본문과 따로 부르고 따로 실패한다(카드 단위 격리): 게이지가 안 와도 리포트는 그대로다.
 */
export const RiskBudgetPanel = () => {
  const budget = useRiskBudget();

  const body = () => {
    if (budget.isSignedOut) return <Text color="tertiary">{GAUGE.signedOut}</Text>;
    if (budget.isPending) return <CoachBlockSkeleton block="zone" />;
    if (budget.isError || budget.data.status === "unavailable") {
      return <Text color="tertiary">{GAUGE.unavailable}</Text>;
    }
    return (
      <>
        <RiskGaugeList view={budget.data} />
        <RiskBudgetForm view={budget.data} />
      </>
    );
  };

  return (
    <section className={panel}>
      <div className={panelHead}>
        <h2 className={panelTitle}>{GAUGE.heading}</h2>
      </div>
      <p className={panelDescription}>{GAUGE.description}</p>
      {body()}
      <CoachDisclosure />
    </section>
  );
};
