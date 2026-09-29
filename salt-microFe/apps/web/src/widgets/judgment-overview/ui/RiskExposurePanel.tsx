"use client";

import { Text } from "@repo/ui/text";
import Link from "next/link";

import {
  CoachBlockSkeleton,
  MarketRegimeNote,
  RISK_MESSAGES,
  RiskGaugeList,
  useRiskBudget,
} from "@/entities/coach";
import { ROUTES } from "@/shared/config";
import { NavChevron } from "@/shared/ui";
import { panel, panelDescription, panelHead, panelTitle } from "@/shared/ui/surface.css";

import { JUDGMENT_OVERVIEW_MESSAGES } from "../model";
import { headLink } from "./JudgmentOverview.css";

const M = JUDGMENT_OVERVIEW_MESSAGES.risk;

/**
 * 위험에 노출된 돈 (F010 슬라이스 3 · `FE-REQ-040` FR-5 · 리서치 §9-4).
 *
 * 코치 리포트의 리스크 예산 게이지와 **같은 응답 · 같은 컴포넌트**다(`coachQueryKeys.riskBudget` — 요청이 늘지 않는다).
 * 여기는 보기만 한다: 기준 설정 폼 · 시나리오는 리포트에 있고 "자세히"가 그리로 간다. 넘어도 막지 않는다.
 */
export const RiskExposurePanel = () => {
  const budget = useRiskBudget();

  const body = () => {
    if (budget.isPending) return <CoachBlockSkeleton block="zone" />;
    if (budget.isError || budget.data.status === "unavailable") {
      return <Text color="tertiary">{RISK_MESSAGES.gauge.unavailable}</Text>;
    }
    return (
      <>
        <RiskGaugeList view={budget.data} />
        {budget.data.market && <MarketRegimeNote market={budget.data.market} />}
      </>
    );
  };

  return (
    <section className={panel}>
      <div className={panelHead}>
        <h2 className={panelTitle}>{M.heading}</h2>
        <Link href={ROUTES.coachReport} className={headLink} aria-label={M.reportLinkLabel}>
          {M.reportLink}
          <NavChevron />
        </Link>
      </div>
      <p className={panelDescription}>{M.description}</p>
      {body()}
    </section>
  );
};
