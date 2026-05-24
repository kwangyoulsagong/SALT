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
  async symbols(req: Request, res: Response) {
    try {
      const result = await marketOverviewService.getSymbols(); // 👈 이걸 서비스에 만들 예정
      res.json({ data: result });
    } catch (error) {
      console.error("Market symbols error:", error);
      res.status(500).json({ message: "Failed to fetch market symbols" });
    }
  }
}

export const marketController = new MarketController();
