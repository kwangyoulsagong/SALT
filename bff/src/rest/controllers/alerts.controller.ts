import { NextFunction, Request, Response } from "express";
import { appAlertsService } from "../../services/app-alerts.service";

export class AppAlertsController {
  async getAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await appAlertsService.getAlerts(req.token!));
    } catch (error) {
      next(error);
    }
  }
}

export const appAlertsController = new AppAlertsController();
