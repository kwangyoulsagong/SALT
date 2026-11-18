"use client";

import { useCoachConversationHistory } from "@/entities/coach";
import { ASK_COACH_MESSAGES, CoachConversation } from "@/features/ask-coach";

import * as styles from "./CoachChatBody.css";

/**
 * 코치 대화 본문 — 지난 대화를 읽은 뒤 대화 면을 놓는다(F006 C절 · `FE-REQ-030`). 읽는 동안은 같은 높이 자리만.
 * 지난 대화를 못 읽어도 새로 묻는 것은 막지 않는다(FR-14 와 같은 태도 — 부분 실패).
 */
export const CoachChatBody = () => {
  const history = useCoachConversationHistory();
  if (history.isSignedOut) return <p className={styles.note}>{ASK_COACH_MESSAGES.signedOut}</p>;
  if (history.isLoading) return <div className={styles.placeholder} aria-busy="true" />;
  return (
    <CoachConversation
      key={history.conversationId ?? "new"}
      history={history.messages}
      conversationId={history.conversationId}
      historyFailed={history.isError}
    />
  );
};
