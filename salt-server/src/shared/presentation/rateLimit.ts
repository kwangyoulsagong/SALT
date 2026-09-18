import { NextFunction, Request, Response } from "express";

import { TooManyRequestsError } from "./httpErrors";

/**
 * 인프로세스 요청 제한.
 *
 * ## 왜 라이브러리를 넣지 않았나
 *
 * 이 서버는 **단일 프로세스 · 사용자 ≤10명**이다(`performance-server.md` §0).
 * 분산 저장소도 프로세스 간 공유도 필요 없고, 필요한 것은 "인증 없이 열린 경로가
 * 무한정 불리지 않게 하는 것" 하나다. 의존성을 하나 늘리는 것보다 30줄이 싸다.
 *
 * > 프로세스가 둘이 되면 이 구현은 **창마다 프로세스 수만큼** 허용하게 된다.
 * > 그때 Redis 기반으로 바꾼다 — 그 전에는 이 한계가 실제 위험이 아니다.
 *
 * ## 고정 창(fixed window)이다
 *
 * 창 경계에서 최대 2배가 몰릴 수 있다. 목적이 **비용이 드는 외부 호출**(LLM)을
 * 무한정 부르지 못하게 막는 것이라 그 정도 오차는 받아들인다.
 */

export interface RateLimitOptions {
  /** 창 길이. */
  windowMs: number;
  /** 창 하나에서 한 클라이언트가 보낼 수 있는 요청 수. */
  max: number;
}

interface Window {
  count: number;
  resetAt: number;
}

const clientKeyOf = (req: Request): string =>
  req.user?.userId ?? req.ip ?? "unknown";

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
      return next(new TooManyRequestsError());
    }

    current.count += 1;
    return next();
  };
};
