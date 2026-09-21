import { Request, Response } from "express";
import { marketOverviewService } from "../../services/market-overview.service";

export class MarketController {
  /**
   * 서버의 4xx 는 **그대로** 돌려준다. 원래는 모든 실패를 500 으로 바꿨고, 그러면 모르는
   * `period` 에 대한 서버의 422 가 "서버 장애"로 읽힌다 — 고칠 쪽이 프론트인데 서버를 본다.
   *
   * 유효한 기간 목록을 BFF 에 두지 않는다. 차트 주기(`chartPeriod.middleware`)는 그렇게
   * 했고 주석이 "서버가 늘릴 때 같이 늘린다"고 적어야 했다 — 목록이 두 곳이면 갈라진다.
   */
  async overview(req: Request, res: Response) {
    try {
      const result = await marketOverviewService.getOverview(req.query);
      res.json(result);
    } catch (error: any) {
      const status = error?.response?.status;
      if (typeof status === "number" && status >= 400 && status < 500) {
        return res.status(status).json(error.response.data);
      }
      console.error("Market overview error:", error?.message ?? error);
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
