import { NextFunction, Request, Response } from "express";
import { ResponseUtil } from "../../utils/response.util";
import { profitPlanQuerySchema } from "./profit-plan.dto";
import { ProfitPlanService } from "./profit-plan.service";

export class ProfitPlanController {
  private service = new ProfitPlanService();

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const query = profitPlanQuerySchema.parse(req.query);
      const result = await this.service.getPlans(userId, query);
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
