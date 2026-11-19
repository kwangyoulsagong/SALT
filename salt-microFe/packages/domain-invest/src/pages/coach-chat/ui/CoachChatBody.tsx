"use client";

import { useCoachBriefing, useCoachConversationHistory } from "@/entities/coach";
import { ASK_COACH_MESSAGES, CoachConversation } from "@/features/ask-coach";

import * as styles from "./CoachChatBody.css";

/**
 * 코치 대화 본문 — 지난 대화를 읽은 뒤 대화 면을 놓는다. 오늘의 브리핑은 따로 와서 지난 대화 다음에 붙는다(F006 C절 · `FE-REQ-030`). 읽는 동안은 같은 높이 자리만.
 * 지난 대화를 못 읽어도 새로 묻는 것은 막지 않는다(FR-14 와 같은 태도 — 부분 실패).
 * 1280 이상이면 같은 대화를 격자 칸에 놓고 오늘의 추천 · 포지션 요약을 옆에(F006 A절 FR-50 · 57). 폭을 알기 전에는 어느 쪽도 그리지 않는다 —
 * 한 배치를 그렸다가 다른 배치로 다시 마운트하면 대화 칸의 스크롤 · 입력이 날아간다.
 */
export const CoachChatBody = () => {
  const history = useCoachConversationHistory();
  const briefing = useCoachBriefing();
  if (history.isSignedOut) return <p className={styles.note}>{ASK_COACH_MESSAGES.signedOut}</p>;
  if (history.isLoading) {
    return <div className={styles.placeholder} aria-busy="true" />;
  }
  const conversation = {
    history: history.messages,
    conversationId: history.conversationId,
    historyFailed: history.isError,
    hasOlder: history.hasOlder,
    isLoadingOlder: history.isLoadingOlder,
    onLoadOlder: history.loadOlder,
    keep: history.keep,
  };
  // 브리핑을 못 읽어도 대화는 막지 않는다 — 그 자리만 한 줄(FR-14 와 같은 태도)
  const briefingState = briefing.isError ? null : briefing.data;
  // 같은 추천이 옆 칸(오늘의 추천)에 펼쳐져 있다 — 대화 안 같은 카드는 한 줄로 접는다
  return (
    <CoachConversation
      key={history.conversationId ?? "new"}
      {...conversation}
      briefing={briefingState}
      asideCard={briefingState?.card ?? null}
    />
  );
};
