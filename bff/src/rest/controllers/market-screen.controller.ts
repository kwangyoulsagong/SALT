import { NextFunction, Request, Response } from "express";
import { backendApi } from "../../services/backend-api.service";
import { marketOverviewService } from "../../services/market-overview.service";
import { appCryptoWhyMovedService } from "../../services/app-crypto-why-moved.service";

/** 코인 심볼 — 서버 DTO(`cryptoSymbolParamSchema`)와 같은 규칙. 경로에 들어가므로 여기서 먼저 막는다(SSRF, `config-security.md`) */
const CRYPTO_SYMBOL = /^[0-9A-Za-z]{1,15}$/;

class MarketScreenController {
  /**
   * 시장 요약 띠 (`BFF-REQ-035`). **공개 경로** — 시세와 같다(로그인 전에도 투자 화면이 뜬다).
   * 실패는 error middleware 가 매핑한다 — 서버 4xx 는 그대로, 그 외는 500.
   */
  async getSummary(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ data: await marketOverviewService.getSummary() });
    } catch (error) {
      next(error);
    }
  }

  /** 코인 "왜 움직였나"(F016 단계 C · `BFF-REQ-051` FR-1) — 화면을 떠나면 upstream 도 끊는다 */
  async getWhyMoved(req: Request, res: Response, next: NextFunction) {
    const symbol = String(req.params.symbol ?? "");
    if (!CRYPTO_SYMBOL.test(symbol)) return res.status(400).json({ success: false, message: "종목 심볼 형식이 아닙니다" });
    const aborter = new AbortController();
    res.on("close", () => {
      if (!res.writableFinished) aborter.abort();
    });
    try {
      const data = await appCryptoWhyMovedService.get(req.token!, symbol.toUpperCase(), aborter.signal);
      return res.json({ success: true, data });
    } catch (error) {
      if (aborter.signal.aborted) return;
      next(error);
    }
  }

  async getMarket(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.token!;

      const response = await backendApi.proxyAuthRequest(
        "GET",
        "/investment/market/overview",
        token,
      );

      return res.json(response.data);
    } catch (error) {
      next(error);
    }
  }

  async getMarketSymbol(req: Request, res: Response, next: NextFunction) {
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
      next(error);
    }
  }
}

export const marketScreenController = new MarketScreenController();
