import { NextFunction, Request, Response } from "express";
import { ResponseUtil } from "../../utils/response.util";
import { BehaviorCoachService } from "./behavior-coach.service";

export class BehaviorCoachController {
  private service = new BehaviorCoachService();

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const result = await this.service.get(userId);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
