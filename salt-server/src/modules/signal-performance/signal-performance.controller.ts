import { NextFunction, Request, Response } from "express";
import { ResponseUtil } from "../../utils/response.util";
import { signalPerformanceQuerySchema } from "./signal-performance.dto";
import { SignalPerformanceService } from "./signal-performance.service";

export class SignalPerformanceController {
  private service = new SignalPerformanceService();

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const query = signalPerformanceQuerySchema.parse(req.query);
      const result = await this.service.get(userId, query);
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
