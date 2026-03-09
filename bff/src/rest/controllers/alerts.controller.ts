import { Request, Response } from "express";
import { appAlertsService } from "../../services/app-alerts.service";

export class AppAlertsController {
  async getAlerts(req: Request, res: Response) {
    try {
      const token = req.token!;

      const result = await appAlertsService.getAlerts(token);

      res.json(result);
    } catch (error) {
      console.error("Alerts error:", error);
      res.status(500).json({
        message: "Failed to fetch alerts",
      });
    }
  }
}

export const appAlertsController = new AppAlertsController();
