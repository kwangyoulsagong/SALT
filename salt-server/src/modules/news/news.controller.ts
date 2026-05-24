import { Request, Response, NextFunction } from 'express';
import { NewsService } from './news.service';
import { ResponseUtil } from '../../utils/response.util';

export class NewsController {
  private newsService = new NewsService();

  getNews = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = {
        symbol: req.query.symbol as string,
        source: req.query.source as string,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        search: req.query.search as string,
      };

      const result = await this.newsService.getNews(query);
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getNewsById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.newsService.getNewsById(id);
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  bookmarkNews = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { newsId } = req.body;
      const result = await this.newsService.bookmarkNews(userId, newsId);
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  removeBookmark = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const result = await this.newsService.removeBookmark(userId, id);
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getMyBookmarks = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const result = await this.newsService.getMyBookmarks(userId, page, limit);
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getTrendingNews = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const result = await this.newsService.getTrendingNews(limit);
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  // 관리자용 - 수동 크롤링 트리거
  crawlNews = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.newsService.crawlAndSaveNews();
      return ResponseUtil.success(res, result, 'News crawling completed');
    } catch (error) {
      next(error);
    }
  };
}
