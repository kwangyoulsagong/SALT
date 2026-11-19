"use client";

import { firstCardHolders, isSameCard, type CoachAnswerLink, type CoachBriefing, type CoachCard, type CoachHistoryKeep, type CoachMessage, type CoachQuestionChip } from "@repo/core/coach";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { ArrowUp } from "lucide-react";

import { Button } from "@repo/ui/button";

import { NavChevron } from "@repo/web-shared/ui";

import { RecommendationCard } from "@/entities/coach";

import { useAskCoach, type LiveCoachMessage } from "../api/useAskCoach";
import { formatMessageTime } from "../lib/formatMessageTime";
import { coachLinkTarget } from "../lib/linkHref";
import { ASK_COACH_MESSAGES, COACH_CHIP_LABEL, COACH_CHIPS, COACH_QUESTION_MAX_LENGTH, COACH_COUNTER_FROM, COACH_FOLLOW_UP_MAX } from "../model/messages";
import * as styles from "./CoachConversation.css";

/** 아래 끝에서 이만큼 안이면 "맨 아래를 보고 있다" — 새 답이 오면 따라 내려간다(`FE-REQ-031` FR-21) */
const FOLLOW_THRESHOLD_PX = 80;
/** 지난 대화를 미리 부르는 거리 — 맨 위에 닿기 이만큼 전에 다음 쪽(30개)을 부른다 */
const PREFETCH_OLDER_PX = 600;

export interface CoachConversationProps {
  /** 지난 대화(서버 저장본, 오래된 것이 위) — 없으면 빈 배열 */
  history: CoachMessage[];
  conversationId: string | null;
  historyFailed?: boolean;
  /** 더 오래된 쪽이 있다 — 위로 올리면 불러온다(`FE-REQ-031` FR-20) */
  hasOlder?: boolean;
  isLoadingOlder?: boolean;
  onLoadOlder?: () => void;
  /** 보관 한도 — 더 불러올 것이 없을 때 맨 위 한 줄. 없으면 그 줄을 안 그린다 */
  keep?: CoachHistoryKeep | null;
  /** 오늘의 브리핑 — `undefined` 읽는 중 · `null` 못 읽음(FEATURE-006 FR-21) */
  briefing?: CoachBriefing | null;
  /**
   * 옆 칸에 이미 펼친 카드(PC 격자 — `FE-REQ-030` FR-51). 대화 안의 같은 판단 카드는 모두 한 줄로 접는다 —
   * 한 화면에 같은 숫자 두 번 금지(`screen-desktop.md` §5)
   */
  asideCard?: CoachCard | null;
}

/**
 * 코치 대화 한 면(F006 C절 FR-20~32 · `FE-REQ-030` · `031`) — 지난 대화 · 오늘의 브리핑 · 칩 넷 · 자유 질문 · 문장씩 오는 답 ·
 * 저장 추천 카드 · 출처 배지 · 생성 시각 · 이동 링크. 답 문장은 서버 규칙 문장 그대로다. 주문 버튼 · 링크는 없다(FR-29).
 *
 * 대화는 자기 스크롤 칸이다 — 입력이 늘 보이고, 새 답이 오면 맨 아래를 보던 사람만 따라 내려간다.
 * 위를 읽던 사람은 자리를 지키고 "새 답 보기"를 받는다(`FE-REQ-031` FR-21).
 *
 * 2026-11-19 재설계(사용자 "챗 디자인 … 존나 이상해" · 딥리서치): 가운데 한 줄 · 답은 본문 · 내 질문만 말풍선 · 브리핑은 카드 ·
 * 입력은 박스 하나 + 보내기 아이콘(Enter 보내기 · Shift+Enter 줄바꿈 · 한글 조합 중 Enter 무시) · 시작 질문은 대화 0 일 때 2×2,
 * 대화 중에는 마지막 답 아래 이어 묻기 3 · 출처 · 시각은 답 아래 한 줄 · 면책은 입력 아래 한 번
 */
export const CoachConversation = ({
  history,
  conversationId,
  historyFailed = false,
  hasOlder = false,
  isLoadingOlder = false,
  onLoadOlder,
  keep = null,
  briefing,
  asideCard = null,
}: CoachConversationProps) => {
  const { messages, ask, retry, isSending, sendError: sendErrorCode } = useAskCoach(conversationId);
  const [draft, setDraft] = useState("");
  const busy = isSending || messages.some((message) => message.status === "streaming");
  // 한 화면에 같은 카드는 한 번 — 화면 순서(지난 대화 → 브리핑 → 이번 답)로 처음 자리만 카드 전체
  const BRIEFING_ID = "briefing";
  const ASIDE_ID = "aside";
  const fullCards = firstCardHolders([
    { id: ASIDE_ID, card: asideCard },
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
    // 맨 위에 닿기 전(600px 앞)에 미리 — 다음 쪽이 도착할 때까지 빈 위쪽을 보지 않게
    const observer = new IntersectionObserver((entries) => entries.some((entry) => entry.isIntersecting) && loadOlder(), {
      root: log,
      rootMargin: `${PREFETCH_OLDER_PX}px 0px 0px 0px`,
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

  const inputRef = useRef<HTMLTextAreaElement>(null);
  // 글 칸 높이 — 한 줄에서 여섯 줄까지 자라고 그 뒤로는 안에서 스크롤(CSS maxHeight)
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
  }, [draft]);

  const send = async () => {
    if (!draft.trim() || busy) return;
    following.current = true;
    // 실패하면 입력을 그대로 둔다 — 다시 누르면 된다
    if (await ask({ content: draft })) setDraft("");
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void send();
  };
  // Enter = 보내기 · Shift+Enter = 줄바꿈 · 한글 조합 중 Enter 는 글자 확정이라 보내지 않는다
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void send();
  };
  const askChip = (chip: CoachQuestionChip) => {
    if (busy) return;
    following.current = true;
    void ask({ chip });
  };

  // 대화가 시작됐나(내 질문이 하나라도) — 시작 질문 2×2 ↔ 이어 묻기
  const started = history.some((message) => message.role === "user") || messages.length > 0;
  const lastQuestion = [...history, ...messages].filter((message) => message.role === "user").at(-1)?.sentences.join(" ") ?? null;
  const followUps = COACH_CHIPS.filter((chip) => COACH_CHIP_LABEL[chip] !== lastQuestion).slice(0, COACH_FOLLOW_UP_MAX);
  const trimmed = draft.trim();
  const sendError =
    sendErrorCode === "busy" ? ASK_COACH_MESSAGES.sendBusy : sendErrorCode ? ASK_COACH_MESSAGES.sendFailed : null;

  return (
    <div className={styles.root}>
      {historyFailed ? <p className={styles.note}>{ASK_COACH_MESSAGES.historyFailed}</p> : null}

      <div className={styles.logFrame}>
        <div
          ref={logRef}
          className={styles.log}
          role="log"
          aria-label={ASK_COACH_MESSAGES.logLabel}
          aria-live="polite"
          aria-busy={busy}
          onScroll={onScroll}
          tabIndex={0}
        >
          {hasOlder ? (
            <div ref={topRef} className={styles.older}>
              <Button type="button" variant="ghost" size="sm" onClick={loadOlder} loading={isLoadingOlder}>
                {isLoadingOlder ? ASK_COACH_MESSAGES.loadingOlder : ASK_COACH_MESSAGES.loadOlder}
              </Button>
            </div>
          ) : keep && history.length > 0 ? (
            <p className={styles.keepNote}>{ASK_COACH_MESSAGES.keepNote(keep.questions, keep.days)}</p>
          ) : null}
          {history.map((message) => (
            <Message key={message.id} message={message} onRetry={retry} fullCard={fullCards.has(message.id)} asideCard={asideCard} />
          ))}
          <Briefing briefing={briefing} fullCard={fullCards.has(BRIEFING_ID)} asideCard={asideCard} />
          {!started ? (
            <ul className={styles.starters} aria-label={ASK_COACH_MESSAGES.chipsLabel}>
              {COACH_CHIPS.map((chip) => (
                <li key={chip}>
                  <button type="button" className={styles.starter} disabled={busy} onClick={() => askChip(chip)}>
                    {COACH_CHIP_LABEL[chip]}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {messages.map((message) => (
            <Message key={message.id} message={message} onRetry={retry} fullCard={fullCards.has(message.id)} asideCard={asideCard} />
          ))}
          {started && !busy ? (
            <ul className={styles.followUps} aria-label={ASK_COACH_MESSAGES.followUpsLabel}>
              {followUps.map((chip) => (
                <li key={chip}>
                  <button type="button" className={styles.followUp} onClick={() => askChip(chip)}>
                    {COACH_CHIP_LABEL[chip]}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {unseen ? (
          <div className={styles.newMessage}>
            <Button type="button" variant="secondary" size="sm" onClick={scrollToBottom}>
              {ASK_COACH_MESSAGES.newMessage}
            </Button>
          </div>
        ) : null}
      </div>

      <form className={styles.composer} onSubmit={submit}>
        <textarea
          ref={inputRef}
          className={styles.input}
          rows={1}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={ASK_COACH_MESSAGES.placeholder}
          maxLength={COACH_QUESTION_MAX_LENGTH}
          aria-label={ASK_COACH_MESSAGES.inputLabel}
          aria-describedby={sendError ? "coach-send-error" : undefined}
        />
        <div className={styles.composerSide}>
          {draft.length >= COACH_COUNTER_FROM ? (
            <span className={styles.counter}>{`${draft.length} / ${COACH_QUESTION_MAX_LENGTH}`}</span>
          ) : null}
          <button
            type="submit"
            className={styles.send}
            disabled={!trimmed || busy}
            aria-label={isSending ? ASK_COACH_MESSAGES.sending : ASK_COACH_MESSAGES.send}
            title={ASK_COACH_MESSAGES.send}
          >
            <ArrowUp size={18} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>
      </form>
      {sendError ? (
        <p id="coach-send-error" className={styles.note} role="alert">
          {sendError}
        </p>
      ) : null}
      <p className={styles.disclaimer}>{ASK_COACH_MESSAGES.disclaimer}</p>
    </div>
  );
};

/** 출처 · 계산 시각 — 답 아래 한 줄(FEATURE-006 FR-27). 배지 대신 글자 — 라벨은 출력 가까이, 짧게 */
const SourceMeta = ({ source, at }: { source: "rule" | "llm" | null; at: string }) => {
  const time = formatMessageTime(at);
  const label = source === "llm" ? ASK_COACH_MESSAGES.sourceLlm : ASK_COACH_MESSAGES.sourceRule;
  return <p className={styles.meta}>{time ? `${label} · ${ASK_COACH_MESSAGES.generatedAt(time)}` : label}</p>;
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
            <NavChevron />
          </Link>
        </li>
      ))}
    </ul>
  );
};

/** 답에 붙은 저장 추천 카드 — 게이트는 카드 자신이 한다(막혔으면 회색 사유 상자, `FE-REQ-030` FR-35 · 36) */
const AnswerCard = ({ card, full, asideCard }: { card: CoachCard; full: boolean; asideCard: CoachCard | null }) => {
  const judgedAt = formatMessageTime(card.generatedAt);
  if (!full) {
    const aside = asideCard !== null && isSameCard(card, asideCard);
    return <p className={styles.meta}>{aside ? ASK_COACH_MESSAGES.sameCardAside(judgedAt) : ASK_COACH_MESSAGES.sameCardAbove(judgedAt)}</p>;
  }
  return (
    <div className={styles.card}>
      <RecommendationCard recommendation={card} />
      {judgedAt ? <p className={styles.meta}>{ASK_COACH_MESSAGES.cardJudgedAt(judgedAt)}</p> : null}
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

/** 오늘의 브리핑 — 지난 대화 다음, 이번에 묻는 것 앞. 저장되지 않는 첫 메시지(FEATURE-006 FR-21). 말풍선이 아니라 카드 */
const Briefing = ({
  briefing,
  fullCard,
  asideCard,
}: {
  briefing: CoachBriefing | null | undefined;
  fullCard: boolean;
  asideCard: CoachCard | null;
}) => {
  if (briefing === undefined) {
    return (
      <section className={styles.briefing} aria-busy="true">
        <p className={styles.briefingTitle}>{ASK_COACH_MESSAGES.briefingTitle}</p>
        <p className={styles.meta}>{ASK_COACH_MESSAGES.briefingLoading}</p>
      </section>
    );
  }
  if (briefing === null) return <p className={styles.note}>{ASK_COACH_MESSAGES.briefingFailed}</p>;
  return (
    <section className={styles.briefing} aria-label={ASK_COACH_MESSAGES.briefingTitle}>
      <p className={styles.briefingTitle}>{ASK_COACH_MESSAGES.briefingTitle}</p>
      <Sentences sentences={briefing.sentences} />
      {briefing.card ? <AnswerCard card={briefing.card} full={fullCard} asideCard={asideCard} /> : null}
      <SourceMeta source={briefing.source} at={briefing.generatedAt} />
      <LinkList links={briefing.links} />
    </section>
  );
};

const Message = ({
  message,
  onRetry,
  fullCard,
  asideCard,
}: {
  message: LiveCoachMessage;
  onRetry: (answerId: string) => void;
  fullCard: boolean;
  asideCard: CoachCard | null;
}) => {
  if (message.role === "user") return <p className={styles.question}>{message.sentences.join(" ")}</p>;
  if (message.status === "failed") {
    return (
      <div className={styles.answer}>
        <p className={styles.note}>{message.canRetry ? ASK_COACH_MESSAGES.streamLost : message.fallbackText || ASK_COACH_MESSAGES.failed}</p>
        {message.canRetry ? (
          <div>
            <Button type="button" variant="secondary" size="sm" onClick={() => onRetry(message.id)}>
              {ASK_COACH_MESSAGES.retry}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }
  const streaming = message.status === "streaming";
  return (
    <div className={styles.answer}>
      <Sentences sentences={message.sentences} />
      {message.card ? <AnswerCard card={message.card} full={fullCard} asideCard={asideCard} /> : null}
      {streaming ? (
        <p className={styles.meta}>{message.reconnecting ? ASK_COACH_MESSAGES.reconnecting : ASK_COACH_MESSAGES.answering}</p>
      ) : (
        <>
          <SourceMeta source={message.source} at={message.createdAt} />
          <LinkList links={message.links} />
        </>
      )}
    </div>
  );
};
