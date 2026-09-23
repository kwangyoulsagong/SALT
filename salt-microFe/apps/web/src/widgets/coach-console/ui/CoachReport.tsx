"use client";

import type { CoachReportViewModel } from "@repo/core/coach";
import { Text } from "@repo/ui/text";
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

import { REPORT_BLOCK_FIELDS } from "../model";
import {
  accumulating,
  card,
  cardTitle,
  column,
  disclaimerBar,
  disclaimerLabel,
  excludedLine,
  grid,
  header,
  layout,
  meta,
  title,
  titleBlock,
} from "./CoachReport.css";

const { report: REPORT } = COACH_MESSAGES;

/** 블록 하나. `degradedFields` 에 있으면 그 블록만 "불러올 수 없음"(`FE-REQ-027` FR-70) */
const ReportCard = ({
  heading,
  degraded,
  children,
}: {
  heading: string;
  degraded: boolean;
  children: ReactNode;
}) => (
  <section className={card}>
    <h2 className={cardTitle}>{heading}</h2>
    {degraded ? <Text color="tertiary">{REPORT.blockUnavailable}</Text> : children}
  </section>
);

const ReportBody = ({ report }: { report: CoachReportViewModel }) => {
  const degraded = (field: string) => report.degradedFields.includes(field);
  const generatedAt = report.generatedAt ? formatGeneratedAt(report.generatedAt) : null;
  const { recommendation } = report;
  // FR-143 · `FE-REQ-027` FR-94 — 막힌 추천은 초기의 **정상 상태**다. 오류 경계로 보내지 않는다
  const isAccumulating = recommendation !== null && !recommendation.renderable;
  const excluded = report.excluded.flatMap((item) => {
    const line = REPORT.excluded[`${item.assetType}:${item.reasonCode}`];
    return line ? [line] : [];
  });

  return (
    <>
      <div className={layout}>
        <div className={header}>
          <div className={titleBlock}>
            <h1 className={title}>{REPORT.pageTitle}</h1>
            <p className={meta}>
              <span>{generatedAt ? REPORT.generatedAt(generatedAt) : REPORT.notGenerated}</span>
              {report.staleHours !== null && report.staleHours > 0 && (
                <span>{REPORT.stale(report.staleHours)}</span>
              )}
            </p>
          </div>
          <RegenerateCoachButton />
        </div>

        {isAccumulating && <p className={accumulating}>{REPORT.accumulating}</p>}

        <div className={grid}>
          <div className={column}>
            <ReportCard
              heading={REPORT.recommendationHeading}
              degraded={degraded(REPORT_BLOCK_FIELDS.recommendation)}
            >
              {recommendation ? (
                <RecommendationCard recommendation={recommendation} />
              ) : (
                <Text color="tertiary">{REPORT.noRecommendation}</Text>
              )}
            </ReportCard>
            <ReportCard
              heading={REPORT.risksHeading}
              degraded={degraded(REPORT_BLOCK_FIELDS.risks)}
            >
              <ReportRiskList risks={report.risks} />
            </ReportCard>
          </div>

          <aside className={column}>
            <ReportCard
              heading={REPORT.exitPlanHeading}
              degraded={degraded(REPORT_BLOCK_FIELDS.exitPlans)}
            >
              <ExitPlanList plans={report.exitPlans} />
            </ReportCard>
            <ReportCard
              heading={REPORT.behaviorHeading}
              degraded={degraded(REPORT_BLOCK_FIELDS.behaviorFacts)}
            >
              <BehaviorFactList facts={report.behaviorFacts} />
            </ReportCard>
          </aside>
        </div>

        {excluded.map((line) => (
          <p key={line} className={excludedLine}>
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

  if (report.isSignedOut) return <Text color="tertiary">{REPORT.signedOut}</Text>;
  if (report.isPending) {
    return <CoachBlockSkeleton block="judgment" />;
  }
  if (report.isError || report.data.status === "unavailable") {
    return <Text color="tertiary">{REPORT.unavailable}</Text>;
  }

  return <ReportBody report={report.data} />;
};

export default CoachReport;
