import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appNewsController } from "../controllers/news.controller";

const router = Router();

/**
 * 종목 뉴스 (`/api/app/news`).
 *
 * **인증을 요구하지 않는다** — 서버 `/news` 가 공개 경로이고, 같은 프리뷰 패널의
 * 차트·심리도 공개다. 근거는 `app-news.service` 주석.
 */
router.get("/", appNewsController.list);
// 기사 본문 — 모달을 열 때 한 번(`BFF-REQ-053`). 로그인 사용자(서버 판정)
router.get("/:id/body", authMiddleware, appNewsController.body);

export default router;
