"use client";

import type { CoachBriefing, CoachMessage } from "@repo/core/coach";
import Link from "next/link";

import { StatusLine } from "@repo/ui/statusLine";
import { Text } from "@repo/ui/text";

import { ROUTES } from "@repo/web-shared/config";
import { NavChevron } from "@repo/web-shared/ui";

import { COACH_MESSAGES, RecommendationCard } from "@/entities/coach";
import { CoachConversation } from "@/features/ask-coach";
import { PcPanelGrid } from "@/widgets/pc-panel-grid";
import { PositionSummary } from "@/widgets/position-overview";

import { COACH_GRID_DEFAULT_LAYOUT, COACH_GRID_MESSAGES, COACH_GRID_PANELS } from "../model";
import * as styles from "./CoachChatGrid.css";

export interface CoachChatGridProps {
  history: CoachMessage[];
  conversationId: string | null;
  historyFailed: boolean;
  hasOlder: boolean;
  isLoadingOlder: boolean;
  onLoadOlder: () => void;
  /** `undefined` 읽는 중 · `null` 못 읽음 */
  briefing: CoachBriefing | null | undefined;
}

/**
 * PC 코치 격자(F006 A절 · `FE-REQ-030` FR-50~58) — 1280 이상에서 `/coach/chat` 이 칸 셋을 한 번에: 좌 대화 · 우상 오늘의 추천 · 우하 포지션 요약.
 * 칸 내용은 여기(페이지)가 넣는다(FR-58). 오늘의 추천 칸에 펼친 카드는 대화 안에서 한 줄로 접힌다(같은 숫자 두 번 금지).
 * `next/dynamic` 으로만 불린다 — 좁은 화면은 이 코드를 받지 않는다.
 */
export const CoachChatGrid = ({ briefing, ...conversation }: CoachChatGridProps) => {
  const card = briefing?.card ?? null;
  return (
    <PcPanelGrid
      defaultLayout={COACH_GRID_DEFAULT_LAYOUT}
      panels={[
        {
          ...COACH_GRID_PANELS.chat,
          content: (
            <CoachConversation
              key={conversation.conversationId ?? "new"}
              {...conversation}
              // 브리핑을 못 읽어도 대화는 막지 않는다 — 그 자리만 한 줄(FR-14 와 같은 태도)
              briefing={briefing}
              asideCard={card}
              fill
            />
          ),
        },
        { ...COACH_GRID_PANELS.card, content: <TodayCard briefing={briefing} /> },
        { ...COACH_GRID_PANELS.position, content: <PositionSummary /> },
      ]}
    />
  );
};

/** 오늘의 추천 칸 — 브리핑에 붙은 저장 추천 카드(게이트는 카드가 한다). 정책 한 줄은 늘(막힘은 초기의 정상 상태 — FR-143) */
const TodayCard = ({ briefing }: { briefing: CoachBriefing | null | undefined }) => {
  const { report } = COACH_MESSAGES;
  return (
    <div className={styles.cardPanel} aria-busy={briefing === undefined}>
      <Text color="secondary">{report.recommendationPolicy}</Text>
      {briefing === undefined ? (
        <Text color="tertiary">{COACH_GRID_MESSAGES.cardLoading}</Text>
      ) : briefing === null ? (
        <StatusLine kind="error">{COACH_GRID_MESSAGES.cardFailed}</StatusLine>
      ) : briefing.card ? (
        <RecommendationCard recommendation={briefing.card} />
      ) : (
        <StatusLine kind="empty">{report.noRecommendation}</StatusLine>
      )}
      <Link href={ROUTES.coachReport} className={styles.detailLink}>
        {COACH_GRID_MESSAGES.reportLink}
        <NavChevron />
      </Link>
    </div>
  );
};
