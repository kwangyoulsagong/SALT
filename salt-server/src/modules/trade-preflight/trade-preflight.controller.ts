import { NextFunction, Request, Response } from "express";
import { ResponseUtil } from "../../utils/response.util";
import { tradePreflightSchema } from "./trade-preflight.dto";
import { TradePreflightService } from "./trade-preflight.service";

export class TradePreflightController {
  private service = new TradePreflightService();

  check = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const data = tradePreflightSchema.parse(req.body);
      const result = await this.service.check(userId, data);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
