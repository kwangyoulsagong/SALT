import { NextFunction, Request, Response } from "express";
import { marketOverviewService } from "../../services/market-overview.service";

export class MarketController {
  /**
   * 실패는 error middleware 가 매핑한다 — 서버 4xx 는 그대로, 그 외는 500. 원래는 모든 실패를
   * 여기서 500 으로 바꿨고, 그러면 모르는 `period` 에 대한 서버의 422 가 "서버 장애"로
   * 읽혔다 — 고칠 쪽이 프론트인데 서버를 본다.
   *
   * 유효한 기간 목록을 BFF 에 두지 않는다. 차트 주기(`chartPeriod.middleware`)는 그렇게
   * 했고 주석이 "서버가 늘릴 때 같이 늘린다"고 적어야 했다 — 목록이 두 곳이면 갈라진다.
   */
  async overview(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await marketOverviewService.getOverview(req.query));
    } catch (error) {
      next(error);
    }
  }

  async symbols(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ data: await marketOverviewService.getSymbols() });
    } catch (error) {
      next(error);
    }
  }
}

export const marketController = new MarketController();
