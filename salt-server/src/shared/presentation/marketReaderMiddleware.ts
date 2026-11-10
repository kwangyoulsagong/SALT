/**
 * 시장 경로의 "읽는 사람" 판정(`SRV-REQ-056` FR-3 · `ADR-011`).
 *
 * 시장 데이터(시세 · 실시간 · 차트 · 호가 · 투자자 · 업종 · 뉴스 · 왜 움직였나 · 검색)는 누구에게나 같다 — 사람 토큰 **또는**
 * 게스트 토큰이면 읽는다. 사람이면 `req.user` 도 채운다(검색의 ★ 처럼 사람 칸을 더할 수 있는 경로). 둘 다 아니면 401.
 *
 * ★ · 포트폴리오 · 코치 · 북마크는 이걸 쓰지 않는다 — `authMiddleware`(사람만). 게스트 토큰은 서명 비밀이 달라 거기서 거절된다.
 */
import { NextFunction, Request, Response } from "express";

import { JwtUtil } from "../lib/jwt";
import { UnauthorizedError } from "./httpErrors";

export type MarketReader = { kind: "user"; userId: string; email: string } | { kind: "guest" };

declare global {
  namespace Express {
    interface Request {
      reader?: MarketReader;
    }
  }
}

const bearerOf = (req: Request): string | null => {
  const header = req.headers.authorization;
  return header && header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
};

export const marketReaderMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const token = bearerOf(req);
  if (!token) return next(new UnauthorizedError("No token provided"));
  try {
    const user = JwtUtil.verifyAccessToken(token);
    req.user = user;
    req.reader = { kind: "user", userId: user.userId, email: user.email };
    return next();
  } catch (userError) {
    // 서명은 맞는데 만료된 사람 토큰 — 게스트로 내리지 않는다(화면이 갱신해야 ★ · 코치가 돌아온다)
    if ((userError as Error).name === "TokenExpiredError") return next(new UnauthorizedError("Token expired"));
  }
  try {
    JwtUtil.verifyGuestToken(token);
    req.reader = { kind: "guest" };
    return next();
  } catch (error) {
    const expired = (error as Error).name === "TokenExpiredError";
    return next(new UnauthorizedError(expired ? "Token expired" : "Invalid token"));
  }
};

/** 사람이면 그 사람, 게스트면 `null` — 사람 칸(★ · 보유)을 더할지 고르는 자리 */
export const readerUser = (req: Request): { userId: string; email: string } | null =>
  req.reader?.kind === "user" ? { userId: req.reader.userId, email: req.reader.email } : null;
