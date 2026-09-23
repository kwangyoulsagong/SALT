import { Router, Request, Response, NextFunction } from "express";
import { backendApi } from "../../services/backend-api.service";
import { authMiddleware } from "../middleware/auth.middleware";
import { marketController } from "../controllers/market.controller";
import { assertChartPeriod } from "../middleware/chartPeriod.middleware";

const router = Router();

/**
 * 프록시 핸들러 - Backend로 요청 전달. 기본 타임아웃은 클라이언트 기본값(10s)이고,
 * 경로별 예산이 있으면(`BFF-REQ-025` 호출 맵) `createProxyHandler({ timeout })` 로 준다.
 */
const createProxyHandler =
  (options: { timeout?: number } = {}) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.token!;
      const method = req.method;
      const url = req.originalUrl.replace("/api", "");
      const data = req.body;

      const response = await backendApi.proxyAuthRequest(
        method,
        url,
        token,
        data,
        options,
      );

      return res.status(response.status).json(response.data);
    } catch (error) {
      // 4xx(쿨다운 429 의 `Retry-After` 포함 — `BFF-REQ-023` FR-60)는 error middleware 가 보존한다
      next(error);
    }
  };

const proxyHandler = createProxyHandler();

/**
 * `generate` 는 서버가 **202 를 바로** 준다(생성은 뒤에서). 1s 를 넘기면 서버 계약 위반이고
 * 기다리지 않는다(`BFF-REQ-025` FR-3 · 4). mutation 이라 재시도 0회. 상태 코드는 그대로 옮긴다
 * — 202 를 200 으로 바꾸지 않는다.
 */
const GENERATE_TIMEOUT_MS = 1_000;

// Auth 관련
//
// **`POST /auth/register` 가 없다** (`BFF-REQ-007` FR-60). 계정은 초대 코드로만 생기고
// 그 경로는 `/api/app/onboarding/invite` 다. 서버에서도 404 이므로 여기 남겨 두면
// 프론트가 죽은 경로를 계속 부르게 된다.
router.post("/auth/login", proxyHandler);
router.post("/auth/refresh", proxyHandler);
router.get("/auth/me", authMiddleware, proxyHandler);

// Goals 관련
router.post("/goals", authMiddleware, proxyHandler);
router.get("/goals", authMiddleware, proxyHandler);
router.get("/goals/statistics", authMiddleware, proxyHandler);
router.get("/goals/:id", authMiddleware, proxyHandler);
router.patch("/goals/:id", authMiddleware, proxyHandler);
router.delete("/goals/:id", authMiddleware, proxyHandler);
router.post("/goals/:id/savings", authMiddleware, proxyHandler);
router.get("/goals/:id/progress", authMiddleware, proxyHandler);

// Investment 관련
router.post("/investment/watchlist", authMiddleware, proxyHandler);
router.get("/investment/watchlist", authMiddleware, proxyHandler);
router.delete("/investment/watchlist/:id", authMiddleware, proxyHandler);
router.get("/investment/crypto/:symbol/price", authMiddleware, proxyHandler);
router.get(
  "/investment/crypto/:symbol/chart",
  assertChartPeriod,
  proxyHandler,
);
router.get("/investment/market/overview", (req, res, next) =>
  marketController.overview(req, res, next),
);
router.get("/investment/market/symbols", (req, res, next) =>
  marketController.symbols(req, res, next),
);

// Market Intelligence
router.get("/market-intelligence/:symbol/dashboard", proxyHandler);
// `/missions*` · `/users/points/*` · `/users/achievements` · `/users/dashboard` 는 동면이다 — 410
// (`gone.middleware` · `BFF-REQ-008` FR-11).

// Users 관련
router.get("/users/profile", authMiddleware, proxyHandler);
router.patch("/users/profile", authMiddleware, proxyHandler);
// `PATCH /users/password` · `DELETE /users/account` 는 제거했다 — 서버에서 404 다
// (`SRV-REQ-009` 제거 목록 · `BFF-REQ-008` 제거 표).

// ai-coach
router.post(
  "/ai-coach/generate",
  authMiddleware,
  createProxyHandler({ timeout: GENERATE_TIMEOUT_MS }),
);
router.get("/ai-coach", authMiddleware, proxyHandler);

export default router;
