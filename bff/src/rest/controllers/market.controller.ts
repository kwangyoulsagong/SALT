import { Request, Response } from "express";
import { marketOverviewService } from "../../services/market-overview.service";

export class MarketController {
  async overview(req: Request, res: Response) {
    try {
      const result = await marketOverviewService.getOverview(req.query);
      res.json(result);
    } catch (error) {
      console.error("Market overview error:", error);
      res.status(500).json({ message: "Failed to fetch market overview" });
    }
  }
}

export const marketController = new MarketController();
