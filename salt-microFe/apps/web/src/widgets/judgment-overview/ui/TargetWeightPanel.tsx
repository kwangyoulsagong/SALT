"use client";

import { Text } from "@repo/ui/text";
import Link from "next/link";

import { CoachBlockSkeleton, TARGET_WEIGHT_MESSAGES, TargetWeightList, useTargetWeights } from "@/entities/coach";
import { AssetIdentity } from "@/entities/market";
import { ROUTES } from "@/shared/config";
import { NavChevron } from "@/shared/ui";
import { panel, panelHead, panelTitle } from "@/shared/ui/surface.css";

import { headLink, noticeDescription } from "./JudgmentOverview.css";

const M = TARGET_WEIGHT_MESSAGES;

const renderIdentity = (symbol: string) => <AssetIdentity symbol={symbol} size="sm" />;

/**
 * 이번 주 목표 비중 (F010 슬라이스 5 · `FE-REQ-042` · 리서치 §9-4 [오늘의 판정]).
 *
 * `/investments` 머리 아래 **첫 카드**다 — 위험 · 성적표보다 먼저(리서치 §9-4 순서). 따로 부르고 따로 실패한다.
 * 투자금 · 목표 변동성은 코치 리포트의 "내 기준" 폼에서 적는다(설정 폼을 두 곳에 두지 않는다).
 */
export const TargetWeightPanel = () => {
  const weights = useTargetWeights();

  const capitalAction = (
    <Link href={ROUTES.coachReport} className={headLink} aria-label={M.setCapitalLabel}>
      {M.setCapital}
      <NavChevron />
    </Link>
  );

  const body = () => {
    if (weights.isPending) return <CoachBlockSkeleton block="zone" />;
    if (weights.isError || weights.data.status === "unavailable") return <Text color="tertiary">{M.unavailable}</Text>;
    if (weights.data.status === "blocked") return <Text color="tertiary">{M.blocked[weights.data.reason]}</Text>;
    return <TargetWeightList view={weights.data} renderIdentity={renderIdentity} capitalAction={capitalAction} />;
  };

  return (
    <section className={panel}>
      <div className={panelHead}>
        <h2 className={panelTitle}>{M.heading}</h2>
      </div>
      <p className={noticeDescription}>{M.description}</p>
      {body()}
    </section>
  );
};
