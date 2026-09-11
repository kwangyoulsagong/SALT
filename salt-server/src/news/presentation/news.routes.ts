import { Router } from "express";

import { authMiddleware } from "../../shared/presentation/authMiddleware";
import type { NewsUseCases } from "../application/api";
import { NewsController } from "./news.controller";

/**
 * `news` 의 HTTP 경로. **경로는 이관 전과 같다** (FR-35).
 *
 * 라우터를 모듈 최상위에서 만들지 않고 팩토리로 준다 — 유스케이스가 밖에서 주입되기
 * 때문이다. 조립은 진입점(`src/composition.ts`) 한 곳에서만 일어난다.
 */
export const createNewsRouter = (useCases: NewsUseCases): Router => {
  const router = Router();
  const newsController = new NewsController(useCases);

  /**
   * @swagger
   * tags:
   *   name: News
   *   description: 암호화폐 뉴스 API
   */

  /**
   * @swagger
   * /api/news:
   *   get:
   *     summary: 뉴스 목록 조회
   *     tags: [News]
   *     parameters:
   *       - in: query
   *         name: symbol
   *         schema:
   *           type: string
   *         description: 코인 심볼 필터 (예 BTC)
   *       - in: query
   *         name: source
   *         schema:
   *           type: string
   *         description: 뉴스 소스 (cryptopanic, coindesk, cointelegraph, cryptoslate)
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: 검색 키워드
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *     responses:
   *       200:
   *         description: 뉴스 목록
   */
  router.get("/", newsController.getNews);

  /**
   * @swagger
   * /api/news/trending:
   *   get:
   *     summary: 인기 뉴스 (조회수 순)
   *     tags: [News]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *     responses:
   *       200:
   *         description: 인기 뉴스 목록
   */
  router.get("/trending", newsController.getTrendingNews);

  /**
   * @swagger
   * /api/news/bookmarks:
   *   get:
   *     summary: 내 북마크 목록
   *     tags: [News]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *     responses:
   *       200:
   *         description: 북마크 목록
   */
  router.get("/bookmarks", authMiddleware, newsController.getMyBookmarks);

  /**
   * @swagger
   * /api/news/{id}:
   *   get:
   *     summary: 뉴스 상세 조회
   *     tags: [News]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: 뉴스 상세 정보
   */
  router.get("/:id", newsController.getNewsById);

  /**
   * @swagger
   * /api/news/bookmark:
   *   post:
   *     summary: 뉴스 북마크 추가
   *     tags: [News]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - newsId
   *             properties:
   *               newsId:
   *                 type: string
   *     responses:
   *       200:
   *         description: 북마크 추가 성공
   */
  router.post("/bookmark", authMiddleware, newsController.bookmarkNews);

  /**
   * @swagger
   * /api/news/bookmark/{id}:
   *   delete:
   *     summary: 뉴스 북마크 삭제
   *     tags: [News]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: 뉴스 ID
   *     responses:
   *       200:
   *         description: 북마크 삭제 성공
   */
  router.delete("/bookmark/:id", authMiddleware, newsController.removeBookmark);

  /**
   * @swagger
   * /api/news/admin/crawl:
   *   post:
   *     summary: 뉴스 크롤링 실행 (관리자용)
   *     tags: [News - Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 크롤링 완료
   */
  router.post("/admin/crawl", authMiddleware, newsController.crawlNews);

  return router;
};
