import { NextFunction, Request, Response } from "express";
import { AIInvestmentCoachService } from "../ai-investment-coach.service";
import { ResponseUtil } from "../../../utils/response.util";
import prisma from "../../../config/database";

export class AIInvestmentCoachController {
  private aiInvestmentCoachService = new AIInvestmentCoachService();

  generate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      const coach = await this.aiInvestmentCoachService.generateCoach(userId);

      return ResponseUtil.success(res, coach, "AI Coach Generation Success");
    } catch (error) {
      console.error("AI Coach Error:", error);
      next(error);
    }
  };

  getLatest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      const latestCoach = await prisma.investmentInsight.findFirst({
        where: {
          userId,
          type: "ai_coach",
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return ResponseUtil.success(res, latestCoach);
    } catch (error) {
      next(error);
    }
  };
}
