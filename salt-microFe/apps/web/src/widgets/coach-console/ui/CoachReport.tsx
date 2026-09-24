"use client";

import type { CoachReportViewModel } from "@repo/core/coach";
import { Badge } from "@repo/ui/badge";
import { Text } from "@repo/ui/text";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  BehaviorFactList,
  COACH_MESSAGES,
  CoachBlockSkeleton,
  ExitPlanList,
  formatGeneratedAt,
  RecommendationCard,
  ReportRiskList,
  useCoachReport,
} from "@/entities/coach";
import { RegenerateCoachButton } from "@/features/regenerate-coach";
import { ROUTES } from "@/shared/config";
import {
  backLink,
  panel,
  panelDescription,
  panelHead,
  panelTitle,
} from "@/shared/ui/surface.css";

import { REPORT_BLOCK_FIELDS } from "../model";
import {
  disclaimerBar,
  disclaimerLabel,
  footnote,
  header,
  layout,
  meta,
  title,
  titleBlock,
} from "./CoachReport.css";
import { AssetIdentity } from "./AssetIdentity";
import { RiskBudgetPanel } from "./RiskBudgetPanel";

const renderIdentity = (symbol: string, size: "sm" | "md") => (
  <AssetIdentity symbol={symbol} size={size} />
);

const { report: REPORT } = COACH_MESSAGES;

/** 섹션 하나 — 제목 · 한 줄 설명 · 내용. `degradedFields` 면 그 섹션만 "불러올 수 없음"(`FE-REQ-027` FR-70) */
const ReportPanel = ({
  heading,
  description,
  badge,
  degraded,
  children,
}: {
  heading: string;
  description?: string;
  badge?: ReactNode;
  degraded: boolean;
  children: ReactNode;
}) => (
  <section className={panel}>
    <div className={panelHead}>
      <h2 className={panelTitle}>
        {heading}
        {badge}
      </h2>
    </div>
    {description && <p className={panelDescription}>{description}</p>}
    {degraded ? <Text color="tertiary">{REPORT.blockUnavailable}</Text> : children}
  </section>
);

const ReportBody = ({ report }: { report: CoachReportViewModel }) => {
  const degraded = (field: string) => report.degradedFields.includes(field);
  const generatedAt = report.generatedAt ? formatGeneratedAt(report.generatedAt) : null;
  const { recommendation } = report;
  const metaLine = [
    generatedAt ? REPORT.generatedAt(generatedAt) : REPORT.notGenerated,
    report.staleHours !== null && report.staleHours > 0 ? REPORT.stale(report.staleHours) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const excluded = report.excluded.flatMap((item) => {
    const line = REPORT.excluded[`${item.assetType}:${item.reasonCode}`];
    return line ? [line] : [];
  });

  return (
    <>
      <div className={layout}>
        <Link href={ROUTES.investments} className={backLink}>
          {`\u2039 ${REPORT.back}`}
        </Link>

        <section className={panel}>
          <div className={header}>
            <div className={titleBlock}>
              <h1 className={title}>{REPORT.pageTitle}</h1>
              <p className={meta}>{metaLine}</p>
            </div>
            <RegenerateCoachButton />
          </div>
        </section>

        {/* F009 — 내 기준과 나란히 보는 게이지. 리포트와 따로 부르고 따로 실패한다 */}
        <RiskBudgetPanel />

        {/* FR-143 — 막힌 추천은 초기의 정상 상태다. 정책을 섹션 설명으로 늘 말하고, 막힘은 회색 상자 하나 */}
        <ReportPanel
          heading={REPORT.recommendationHeading}
          description={REPORT.recommendationPolicy}
          degraded={degraded(REPORT_BLOCK_FIELDS.recommendation)}
        >
          {recommendation ? (
            <RecommendationCard recommendation={recommendation} />
          ) : (
            <Text color="tertiary">{REPORT.noRecommendation}</Text>
          )}
        </ReportPanel>

        <ReportPanel heading={REPORT.risksHeading} degraded={degraded(REPORT_BLOCK_FIELDS.risks)}>
          <ReportRiskList risks={report.risks} renderIdentity={renderIdentity} />
        </ReportPanel>

        <ReportPanel
          heading={REPORT.exitPlanHeading}
          description={REPORT.exitPlanDescription}
          badge={
            <Badge size="sm" tone="neutral">
              {COACH_MESSAGES.notPrediction}
            </Badge>
          }
          degraded={degraded(REPORT_BLOCK_FIELDS.exitPlans)}
        >
          <ExitPlanList plans={report.exitPlans} renderIdentity={renderIdentity} />
        </ReportPanel>

        <ReportPanel
          heading={REPORT.behaviorHeading}
          degraded={degraded(REPORT_BLOCK_FIELDS.behaviorFacts)}
        >
          <BehaviorFactList facts={report.behaviorFacts} />
        </ReportPanel>

        {excluded.map((line) => (
          <p key={line} className={footnote}>
            {line}
          </p>
        ))}
      </div>

      <div className={disclaimerBar} role="note">
        <span className={disclaimerLabel}>{REPORT.disclaimerLabel}</span>
        <span>{report.disclaimer}</span>
      </div>
    </>
  );
};

/**
 * 코치 리포트 `/coach/report` (`FE-REQ-026` M · FR-140 · FR-143).
 *
 * ## 면책이 없으면 그리지 않는다 (FR-90 · `FE-REQ-027` FR-6)
 *
 * BFF 는 면책이 없는 리포트를 `unavailable` 로 준다 — `ok` 분기에는 면책이 타입상 늘 있다.
 * `unavailable` 은 오류 화면이 아니라 한 줄 안내다. 옛 리포트를 캐시에서 꺼내 보여주지 않는다.
 *
 * ## 그리지 않는 것 — 후보 목록
 *
 * `@repo/core/coach` `coachReport.ts` 머리말. 3종 세트가 없는 추천을 그릴 수 없다.
 *
 * 조회가 클라이언트인 이유는 `useCoachReport` 에 있다. 블록마다 따로 부르지 않는다 —
 * 서버 한 번 · BFF 한 번에 전부 온다(`FE-REQ-028` FR-4).
 */
export const CoachReport = () => {
  const report = useCoachReport();

  const notice = (content: ReactNode, extra?: ReactNode) => (
    <div className={layout}>
      <section className={panel}>
        <h1 className={title}>{REPORT.pageTitle}</h1>
        {content}
      </section>
      {extra}
    </div>
  );

  if (report.isSignedOut) return notice(<Text color="tertiary">{REPORT.signedOut}</Text>);
  if (report.isPending) return notice(<CoachBlockSkeleton block="judgment" />);
  if (report.isError || report.data.status === "unavailable") {
    // 게이지는 리포트와 따로 실패한다 — 리포트가 없어도 내 기준 · 게이지는 보인다(F009 카드 단위 격리)
    return notice(<Text color="tertiary">{REPORT.unavailable}</Text>, <RiskBudgetPanel />);
  }

  return <ReportBody report={report.data} />;
};

export default CoachReport;
