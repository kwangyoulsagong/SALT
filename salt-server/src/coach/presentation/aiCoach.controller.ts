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

      const result = await this.useCases.generateRecommendation.execute(
        req.user!.userId,
        data
      );

      return ResponseUtil.success(res, result, "AI Coach Generation Success");
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

  explain = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = explainCoachSchema.parse(req.body ?? {});
      const result = await this.useCases.explainDecision.execute(data);

      return ResponseUtil.success(res, result, "AI Coach Explanation Success");
    } catch (error) {
      next(error);
    }
  };
}
