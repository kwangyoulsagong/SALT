"use client";

import { Text } from "@repo/ui/text";
import { StatusLine } from "@repo/ui/statusLine";

import { CoachBlockSkeleton, TARGET_WEIGHT_MESSAGES, TargetWeightList, useTargetWeights } from "@/entities/coach";
import { AssetIdentity } from "@/entities/market";
import { COACH_REPORT_SECTIONS } from "@/shared/config";
import { panel, panelHead, panelTitle } from "@/shared/ui/surface.css";

import { anchorTarget, inlineLink, noticeDescription } from "./CoachReport.css";

const M = TARGET_WEIGHT_MESSAGES;

const renderIdentity = (symbol: string) => <AssetIdentity symbol={symbol} size="sm" />;

/**
 * 이번 주 목표 비중 (F010 슬라이스 5 · `FE-REQ-042` · 리서치 §9-4 [오늘의 판정]).
 *
 * 코치 리포트의 **첫 패널**이다(2026-09-29 투자 화면에서 옮김 — 3종 고지를 다 펼친 카드가 876px 로 한 화면보다 길어
 * 시세 표를 두 화면 반 아래로 밀었다). 투자 화면에는 요약 띠만 남고 그 띠가 이 앵커로 온다.
 * 투자금 · 목표 변동성은 같은 페이지 "내 기준" 폼에서 적는다 — 링크는 페이지 안 이동이다.
 */
export const TargetWeightPanel = () => {
  const weights = useTargetWeights();

  const capitalAction = (
    <a href={`#${COACH_REPORT_SECTIONS.riskBudget}`} className={inlineLink} aria-label={M.setCapitalLabel}>
      {M.setCapital}
    </a>
  );

  const body = () => {
    if (weights.isPending) return <CoachBlockSkeleton block="zone" />;
    if (weights.isError || weights.data.status === "unavailable") return <StatusLine kind="error">{M.unavailable}</StatusLine>;
    if (weights.data.status === "blocked") return <Text color="tertiary">{M.blocked[weights.data.reason]}</Text>;
    return <TargetWeightList view={weights.data} renderIdentity={renderIdentity} capitalAction={capitalAction} />;
  };

  return (
    <section id={COACH_REPORT_SECTIONS.targetWeight} className={`${panel} ${anchorTarget}`}>
      <div className={panelHead}>
        <h2 className={panelTitle}>{M.heading}</h2>
      </div>
      <p className={noticeDescription}>{M.description}</p>
      {body()}
    </section>
  );
};
