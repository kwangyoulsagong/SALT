import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { ResponseUtil } from '../../utils/response.util';
import {
  updateProfileSchema,
  changePasswordSchema,
  queryPointTransactionsSchema,
  queryAchievementsSchema,
} from './user.dto';

export class UserController {
  private userService = new UserService();

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const result = await this.userService.getProfile(userId);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const data = updateProfileSchema.parse(req.body);
      const result = await this.userService.updateProfile(userId, data);

      return ResponseUtil.success(res, result, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const data = changePasswordSchema.parse(req.body);
      const result = await this.userService.changePassword(userId, data);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getPointTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const query = queryPointTransactionsSchema.parse(req.query);
      const result = await this.userService.getPointTransactions(userId, query);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getPointStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const result = await this.userService.getPointStats(userId);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getAchievements = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const query = queryAchievementsSchema.parse(req.query);
      const result = await this.userService.getAchievements(userId, query);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const result = await this.userService.getDashboardSummary(userId);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { password } = req.body;

      if (!password) {
        return ResponseUtil.error(res, 'Password is required', 400);
      }

      const result = await this.userService.deleteAccount(userId, password);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
