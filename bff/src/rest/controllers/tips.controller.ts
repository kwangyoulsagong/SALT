import { NextFunction, Request, Response } from "express";
import { appTipsService } from "../../services/app-tips.service";

/**
 * 금융 팁 (`BFF-REQ-049`). 요청 파싱 · 서비스 1회 호출 · 응답 변환만.
 * 공개 응답엔 공유 캐시 헤더 — 글은 사용자마다 같다(개인 데이터 0, FR-1). 개인 응답(for-me · 닫기)은 `no-store`.
 */
type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** 공개 글 캐시 — 1분 신선 · 10분 낡은 채 다시 확인. 유효기한 경계(자정)를 몇 분 늦게 반영하는 것은 감수한다 */
export const PUBLIC_TIPS_CACHE = "public, max-age=60, stale-while-revalidate=600";

const wrap =
  (cache: string, run: (req: Request) => Promise<unknown>): Handler =>
  async (req, res, next) => {
    try {
      const body = await run(req);
      res.set("Cache-Control", cache);
      return res.status(200).json(body);
    } catch (error) {
      return next(error);
    }
  };

export const tipsController = {
  list: wrap(PUBLIC_TIPS_CACHE, () => appTipsService.list()),
  detail: wrap(PUBLIC_TIPS_CACHE, (req) => appTipsService.detail(String(req.params.slug))),
  forMe: wrap("no-store", (req) => appTipsService.forMe(req.token!, String(req.query.context ?? ""))),
  dismiss: wrap("no-store", (req) => appTipsService.dismiss(req.token!, String(req.params.slug))),
  /** 세션은 있으면 쓴다(쿠키 → 헤더는 `cookieSessionMiddleware`) — 로그인 없이도 풀 수 있는 공개 글이라 `authMiddleware` 를 걸지 않는다 */
  answerQuiz: wrap("no-store", (req) => appTipsService.answerQuiz(bearer(req), String(req.params.slug), Number(req.body?.choice))),
  quizCards: wrap("no-store", (req) => appTipsService.quizCards(req.token!)),
};

const bearer = (req: Request): string | undefined => {
  const header = req.headers.authorization;
  return header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
};
