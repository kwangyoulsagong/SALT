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
   *         name: language
   *         schema:
   *           type: string
   *           enum: [ko, en, all]
   *         description: 언어 필터. 생략하면 전체다
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
   *       - in: query
   *         name: language
   *         schema:
   *           type: string
   *           enum: [ko, en, all]
   *         description: 언어 필터. 생략하면 전체다
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
   * /api/news/{id}/body:
   *   get:
   *     summary: 기사 본문 — 포털 검색으로 같은 기사를 찾아 뽑은 문단(SRV-REQ-054)
   *     description: |
   *       처음 부를 때 제목으로 포털 뉴스를 검색해 같은 기사(제목 겹침 0.8 이상 · 게시 2일 안)를 찾고 본문 문단만 뽑아 캐시한다.
   *       `status` = `ok`(문단 있음) | `not_found`(같은 기사 없음 — 3시간 뒤 다시) | `failed`(받지 못함 — 30분 뒤 다시). 문단은 글자만.
   *     tags: [News]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: 본문
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 data:
   *                   type: object
   *                   properties:
   *                     status: { type: string, enum: [ok, not_found, failed] }
   *                     paragraphs: { type: array, items: { type: string } }
   *                     originalUrl: { type: string, nullable: true }
   *                     fetchedAt: { type: string, format: date-time }
   *       400: { description: id 형식 오류 }
   *       401: { description: 로그인 필요 }
   *       404: { description: 없는 기사 }
   *       503: { description: 포털 검색 키 없음(NEWS_BODY_UNAVAILABLE) }
   */
  router.get("/:id/body", authMiddleware, newsController.getNewsBody);

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
