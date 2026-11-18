import { AppError } from "../utils/error.util";
import { createSseParser } from "../utils/sse.util";
import { backendApi } from "./backend-api.service";

/**
 * 코치 대화 중계(F006 C절 · `BFF-REQ-027` · `BFF-REQ-028`) — 서버 `/api/coach/messages` · `/conversations`.
 *
 * BFF 는 계산하지 않는다 — 문장 · 숫자는 서버 규칙 답 그대로. 하는 일은 ① 화면 계약으로 모양을 좁히기(모르는 링크 코드 · 깨진 행은 버림)
 * ② 스트림 이벤트 이름을 `streaming-sse.md` §3 계약으로 옮기기 ③ 끊기면 위로 전파.
 */

type BackendEnvelope<T> = { success: boolean; data: T };

export const COACH_LINK_KINDS = ["risk_budget", "profit_plan", "behavior_mirror", "size_check", "symbol"] as const;
export type CoachLinkKind = (typeof COACH_LINK_KINDS)[number];
export type CoachLink = { kind: CoachLinkKind; symbol?: string };
export const COACH_CHIPS = ["sell_check", "weekly_amount", "risk_check", "mistake_review"] as const;

export interface CoachMessageViewModel {
  id: string;
  role: "user" | "assistant";
  /** 답은 문장마다 한 줄 · 질문은 한 줄 */
  sentences: string[];
  status: "streaming" | "complete" | "failed";
  source: "rule" | "llm" | null;
  links: CoachLink[];
  gaps: string[];
  errorCode: string | null;
  createdAt: string;
}

export interface CoachConversationItemViewModel {
  id: string;
  title: string | null;
  messageCount: number;
  lastMessageAt: string;
}

export type CoachStreamEvent =
  | { event: "message.start"; data: { messageId: string } }
  | { event: "message.delta"; data: { text: string }; id?: string }
  | {
      event: "message.done";
      data: { messageId: string; intent: string; source: "rule" | "llm"; links: CoachLink[]; gaps: string[]; replayed: boolean };
    }
  | { event: "message.error"; data: { code: string; fallbackText: string } };

export class CoachConversationContractError extends Error {}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SYMBOL = /^[A-Z0-9]{1,20}$/;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const str = (value: unknown, name: string): string => {
  if (typeof value !== "string") throw new CoachConversationContractError(`${name} 가 문자열이 아니다`);
  return value;
};

/** 모르는 링크 코드는 버린다 — 화면이 경로를 못 만든다. 종목 링크는 종목 코드가 있을 때만 */
export const toLinks = (value: unknown): CoachLink[] =>
  (Array.isArray(value) ? value : []).flatMap((link): CoachLink[] => {
    if (!isRecord(link) || !COACH_LINK_KINDS.includes(link.kind as CoachLinkKind)) return [];
    if (link.kind === "symbol") return typeof link.symbol === "string" && SYMBOL.test(link.symbol) ? [{ kind: "symbol", symbol: link.symbol }] : [];
    return [{ kind: link.kind as CoachLinkKind }];
  });

const toGaps = (value: unknown): string[] => (Array.isArray(value) ? value.filter((gap): gap is string => typeof gap === "string") : []);

export const toCoachMessage = (raw: unknown): CoachMessageViewModel => {
  if (!isRecord(raw)) throw new CoachConversationContractError("메시지가 객체가 아니다");
  const role = raw.role === "assistant" ? "assistant" : raw.role === "user" ? "user" : null;
  const status = raw.status === "streaming" || raw.status === "complete" || raw.status === "failed" ? raw.status : null;
  if (!role || !status) throw new CoachConversationContractError("role · status 값이 다르다");
  const content = str(raw.content, "content");
  return {
    id: str(raw.id, "id"),
    role,
    sentences: content ? content.split("\n").filter(Boolean) : [],
    status,
    source: raw.explanationSource === "rule" || raw.explanationSource === "llm" ? raw.explanationSource : null,
    links: toLinks(raw.links),
    gaps: toGaps(raw.gaps),
    errorCode: typeof raw.errorCode === "string" ? raw.errorCode : null,
    createdAt: str(raw.createdAt, "createdAt"),
  };
};

const toConversationItem = (raw: unknown): CoachConversationItemViewModel => {
  if (!isRecord(raw) || typeof raw.messageCount !== "number") throw new CoachConversationContractError("대화 행 모양이 다르다");
  return {
    id: str(raw.id, "id"),
    title: typeof raw.title === "string" ? raw.title : null,
    messageCount: raw.messageCount,
    lastMessageAt: str(raw.lastMessageAt, "lastMessageAt"),
  };
};

/** 깨진 행 하나는 버리고 나머지는 보낸다 — 목록 전체를 실패시키지 않는다 */
const keepValid = <T>(items: unknown, map: (raw: unknown) => T): T[] =>
  (Array.isArray(items) ? items : []).flatMap((raw) => {
    try {
      return [map(raw)];
    } catch (error) {
      if (error instanceof CoachConversationContractError) return [];
      throw error;
    }
  });

const page = (query: { limit?: unknown; cursor?: unknown }) => {
  const params = new URLSearchParams();
  const limit = Number(query.limit);
  if (Number.isInteger(limit) && limit >= 1 && limit <= 50) params.set("limit", String(limit));
  if (typeof query.cursor === "string" && UUID.test(query.cursor)) params.set("cursor", query.cursor);
  const text = params.toString();
  return text ? `?${text}` : "";
};

const requireId = (value: unknown, code: string): string => {
  if (typeof value !== "string" || !UUID.test(value)) throw new AppError("id 형식이 다릅니다", 400, true, code);
  return value;
};

/** 답 스트림이 조용해도 되는 시간 — 서버는 규칙 답이라 곧 끝난다. 재료 셋을 읽는 몇 초 + 여유 */
const ANSWER_STREAM_IDLE_MS = 30_000;

export const coachConversationService = {
  async ask(token: string, body: unknown) {
    const input = isRecord(body) ? body : {};
    const content = typeof input.content === "string" ? input.content : null;
    const chip = COACH_CHIPS.includes(input.chip as (typeof COACH_CHIPS)[number]) ? (input.chip as string) : null;
    if (!content?.trim() && !chip) throw new AppError("질문이 비었습니다", 400, true, "COACH_QUESTION_EMPTY");
    const conversationId = input.conversationId == null ? null : requireId(input.conversationId, "INVALID_CONVERSATION_ID");
    const response = await backendApi.proxyAuthRequest("POST", "/coach/messages", token, { conversationId, content, chip });
    const data = (response.data as BackendEnvelope<unknown>).data;
    if (!isRecord(data)) throw new CoachConversationContractError("묻기 응답 모양이 다르다");
    return { conversationId: str(data.conversationId, "conversationId"), messageId: str(data.messageId, "messageId") };
  },

  async listConversations(token: string, query: { limit?: unknown; cursor?: unknown }) {
    const response = await backendApi.proxyAuthRequest("GET", `/coach/conversations${page(query)}`, token);
    const data = (response.data as BackendEnvelope<{ items?: unknown; nextCursor?: unknown }>).data;
    return {
      items: keepValid(data?.items, toConversationItem),
      nextCursor: typeof data?.nextCursor === "string" ? data.nextCursor : null,
    };
  },

  async listMessages(token: string, conversationId: unknown, query: { limit?: unknown; cursor?: unknown }) {
    const id = requireId(conversationId, "INVALID_CONVERSATION_ID");
    const response = await backendApi.proxyAuthRequest("GET", `/coach/conversations/${id}/messages${page(query)}`, token);
    const data = (response.data as BackendEnvelope<{ items?: unknown; nextCursor?: unknown }>).data;
    return {
      items: keepValid(data?.items, toCoachMessage),
      nextCursor: typeof data?.nextCursor === "string" ? data.nextCursor : null,
    };
  },

  async deleteConversation(token: string, conversationId: unknown) {
    const id = requireId(conversationId, "INVALID_CONVERSATION_ID");
    await backendApi.proxyAuthRequest("DELETE", `/coach/conversations/${id}`, token);
  },

  /** 답 스트림 — 이벤트마다 모양을 좁혀 옮긴다. 화면이 끊으면 `signal` 로 서버까지 끊는다(`streaming-sse.md` §4) */
  async streamAnswer(
    token: string,
    messageId: unknown,
    lastEventId: string | undefined,
    onEvent: (event: CoachStreamEvent) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const id = requireId(messageId, "INVALID_MESSAGE_ID");
    const upstream = await backendApi.openAuthStream(`/coach/messages/${id}/stream`, token, undefined, {
      method: "GET",
      timeout: ANSWER_STREAM_IDLE_MS,
      signal,
      headers: lastEventId && /^\d{1,4}$/.test(lastEventId) ? { "Last-Event-ID": lastEventId } : undefined,
    });
    const parse = createSseParser(({ event, data, id: eventId }) => {
      let body: unknown;
      try {
        body = JSON.parse(data);
      } catch {
        return;
      }
      if (!isRecord(body)) return;
      if (event === "message.start" && typeof body.messageId === "string") {
        onEvent({ event, data: { messageId: body.messageId } });
      } else if (event === "message.delta" && typeof body.text === "string") {
        onEvent({ event, data: { text: body.text }, ...(eventId ? { id: eventId } : {}) });
      } else if (event === "message.done" && typeof body.messageId === "string") {
        onEvent({
          event,
          data: {
            messageId: body.messageId,
            intent: typeof body.intent === "string" ? body.intent : "other",
            source: body.explanationSource === "llm" ? "llm" : "rule",
            links: toLinks(body.links),
            gaps: toGaps(body.gaps),
            replayed: body.replayed === true,
          },
        });
      } else if (event === "message.error") {
        onEvent({
          event,
          data: {
            code: typeof body.code === "string" ? body.code : "LLM_ERROR",
            fallbackText: typeof body.fallbackText === "string" ? body.fallbackText : "",
          },
        });
      }
    });
    await new Promise<void>((resolve, reject) => {
      upstream.on("data", (chunk: Buffer) => parse(chunk.toString()));
      upstream.on("end", () => resolve());
      upstream.on("error", (error) => (signal?.aborted ? resolve() : reject(error)));
      signal?.addEventListener("abort", () => resolve(), { once: true });
    });
  },
};
