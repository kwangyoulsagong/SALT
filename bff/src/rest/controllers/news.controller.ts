import { NextFunction, Request, Response } from "express";
import { appArticleBodyService } from "../../services/app-article-body.service";
import { appNewsService } from "../../services/app-news.service";
import { AppError } from "../../utils/error.util";

const NEWS_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 종목 뉴스 프리뷰 (`BFF-REQ-008`).
 *
 * 요청 파싱과 응답 변환만 한다. 조립은 서비스가 갖는다 (`rest-contract.md`).
 */
class AppNewsController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const symbol = req.query.symbol;
      if (typeof symbol !== "string" || symbol.trim() === "") {
        throw new AppError("symbol is required", 400);
      }

      const rawLimit = req.query.limit;
      const limit =
        typeof rawLimit === "string" && rawLimit !== ""
          ? Number(rawLimit)
          : undefined;

      if (limit !== undefined && !Number.isFinite(limit)) {
        throw new AppError("limit must be a number", 400);
      }

      const result = await appNewsService.listBySymbol(symbol, limit);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  };

  /** 코인 기사 본문(`BFF-REQ-053`) — id 는 서버 원장 uuid. 다른 모양은 서버를 부르지 않는다 */
  body = async (req: Request, res: Response, next: NextFunction) => {
    const id = String(req.params.id ?? "");
    if (!NEWS_ID.test(id)) return res.status(400).json({ success: false, message: "기사 id 형식이 아닙니다" });
    const aborter = new AbortController();
    res.on("close", () => {
      if (!res.writableFinished) aborter.abort();
    });
    try {
      return res.json({ success: true, data: await appArticleBodyService.coin(req.token!, id, aborter.signal) });
    } catch (error) {
      if (aborter.signal.aborted) return;
      return next(error);
    }
  };
}

export const appNewsController = new AppNewsController();
