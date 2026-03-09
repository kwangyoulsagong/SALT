import { Response } from "express";
import { Request } from "express";
import { appFeedService } from "../../services/app-feed.service";
export class AppFeedController {
  async getFeed(req: Request, res: Response) {
    try {
      const token = req.token!;

      const result = await appFeedService.getFeed(token);

      res.json(result);
    } catch (error) {
      console.log("Feed error:", error);
      res.status(500).json({
        message: "Failed to fetch feed",
      });
    }
  }
}

export const appFeedController = new AppFeedController();
