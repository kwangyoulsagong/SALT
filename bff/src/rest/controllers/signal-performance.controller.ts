import { Request, Response, NextFunction } from "express";
import { appSignalPerformanceService } from "../../services/app-signal-performance.service";

export class AppSignalPerformanceController {
  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await appSignalPerformanceService.get(req.token!, req.query);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

export const appSignalPerformanceController =
  new AppSignalPerformanceController();
