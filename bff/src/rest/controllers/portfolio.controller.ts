import { NextFunction, Request, Response } from "express";
import { appPortfolioService } from "../../services/app-portfolio.service";
import { backendApi } from "../../services/backend-api.service";
import { AppError } from "../../utils/error.util";

export class AppPortfolioController {
  async getPortfolio(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await appPortfolioService.getPortfolio(req.token!));
    } catch (error) {
      next(error);
    }
  }

  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await appPortfolioService.getSummary(req.token!);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  }

  async getPerformance(req: Request, res: Response) {
    const token = req.token!;

    const response = await backendApi.proxyAuthRequest(
      "GET",
      "/portfolio/performance",
      token,
    );

    res.json(response.data);
  }
}

const FLOW_RANGES = new Set(["1w", "1m", "3m", "1y"]);

/** 포지션(F006 G절) — 응답은 뷰모델 그대로(같은 파일 `summary` 와 같은 모양). 기간은 넷 중 하나, 아니면 400(서버에 모르는 값을 넘기지 않는다) */
export const positionController = {
  async getPosition(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await appPortfolioService.getPosition(req.token!));
    } catch (error) {
      next(error);
    }
  },
  async getFlow(req: Request, res: Response, next: NextFunction) {
    try {
      const range = String(req.query.range ?? "1m");
      if (!FLOW_RANGES.has(range)) {
        return next(new AppError("range 는 1w · 1m · 3m · 1y 중 하나", 400, true, "INVALID_RANGE"));
      }
      res.json(await appPortfolioService.getPositionFlow(req.token!, range as "1w" | "1m" | "3m" | "1y"));
    } catch (error) {
      next(error);
    }
  },
};

export const appPortfolioController = new AppPortfolioController();
