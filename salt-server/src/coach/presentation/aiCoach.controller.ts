import { NextFunction, Request, Response } from "express";

import { ResponseUtil } from "../../shared/presentation/ResponseUtil";
import type { CoachUseCases } from "../application/api";
import {
  coachFeedbackSchema,
  explainCoachSchema,
  generateCoachSchema,
  getCoachQuerySchema,
  updateCoachProfileSchema,
} from "./dto/coach.dto";

/** 프록시 · 로드밸런서가 유휴 연결을 끊지 않게(`bff/.claude/rules/streaming-sse.md` §5) */
const SSE_HEARTBEAT_MS = 15_000;

/**
 * `/api/ai-coach` 의 컨트롤러.
 *
 * ## `console.error` 를 남기지 않았다
 *
 * 원문은 `generate` 와 `explain` 에서 에러를 찍고 다시 `next(error)` 로 넘겼다.
 * 그러면 같은 에러가 두 번 기록되고, **해설 실패 로그에는 모델 응답이 섞여 있었다**
 * (`ddd-infrastructure.md` §6 이 금지하는 원문 로깅). 매핑과 로깅은
 * `shared/presentation` 의 미들웨어 한 곳이 한다 (`ddd-presentation.md` §4).
 */
export class AICoachController {
  constructor(private readonly useCases: CoachUseCases) {}

  getLatest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = getCoachQuerySchema.parse(req.query);

      const result = await this.useCases.getRecommendation.execute(
        req.user!.userId,
        query
      );

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  generate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = generateCoachSchema.parse(req.body ?? {});

      const result = await this.useCases.requestGeneration.execute(
        req.user!.userId,
        data
      );

      // 쿨다운은 유스케이스의 **결과**다(에러가 아니다). 429 로 옮기는 것만 여기서 한다.
      // 본문 모양은 전역 에러 미들웨어(`success` · `code` · `message`)에 맞춘다
      if (!result.accepted) {
        res.set("Retry-After", String(result.retryAfterSeconds));
        return res.status(429).json({
          success: false,
          code: "COACH_REGENERATE_COOLDOWN",
          message: "Coach regeneration is cooling down",
          retryAfterSeconds: result.retryAfterSeconds,
        });
      }

      return ResponseUtil.success(
        res,
        { requestId: result.requestId, requestedAt: result.requestedAt },
        "AI Coach Generation Accepted",
        202
      );
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await this.useCases.getProfile.execute(req.user!.userId);
      return ResponseUtil.success(res, profile);
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = updateCoachProfileSchema.parse(req.body ?? {});

      const profile = await this.useCases.updateProfile.execute(
        req.user!.userId,
        data
      );

      return ResponseUtil.success(res, profile);
    } catch (error) {
      next(error);
    }
  };

  feedback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = coachFeedbackSchema.parse(req.body ?? {});

      const result = await this.useCases.recordFeedback.execute(
        req.user!.userId,
        data
      );

      return ResponseUtil.created(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * 요청한 쪽이 끊으면 LLM 호출도 끊는다. `req` 가 아니라 `res` 의 `close` 를 본다 —
   * `req` 의 `close` 는 본문을 다 읽은 순간에도 온다. 응답을 다 쓴 뒤의 `close` 는 무시한다.
   */
  explain = async (req: Request, res: Response, next: NextFunction) => {
    const controller = new AbortController();
    const onClose = () => {
      if (!res.writableEnded) controller.abort();
    };
    res.on("close", onClose);

    try {
      const data = explainCoachSchema.parse(req.body ?? {});
      const result = await this.useCases.explainDecision.execute(
        req.user!.userId,
        data,
        controller.signal
      );
      if (controller.signal.aborted) return;

      return ResponseUtil.success(res, result, "AI Coach Explanation Success");
    } catch (error) {
      // 끊긴 요청에는 응답할 곳이 없다 — 에러로 올리면 로그만 쌓인다
      if (controller.signal.aborted) return;
      next(error);
    } finally {
      res.off("close", onClose);
    }
  };

  /**
   * 해설 스트림 (SSE, F008 `SRV-REQ-037` FR-8).
   *
   * - 본문 검증은 스트림을 열기 **전에** 한다 — 400 은 평범한 JSON 오류로 나간다
   * - 연결이 끊기면 LLM 호출까지 끊는다(`streaming-sse.md` §4). 15초마다 `ping`(§5)
   * - 스트림을 연 뒤의 실패는 `message.error` 한 건 — 화면은 이미 받은 템플릿 문장을 그대로 둔다
   */
  explainStream = async (req: Request, res: Response, next: NextFunction) => {
    let data;
    try {
      data = explainCoachSchema.parse(req.body ?? {});
    } catch (error) {
      return next(error);
    }

    const controller = new AbortController();
    res.on("close", () => {
      if (!res.writableEnded) controller.abort();
    });

    res.status(200).set({
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();

    const write = (event: string, payload: unknown) => {
      if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
    };
    const heartbeat = setInterval(() => write("ping", {}), SSE_HEARTBEAT_MS);

    try {
      await this.useCases.explainDecision.stream(
        req.user!.userId,
        data,
        ({ event, data: payload }) => write(event, payload),
        controller.signal
      );
    } catch {
      // 원인은 싣지 않는다 — 모델 원문이 섞일 수 있다(`ddd-infrastructure.md` §6)
      if (!controller.signal.aborted) write("message.error", { code: "EXPLAIN_FAILED", fallback: "rule" });
    } finally {
      clearInterval(heartbeat);
      if (!res.writableEnded) res.end();
    }
  };
}
