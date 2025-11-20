import { Request, Response, NextFunction } from 'express';
import { DrawingService } from './drawing.service';
import { ResponseUtil } from '../../utils/response.util';
import {
  createDrawingSchema,
  updateDrawingSchema,
  queryDrawingsSchema,
} from './drawing.dto';

export class DrawingController {
  private drawingService = new DrawingService();

  createDrawing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const data = createDrawingSchema.parse(req.body);
      const result = await this.drawingService.createDrawing(userId, data);

      return ResponseUtil.created(res, result, 'Drawing created successfully');
    } catch (error) {
      next(error);
    }
  };

  getMyDrawings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const query = queryDrawingsSchema.parse(req.query);
      const result = await this.drawingService.getMyDrawings(userId, query);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getPublicDrawings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = queryDrawingsSchema.parse(req.query);
      const result = await this.drawingService.getPublicDrawings(query);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getDrawingById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const result = await this.drawingService.getDrawingById(id, userId);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  updateDrawing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const data = updateDrawingSchema.parse(req.body);
      const result = await this.drawingService.updateDrawing(userId, id, data);

      return ResponseUtil.success(res, result, 'Drawing updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteDrawing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const result = await this.drawingService.deleteDrawing(userId, id);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  toggleLike = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.drawingService.toggleLike(id);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
