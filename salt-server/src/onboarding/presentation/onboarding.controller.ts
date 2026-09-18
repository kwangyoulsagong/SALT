import { NextFunction, Request, Response } from "express";

import { ResponseUtil } from "../../shared/presentation/ResponseUtil";
import type { OnboardingUseCases } from "../application/api";

export class OnboardingController {
  constructor(private readonly useCases: OnboardingUseCases) {}

  getStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.useCases.getOnboardingStatus.execute(
        req.user!.userId
      );

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
