import { Request, Response } from "express";
import { PortfolioPerformanceService } from "./portfolio-performance.service";
import { ResponseUtil } from "../../utils/response.util";

export class PortfolioPerformanceController {
  private service = new PortfolioPerformanceService();

  async getPerformance(req: Request, res: Response) {
    const userId = req.user!.userId;

    const range = (req.query.range as string) ?? "7d";

    const data = await this.service.getPerformance(userId, range);

    return ResponseUtil.success(res, data);
  }
}
