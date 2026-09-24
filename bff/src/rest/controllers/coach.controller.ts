import { Request, Response, NextFunction } from "express";
import { appCoachReportService } from "../../services/app-coach-report.service";
import { appForecastService } from "../../services/app-forecast.service";

/** 코치 모양 심볼(`BTC`). 서버 DTO 와 같은 규칙 — 여기서 먼저 막아 upstream 을 부르지 않는다 */
const SYMBOL_PATTERN = /^[A-Za-z0-9]{1,20}$/;

export class AppCoachController {
  report = async (req: Request, res: Response, next: NextFunction) => {
    // 화면을 떠나면 upstream 도 끊는다 (`detail` 과 같은 규칙)
    const aborter = new AbortController();
    res.on("close", () => {
      if (!res.writableFinished) aborter.abort();
    });

    try {
      const data = await appCoachReportService.getReport(
        req.token!,
        aborter.signal,
      );
      return res.json({ success: true, data });
    } catch (error) {
      if (aborter.signal.aborted) return;
      next(error);
    }
  };

  /** 가격 변동 범위 — 소유자 전용(404 는 그대로), F008 `BFF-REQ-037` */
  forecast = async (req: Request, res: Response, next: NextFunction) => {
    const symbol = typeof req.query.symbol === "string" ? req.query.symbol.trim() : "";
    if (!SYMBOL_PATTERN.test(symbol)) {
      return res.status(400).json({ success: false, message: "symbol 형식이 아닙니다" });
    }
    const aborter = new AbortController();
    res.on("close", () => {
      if (!res.writableFinished) aborter.abort();
    });
    try {
      const data = await appForecastService.getForecast(req.token!, symbol.toUpperCase(), aborter.signal);
      return res.json({ success: true, data });
    } catch (error) {
      if (aborter.signal.aborted) return;
      next(error);
    }
  };

  generationStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await appCoachReportService.getGenerationStatus(req.token!);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

export const appCoachController = new AppCoachController();
