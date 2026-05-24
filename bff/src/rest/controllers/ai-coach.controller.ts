import { Request, Response, NextFunction } from "express";
import { appAICoachService } from "../../services/app-ai-coach.service";

export class AppAICoachController {
  preview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await appAICoachService.getPreview(req.token!, req.query);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  detail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await appAICoachService.getDetail(req.token!, req.query);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await appAICoachService.getProfile(req.token!);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await appAICoachService.updateProfile(req.token!, req.body);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  feedback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await appAICoachService.feedback(req.token!, req.body);
      return res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

export const appAICoachController = new AppAICoachController();
