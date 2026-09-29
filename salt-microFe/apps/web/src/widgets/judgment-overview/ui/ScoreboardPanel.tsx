"use client";

import { Text } from "@repo/ui/text";

import {
  CoachBlockSkeleton,
  formatGeneratedAt,
  SCOREBOARD_MESSAGES,
  ScoreboardList,
  useJudgmentScoreboard,
} from "@/entities/coach";
import { AssetIdentity } from "@/entities/market";
import { panel, panelDescription, panelHead, panelTitle } from "@/shared/ui/surface.css";

import { footnote } from "./JudgmentOverview.css";

const S = SCOREBOARD_MESSAGES;

const renderIdentity = (symbol: string) => <AssetIdentity symbol={symbol} size="sm" />;

/**
 * 판정 성적표 (F010 슬라이스 3 · `FE-REQ-040` FR-6 · 리서치 §9-4 · §9-5 ④).
 *
 * 신호 유형별 적중 · 기준 대비 · 평균 · 표본 · 기간과 **최근 빗나간 판정**. 서버 고지(과거 결과 · 예측 아님)를 그대로 싣는다.
 * 확률 · 기대 R · 국면별 적중은 아직 없다 — 보정(슬라이스 4)과 원장 국면 재료가 먼저다.
 */
export const ScoreboardPanel = () => {
  const board = useJudgmentScoreboard();

  const body = () => {
    if (board.isPending) return <CoachBlockSkeleton block="zone" />;
    if (board.isError || board.data.status === "unavailable") return <Text color="tertiary">{S.unavailable}</Text>;
    if (board.data.status === "insufficient_data") return <Text color="tertiary">{S.empty}</Text>;
    const at = board.data.generatedAt ? formatGeneratedAt(board.data.generatedAt) : null;
    return (
      <>
        <ScoreboardList view={board.data} renderIdentity={renderIdentity} />
        {/* 고지는 늘 읽혀야 한다 — 패널 설명(neutral 500, 3.03:1)이 아니라 AA 를 넘는 보조 글 */}
        <p className={footnote}>
          {board.data.disclaimer}
          {at && ` · ${S.generatedAt(at)}`}
        </p>
      </>
    );
  };

  return (
    <section className={panel}>
      <div className={panelHead}>
        <h2 className={panelTitle}>{S.heading}</h2>
      </div>
      <p className={panelDescription}>{S.description}</p>
      {body()}
    </section>
  );
};
