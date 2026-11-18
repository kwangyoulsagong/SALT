"use client";

import { firstCardHolders, type CoachAnswerLink, type CoachBriefing, type CoachCard, type CoachMessage, type CoachQuestionChip } from "@repo/core/coach";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";

import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { ChatBubble } from "@repo/ui/chatBubble";
import { Chip } from "@repo/ui/chip";
import { TextArea } from "@repo/ui/textArea";

import { RecommendationCard } from "@/entities/coach";

import { useAskCoach, type LiveCoachMessage } from "../api/useAskCoach";
import { formatMessageTime } from "../lib/formatMessageTime";
import { coachLinkTarget } from "../lib/linkHref";
import { ASK_COACH_MESSAGES, COACH_CHIP_LABEL, COACH_CHIPS, COACH_QUESTION_MAX_LENGTH } from "../model/messages";
import * as styles from "./CoachConversation.css";

/** 아래 끝에서 이만큼 안이면 "맨 아래를 보고 있다" — 새 답이 오면 따라 내려간다(`FE-REQ-031` FR-21) */
const FOLLOW_THRESHOLD_PX = 80;

export interface CoachConversationProps {
  /** 지난 대화(서버 저장본, 오래된 것이 위) — 없으면 빈 배열 */
  history: CoachMessage[];
  conversationId: string | null;
  historyFailed?: boolean;
  /** 더 오래된 쪽이 있다 — 위로 올리면 불러온다(`FE-REQ-031` FR-20) */
  hasOlder?: boolean;
  isLoadingOlder?: boolean;
  onLoadOlder?: () => void;
  /** 오늘의 브리핑 — `undefined` 읽는 중 · `null` 못 읽음(FEATURE-006 FR-21) */
  briefing?: CoachBriefing | null;
}

/**
 * 코치 대화 한 면(F006 C절 FR-20~32 · `FE-REQ-030` · `031`) — 지난 대화 · 오늘의 브리핑 · 칩 넷 · 자유 질문 · 문장씩 오는 답 ·
 * 저장 추천 카드 · 출처 배지 · 생성 시각 · 이동 링크. 답 문장은 서버 규칙 문장 그대로다. 주문 버튼 · 링크는 없다(FR-29).
 *
 * 대화는 자기 스크롤 칸이다 — 칩 · 입력이 늘 보이고, 새 답이 오면 맨 아래를 보던 사람만 따라 내려간다.
 * 위를 읽던 사람은 자리를 지키고 "새 답 보기"를 받는다(`FE-REQ-031` FR-21).
 */
export const CoachConversation = ({
  history,
  conversationId,
  historyFailed = false,
  hasOlder = false,
  isLoadingOlder = false,
  onLoadOlder,
  briefing,
}: CoachConversationProps) => {
  const { messages, ask, retry, isSending, sendError } = useAskCoach(conversationId);
  const [draft, setDraft] = useState("");
  const busy = isSending || messages.some((message) => message.status === "streaming");
  // 한 화면에 같은 카드는 한 번 — 화면 순서(지난 대화 → 브리핑 → 이번 답)로 처음 자리만 카드 전체
  const BRIEFING_ID = "briefing";
  const fullCards = firstCardHolders([
    ...history,
    { id: BRIEFING_ID, card: briefing?.card ?? null },
    ...messages,
  ]);

  const logRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const [unseen, setUnseen] = useState(false);

  const scrollToBottom = useCallback(() => {
    const log = logRef.current;
    if (!log) return;
    log.scrollTop = log.scrollHeight;
    following.current = true;
    setUnseen(false);
  }, []);

  const onScroll = () => {
    const log = logRef.current;
    if (!log) return;
    following.current = log.scrollHeight - log.scrollTop - log.clientHeight <= FOLLOW_THRESHOLD_PX;
    if (following.current) setUnseen(false);
  };

  // 위에 오래된 쪽이 붙으면 보던 자리를 지킨다 — 붙기 전 높이와의 차만큼 내린다
  const firstId = history[0]?.id ?? null;
  const heightBeforeOlder = useRef<number | null>(null);
  useLayoutEffect(() => {
    const log = logRef.current;
    if (!log || heightBeforeOlder.current === null) return;
    log.scrollTop += log.scrollHeight - heightBeforeOlder.current;
    heightBeforeOlder.current = null;
  }, [firstId]);

  const loadOlder = useCallback(() => {
    if (!hasOlder || isLoadingOlder || !onLoadOlder) return;
    heightBeforeOlder.current = logRef.current?.scrollHeight ?? null;
    onLoadOlder();
  }, [hasOlder, isLoadingOlder, onLoadOlder]);

  // 맨 위에 닿으면 저절로 더 — 버튼도 같이 둔다(키보드 · 화면 읽기 프로그램)
  useEffect(() => {
    const top = topRef.current;
    const log = logRef.current;
    if (!top || !log || !hasOlder) return;
    const observer = new IntersectionObserver((entries) => entries.some((entry) => entry.isIntersecting) && loadOlder(), {
      root: log,
    });
    observer.observe(top);
    return () => observer.disconnect();
  }, [hasOlder, loadOlder]);

  // 처음 그릴 때 맨 아래(가장 최근)
  useLayoutEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  // 새 문장 · 카드 · 브리핑이 오면 — 맨 아래를 보던 사람만 따라간다
  const last = messages[messages.length - 1];
  const growth = `${messages.length}:${last?.sentences.length ?? 0}:${last?.card ? 1 : 0}:${last?.status ?? ""}:${briefing ? 1 : 0}`;
  useLayoutEffect(() => {
    if (following.current) scrollToBottom();
    else setUnseen(true);
    // `growth` 가 바뀔 때만 — 오래된 쪽이 위에 붙는 것은 새 답이 아니다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [growth]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || busy) return;
    following.current = true;
    // 실패하면 입력을 그대로 둔다 — 다시 누르면 된다
    if (await ask({ content: draft })) setDraft("");
  };
  const askChip = (chip: CoachQuestionChip) => {
    if (busy) return;
    following.current = true;
    void ask({ chip });
  };

  return (
    <div className={styles.root}>
      <p className={styles.intro}>{ASK_COACH_MESSAGES.intro}</p>
      {historyFailed ? <p className={styles.note}>{ASK_COACH_MESSAGES.historyFailed}</p> : null}

      <div className={styles.logFrame}>
        <div ref={logRef} className={styles.log} role="log" aria-live="polite" aria-busy={busy} onScroll={onScroll} tabIndex={0}>
          {hasOlder ? (
            <div ref={topRef} className={styles.older}>
              <Button type="button" variant="ghost" size="sm" onClick={loadOlder} loading={isLoadingOlder}>
                {isLoadingOlder ? ASK_COACH_MESSAGES.loadingOlder : ASK_COACH_MESSAGES.loadOlder}
              </Button>
            </div>
          ) : null}
          {history.map((message) => (
            <MessageBubble key={message.id} message={message} onRetry={retry} fullCard={fullCards.has(message.id)} />
          ))}
          <BriefingBubble briefing={briefing} fullCard={fullCards.has(BRIEFING_ID)} />
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} onRetry={retry} fullCard={fullCards.has(message.id)} />
          ))}
        </div>
        {unseen ? (
          <div className={styles.newMessage}>
            <Button type="button" variant="secondary" size="sm" onClick={scrollToBottom}>
              {ASK_COACH_MESSAGES.newMessage}
            </Button>
          </div>
        ) : null}
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

/** 출처 배지 + 생성 시각(FEATURE-006 FR-27) */
const SourceMeta = ({ source, at }: { source: "rule" | "llm" | null; at: string }) => {
  const time = formatMessageTime(at);
  return (
    <span className={styles.meta}>
      <Badge tone={source === "llm" ? "ai" : "neutral"} size="sm">
        {source === "llm" ? ASK_COACH_MESSAGES.sourceLlm : ASK_COACH_MESSAGES.sourceRule}
      </Badge>
      {time ? <span className={styles.time}>{ASK_COACH_MESSAGES.generatedAt(time)}</span> : null}
    </span>
  );
};

const LinkList = ({ links }: { links: CoachAnswerLink[] }) => {
  const targets = links.flatMap((link) => {
    const target = coachLinkTarget(link);
    return target ? [target] : [];
  });
  if (!targets.length) return null;
  return (
    <ul className={styles.links} aria-label={ASK_COACH_MESSAGES.links}>
      {targets.map((target) => (
        <li key={target.href}>
          <Link className={styles.link} href={target.href}>
            {target.label}
          </Link>
        </li>
      ))}
    </ul>
  );
};

/** 답에 붙은 저장 추천 카드 — 게이트는 카드 자신이 한다(막혔으면 회색 사유 상자, `FE-REQ-030` FR-35 · 36) */
const AnswerCard = ({ card, full }: { card: CoachCard; full: boolean }) => {
  const judgedAt = formatMessageTime(card.generatedAt);
  if (!full) return <p className={styles.time}>{ASK_COACH_MESSAGES.sameCardAbove(judgedAt)}</p>;
  return (
    <div className={styles.card}>
      <RecommendationCard recommendation={card} />
      {judgedAt ? <p className={styles.time}>{ASK_COACH_MESSAGES.cardJudgedAt(judgedAt)}</p> : null}
    </div>
  );
};

const Sentences = ({ sentences }: { sentences: string[] }) =>
  sentences.length ? (
    <ul className={styles.sentences}>
      {sentences.map((sentence, index) => (
        <li key={index}>{sentence}</li>
      ))}
    </ul>
  ) : null;

/** 오늘의 브리핑 — 지난 대화 다음, 이번에 묻는 것 앞. 저장되지 않는 첫 메시지(FEATURE-006 FR-21) */
const BriefingBubble = ({ briefing, fullCard }: { briefing: CoachBriefing | null | undefined; fullCard: boolean }) => {
  if (briefing === undefined) {
    return (
      <ChatBubble role="assistant" streaming meta={ASK_COACH_MESSAGES.briefingLoading}>
        {null}
      </ChatBubble>
    );
  }
  if (briefing === null) {
    return <ChatBubble role="assistant">{ASK_COACH_MESSAGES.briefingFailed}</ChatBubble>;
  }
  return (
    <ChatBubble
      role="assistant"
      meta={<SourceMeta source={briefing.source} at={briefing.generatedAt} />}
      footer={<LinkList links={briefing.links} />}
    >
      <p className={styles.briefingTitle}>{ASK_COACH_MESSAGES.briefingTitle}</p>
      <Sentences sentences={briefing.sentences} />
      {briefing.card ? <AnswerCard card={briefing.card} full={fullCard} /> : null}
    </ChatBubble>
  );
};

const MessageBubble = ({
  message,
  onRetry,
  fullCard,
}: {
  message: LiveCoachMessage;
  onRetry: (answerId: string) => void;
  fullCard: boolean;
}) => {
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
  return (
    <ChatBubble
      role="assistant"
      streaming={streaming}
      meta={
        streaming ? (
          message.reconnecting ? ASK_COACH_MESSAGES.reconnecting : ASK_COACH_MESSAGES.answering
        ) : (
          <SourceMeta source={message.source} at={message.createdAt} />
        )
      }
      footer={!streaming ? <LinkList links={message.links} /> : undefined}
    >
      <Sentences sentences={message.sentences} />
      {message.card ? <AnswerCard card={message.card} full={fullCard} /> : null}
    </ChatBubble>
  );
};
