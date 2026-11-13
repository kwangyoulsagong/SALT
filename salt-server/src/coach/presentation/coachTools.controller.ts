import { NextFunction, Request, Response } from "express";

import { ResponseUtil } from "../../shared/presentation/ResponseUtil";
import type { CoachUseCases } from "../application/api";
import { logger } from "../../shared/config/logger";
import {
  explanationQuerySchema,
  forecastQuerySchema,
  tradeCheckQuerySchema,
  profitPlanQuerySchema,
  signalPerformanceQuerySchema,
  tradePreflightSchema,
} from "./dto/coach.dto";

/**
 * 코치의 나머지 네 경로 — 행동 코치 · 익절 계획 · 주문 전 계산 · 성적표.
 *
 * ## 컨트롤러 하나에 넷을 둔 이유
 *
 * 각각 **핸들러가 하나뿐**이고 판단이 없다(검증 → 유스케이스 1회 → 응답).
 * 파일을 넷으로 나누면 같은 네 줄이 네 번 반복된다. 경로는 라우터가 나눈다.
 */
export class CoachToolsController {
  constructor(private readonly useCases: CoachUseCases) {}

  getBehaviorCoach = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.useCases.getBehaviorCoach.execute(
        req.user!.userId
      );
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  listProfitPlans = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = profitPlanQuerySchema.parse(req.query);

      const result = await this.useCases.listProfitPlans.execute(
        req.user!.userId,
        query
      );

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  checkTradePreflight = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const data = tradePreflightSchema.parse(req.body);

      const result = await this.useCases.checkTradePreflight.execute(
        req.user!.userId,
        data
      );

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  /** 생성 상태 · 남은 쿨다운. 입력이 없다. */
  getGenerationStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.useCases.getGenerationStatus.execute(
        req.user!.userId
      );

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  /** 코치 상세. 입력이 없다 — 대상은 토큰의 사용자다. */
  getCoachDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.useCases.getCoachDetail.execute(
        req.user!.userId
      );

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * 판단 성적표. `/api/coach/scoreboard` 와 `?groupBy=signalType` 이 **같은 표**를 준다 —
   * 하나는 리포트 화면의 경로이고 하나는 기존 경로의 하위 호환 확장이다.
   */
  getScoreboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.useCases.getJudgmentScoreboard.execute();

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getSignalPerformance = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const query = signalPerformanceQuerySchema.parse(req.query);

      // 응답 **모양이 다른 두 계약**이 한 경로에 있다. 무인자 호출이 옛 응답을 그대로
      // 받아야 해서(FR-15) 새 표를 여기에 덧붙일 수 없었다 — 쿼리로 갈라진다.
      if (query.groupBy) return this.getScoreboard(req, res, next);

      const result = await this.useCases.getSignalPerformance.execute(
        req.user!.userId,
        query
      );

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * 시나리오 — 모든 종목 · 지평 넷에 늘(과거 실제 결과 · 모델 확률은 소유자 + 시험을 넘은 칸만). F017 v4 `SRV-REQ-053` FR-10.
   */
  getScenario = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = forecastQuerySchema.parse(req.query);
      const result = await this.useCases.getSymbolScenario.execute(
        { userId: req.user!.userId, email: req.user!.email },
        query.symbol
      );
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  /** 한 장 패널 한 번 응답 — 칸마다 tier · status · 한 칸 실패가 패널을 비우지 않는다. F017 v4 `SRV-REQ-053` FR-13 */
  getPanel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = forecastQuerySchema.parse(req.query);
      const result = await this.useCases.getCoachPanel.execute(
        { userId: req.user!.userId, email: req.user!.email },
        query.symbol
      );
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * 해설 스트림(SSE) — `snapshot` · `sentence` · `done` · `fallback` · 하트비트 15초(`streaming-sse.md` §5). F017 v4 `SRV-REQ-053` FR-9.
   * 화면이 떠나면 이 구독만 뗀다 — 생성은 끝까지 가서 저장한다(다음 사람 몫)
   */
  streamExplanation = async (req: Request, res: Response, next: NextFunction) => {
    let query: ReturnType<typeof explanationQuerySchema.parse>;
    try {
      query = explanationQuerySchema.parse(req.query);
    } catch (error) {
      return next(error);
    }
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    const send = (event: string, data: unknown) => {
      if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    const aborter = new AbortController();
    const heartbeat = setInterval(() => !res.writableEnded && res.write(": ping\n\n"), 15_000);
    req.on("close", () => {
      clearInterval(heartbeat);
      aborter.abort();
    });
    try {
      await this.useCases.streamSymbolExplanation.execute(
        query.symbol,
        query.mode,
        {
          snapshot: (view) => send("snapshot", view),
          sentence: (sentence) => send("sentence", sentence),
          done: (view) => send("done", view),
          fallback: (view) => send("fallback", view),
        },
        aborter.signal
      );
    } catch (error) {
      // 헤더를 이미 보냈다 — 오류 미들웨어 대신 이벤트 한 줄(문장 원문 · 원인은 싣지 않는다)
      logger.warn(`해설 스트림 실패 — ${query.symbol} ${query.mode}: ${(error as Error).name}`);
      send("error", { code: "EXPLAIN_STREAM_FAILED" });
    } finally {
      clearInterval(heartbeat);
      if (!res.writableEnded) res.end();
    }
  };

  /**
   * 주요 사건(거시 일정) · 과거 반응 — 소유자만(아니면 404). F008 `SRV-REQ-037` FR-10.
   */
  getPositioning = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = forecastQuerySchema.parse(req.query);
      const result = await this.useCases.getSymbolPositioning.execute(
        { userId: req.user!.userId, email: req.user!.email },
        query.symbol
      );
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getTradeCheck = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = tradeCheckQuerySchema.parse(req.query);
      const result = await this.useCases.checkTradeOdds.execute(req.user!.userId, query);
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getEvents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = forecastQuerySchema.parse(req.query);
      const result = await this.useCases.getSymbolEvents.execute(
        { userId: req.user!.userId, email: req.user!.email },
        query.symbol
      );
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
