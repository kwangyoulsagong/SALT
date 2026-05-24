import { Request, Response, NextFunction } from "express";
import { appBehaviorCoachService } from "../../services/app-behavior-coach.service";

export class AppBehaviorCoachController {
  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await appBehaviorCoachService.get(req.token!);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

export const appBehaviorCoachController = new AppBehaviorCoachController();
