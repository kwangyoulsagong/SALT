import type { NextFunction, Request, Response } from "express";

import { ACCESS_COOKIE, isSameOriginRequest, readCookie, webOrigins } from "../../utils/session-cookie.util";

/**
 * 웹 세션 쿠키 → `Authorization` (`BFF-REQ-009` FR-54). 라우트보다 먼저 한 번 — 앱 대면 경로 · 서버 통과(proxy) · SSE 가 전부
 * 헤더 하나만 본다. 헤더가 이미 있으면(앱) 건드리지 않는다. 다른 사이트에서 온 요청의 쿠키는 쓰지 않는다(`session-cookie.util`).
 */
export const cookieSessionMiddleware = (origins: readonly string[] = webOrigins()) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.headers.authorization) {
      const token = readCookie(req.headers.cookie, ACCESS_COOKIE);
      if (token && isSameOriginRequest(req.headers, origins)) req.headers.authorization = `Bearer ${token}`;
    }
    next();
  };
