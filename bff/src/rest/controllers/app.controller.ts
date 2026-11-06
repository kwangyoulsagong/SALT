import { NextFunction, Request, Response } from "express";
import { appHomeService } from "../../services/app-home.service";

export class AppController {
  async getHome(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await appHomeService.getHome(req.token!));
    } catch (error) {
      next(error);
    }
  }

  async arrangeHome(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await appHomeService.arrangeHome(req.token!, req.body?.order, req.body?.hidden));
    } catch (error) {
      next(error);
    }
  }
}

export const appController = new AppController();
