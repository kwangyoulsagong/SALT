import { NextFunction, Request, Response } from "express";
import { AIInvestmentCoachService } from "../ai-investment-coach.service";
import { ResponseUtil } from "../../../utils/response.util";
import {
  generateCoachSchema,
  getCoachQuerySchema,
  updateCoachProfileSchema,
  coachFeedbackSchema,
} from "./ai-coach.dto";

export class AIInvestmentCoachController {
  private aiInvestmentCoachService = new AIInvestmentCoachService();

  generate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const data = generateCoachSchema.parse(req.body ?? {});

      const coach = await this.aiInvestmentCoachService.generateCoach(
        userId,
        data,
      );

      return ResponseUtil.success(res, coach, "AI Coach Generation Success");
    } catch (error) {
      console.error("AI Coach Error:", error);
      next(error);
    }
  };

  getLatest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const query = getCoachQuerySchema.parse(req.query);

      const latestCoach = await this.aiInvestmentCoachService.getCoach(
        userId,
        query,
      );

      return ResponseUtil.success(res, latestCoach);
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const profile = await this.aiInvestmentCoachService.getProfile(userId);
      return ResponseUtil.success(res, profile);
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const data = updateCoachProfileSchema.parse(req.body ?? {});
      const profile = await this.aiInvestmentCoachService.updateProfile(
        userId,
        data,
      );
      return ResponseUtil.success(res, profile);
    } catch (error) {
      next(error);
    }
  };

  feedback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const data = coachFeedbackSchema.parse(req.body ?? {});
      const result = await this.aiInvestmentCoachService.recordFeedback(
        userId,
        data,
      );
      return ResponseUtil.created(res, result);
    } catch (error) {
      next(error);
    }
  };
}
