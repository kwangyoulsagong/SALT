"use client";

import type { CoachMessage, CoachQuestionChip } from "@repo/core/coach";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { ChatBubble } from "@repo/ui/chatBubble";
import { Chip } from "@repo/ui/chip";
import { TextArea } from "@repo/ui/textArea";

import { useAskCoach, type LiveCoachMessage } from "../api/useAskCoach";
import { coachLinkTarget } from "../lib/linkHref";
import { ASK_COACH_MESSAGES, COACH_CHIP_LABEL, COACH_CHIPS, COACH_QUESTION_MAX_LENGTH } from "../model/messages";
import * as styles from "./CoachConversation.css";

export interface CoachConversationProps {
  /** 지난 대화(서버 저장본, 오래된 것이 위) — 없으면 빈 배열 */
  history: CoachMessage[];
  conversationId: string | null;
  historyFailed?: boolean;
}

/**
 * 코치 대화 한 면(F006 C절 FR-20~32 · `FE-REQ-030` · `031`) — 칩 넷 · 자유 질문 · 문장씩 오는 답 · 출처 배지 · 이동 링크.
 * 답 문장은 서버 규칙 문장 그대로다. 주문 버튼 · 링크는 없다(FR-29).
 */
export const CoachConversation = ({ history, conversationId, historyFailed = false }: CoachConversationProps) => {
  const { messages, ask, retry, isSending, sendError } = useAskCoach(conversationId);
  const [draft, setDraft] = useState("");
  const all: LiveCoachMessage[] = [...history, ...messages];
  const busy = isSending || messages.some((message) => message.status === "streaming");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || busy) return;
    // 실패하면 입력을 그대로 둔다 — 다시 누르면 된다
    if (await ask({ content: draft })) setDraft("");
  };
  const askChip = (chip: CoachQuestionChip) => {
    if (!busy) void ask({ chip });
  };

  return (
    <div className={styles.root}>
      <p className={styles.intro}>{ASK_COACH_MESSAGES.intro}</p>
      {historyFailed ? <p className={styles.note}>{ASK_COACH_MESSAGES.historyFailed}</p> : null}

      <div className={styles.log} role="log" aria-live="polite" aria-busy={busy}>
        {all.map((message) => (
          <MessageBubble key={message.id} message={message} onRetry={retry} />
        ))}
      </div>

      <div className={styles.chips} role="group" aria-label={ASK_COACH_MESSAGES.chipsLabel}>
        {COACH_CHIPS.map((chip) => (
          <Chip key={chip} size="md" disabled={busy} onPress={() => askChip(chip)}>
            {COACH_CHIP_LABEL[chip]}
          </Chip>
        ))}
      </div>

      <form className={styles.composer} onSubmit={submit}>
        <TextArea
          label={ASK_COACH_MESSAGES.inputLabel}
          value={draft}
          onChange={setDraft}
          placeholder={ASK_COACH_MESSAGES.placeholder}
          maxLength={COACH_QUESTION_MAX_LENGTH}
          autoResize
          error={sendError === "busy" ? ASK_COACH_MESSAGES.sendBusy : sendError ? ASK_COACH_MESSAGES.sendFailed : undefined}
        />
        <div className={styles.actions}>
          <Button type="submit" variant="primary" disabled={!draft.trim() || busy} loading={isSending}>
            {isSending ? ASK_COACH_MESSAGES.sending : ASK_COACH_MESSAGES.send}
          </Button>
        </div>
      </form>
      <p className={styles.note}>{ASK_COACH_MESSAGES.disclaimer}</p>
    </div>
  );
};

const MessageBubble = ({ message, onRetry }: { message: LiveCoachMessage; onRetry: (answerId: string) => void }) => {
  if (message.role === "user") {
    return <ChatBubble role="user">{message.sentences.join(" ")}</ChatBubble>;
  }
  if (message.status === "failed") {
    return (
      <ChatBubble
        role="assistant"
        footer={
          message.canRetry ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => onRetry(message.id)}>
              {ASK_COACH_MESSAGES.retry}
            </Button>
          ) : undefined
        }
      >
        {message.canRetry ? ASK_COACH_MESSAGES.streamLost : message.fallbackText || ASK_COACH_MESSAGES.failed}
      </ChatBubble>
    );
  }
  const streaming = message.status === "streaming";
  const targets = message.links.flatMap((link) => {
    const target = coachLinkTarget(link);
    return target ? [target] : [];
  });
  return (
    <ChatBubble
      role="assistant"
      streaming={streaming}
      meta={
        streaming ? (
          message.reconnecting ? ASK_COACH_MESSAGES.reconnecting : ASK_COACH_MESSAGES.answering
        ) : (
          <span className={styles.meta}>
            <Badge tone={message.source === "llm" ? "ai" : "neutral"} size="sm">
              {message.source === "llm" ? ASK_COACH_MESSAGES.sourceLlm : ASK_COACH_MESSAGES.sourceRule}
            </Badge>
          </span>
        )
      }
      footer={
        !streaming && targets.length ? (
          <ul className={styles.links} aria-label={ASK_COACH_MESSAGES.links}>
            {targets.map((target) => (
              <li key={target.href}>
                <Link className={styles.link} href={target.href}>
                  {target.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : undefined
      }
    >
      {message.sentences.length ? (
        <ul className={styles.sentences}>
          {message.sentences.map((sentence, index) => (
            <li key={index}>{sentence}</li>
          ))}
        </ul>
      ) : null}
    </ChatBubble>
  );
};
