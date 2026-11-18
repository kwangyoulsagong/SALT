"use client";

import type { CoachAnswerLink, CoachCard, CoachMessage, CoachQuestionChip } from "@repo/core/coach";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { hasApiStatus } from "@repo/web-shared/api";

import { coachQueryKeys } from "@/entities/coach";

import { COACH_CHIP_LABEL } from "../model/messages";
import { answerStreamUrl, askCoachApi } from "./askCoachApi";

/** 이 화면에서 새로 오간 메시지 — 서버 저장본과 같은 모양 + 연결 상태 */
export type LiveCoachMessage = CoachMessage & { fallbackText?: string; reconnecting?: boolean; canRetry?: boolean };

/** 끊긴 답 스트림을 브라우저가 다시 붙는 횟수 상한 — 넘으면 끊고 "다시 받기"(`FE-REQ-031` FR-14 · `FE-REQ-032` FR-16) */
const MAX_RECONNECTS = 3;

interface DoneEvent {
  messageId: string;
  source: "rule" | "llm";
  links: CoachAnswerLink[];
  gaps: string[];
}

const parse = <T,>(event: Event): T | null => {
  try {
    return JSON.parse(String((event as MessageEvent).data)) as T;
  } catch {
    return null;
  }
};

/**
 * 코치에게 묻기(F006 C절 · `FE-REQ-031`) — POST 로 답 자리를 받고, 그 답을 SSE 로 문장씩 받는다.
 *
 * - `EventSource` 는 effect · 이벤트 핸들러 안에서만 만든다(`ssr.md`). 쿠키 세션 · 같은 origin
 * - 끝(`message.done` · `message.error`)이면 닫는다 — 서버가 스트림을 닫은 뒤 자동 재연결이 다시 붙지 않게.
 *   끝나기 전에 끊기면 브라우저가 `Last-Event-ID` 로 다시 붙고, 서버는 받은 문장 다음부터 보낸다(같은 답 — 다시 만들지 않는다)
 * - 문장 · 숫자는 서버 것 그대로. 낙관적으로 답을 그리지 않는다 — 질문 말풍선만 먼저 보인다
 * - 끝나면 대화 목록 · 메시지 캐시를 낡음으로만 표시한다(지금 다시 부르면 화면의 말풍선이 두 번 보인다)
 */
export const useAskCoach = (initialConversationId: string | null) => {
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [messages, setMessages] = useState<LiveCoachMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  /** `busy` = 429(너무 잦음 · 동시 스트림) — 문구가 다르다(`FE-REQ-032` FR-41) */
  const [sendError, setSendError] = useState<false | "failed" | "busy">(false);
  const sources = useRef(new Set<EventSource>());

  useEffect(() => setConversationId((current) => current ?? initialConversationId), [initialConversationId]);
  useEffect(() => {
    const open = sources.current;
    return () => {
      for (const source of open) source.close();
      open.clear();
    };
  }, []);

  const patch = useCallback((id: string, update: (message: LiveCoachMessage) => LiveCoachMessage) => {
    setMessages((list) => list.map((message) => (message.id === id ? update(message) : message)));
  }, []);

  const listen = useCallback(
    (answerId: string, ofConversation: string) => {
      const source = new EventSource(answerStreamUrl(answerId), { withCredentials: true });
      sources.current.add(source);
      let finished = false;
      let reconnects = 0;
      const finish = () => {
        finished = true;
        source.close();
        sources.current.delete(source);
        void queryClient.invalidateQueries({ queryKey: coachQueryKeys.conversations(), refetchType: "none" });
        void queryClient.invalidateQueries({ queryKey: coachQueryKeys.messages(ofConversation), refetchType: "none" });
      };
      source.addEventListener("message.delta", (event) => {
        if (finished) return;
        const delta = parse<{ text: string }>(event);
        if (delta) patch(answerId, (m) => ({ ...m, reconnecting: false, sentences: [...m.sentences, delta.text] }));
      });
      // 카드는 완성 객체 한 번(`FE-REQ-031` FR-5) — 받은 그대로 붙인다. 게이트는 카드 컴포넌트가 한 번 더 본다
      source.addEventListener("message.card", (event) => {
        if (finished) return;
        const card = parse<CoachCard>(event);
        if (card) patch(answerId, (m) => ({ ...m, reconnecting: false, card }));
      });
      source.addEventListener("message.done", (event) => {
        if (finished) return;
        const done = parse<DoneEvent>(event);
        patch(answerId, (m) => ({ ...m, status: "complete", source: done?.source ?? "rule", links: done?.links ?? [], gaps: done?.gaps ?? [] }));
        finish();
      });
      source.addEventListener("message.error", (event) => {
        if (finished) return;
        const error = parse<{ code: string; fallbackText: string }>(event);
        patch(answerId, (m) => ({ ...m, status: "failed", errorCode: error?.code ?? null, fallbackText: error?.fallbackText }));
        finish();
      });
      // 잠깐 끊긴 것은 브라우저가 `Last-Event-ID` 로 다시 붙는다 — "연결 중"을 보이고, 셋을 넘거나 아주 닫히면 끊고 "다시 받기"
      source.addEventListener("error", () => {
        if (finished) return;
        reconnects += 1;
        if (source.readyState === EventSource.CLOSED || reconnects > MAX_RECONNECTS) {
          patch(answerId, (m) => ({ ...m, status: "failed", errorCode: "STREAM_CLOSED", reconnecting: false, canRetry: true }));
          finish();
          return;
        }
        patch(answerId, (m) => ({ ...m, reconnecting: true }));
      });
    },
    [patch, queryClient]
  );

  /** 끊긴 답만 다시 받는다 — 같은 답 id 로 다시 열 뿐 질문을 다시 보내지 않는다(`FE-REQ-031` FR-13). 받은 문장은 비우고 처음부터 */
  const retry = useCallback(
    (answerId: string) => {
      if (!conversationId) return;
      patch(answerId, (m) => ({ ...m, status: "streaming", sentences: [], card: null, errorCode: null, canRetry: false }));
      listen(answerId, conversationId);
    },
    [conversationId, listen, patch]
  );

  const ask = useCallback(
    async (input: { content: string } | { chip: CoachQuestionChip }): Promise<boolean> => {
      setIsSending(true);
      setSendError(false);
      try {
        const chip = "chip" in input ? input.chip : null;
        const content = "content" in input ? input.content.trim() : null;
        const result = await askCoachApi.ask({ conversationId, content, chip });
        const now = new Date().toISOString();
        const base = { links: [], gaps: [], errorCode: null, card: null, createdAt: now };
        setConversationId(result.conversationId);
        setMessages((list) => [
          ...list,
          { ...base, id: `${result.messageId}:q`, role: "user", sentences: [content || (chip ? COACH_CHIP_LABEL[chip] : "")], status: "complete", source: null },
          { ...base, id: result.messageId, role: "assistant", sentences: [], status: "streaming", source: null },
        ]);
        listen(result.messageId, result.conversationId);
        return true;
      } catch (error) {
        setSendError(hasApiStatus(error, 429) ? "busy" : "failed");
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, listen]
  );

  return { messages, ask, retry, isSending, sendError };
};
