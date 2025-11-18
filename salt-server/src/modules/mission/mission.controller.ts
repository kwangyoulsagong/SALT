import { Request, Response, NextFunction } from 'express';
import { MissionService } from './mission.service';
import { ResponseUtil } from '../../utils/response.util';
import {
  createMissionSchema,
  updateMissionSchema,
  queryMissionsSchema,
  queryUserMissionsSchema,
} from './mission.dto';

export class MissionController {
  private missionService = new MissionService();

  // 관리자용
  createMission = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createMissionSchema.parse(req.body);
      const result = await this.missionService.createMission(data);

      return ResponseUtil.created(res, result, 'Mission created successfully');
    } catch (error) {
      next(error);
    }
  };

  updateMission = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data = updateMissionSchema.parse(req.body);
      const result = await this.missionService.updateMission(id, data);

      return ResponseUtil.success(res, result, 'Mission updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteMission = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.missionService.deleteMission(id);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  // 사용자용
  getMissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = queryMissionsSchema.parse(req.query);
      const result = await this.missionService.getMissions(query);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getTodayMissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const result = await this.missionService.getTodayMissions(userId);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  startMission = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const result = await this.missionService.startMission(userId, id);

      return ResponseUtil.created(res, result, 'Mission started successfully');
    } catch (error) {
      next(error);
    }
  };

  completeMission = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { progressId } = req.params;
      const result = await this.missionService.completeMission(userId, progressId);

      return ResponseUtil.success(res, result, 'Mission completed successfully');
    } catch (error) {
      next(error);
    }
  };

  getUserMissionHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const query = queryUserMissionsSchema.parse(req.query);
      const result = await this.missionService.getUserMissionHistory(userId, query);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getUserMissionStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const result = await this.missionService.getUserMissionStats(userId);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
