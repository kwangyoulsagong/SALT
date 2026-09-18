import { NextFunction, Request, Response } from "express";
import { appNewsService } from "../../services/app-news.service";
import { AppError } from "../../utils/error.util";

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
}

export const appNewsController = new AppNewsController();
