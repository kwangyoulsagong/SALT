import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";
import { ResponseUtil } from "../../utils/response.util";
import { registerSchema, loginSchema, refreshTokenSchema } from "./auth.dto";

export class AuthController {
  private authService = new AuthService();

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = registerSchema.parse(req.body);
      const result = await this.authService.register(data);

      return ResponseUtil.created(res, result, "User registered successfully");
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = loginSchema.parse(req.body);
      const result = await this.authService.login(data);

      return ResponseUtil.success(res, result, "Login successful");
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = refreshTokenSchema.parse(req.body);
      const result = await this.authService.refreshToken(refreshToken);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const result = await this.authService.getMe(userId);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
