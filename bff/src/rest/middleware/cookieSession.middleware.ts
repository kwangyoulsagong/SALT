import type { NextFunction, Request, Response } from "express";

import { isSameOriginRequest, sessionTokenFromCookie, webOrigins } from "../../utils/session-cookie.util";

/**
 * 웹 세션 쿠키 → `Authorization` (`BFF-REQ-009` FR-54). 라우트보다 먼저 한 번 — 앱 대면 경로 · 서버 통과(proxy) · SSE 가 전부
 * 헤더 하나만 본다. 헤더가 이미 있으면(앱) 건드리지 않는다. 다른 사이트에서 온 요청의 쿠키는 쓰지 않는다(`session-cookie.util`).
 *
 * 사람 쿠키(`salt_at`)가 없으면 게스트 쿠키(`salt_gt`)를 쓴다(`BFF-REQ-055` FR-1 · `ADR-011`) — 서버가 시장 경로에서만 받는다.
 * BFF 의 `authMiddleware` 는 헤더가 **있나**만 보므로 게스트도 지나가고, 사람 경로의 거절(401)은 서버가 한다.
 */
export const cookieSessionMiddleware = (origins: readonly string[] = webOrigins()) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.headers.authorization) {
      const session = sessionTokenFromCookie(req.headers.cookie);
      if (session && isSameOriginRequest(req.headers, origins)) req.headers.authorization = `Bearer ${session.token}`;
    }
    next();
  };
