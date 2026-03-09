import { Request, Response } from "express";
import { appHomeService } from "../../services/app-home.service";

export class AppController {
  async getHome(req: Request, res: Response) {
    try {
      const token = req.token!;

      const result = await appHomeService.getHome(token);

      res.json(result);
    } catch (error) {
      console.error("App home error:", error);
      res.status(500).json({
        message: "Failed to fetch home data",
      });
    }
  }
}

export const appController = new AppController();
