/**
 * 시장 경로의 "읽는 사람" 판정(`SRV-REQ-056` FR-3 · `ADR-011`).
 *
 * 시장 데이터(시세 · 실시간 · 차트 · 호가 · 투자자 · 업종 · 뉴스 · 왜 움직였나 · 검색)는 누구에게나 같다 — 사람 토큰 **또는**
 * 게스트 토큰이면 읽는다. 사람이면 `req.user` 도 채운다(검색의 ★ 처럼 사람 칸을 더할 수 있는 경로). 둘 다 아니면 401.
 *
 * ★ · 포트폴리오 · 코치 · 북마크는 이걸 쓰지 않는다 — `authMiddleware`(사람만). 게스트 토큰은 받는 쪽(`aud`)이 달라 거기서 거절된다
 * (서버 S3b 2026-11-12 — 옛 HS 는 비밀이 달라서, 새 RS 는 aud 로. 판정 `shared/lib/tokenVerifier`).
 * 만료된 사람 토큰은 게스트로 내리지 않는다 — 화면이 갱신해야 ★ · 코치가 돌아온다.
 */
import { NextFunction, Request, Response } from "express";

import { tokenVerifier, type TokenVerifier } from "../lib/tokenVerifier";
import { bearerOf, rejectionOf } from "./authMiddleware";
import { UnauthorizedError } from "./httpErrors";

export type MarketReader = { kind: "user"; userId: string; email: string } | { kind: "guest" };

declare global {
  namespace Express {
    interface Request {
      reader?: MarketReader;
    }
  }
}

/** 검증기를 받는 판 — 시험이 고정 키로 만든다. 라우터는 아래 [marketReaderMiddleware] */
export const createMarketReaderMiddleware = (verifier: TokenVerifier) => (req: Request, _res: Response, next: NextFunction) => {
  const token = bearerOf(req);
  if (!token) return next(new UnauthorizedError("No token provided"));
  verifier
    .check(token)
    .then((check) => {
      if (check.kind === "person") {
        req.user = check.person;
        req.reader = { kind: "user", userId: check.person.userId, email: check.person.email };
        return next();
      }
      if (check.kind === "guest") {
        req.reader = { kind: "guest" };
        return next();
      }
      return next(rejectionOf(check));
    })
    .catch(next);
};

export const marketReaderMiddleware = createMarketReaderMiddleware(tokenVerifier);

/** 사람이면 그 사람, 게스트면 `null` — 사람 칸(★ · 보유)을 더할지 고르는 자리 */
export const readerUser = (req: Request): { userId: string; email: string } | null =>
  req.reader?.kind === "user" ? { userId: req.reader.userId, email: req.reader.email } : null;
