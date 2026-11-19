import { NextFunction, Request, Response } from "express";

import { ResponseUtil } from "../../shared/presentation/ResponseUtil";
import type { PlanUseCases } from "../application/api";
import { assertNoReadOnlyKeys } from "../domain";
import { completeWeeklyPlanSchema, monthlySummaryQuerySchema, updatePlanSettingsSchema } from "./dto/plan.dto";

/** `/api/plan` — 요청 검증 → 유스케이스 한 번 → 응답. 금액은 유스케이스가 원 정수로 낸 값 그대로 */
export class PlanController {
  constructor(private readonly useCases: PlanUseCases) {}

  getWeekly = async (req: Request, res: Response, next: NextFunction) => {
    try {
      return ResponseUtil.success(res, await this.useCases.getWeeklyPlan.execute(req.user!.userId));
    } catch (error) {
      next(error);
    }
  };

  complete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = completeWeeklyPlanSchema.parse(req.body);
      const result = await this.useCases.completeWeeklyPlan.execute({ userId: req.user!.userId, ...body });
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      return ResponseUtil.success(res, await this.useCases.getPlanSettings.execute(req.user!.userId));
    } catch (error) {
      next(error);
    }
  };

  updateSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 밴드 · 배분 키가 오면 Zod 의 "모르는 키"(400) 전에 422 — 읽기 전용이라고 알린다(FR-73)
      assertNoReadOnlyKeys(req.body);
      const body = updatePlanSettingsSchema.parse(req.body);
      return ResponseUtil.success(res, await this.useCases.updatePlanSettings.execute(req.user!.userId, body.monthlyBaseKrw));
    } catch (error) {
      next(error);
    }
  };

  getMonthlySummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { month } = monthlySummaryQuerySchema.parse(req.query);
      return ResponseUtil.success(res, await this.useCases.getMonthlySummary.execute(req.user!.userId, month));
    } catch (error) {
      next(error);
    }
  };
}
