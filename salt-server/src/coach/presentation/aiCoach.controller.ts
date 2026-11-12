import { NextFunction, Request, Response } from "express";

import { ResponseUtil } from "../../shared/presentation/ResponseUtil";
import type { CoachUseCases } from "../application/api";
import { MoveCardNotFoundError } from "../domain";
import {
  coachFeedbackSchema,
  explanationQuerySchema,
  moveSummaryQuerySchema,
  generateCoachSchema,
  getCoachQuerySchema,
  updateCoachProfileSchema,
} from "./dto/coach.dto";

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
        query,
        req.user!.email
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

  /** 해설 — 저장값 읽기(4단). LLM 을 부르지 않으니 끊김 처리 · 요청 한도가 없다(F017 v2 단계 3) */
  explanation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { symbol, mode } = explanationQuerySchema.parse(req.query);
      const result = await this.useCases.getSymbolExplanation.execute(symbol, mode);
      return ResponseUtil.success(res, result, "AI Coach Explanation Success");
    } catch (error) {
      next(error);
    }
  };

  /** 오늘 등락 한 줄(③) — 저장값과 지금 카드 대조만, LLM 0(F016 단계 D). 시장 경로와 같은 읽는 사람(게스트 포함) */
  moveSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { asset, symbol } = moveSummaryQuerySchema.parse(req.query);
      const result = await this.useCases.getMoveSummary.execute(asset, symbol);
      if (!result) throw new MoveCardNotFoundError(symbol);
      return ResponseUtil.success(res, result, "Move Summary Success");
    } catch (error) {
      next(error);
    }
  };
}
