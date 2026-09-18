import { Router } from "express";

import { authMiddleware } from "../../shared/presentation/authMiddleware";
import type { OnboardingUseCases } from "../application/api";
import { OnboardingController } from "./onboarding.controller";

export const createOnboardingRouter = (useCases: OnboardingUseCases): Router => {
  const router = Router();
  const controller = new OnboardingController(useCases);

  /**
   * @swagger
   * /api/onboarding/status:
   *   get:
   *     summary: 온보딩 3스텝 진행 상태
   *     tags: [Onboarding]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: |
   *           `{ complete, nextStep, steps }`. `steps` 는 `invite`·`link_account`·
   *           `set_plan` 순서이고 `nextStep` 은 첫 미완료 단계다.
   */
  router.get("/status", authMiddleware, controller.getStatus);

  return router;
};
