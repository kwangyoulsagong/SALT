"use client";

import { Text } from "@repo/ui/text";
import { StatusLine } from "@repo/ui/statusLine";

import {
  CoachBlockSkeleton,
  CoachDisclosure,
  MarketRegimeNote,
  RISK_MESSAGES,
  RiskGaugeList,
  riskSummaryLine,
  ScenarioList,
  useRiskBudget,
} from "@/entities/coach";
import { RiskBudgetForm } from "@/features/set-risk-budget";
import { COACH_REPORT_SECTIONS } from "@repo/web-shared/config";
import { panel, panelDescription, panelHead, panelTitle } from "@repo/web-shared/ui/surface.css";

import { anchorTarget, foldHintSummary, riskLine, riskLineAlert, riskNote, subHeading } from "./CoachReport.css";

const { gauge: GAUGE, scenario: SCENARIO } = RISK_MESSAGES;

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
      return <StatusLine kind="error">{GAUGE.unavailable}</StatusLine>;
    }
    // 한 줄 먼저(F017 v4 순서 6 · `FE-REQ-064` FR-12 "위험 예산 한 줄 — 넘을 때만 강조") — 게이지 · 국면 · 내 기준 · 시나리오는 펼침
    const summary = riskSummaryLine(budget.data, true);
    return (
      <>
        <p className={summary.exceeded ? `${riskLine} ${riskLineAlert}` : riskLine}>{summary.value}</p>
        <p className={riskNote}>{summary.notes.length ? summary.notes.join(" · ") : RISK_MESSAGES.summary.noteFallback}</p>
        {/* 넘었으면 펼친 채로 — 강조는 넘을 때만 */}
        <details open={summary.exceeded}>
          <summary className={foldHintSummary}>{RISK_MESSAGES.summary.more}</summary>
          <RiskGaugeList view={budget.data} />
          {/* 국면(F010 `FE-REQ-040` FR-3) — 참고 라벨. 국면 작업이 없거나 낡았으면 칸이 없다 */}
          {budget.data.market && <MarketRegimeNote market={budget.data.market} />}
          <RiskBudgetForm view={budget.data} />
          {/* 시나리오(FR-25) — 게이지와 같은 보유 · 같은 응답. 서버가 못 줬으면 묶음째 없다 */}
          {budget.data.scenarios && (
            <>
              <h3 className={subHeading}>{SCENARIO.heading}</h3>
              <p className={panelDescription}>{SCENARIO.description}</p>
              <ScenarioList scenarios={budget.data.scenarios} />
            </>
          )}
        </details>
      </>
    );
  };

  return (
    <section id={COACH_REPORT_SECTIONS.riskBudget} className={`${panel} ${anchorTarget}`}>
      <div className={panelHead}>
        <h2 className={panelTitle}>{GAUGE.heading}</h2>
      </div>
      <p className={panelDescription}>{GAUGE.description}</p>
      {body()}
      {/* ~~매입가 숨김(FR-27)~~ 2026-11-10 숨는 보유 칸과 함께 포트폴리오 페이지로(`FE-REQ-069` FR-4) — 코치 설정에도 그대로 */}
      <CoachDisclosure />
    </section>
  );
};
