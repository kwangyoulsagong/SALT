import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { appSearchController, appSearchExtrasController } from "../controllers/search.controller";

const router = Router();

/** 종목 검색 (`/api/app/search`, `BFF-REQ-007` H절) — 코인 + 국내 한 검색. 토큰 필수(사람 · 게스트 — 게스트는 `isTracked` · `tracked` 가 `null`, `BFF-REQ-055`) */
router.get("/", authMiddleware, appSearchController.search);

/** 검색 모달 2단계(`BFF-REQ-054`) — 결과 묶음 · 뜨는 업종 · 곁 칸. 토큰 필수(사람 · 게스트) */
router.get("/groups", authMiddleware, appSearchExtrasController.groups);
router.get("/rising-sectors", authMiddleware, appSearchExtrasController.risingSectors);
router.get("/related", authMiddleware, appSearchExtrasController.related);

export default router;
