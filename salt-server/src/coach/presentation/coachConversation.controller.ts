import { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { logger } from "../../shared/config/logger";
import { PayloadTooLargeError, TooManyRequestsError } from "../../shared/presentation/httpErrors";
import { ResponseUtil } from "../../shared/presentation/ResponseUtil";
import type { CoachUseCases } from "../application/api";
import {
  COACH_QUESTION_CHIPS,
  COACH_QUESTION_MAX_LENGTH,
  PANEL_LAYOUT_MAX_BYTES,
  PANEL_LAYOUT_SURFACES,
  panelLayoutBytes,
  type CoachMessageRecord,
} from "../domain";

/**
 * 코치 대화(F006 C절 · `SRV-REQ-029`) — 2단계: `POST /messages` 는 바로 201, `GET /messages/:id/stream` 이 답을 흘린다.
 *
 * 답은 규칙 문장이라 스트림이 열리면 곧 끝난다 — 이벤트 계약(`bff/.claude/rules/streaming-sse.md` §3)은 LLM 답과 같게 두어
 * 나중에 다듬기가 붙어도 화면 · BFF 가 바뀌지 않게 한다. 문장 하나 = `message.delta` 하나(문장 경계에서만 흘린다 — FR-47).
 */

export const askCoachSchema = z
  .object({
    conversationId: z.string().uuid().nullish(),
    content: z.string().trim().max(COACH_QUESTION_MAX_LENGTH).nullish(),
    chip: z.enum(COACH_QUESTION_CHIPS).nullish(),
  })
  .refine((body) => Boolean(body.content) || Boolean(body.chip), { message: "content 또는 chip 이 필요합니다" });

const idSchema = z.object({ id: z.string().uuid() });
const surfaceSchema = z.object({ surface: z.enum(PANEL_LAYOUT_SURFACES).default("pc") });
/** 트리 모양은 보지 않는다(`DB-REQ-021` FR-24) — 객체인지만. 배열 · 원시값은 배치가 아니다 */
export const savePanelLayoutSchema = z.object({
  surface: z.enum(PANEL_LAYOUT_SURFACES).default("pc"),
  tree: z.record(z.string(), z.unknown()),
});
const pageSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().uuid().optional(),
});

/** 한 사람이 동시에 여는 답 스트림 상한(FR-10) — 넘으면 429 */
const MAX_STREAMS_PER_USER = 4;
const openStreams = new Map<string, number>();

const toMessageView = (message: CoachMessageRecord) => ({
  id: message.id,
  role: message.role,
  content: message.content,
  intent: message.intent,
  status: message.status,
  explanationSource: message.explanationSource,
  links: message.links,
  gaps: message.gaps,
  errorCode: message.errorCode,
  card: message.card,
  createdAt: message.createdAt.toISOString(),
});

/** 실패 때 화면이 빈 채로 남지 않게 함께 보내는 서버 문장(FR-6) */
const FALLBACK_TEXT = "지금은 답을 만들지 못했어요. 같은 질문을 다시 보내면 처음부터 계산해요.";

export class CoachConversationController {
  constructor(private readonly useCases: CoachUseCases) {}

  ask = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = askCoachSchema.parse(req.body);
      const result = await this.useCases.askCoach.execute(req.user!.userId, {
        conversationId: body.conversationId ?? null,
        content: body.content ?? null,
        chip: body.chip ?? null,
      });
      return ResponseUtil.created(res, result);
    } catch (error) {
      next(error);
    }
  };

  stream = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.userId;
    let messageId: string;
    try {
      messageId = idSchema.parse(req.params).id;
    } catch (error) {
      return next(error);
    }
    const open = openStreams.get(userId) ?? 0;
    if (open >= MAX_STREAMS_PER_USER) return next(new TooManyRequestsError());
    openStreams.set(userId, open + 1);
    const release = () => {
      const left = (openStreams.get(userId) ?? 1) - 1;
      if (left <= 0) openStreams.delete(userId);
      else openStreams.set(userId, left);
    };

    // 답을 먼저 만든다(규칙 — 수백 ms). 남의 · 없는 메시지면 헤더 전에 404 JSON 으로
    let result: Awaited<ReturnType<CoachUseCases["answerCoachMessage"]["execute"]>>;
    try {
      result = await this.useCases.answerCoachMessage.execute(userId, messageId);
    } catch (error) {
      release();
      return next(error);
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    const send = (event: string, data: unknown, id?: number) => {
      if (res.writableEnded) return;
      res.write(`${id === undefined ? "" : `id: ${id}\n`}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    req.on("close", release);
    try {
      send("message.start", { messageId });
      if ("failed" in result) {
        send("message.error", { code: result.failed, fallbackText: FALLBACK_TEXT });
        return;
      }
      // 재연결이면 받은 문장 다음부터(`SRV-REQ-029` FR-3) — 문장 번호가 이벤트 id
      const lastId = Number(req.header("Last-Event-ID"));
      const from = Number.isInteger(lastId) && lastId >= 0 ? lastId + 1 : 0;
      result.answer.sentences.forEach((text, index) => {
        if (index >= from) send("message.delta", { text }, index);
      });
      // 카드는 완성 객체 한 번(`SRV-REQ-029` FR-5) — 문장 다음 번호를 id 로 두어 문장까지만 받고 끊긴 재연결도 카드를 받는다
      const cardId = result.answer.sentences.length;
      if (result.card && from <= cardId) send("message.card", result.card, cardId);
      send("message.done", {
        messageId,
        intent: result.answer.intent,
        explanationSource: "rule",
        links: result.answer.links,
        gaps: result.answer.gaps,
        replayed: result.replayed,
      });
    } catch (error) {
      logger.warn(`코치 대화 스트림 실패 — ${(error as Error).name}`);
      send("message.error", { code: "LLM_ERROR", fallbackText: FALLBACK_TEXT });
    } finally {
      if (!res.writableEnded) res.end();
    }
  };

  /** 오늘의 브리핑 — 저장하지 않는 첫 메시지(FEATURE-006 FR-21) */
  briefing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.useCases.getCoachBriefing.execute(req.user!.userId);
      return ResponseUtil.success(res, {
        generatedAt: result.generatedAt.toISOString(),
        sentences: result.sentences,
        links: result.links,
        gaps: result.gaps,
        card: result.card,
        explanationSource: "rule",
      });
    } catch (error) {
      next(error);
    }
  };

  listConversations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = pageSchema.parse(req.query);
      const result = await this.useCases.listCoachConversations.execute(req.user!.userId, query.limit, query.cursor ?? null);
      return ResponseUtil.success(res, {
        items: result.items.map((item) => ({
          id: item.id,
          title: item.title,
          messageCount: item.messageCount,
          lastMessageAt: item.lastMessageAt.toISOString(),
          createdAt: item.createdAt.toISOString(),
        })),
        nextCursor: result.nextCursor,
      });
    } catch (error) {
      next(error);
    }
  };

  listMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = idSchema.parse(req.params);
      const query = pageSchema.parse(req.query);
      const result = await this.useCases.listCoachMessages.execute(req.user!.userId, id, query.limit, query.cursor ?? null);
      return ResponseUtil.success(res, { items: result.items.map(toMessageView), nextCursor: result.nextCursor });
    } catch (error) {
      next(error);
    }
  };

  deleteConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = idSchema.parse(req.params);
      await this.useCases.deleteCoachConversation.execute(req.user!.userId, id);
      return res.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  /** PC 패널 배치(F006 A절) — 없으면 `tree: null` */
  getPanelLayout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { surface } = surfaceSchema.parse(req.query);
      const record = await this.useCases.getPanelLayout.execute(req.user!.userId, surface);
      return ResponseUtil.success(res, {
        surface,
        tree: record?.tree ?? null,
        updatedAt: record ? record.updatedAt.toISOString() : null,
      });
    } catch (error) {
      next(error);
    }
  };

  /** PC 패널 배치 저장 — 16KB 를 넘으면 413(`SRV-REQ-029` FR-30). 모양은 보지 않는다 */
  savePanelLayout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = savePanelLayoutSchema.parse(req.body);
      if (panelLayoutBytes(body.tree) > PANEL_LAYOUT_MAX_BYTES) throw new PayloadTooLargeError("panel layout too large");
      await this.useCases.savePanelLayout.execute(req.user!.userId, body.surface, body.tree);
      return res.status(204).end();
    } catch (error) {
      next(error);
    }
  };
}
