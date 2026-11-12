/**
 * 인증 미들웨어 — 사람 토큰만(게스트 · 갱신 토큰은 401).
 *
 * **왜 `auth` 컨텍스트가 아니라 여기 있는가.** 모든 컨텍스트의 라우터가 이것을 건다. 토큰 **전송 · 검증 계층**만 —
 * 서버 S3b(2026-11-12)부터 발급은 identity(Kotlin)이고 Express 는 리소스 서버다. 판정은 `shared/lib/tokenVerifier` 한 곳
 * (새 RS256 + 옛 HS256 을 `LEGACY_HS_UNTIL` 까지). 401 문구 셋은 그대로: `No token provided` · `Invalid token` · `Token expired`.
 */
import { NextFunction, Request, Response } from "express";

import { tokenVerifier, type TokenCheck, type TokenPerson, type TokenVerifier } from "../lib/tokenVerifier";
import { ServiceUnavailableError, UnauthorizedError } from "./httpErrors";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPerson;
    }
  }
}

export const bearerOf = (req: Request): string | null => {
  const header = req.headers.authorization;
  return header && header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
};

/** 실패 판정 → HTTP 오류. 통과면 null */
export const rejectionOf = (check: TokenCheck): Error | null => {
  switch (check.kind) {
    case "expired":
      return new UnauthorizedError("Token expired");
    case "invalid":
      return new UnauthorizedError("Invalid token");
    case "unavailable":
      return new ServiceUnavailableError("Token keys unavailable");
    default:
      return null;
  }
};

/** 검증기를 받는 판 — 시험이 고정 키로 만든다. 라우터는 아래 [authMiddleware] */
export const createAuthMiddleware = (verifier: TokenVerifier) => (req: Request, _res: Response, next: NextFunction) => {
  const token = bearerOf(req);
  if (!token) return next(new UnauthorizedError("No token provided"));
  verifier
    .person(token)
    .then((check) => {
      if (check.kind === "person") {
        req.user = check.person;
        return next();
      }
      return next(rejectionOf(check));
    })
    .catch(next);
};

export const authMiddleware = createAuthMiddleware(tokenVerifier);
