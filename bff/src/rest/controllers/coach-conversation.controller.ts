import { NextFunction, Request, Response } from "express";

import { coachConversationService } from "../../services/coach-conversation.service";

/**
 * 코치 대화(F006 C절 · `BFF-REQ-027` · `BFF-REQ-028`) — `/api/app/coach` 아래.
 * 요청 파싱 · 서비스 한 번 · 응답만. 스트림은 해설 스트림과 같은 중계 모양(`ai-coach.controller` `explainStream`)이다.
 */

/** BFF 한 프로세스의 답 스트림 상한(`performance-bff.md` §7) — 서버는 사람마다 4 */
const MAX_OPEN_STREAMS = 40;
let openStreams = 0;

const STREAM_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

const writeEvent = (res: Response, event: string, data: unknown, id?: string) => {
  if (!res.writableEnded) res.write(`${id ? `id: ${id}\n` : ""}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};

class CoachConversationController {
  ask = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await coachConversationService.ask(req.token!, req.body);
      return res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  listConversations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await coachConversationService.listConversations(req.token!, req.query);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  listMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await coachConversationService.listMessages(req.token!, req.params.id, req.query);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  deleteConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await coachConversationService.deleteConversation(req.token!, req.params.id);
      return res.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  /** 답 스트림 — 헤더는 첫 이벤트에 연다. 그 전 실패(404 · 429)는 오류 미들웨어가 서버 status · code 그대로 */
  stream = async (req: Request, res: Response, next: NextFunction) => {
    if (openStreams >= MAX_OPEN_STREAMS) {
      return res.status(429).json({ success: false, code: "COACH_STREAM_LIMIT", message: "동시 답 스트림이 너무 많습니다" });
    }
    openStreams += 1;
    let released = false;
    const release = () => {
      if (!released) {
        released = true;
        openStreams -= 1;
      }
    };
    const aborter = new AbortController();
    let opened = false;
    const ping = setInterval(() => opened && !res.writableEnded && res.write(": ping\n\n"), 15_000);
    res.on("close", () => {
      clearInterval(ping);
      release();
      if (!res.writableFinished) aborter.abort();
    });
    const open = () => {
      if (opened) return;
      opened = true;
      res.writeHead(200, STREAM_HEADERS);
    };
    try {
      await coachConversationService.streamAnswer(
        req.token!,
        req.params.id,
        req.header("Last-Event-ID") ?? undefined,
        (e) => {
          open();
          writeEvent(res, e.event, e.data, "id" in e ? e.id : undefined);
        },
        aborter.signal
      );
      if (!opened) open();
      res.end();
    } catch (error) {
      clearInterval(ping);
      release();
      if (aborter.signal.aborted) return;
      if (opened) {
        writeEvent(res, "message.error", { code: "LLM_ERROR", fallbackText: "" });
        return res.end();
      }
      next(error);
    }
  };
}

export const appCoachConversationController = new CoachConversationController();
