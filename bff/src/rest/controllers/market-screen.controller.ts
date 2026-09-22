import { NextFunction, Request, Response } from "express";
import { backendApi } from "../../services/backend-api.service";
import { marketOverviewService } from "../../services/market-overview.service";

class MarketScreenController {
  /**
   * 시장 요약 띠 (`BFF-REQ-035`). **공개 경로** — 시세와 같다(로그인 전에도 투자 화면이 뜬다).
   * 실패는 error middleware 가 매핑한다 — 서버 4xx 는 그대로, 그 외는 502/504.
   */
  async getSummary(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ data: await marketOverviewService.getSummary() });
    } catch (error) {
      next(error);
    }
  }

  async getMarket(req: Request, res: Response) {
    try {
      const token = req.token!;

      const response = await backendApi.proxyAuthRequest(
        "GET",
        "/investment/market/overview",
        token,
      );

      return res.json(response.data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Market fetch failed" });
    }
  }

  async getMarketSymbol(req: Request, res: Response) {
    try {
      const token = req.token!;
      const { symbol } = req.params;

      const [price, intelligence] = await Promise.all([
        backendApi.proxyAuthRequest(
          "GET",
          `/investment/crypto/${symbol}/price`,
          token,
        ),

        backendApi.proxyAuthRequest(
          "GET",
          `/market-intelligence/${symbol}/dashboard`,
          token,
        ),
      ]);

      return res.json({
        price: price.data,
        intelligence: intelligence.data,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Market symbol fetch failed" });
    }
  }
}

export const marketScreenController = new MarketScreenController();
