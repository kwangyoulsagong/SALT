import { logger } from "../config/logger";
import { AppError, toUpstreamClientError } from "../utils/error.util";
import { createSseParser } from "../utils/sse.util";
import { backendApi } from "./backend-api.service";
import { toReportRecommendation, type ReportRecommendation } from "./coach-report.viewmodel";

/**
 * 코치 대화 중계(F006 C절 · `BFF-REQ-027` · `BFF-REQ-028`) — 서버 `/api/coach/messages` · `/conversations`.
 *
 * BFF 는 계산하지 않는다 — 문장 · 숫자는 서버 규칙 답 그대로. 하는 일은 ① 화면 계약으로 모양을 좁히기(모르는 링크 코드 · 깨진 행은 버림)
 * ② 스트림 이벤트 이름을 `streaming-sse.md` §3 계약으로 옮기기 ③ 끊기면 위로 전파.
 */

type BackendEnvelope<T> = { success: boolean; data: T };

/** `plan` — 밴드 적립 화면(2026-11-19, 이번 주 금액 답). 모르는 종류는 걸러진다 — 서버 · 코어 타입 · 화면과 같이 바꾼다 */
export const COACH_LINK_KINDS = ["risk_budget", "profit_plan", "behavior_mirror", "size_check", "symbol", "plan"] as const;
export type CoachLinkKind = (typeof COACH_LINK_KINDS)[number];
export type CoachLink = { kind: CoachLinkKind; symbol?: string };
export const COACH_CHIPS = ["sell_check", "weekly_amount", "risk_check", "mistake_review"] as const;

/**
 * 답 · 브리핑에 붙는 저장 추천 카드 — 코치 리포트 `recommendation` 과 **같은 타입**(`BFF-REQ-028` 결정 · `FE-REQ-032` FR-52)이라 화면이
 * `RecommendationCard` 를 그대로 쓴다. 변환도 같은 함수(`toReportRecommendation`) — 게이트 칸을 채우지 않고 좁히기만(`BFF-REQ-027` FR-42).
 * `generatedAt` = 그 판단을 만든 시각(FEATURE-006 FR-27)
 */
export type CoachCardViewModel = ReportRecommendation & { generatedAt: string | null };

/** 깨진 카드는 버린다(`null`) — 반쯤 그린 카드가 게이트를 우회하지 않게. 답 문장은 그대로 간다 */
export const toCoachCard = (raw: unknown): CoachCardViewModel | null => {
  if (!isRecord(raw)) return null;
  const card = toReportRecommendation(raw);
  if (!card) return null;
  return { ...card, generatedAt: typeof raw.generatedAt === "string" ? raw.generatedAt : null };
};

export interface CoachBriefingViewModel {
  generatedAt: string;
  sentences: string[];
  source: "rule" | "llm";
  links: CoachLink[];
  gaps: string[];
  card: CoachCardViewModel | null;
}

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
  card: CoachCardViewModel | null;
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
  | { event: "message.card"; data: CoachCardViewModel; id?: string }
  | {
      event: "message.done";
      data: { messageId: string; intent: string; source: "rule" | "llm"; links: CoachLink[]; gaps: string[]; replayed: boolean };
    }
  | { event: "message.error"; data: { code: string; fallbackText: string } };

export class CoachConversationContractError extends Error {}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SYMBOL = /^[A-Z0-9]{1,20}$/;
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
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
    card: role === "assistant" ? toCoachCard(raw.card) : null,
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
  // 틀린 커서는 버리지 않고 400 — 버리면 서버가 첫 쪽을 다시 주고 화면은 같은 쪽을 끝없이 붙인다(2026-11-19 실측: 41쪽에 메시지 60개)
  if (query.cursor !== undefined && query.cursor !== "") {
    if (typeof query.cursor !== "string" || !UUID.test(query.cursor)) throw new AppError("커서 형식이 다릅니다", 400, true, "INVALID_CURSOR");
    params.set("cursor", query.cursor);
  }
  const text = params.toString();
  return text ? `?${text}` : "";
};

/** 보관 한도(`BFF-REQ-028` · 서버 `SRV-REQ-029` FR-30) — 숫자 둘이 양의 정수일 때만, 아니면 `null`(화면은 그 줄을 안 그린다) */
const toKeep = (raw: unknown): { questions: number; days: number } | null => {
  if (!isPlainObject(raw)) return null;
  const { questions, days } = raw as { questions?: unknown; days?: unknown };
  return Number.isInteger(questions) && Number.isInteger(days) && (questions as number) > 0 && (days as number) > 0
    ? { questions: questions as number, days: days as number }
    : null;
};

const requireId = (value: unknown, code: string): string => {
  if (typeof value !== "string" || !UUID.test(value)) throw new AppError("id 형식이 다릅니다", 400, true, code);
  return value;
};

/** 답 스트림이 조용해도 되는 시간 — 서버는 규칙 답이라 곧 끝난다. 재료 셋을 읽는 몇 초 + 여유 */
const ANSWER_STREAM_IDLE_MS = 30_000;

/**
 * PC 패널 배치(F006 A절 · `BFF-REQ-027` FR-50~52 · `BFF-REQ-028`). 트리 모양은 프론트 `@repo/ui/layoutTree` 가 주인 — BFF 는
 * 객체인지 · 크기만 본다(FR-50 · 51). 읽기가 실패해도 화면은 기본 배치로 돈다 — 오류를 앞세우지 않고 `degraded` 로 알린다(FR-52)
 */
export interface PanelLayoutViewModel {
  tree: Record<string, unknown> | null;
  updatedAt: string | null;
  /** 서버에서 못 읽었다 — 화면은 기본 배치(저장된 배치가 있을 수 있으니 이때는 다시 저장하지 않는다) */
  degraded: boolean;
}

/** 압축 JSON 바이트 상한 — 서버 `PANEL_LAYOUT_MAX_BYTES` 와 같은 값(`SRV-REQ-029` FR-30) */
export const PANEL_LAYOUT_MAX_BYTES = 16 * 1024;

const isPlainObject = (value: unknown): value is Record<string, unknown> => isRecord(value) && !Array.isArray(value);

export const coachConversationService = {
  async getPanelLayout(token: string): Promise<PanelLayoutViewModel> {
    try {
      const response = await backendApi.proxyAuthRequest("GET", "/coach/panel-layout?surface=pc", token);
      const data = (response.data as BackendEnvelope<{ tree?: unknown; updatedAt?: unknown }>).data;
      return {
        tree: isPlainObject(data?.tree) ? data.tree : null,
        updatedAt: typeof data?.updatedAt === "string" ? data.updatedAt : null,
        degraded: false,
      };
    } catch (error) {
      // 로그인 문제는 그대로 — 화면이 로그인으로 보낸다. 그 밖(5xx · 시간 초과)은 기본 배치로(FR-52)
      const upstream = toUpstreamClientError(error);
      if (upstream && (upstream.status === 401 || upstream.status === 403)) throw error;
      logger.warn(`패널 배치 읽기 실패 — 기본 배치로 (${(error as Error).name})`);
      return { tree: null, updatedAt: null, degraded: true };
    }
  },

  async savePanelLayout(token: string, body: unknown): Promise<void> {
    const tree = isRecord(body) ? body.tree : undefined;
    if (!isPlainObject(tree)) throw new AppError("배치 형식이 아닙니다", 400, true, "PANEL_LAYOUT_INVALID");
    if (Buffer.byteLength(JSON.stringify(tree), "utf8") > PANEL_LAYOUT_MAX_BYTES) {
      throw new AppError("배치가 너무 큽니다", 413, true, "PANEL_LAYOUT_TOO_LARGE");
    }
    await backendApi.proxyAuthRequest("PUT", "/coach/panel-layout", token, { surface: "pc", tree });
  },

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

  /** 오늘의 브리핑(FEATURE-006 FR-21) — 서버 규칙 문장 그대로 + 카드 */
  async briefing(token: string): Promise<CoachBriefingViewModel> {
    const response = await backendApi.proxyAuthRequest("GET", "/coach/briefing", token);
    const data = (response.data as BackendEnvelope<unknown>).data;
    if (!isRecord(data) || !Array.isArray(data.sentences)) throw new CoachConversationContractError("브리핑 모양이 다르다");
    return {
      generatedAt: str(data.generatedAt, "generatedAt"),
      sentences: data.sentences.filter((line): line is string => typeof line === "string" && line.length > 0),
      source: data.explanationSource === "llm" ? "llm" : "rule",
      links: toLinks(data.links),
      gaps: toGaps(data.gaps),
      card: toCoachCard(data.card),
    };
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
    const data = (response.data as BackendEnvelope<{ items?: unknown; nextCursor?: unknown; keep?: unknown }>).data;
    return {
      items: keepValid(data?.items, toCoachMessage),
      nextCursor: typeof data?.nextCursor === "string" ? data.nextCursor : null,
      keep: toKeep(data?.keep),
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
      } else if (event === "message.card") {
        // 완성 객체 한 번 — 쪼개지 않고, 깨졌으면 보내지 않는다(`BFF-REQ-027` FR-3)
        const card = toCoachCard(body);
        if (card) onEvent({ event, data: card, ...(eventId ? { id: eventId } : {}) });
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
