import { Request, Response } from "express";

import { logger } from "../config/logger";

/**
 * 동면 경로 (`SRV-REQ-009` FR-7 · 8 · `FEATURE-000` FR-10 · 12 · 13 · 14 · `ddd-presentation.md` §5).
 *
 * 등록을 풀고 404 가 아니라 **410 Gone** 을 준다. 404 는 "주소를 틀렸다"로 읽혀서
 * 남은 호출이 버그인지 의도된 제거인지 구분이 안 된다. BFF `gone.middleware` 와 같은 응답이다.
 *
 * 로그는 **경로(마운트 지점)당 1회**다. 키를 `originalUrl` 로 잡지 않는다 — `/missions/:id` 처럼 끝없이 늘어난다.
 *
 * **동면이지 삭제가 아니다.** 라우트 · 컨트롤러 · 서비스 · Prisma 모델은 남겨 두었다.
 * `/api/users/*` · `/api/investment-insight/top` 은 살아 있는 라우터 안의 경로라
 * 라우터보다 **먼저** 마운트해 가린다. 되살릴 때는 이 목록에서 빼고 `app.ts` 에 라우트를 다시 건다.
 */
export const DORMANT_PATHS = [
  "/api/missions",
  "/api/users/points",
  "/api/users/achievements",
  "/api/users/dashboard",
  "/api/dashboard",
  "/api/feed",
  // 스펙 표의 `/api/investment-insight/ranking*` — 실제 경로는 `insight-ranking.controller` 의 `/top` 이다
  "/api/investment-insight/top",
] as const;

const logged = new Set<string>();

export const goneMiddleware = (req: Request, res: Response) => {
  const key = req.baseUrl;
  if (!logged.has(key)) {
    logged.add(key);
    logger.warn("동면 경로 호출 — 잔여 호출", { path: key, method: req.method });
  }

  res.status(410).json({
    success: false,
    code: "ENDPOINT_DORMANT",
    revivable: true,
    message: "This endpoint is dormant",
  });
};
