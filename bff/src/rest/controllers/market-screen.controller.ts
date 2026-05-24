import { Request, Response } from "express";
import { backendApi } from "../../services/backend-api.service";

class MarketScreenController {
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
