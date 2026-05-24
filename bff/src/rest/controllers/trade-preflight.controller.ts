import { Request, Response, NextFunction } from "express";
import { appTradePreflightService } from "../../services/app-trade-preflight.service";

export class AppTradePreflightController {
  check = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await appTradePreflightService.check(req.token!, req.body);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

export const appTradePreflightController = new AppTradePreflightController();
