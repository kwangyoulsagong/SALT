import { Request, Response, NextFunction } from "express";
import { appAICoachService } from "../../services/app-ai-coach.service";
import { formatSseEvent } from "../../utils/sse.util";

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

  /** 한 장 패널(F017 v4 1d) — 종목을 빨리 바꾸면 이전 요청을 끊는다(upstream 도) */
  panel = async (req: Request, res: Response, next: NextFunction) => {
    const aborter = new AbortController();
    res.on("close", () => {
      if (!res.writableFinished) aborter.abort();
    });
    try {
      const data = await appAICoachService.getPanel(req.token!, req.query, aborter.signal);
      return res.json({ success: true, data });
    } catch (error) {
      if (aborter.signal.aborted) return;
      next(error);
    }
  };

  /**
   * 해설 스트림(SSE, F017 v4 1f · `BFF-REQ-052` FR-7) — 압축 · 버퍼링 끔 · 15초 ping(`streaming-sse.md` §5).
   * 화면이 떠나면 서버 연결도 끊는다(생성은 서버가 끝까지 — 저장용). 헤더 전 실패(400 · 401 · 서버 4xx)는 오류 미들웨어로
   */
  explainStream = async (req: Request, res: Response, next: NextFunction) => {
    const aborter = new AbortController();
    let opened = false;
    const ping = setInterval(() => opened && !res.writableEnded && res.write(": ping\n\n"), 15_000);
    res.on("close", () => {
      clearInterval(ping);
      if (!res.writableFinished) aborter.abort();
    });
    const open = () => {
      if (opened) return;
      opened = true;
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
    };
    try {
      await appAICoachService.streamExplanation(
        req.token!,
        req.query,
        (e) => {
          open();
          if (!res.writableEnded) res.write(formatSseEvent(e.event, JSON.stringify(e.data)));
        },
        aborter.signal,
      );
      if (!opened) open();
      res.end();
    } catch (error) {
      clearInterval(ping);
      if (aborter.signal.aborted) return;
      if (opened) {
        res.write(formatSseEvent("error", JSON.stringify({ code: "EXPLAIN_STREAM_FAILED" })));
        return res.end();
      }
      next(error);
    }
  };

  /** 점검 — 화면이 종목 · 방향을 빨리 바꾸면 이전 요청을 끊는다(upstream 도) */
  tradeCheck = async (req: Request, res: Response, next: NextFunction) => {
    const aborter = new AbortController();
    res.on("close", () => {
      if (!res.writableFinished) aborter.abort();
    });
    try {
      const data = await appAICoachService.getTradeCheck(req.token!, req.query, aborter.signal);
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

}

export const appAICoachController = new AppAICoachController();
