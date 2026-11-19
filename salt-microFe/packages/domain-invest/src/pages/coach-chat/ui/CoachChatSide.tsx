"use client";

import Link from "next/link";

import { StatusLine } from "@repo/ui/statusLine";

import { ROUTES } from "@repo/web-shared/config";
import { NavChevron } from "@repo/web-shared/ui";

import { COACH_MESSAGES, RecommendationCard, useCoachBriefing } from "@/entities/coach";
import { PositionSummary } from "@/widgets/position-overview";

import { COACH_CHAT_SIDE } from "../model";
import { block, blockTitle, detailLink, policy } from "./CoachChatSide.css";

/**
 * 코치 대화 옆 칸 — 오늘의 추천 · 포지션 요약(2026-11-19 재설계 — 끌어서 옮기던 PC 격자 대신 고정 칸, 사용자 결정 · 리서치:
 * 전용 대화 화면의 맥락 칸은 보조형 고정, 끌어 옮기는 사례는 찾지 못했다). 대화와 같은 브리핑 쿼리라 요청은 하나.
 * 같은 추천이 대화 안에 나오면 대화 쪽이 한 줄로 접는다(`asideCard` — 한 화면에 같은 숫자 두 번 금지)
 */
export const CoachChatSide = () => {
  const briefing = useCoachBriefing();
  const { report } = COACH_MESSAGES;
  return (
    <>
      <section className={block} aria-labelledby="coach-side-card">
        <h2 id="coach-side-card" className={blockTitle}>
          {COACH_CHAT_SIDE.cardTitle}
        </h2>
        <p className={policy}>{report.recommendationPolicy}</p>
        {briefing.isLoading ? (
          <p className={policy}>{COACH_CHAT_SIDE.cardLoading}</p>
        ) : briefing.isError ? (
          <StatusLine kind="error">{COACH_CHAT_SIDE.cardFailed}</StatusLine>
        ) : briefing.data?.card ? (
          <RecommendationCard recommendation={briefing.data.card} />
        ) : (
          <StatusLine kind="empty">{report.noRecommendation}</StatusLine>
        )}
        <Link href={ROUTES.coachReport} className={detailLink}>
          {COACH_CHAT_SIDE.reportLink}
          <NavChevron />
        </Link>
      </section>
      <section className={block} aria-labelledby="coach-side-position">
        <h2 id="coach-side-position" className={blockTitle}>
          {COACH_CHAT_SIDE.positionTitle}
        </h2>
        <PositionSummary />
      </section>
    </>
  );
};
