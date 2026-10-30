"use client";

import { StatusLine } from "@repo/ui/statusLine";
import Link from "next/link";

import {
  CoachBlockSkeleton,
  formatGeneratedAt,
  ReturnDistributionBars,
  SCOREBOARD_MESSAGES,
  SIGNAL_EVIDENCE_MESSAGES,
  SignalCaseColumns,
  SignalMetrics,
  signalTypeLabel,
  useJudgmentScoreboard,
} from "@/entities/coach";
import { AssetIdentity } from "@/entities/market";
import { COACH_REPORT_SECTIONS, ROUTES } from "@/shared/config";
import { backLink, panel, panelHead, panelTitle } from "@/shared/ui/surface.css";

// 새 화면의 설명 · 자산군 줄은 AA 를 넘는 보조 글(neutral 700)이다 — 패널 설명(500, 3.03:1)은 쓰지 않는다(axe 2026-10-30)
import { layout, panelFootnote, title, titleBlock } from "./CoachReport.css";

const M = SIGNAL_EVIDENCE_MESSAGES;

const DISTRIBUTION_HEADING_ID = "signal-distribution";

const renderIdentity = (symbol: string) => <AssetIdentity symbol={symbol} size="sm" />;

interface SignalEvidenceProps {
  /** URL 에서 풀어 온 그룹 키 `[kr_stock.]<mode>.<action>` */
  signalType: string;
}

/**
 * 판정 근거 상세 (`/coach/signals/[signalType]`, F004 FR-33 · 34 · `FE-REQ-026` FR-141 · 142).
 *
 * 성적표와 **같은 응답**(`/coach/scoreboard`)에서 그룹 하나를 고른다 — 따로 부르지 않으니 리포트에서 넘어오면 캐시로 바로 그린다.
 * 성적 4칸 → 수익률 분포 → 맞았던 때 · 틀렸던 때(같은 크기) 순서. 제목은 URL 키로 바로 그린다(불러오는 동안에도 h1 이 있다).
 * 매핑 없는 키 · 응답에 없는 그룹은 "기록 없음"이다 — 코드 원문을 제목에 쓰지 않는다(FR-144).
 */
export const SignalEvidence = ({ signalType }: SignalEvidenceProps) => {
  const board = useJudgmentScoreboard();
  const label = signalTypeLabel(signalType);
  const ready = board.data && board.data.status !== "unavailable" ? board.data : null;
  const group = label && ready ? ready.groups.find((item) => item.signalType === signalType) : undefined;

  const status = () => {
    if (!label) return <StatusLine kind="empty">{M.notFound}</StatusLine>;
    if (board.isSignedOut) return <StatusLine kind="empty">{M.signedOut}</StatusLine>;
    if (board.isPending) return <CoachBlockSkeleton block="zone" />;
    if (board.isError || !ready) return <StatusLine kind="error">{M.unavailable}</StatusLine>;
    if (!group) return <StatusLine kind="empty">{M.notFound}</StatusLine>;
    return null;
  };

  const at = ready?.generatedAt ? formatGeneratedAt(ready.generatedAt) : null;
  const horizon = group?.returnDistribution ? M.horizonDays(group.returnDistribution.horizonDays) : null;

  return (
    <div className={layout}>
      <Link href={ROUTES.coachReportSection(COACH_REPORT_SECTIONS.scoreboard)} className={backLink}>
        {`‹ ${M.back}`}
      </Link>

      <section className={panel}>
        <div className={titleBlock}>
          <h1 className={title}>{label ? `${label} ${M.headingSuffix}` : M.headingSuffix}</h1>
          {group && <p className={panelFootnote}>{M.assetClassMeta[group.assetClass]}</p>}
        </div>
        <p className={panelFootnote}>{M.description}</p>
        {group ? <SignalMetrics group={group} /> : status()}
      </section>

      {group && ready && (
        <>
          <section className={panel} aria-labelledby={DISTRIBUTION_HEADING_ID}>
            <div className={panelHead}>
              <h2 id={DISTRIBUTION_HEADING_ID} className={panelTitle}>
                {M.distributionHeading(horizon)}
              </h2>
            </div>
            <ReturnDistributionBars distribution={group.returnDistribution} />
          </section>

          <section className={panel} aria-label={`${M.hitsHeading} · ${M.missesHeading}`}>
            <p className={panelFootnote}>{M.casesNote}</p>
            <SignalCaseColumns group={group} renderIdentity={renderIdentity} />
            {/* 고지는 늘 읽혀야 한다 — 성적표 패널과 같은 서버 문장 · 같은 자리 */}
            <p className={panelFootnote}>
              {ready.disclaimer}
              {at && ` · ${SCOREBOARD_MESSAGES.generatedAt(at)}`}
            </p>
          </section>
        </>
      )}
    </div>
  );
};

export default SignalEvidence;
