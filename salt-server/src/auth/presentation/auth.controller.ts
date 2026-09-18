import { NextFunction, Request, Response } from "express";

import { ResponseUtil } from "../../shared/presentation/ResponseUtil";
import type { AuthUseCases } from "../application/api";
import {
  acceptInviteSchema,
  inviteCheckSchema,
  loginSchema,
  refreshTokenSchema,
} from "./dto/auth.dto";

/**
 * `auth` 의 HTTP 노출면.
 *
 * `register` 핸들러가 없다. 경로도 함께 사라졌으므로 `POST /api/auth/register` 는 404 다
 * (`SRV-REQ-009` FR-5).
 */
export class AuthController {
  constructor(private readonly useCases: AuthUseCases) {}

  acceptInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = acceptInviteSchema.parse(req.body);
      const result = await this.useCases.acceptInviteCode.execute({
        ...data,
        clientKey: req.ip,
      });

      return ResponseUtil.created(res, result, "User registered successfully");
    } catch (error) {
      next(error);
    }
  };

  checkInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = inviteCheckSchema.parse(req.query);
      const result = await this.useCases.checkInviteCode.execute(code);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = loginSchema.parse(req.body);
      const result = await this.useCases.login.execute(data);

      return ResponseUtil.success(res, result, "Login successful");
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = refreshTokenSchema.parse(req.body);
      const result = this.useCases.refreshSession.execute(refreshToken);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.useCases.getAccount.execute(req.user!.userId);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
