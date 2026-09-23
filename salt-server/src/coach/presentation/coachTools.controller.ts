import { NextFunction, Request, Response } from "express";

import { ResponseUtil } from "../../shared/presentation/ResponseUtil";
import type { CoachUseCases } from "../application/api";
import {
  profitPlanQuerySchema,
  signalPerformanceQuerySchema,
  tradePreflightSchema,
} from "./dto/coach.dto";

/**
 * 코치의 나머지 네 경로 — 행동 코치 · 익절 계획 · 주문 전 계산 · 성적표.
 *
 * ## 컨트롤러 하나에 넷을 둔 이유
 *
 * 각각 **핸들러가 하나뿐**이고 판단이 없다(검증 → 유스케이스 1회 → 응답).
 * 파일을 넷으로 나누면 같은 네 줄이 네 번 반복된다. 경로는 라우터가 나눈다.
 */
export class CoachToolsController {
  constructor(private readonly useCases: CoachUseCases) {}

  getBehaviorCoach = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.useCases.getBehaviorCoach.execute(
        req.user!.userId
      );
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  listProfitPlans = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = profitPlanQuerySchema.parse(req.query);

      const result = await this.useCases.listProfitPlans.execute(
        req.user!.userId,
        query
      );

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  checkTradePreflight = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const data = tradePreflightSchema.parse(req.body);

      const result = await this.useCases.checkTradePreflight.execute(
        req.user!.userId,
        data
      );

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * 판단 성적표. `/api/coach/scoreboard` 와 `?groupBy=signalType` 이 **같은 표**를 준다 —
   * 하나는 리포트 화면의 경로이고 하나는 기존 경로의 하위 호환 확장이다.
   */
  getScoreboard = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.useCases.getJudgmentScoreboard.execute();

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getSignalPerformance = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const query = signalPerformanceQuerySchema.parse(req.query);

      // 응답 **모양이 다른 두 계약**이 한 경로에 있다. 무인자 호출이 옛 응답을 그대로
      // 받아야 해서(FR-15) 새 표를 여기에 덧붙일 수 없었다 — 쿼리로 갈라진다.
      if (query.groupBy) return this.getScoreboard(req, res, next);

      const result = await this.useCases.getSignalPerformance.execute(
        req.user!.userId,
        query
      );

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
