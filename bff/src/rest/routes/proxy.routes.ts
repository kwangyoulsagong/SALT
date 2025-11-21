import { Router, Request, Response, NextFunction } from "express";
import { backendApi } from "../../services/backend-api.service";
import { authMiddleware } from "../middleware/auth.middleware";
import { marketController } from "../controllers/market.controller";

const router = Router();

/**
 * 프록시 핸들러 - Backend로 요청 전달
 */
const proxyHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.token!;
    const method = req.method;
    const url = req.originalUrl.replace("/api", "");
    const data = req.body;

    const response = await backendApi.proxyAuthRequest(
      method,
      url,
      token,
      data
    );

    return res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    next(error);
  }
};

// Auth 관련
router.post("/auth/register", proxyHandler);
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
router.get("/investment/crypto/:symbol/chart", authMiddleware, proxyHandler);
router.get("/investment/market/overview", (req, res) =>
  marketController.overview(req, res)
);
router.get("/investment/market/symbols", (req, res) =>
  marketController.symbols(req, res)
);
// Missions 관련
router.get("/missions", authMiddleware, proxyHandler);
router.get("/missions/today", authMiddleware, proxyHandler);
router.get("/missions/my/history", authMiddleware, proxyHandler);
router.get("/missions/my/stats", authMiddleware, proxyHandler);
router.post("/missions/:id/start", authMiddleware, proxyHandler);
router.post(
  "/missions/progress/:progressId/complete",
  authMiddleware,
  proxyHandler
);
router.post("/missions/admin", authMiddleware, proxyHandler);
router.patch("/missions/admin/:id", authMiddleware, proxyHandler);
router.delete("/missions/admin/:id", authMiddleware, proxyHandler);

// Users 관련
router.get("/users/profile", authMiddleware, proxyHandler);
router.patch("/users/profile", authMiddleware, proxyHandler);
router.patch("/users/password", authMiddleware, proxyHandler);
router.get("/users/points/transactions", authMiddleware, proxyHandler);
router.get("/users/points/stats", authMiddleware, proxyHandler);
router.get("/users/achievements", authMiddleware, proxyHandler);
router.get("/users/dashboard", authMiddleware, proxyHandler);
router.delete("/users/account", authMiddleware, proxyHandler);

export default router;
