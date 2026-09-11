import { NextFunction, Request, Response } from "express";

import { ResponseUtil } from "../../shared/presentation/ResponseUtil";
import type { NewsUseCases } from "../application/api";

/**
 * 요청을 유스케이스 입력으로 옮기고 응답을 만든다. **판단이 없다.**
 *
 * 유스케이스를 `new` 하지 않고 **주입받는다** — 컨트롤러가 직접 만들면 구현을 알게 되고
 * (`presentation` → `infrastructure`), 훅이 그것을 막는다.
 */
export class NewsController {
  constructor(private readonly useCases: NewsUseCases) {}

  getNews = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.useCases.listArticles.execute({
        symbol: req.query.symbol as string,
        source: req.query.source as string,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        search: req.query.search as string,
      });
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getNewsById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.useCases.getArticle.execute(req.params.id);
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  bookmarkNews = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.useCases.bookmarkArticle.execute(
        req.user!.userId,
        req.body.newsId
      );
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  removeBookmark = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.useCases.removeBookmark.execute(
        req.user!.userId,
        req.params.id
      );
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getMyBookmarks = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.useCases.listBookmarks.execute(
        req.user!.userId,
        req.query.page ? Number(req.query.page) : undefined,
        req.query.limit ? Number(req.query.limit) : undefined
      );
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getTrendingNews = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const result = await this.useCases.listTrendingArticles.execute(limit);
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  /** 관리자용 수동 크롤링. 스케줄은 워커가 갖는다 (FR-5). */
  crawlNews = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.useCases.crawlNews.execute();
      return ResponseUtil.success(res, result, "News crawling completed");
    } catch (error) {
      next(error);
    }
  };
}
