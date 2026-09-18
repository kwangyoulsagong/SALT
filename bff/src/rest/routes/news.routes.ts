import { Router } from "express";
import { appNewsController } from "../controllers/news.controller";

const router = Router();

/**
 * 종목 뉴스 (`/api/app/news`).
 *
 * **인증을 요구하지 않는다** — 서버 `/news` 가 공개 경로이고, 같은 프리뷰 패널의
 * 차트·심리도 공개다. 근거는 `app-news.service` 주석.
 */
router.get("/", appNewsController.list);

export default router;
