import { Request, Response } from "express";

import { ResponseUtil } from "../../utils/response.util";
import { DashboardService } from "./dashboard.service";

export class DashboardController {
  private service = new DashboardService();

  async getDashboard(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;

      const data = await this.service.getDashboard(userId);

      return ResponseUtil.success(res, data);
    } catch (error) {
      return ResponseUtil.error(res, "DASHBOARD_FETCH_FAILED");
    }
  }
}
