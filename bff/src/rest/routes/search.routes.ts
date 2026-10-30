import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appSearchController } from "../controllers/search.controller";

const router = Router();

/** 종목 검색 (`/api/app/search`, `BFF-REQ-007` H절) — 코인 + 국내 한 검색. 인증 필수(사용자별 `isTracked`) */
router.get("/", authMiddleware, appSearchController.search);

export default router;
