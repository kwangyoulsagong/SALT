import { NextFunction, Request, Response } from "express";

import { AppError } from "../../utils/error.util";

/**
 * 인프로세스 요청 제한.
 *
 * ## 왜 BFF 에도 있어야 하나
 *
 * 서버(`salt-server`)에 같은 것이 있다. 그런데 **BFF 가 인증 없이 여는 경로**(초대 코드
 * 확인·수락)는 서버에 닿기 전에 BFF 의 커넥션과 upstream 호출을 먼저 쓴다. 서버에서만
 * 막으면 BFF 는 그 요청을 전부 중계하고 나서 429 를 받아 온다 — 막는 지점이 비용이
 * 드는 지점보다 뒤에 있다.
 *
 * 라이브러리를 넣지 않은 이유는 서버 쪽 구현과 같다: 단일 프로세스·사용자 ≤10명이라
 * 분산 저장소가 필요 없고, 필요한 것은 "무인증 경로가 무한정 불리지 않게" 하나다.
 *
 * > 프로세스가 둘이 되면 창마다 프로세스 수만큼 허용하게 된다. 그때 Redis 로 바꾼다.
 */
export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

interface Window {
  count: number;
  resetAt: number;
}

/**
 * 클라이언트 식별자.
 *
 * 토큰이 있으면 토큰을, 없으면 IP 를 쓴다. 무인증 경로는 언제나 IP 다 —
 * 프록시 뒤에 서면 `trust proxy` 설정이 선행이고, 그 전에는 같은 IP 로 묶인다.
 */
const clientKeyOf = (req: Request): string => req.token ?? req.ip ?? "unknown";

export const rateLimit = ({ windowMs, max }: RateLimitOptions) => {
  const windows = new Map<string, Window>();

  return (req: Request, _res: Response, next: NextFunction) => {
    const key = clientKeyOf(req);
    const now = Date.now();
    const current = windows.get(key);

    if (!current || current.resetAt <= now) {
      windows.set(key, { count: 1, resetAt: now + windowMs });
      // 지난 창은 그때 지운다 — 창이 짧아 맵이 무한정 커지지 않는다.
      for (const [otherKey, window] of windows) {
        if (window.resetAt <= now) windows.delete(otherKey);
      }
      return next();
    }

    if (current.count >= max) {
      return next(new AppError("Too many requests", 429));
    }

    current.count += 1;
    return next();
  };
};
