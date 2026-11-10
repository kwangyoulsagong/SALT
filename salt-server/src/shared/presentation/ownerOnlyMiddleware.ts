/**
 * 소유자만(`FORECAST_OWNER_EMAILS`) — 관리 경로용. `authMiddleware` 뒤에 건다.
 *
 * 2026-11-10 인증 경계 조사에서 `POST /api/news/admin/crawl` 이 로그인만 보고 누구나 수집을 돌리게 열려 있었다(`SRV-REQ-056` FR-7).
 * 같은 꼴(관리 동작 + 로그인만)을 막는 한 자리다. 전망의 소유자 판정(`isForecastOwner`)과 같은 비교 — 대소문자 · 공백 무시.
 */
import { NextFunction, Request, Response } from "express";

import { ForbiddenError } from "./httpErrors";

const sameEmail = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export const ownerOnlyMiddleware =
  (owners: readonly string[]) => (req: Request, _res: Response, next: NextFunction) => {
    const email = req.user?.email;
    if (email && owners.some((owner) => sameEmail(owner, email))) return next();
    return next(new ForbiddenError("Owner only"));
  };
