import { Request, Response, NextFunction } from "express";
import { appAICoachService } from "../../services/app-ai-coach.service";
import { formatSseEvent } from "../../utils/sse.util";

/** 프록시 · 로드밸런서가 유휴 연결을 끊지 않게(`streaming-sse.md` §5) */
const SSE_HEARTBEAT_MS = 15_000;

export class AppAICoachController {
  preview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await appAICoachService.getPreview(req.token!, req.query);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  detail = async (req: Request, res: Response, next: NextFunction) => {
    // 행 선택이 빨리 바뀌면 화면이 이전 요청을 끊는다 — upstream 도 같이 끊는다(`BFF-REQ-026` FR-52)
    const aborter = new AbortController();
    res.on("close", () => {
      if (!res.writableFinished) aborter.abort();
    });

    try {
      const data = await appAICoachService.getDetail(
        req.token!,
        req.query,
        aborter.signal,
      );
      return res.json({ success: true, data });
    } catch (error) {
      if (aborter.signal.aborted) return;
      next(error);
    }
  };

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await appAICoachService.getProfile(req.token!);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await appAICoachService.updateProfile(req.token!, req.body);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  feedback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await appAICoachService.feedback(req.token!, req.body);
      return res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  explain = async (req: Request, res: Response, next: NextFunction) => {
    // 20s 를 잡는 호출이다 — 화면을 떠나면 서버 LLM 호출도 같이 끊는다
    const aborter = new AbortController();
    res.on("close", () => {
      if (!res.writableFinished) aborter.abort();
    });

    try {
      const data = await appAICoachService.explain(
        req.token!,
        req.body,
        aborter.signal,
      );
      return res.json({ success: true, data });
    } catch (error) {
      if (aborter.signal.aborted) return;
      next(error);
    }
  };

  /**
   * 해설 스트림(SSE) — 서버 스트림을 이벤트 단위로 중계한다(`streaming-sse.md`).
   *
   * 스트림을 열기 전의 실패(429 · 400 · 401)는 평범한 JSON 오류다. 연 뒤에는 헤더가 나갔으므로
   * 실패를 `message.error` 한 건으로 알린다 — 화면은 받은 템플릿 문장을 그대로 둔다.
   */
  explainStream = async (req: Request, res: Response, next: NextFunction) => {
    const aborter = new AbortController();
    res.on("close", () => {
      if (!res.writableFinished) aborter.abort();
    });

    let opened: Awaited<ReturnType<typeof appAICoachService.openExplainStream>>;
    try {
      opened = await appAICoachService.openExplainStream(req.token!, req.body, aborter.signal);
    } catch (error) {
      if (aborter.signal.aborted) return;
      return next(error);
    }

    res.status(200).set({
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    const write = (event: string, data: string) => {
      if (!res.writableEnded) res.write(formatSseEvent(event, data));
    };
    const heartbeat = setInterval(() => write("ping", "{}"), SSE_HEARTBEAT_MS);

    try {
      for await (const event of opened.events) write(event.event, event.data);
    } catch {
      if (!aborter.signal.aborted) write("message.error", JSON.stringify({ code: "UPSTREAM_FAILED", fallback: "rule" }));
    } finally {
      clearInterval(heartbeat);
      opened.close();
      if (!res.writableEnded) res.end();
    }
  };
}

export const appAICoachController = new AppAICoachController();
