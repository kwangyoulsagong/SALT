import { NextFunction, Request, Response } from "express";

import {
  appOnboardingService,
  InviteRejectedError,
} from "../../services/app-onboarding.service";
import { AppError } from "../../utils/error.util";

/**
 * 온보딩 (`BFF-REQ-008`).
 *
 * 요청 파싱 · 서비스 1회 호출 · 응답 변환만 한다. 초대 판정은 서버의 일이고
 * **문구 생성은 프론트의 일**이다 — 여기서 나가는 것은 `reasonCode` 뿐이다.
 */
class AppOnboardingController {
  checkInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const code = req.query.code;
      if (typeof code !== "string" || code.trim() === "") {
        throw new AppError("code is required", 400);
      }

      return res.json(await appOnboardingService.checkInvite(code.trim()));
    } catch (error) {
      return next(error);
    }
  };

  acceptInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, email, nickname, password } = req.body ?? {};

      if (!code || !email || !nickname || !password) {
        throw new AppError("code, email, nickname, password are required", 400);
      }

      const result = await appOnboardingService.acceptInvite({
        code,
        email,
        nickname,
        password,
      });

      return res.status(201).json(result);
    } catch (error) {
      // 초대 거절은 본문 모양이 다르다 — 화면이 `reasonCode` 로 분기한다.
      if (error instanceof InviteRejectedError) {
        return res
          .status(error.statusCode)
          .json({ reasonCode: error.reasonCode });
      }
      return next(error);
    }
  };

  status = async (req: Request, res: Response, next: NextFunction) => {
    try {
      return res.json(await appOnboardingService.status(req.token!));
    } catch (error) {
      return next(error);
    }
  };
}

export const appOnboardingController = new AppOnboardingController();
