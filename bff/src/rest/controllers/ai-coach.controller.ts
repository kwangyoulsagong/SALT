import { Request, Response, NextFunction } from "express";
import { appAICoachService } from "../../services/app-ai-coach.service";
import { appForecastService } from "../../services/app-forecast.service";

const SYMBOL_PATTERN = /^[A-Za-z0-9]{1,20}$/;

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

  /** 시나리오 — 모든 종목 · 지평 넷에 늘(로그인한 누구나 · 모델 확률 칸만 소유자). F017 v4 `BFF-REQ-052` FR-4 개정 */
  scenario = async (req: Request, res: Response, next: NextFunction) => {
    const symbol = typeof req.query.symbol === "string" ? req.query.symbol.trim() : "";
    if (!SYMBOL_PATTERN.test(symbol)) {
      return res.status(400).json({ success: false, message: "symbol 형식이 아닙니다" });
    }
    const aborter = new AbortController();
    res.on("close", () => {
      if (!res.writableFinished) aborter.abort();
    });
    try {
      const data = await appForecastService.getScenario(req.token!, symbol.toUpperCase(), aborter.signal);
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

  /** 해설(F017 v2 단계 3) — 저장값 읽기라 짧다. 화면을 떠나면 서버 호출도 끊는다 */
  explanation = async (req: Request, res: Response, next: NextFunction) => {
    const aborter = new AbortController();
    res.on("close", () => {
      if (!res.writableFinished) aborter.abort();
    });
    try {
      const data = await appAICoachService.getExplanation(req.token!, req.query, aborter.signal);
      return res.json({ success: true, data });
    } catch (error) {
      if (aborter.signal.aborted) return;
      next(error);
    }
  };
}

export const appAICoachController = new AppAICoachController();
