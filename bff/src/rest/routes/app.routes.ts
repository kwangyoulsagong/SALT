import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appController } from "../controllers/app.controller";

const router = Router();

/**
 * 셸 홈 — 도메인 요약 카드 `{ cards: HomeSummaryCard[], order, hidden }` (`BFF-REQ-046`, 2026-11-02 계약 변경).
 * 카드 하나가 실패 · 800ms 초과면 그 카드만 `state: "degraded"` — 홈은 언제나 200.
 */
router.get("/home", authMiddleware, (req, res, next) =>
  appController.getHome(req, res, next),
);

/** 홈 시장 블록(`BFF-REQ-046` FR-14, 2026-11-26) — 개인 기록이 없어도 차는 칸. 원천 하나가 실패하면 그 줄만 빠진다(200) */
router.get("/home/market", authMiddleware, (req, res, next) =>
  appController.getHomeMarket(req, res, next),
);

/** 홈 카드 순서 · 숨김 저장(`BFF-REQ-046` FR-5) — 서버 identity(S3a). 값 검사(카드 넷 순열 · 하나는 보임)는 서버 한 곳 */
router.put("/home/layout", authMiddleware, (req, res, next) =>
  appController.arrangeHome(req, res, next),
);

export default router;
