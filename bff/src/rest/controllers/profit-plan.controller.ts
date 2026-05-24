import { Request, Response, NextFunction } from "express";
import { appProfitPlanService } from "../../services/app-profit-plan.service";

export class AppProfitPlanController {
  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await appProfitPlanService.get(req.token!, req.query);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

export const appProfitPlanController = new AppProfitPlanController();
