"use client";

import dynamic from "next/dynamic";

import { useWideViewport } from "@repo/web-shared/lib";

import { useCoachBriefing, useCoachConversationHistory } from "@/entities/coach";
import { ASK_COACH_MESSAGES, CoachConversation } from "@/features/ask-coach";

import * as styles from "./CoachChatBody.css";

/** PC 격자(1280 이상) — `MovableGrid` 는 SSR 이 안 되고(`FE-REQ-030` FR-56) 좁은 화면엔 필요 없는 코드라 따로 받는다 */
const CoachChatGrid = dynamic(() => import("./CoachChatGrid").then((mod) => mod.CoachChatGrid), {
  ssr: false,
  loading: () => <div className={styles.gridPlaceholder} aria-busy="true" />,
});

/**
 * 코치 대화 본문 — 지난 대화를 읽은 뒤 대화 면을 놓는다. 오늘의 브리핑은 따로 와서 지난 대화 다음에 붙는다(F006 C절 · `FE-REQ-030`). 읽는 동안은 같은 높이 자리만.
 * 지난 대화를 못 읽어도 새로 묻는 것은 막지 않는다(FR-14 와 같은 태도 — 부분 실패).
 * 1280 이상이면 같은 대화를 격자 칸에 놓고 오늘의 추천 · 포지션 요약을 옆에(F006 A절 FR-50 · 57). 폭을 알기 전에는 어느 쪽도 그리지 않는다 —
 * 한 배치를 그렸다가 다른 배치로 다시 마운트하면 대화 칸의 스크롤 · 입력이 날아간다.
 */
export const CoachChatBody = () => {
  const history = useCoachConversationHistory();
  const briefing = useCoachBriefing();
  const wide = useWideViewport();
  if (history.isSignedOut) return <p className={styles.note}>{ASK_COACH_MESSAGES.signedOut}</p>;
  if (history.isLoading || wide === null) {
    return <div className={styles.placeholder} aria-busy="true" />;
  }
  const conversation = {
    history: history.messages,
    conversationId: history.conversationId,
    historyFailed: history.isError,
    hasOlder: history.hasOlder,
    isLoadingOlder: history.isLoadingOlder,
    onLoadOlder: history.loadOlder,
  };
  // 브리핑을 못 읽어도 대화는 막지 않는다 — 그 자리만 한 줄(FR-14 와 같은 태도)
  const briefingState = briefing.isError ? null : briefing.data;
  if (wide) return <CoachChatGrid {...conversation} briefing={briefingState} />;
  return <CoachConversation key={history.conversationId ?? "new"} {...conversation} briefing={briefingState} />;
};
