import { Request, Response } from "express";
import { logger } from "../../config/logger";

/**
 * 동면 경로 (`BFF-REQ-007` A절 FR-1~6 · `BFF-REQ-008` FR-11 · `bff-architecture.md` §7).
 *
 * 등록을 풀고 404 가 아니라 **410 Gone** 을 준다. 404 는 "주소를 틀렸다"로 읽혀서
 * 프론트에 남은 호출이 버그인지 의도된 제거인지 구분이 안 된다.
 *
 * 로그는 **경로(마운트 지점)당 1회**다. 요청마다 남기면 잔여 호출 하나가 로그를 덮는다.
 * 키를 `originalUrl` 로 잡지 않는다 — `/missions/:id` 처럼 끝없이 늘어난다.
 *
 * **동면이지 삭제가 아니다.** `feed` 라우트 · 컨트롤러 · 서비스 파일은 남겨 두었다(FR-1).
 * 되살릴 때는 이 목록에서 빼고 `app.ts` 에 라우트를 다시 건다 — 목록이 한 곳이다(FR-5).
 *
 * 2026-09-22 등록. 1주(2026-09-29) 동안 로그에 잔여 호출이 0건인지 본다(FR-6).
 */
export const DORMANT_PATHS = [
  "/api/app/feed",
  "/api/missions",
  "/api/users/points",
  "/api/users/achievements",
  "/api/dashboard",
  // 스펙 목록(`/api/dashboard*`) 밖이지만 같은 게이미피케이션 요약이다 — 8값 중 미션 · 포인트가 3,
  // 목표는 `/api/goals` 가 따로 준다. 프론트 호출 0건 (2026-09-22 추가)
  "/api/users/dashboard",
] as const;

const logged = new Set<string>();

export const goneMiddleware = (req: Request, res: Response) => {
  const key = req.baseUrl;
  if (!logged.has(key)) {
    logged.add(key);
    logger.warn("동면 경로 호출 — 프론트 잔여 호출", {
      path: key,
      method: req.method,
    });
  }

  res.status(410).json({
    success: false,
    code: "ENDPOINT_DORMANT",
    revivable: true,
    message: "This endpoint is dormant",
  });
};
