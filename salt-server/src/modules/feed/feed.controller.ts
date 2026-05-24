// modules/feed/feed.controller.ts

import { Request, Response } from "express";
import { InvestmentFeedService } from "./feed.service";
import { ResponseUtil } from "../../utils/response.util";

export class InvestmentFeedController {
  private service = new InvestmentFeedService();

  async getFeed(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;

      const page = Number(req.query.page ?? 1);
      const size = Number(req.query.size ?? 20);

      const data = await this.service.getFeed(userId, page, size);

      return ResponseUtil.success(res, data);
    } catch (error) {
      return ResponseUtil.error(res, "FEED_FETCH_FAILED");
    }
  }
}
