import { Request, Response, NextFunction } from 'express';
import { GoalsService } from './goals.service';
import { ResponseUtil } from '../../utils/response.util';
import {
  createGoalSchema,
  updateGoalSchema,
  addSavingSchema,
  queryGoalsSchema,
} from './goals.dto';

export class GoalsController {
  private goalsService = new GoalsService();

  createGoal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const data = createGoalSchema.parse(req.body);
      const result = await this.goalsService.createGoal(userId, data);

      return ResponseUtil.created(res, result, 'Goal created successfully');
    } catch (error) {
      next(error);
    }
  };

  getGoals = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const query = queryGoalsSchema.parse(req.query);
      const result = await this.goalsService.getGoals(userId, query);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getGoalById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const result = await this.goalsService.getGoalById(userId, id);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  updateGoal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const data = updateGoalSchema.parse(req.body);
      const result = await this.goalsService.updateGoal(userId, id, data);

      return ResponseUtil.success(res, result, 'Goal updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteGoal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const result = await this.goalsService.deleteGoal(userId, id);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  addSaving = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const data = addSavingSchema.parse(req.body);
      const result = await this.goalsService.addSaving(userId, id, data);

      return ResponseUtil.created(res, result, 'Saving added successfully');
    } catch (error) {
      next(error);
    }
  };

  getGoalProgress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const result = await this.goalsService.getGoalProgress(userId, id);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getStatistics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const result = await this.goalsService.getGoalStatistics(userId);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
