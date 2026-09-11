import { Router, Request, Response } from "express";

/**
 * **서버 자신의 상태**를 답하는 라우터만 여기 둔다 — 도메인이 없기 때문이다
 * (`ddd-shared.md` §5). 그 외 라우터가 생기면 그건 컨텍스트를 못 찾은 것이다.
 */
export const healthRouter: Router = Router();

healthRouter.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "salt-backend",
    timestamp: new Date().toISOString(),
  });
});
