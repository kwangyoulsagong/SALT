import { NextFunction, Request, Response } from "express";
import { ResponseUtil } from "../../utils/response.util";
import { PlaybookTriggerService } from "./playbook-trigger.service";

export class PlaybookTriggerController {
  private triggerService = new PlaybookTriggerService();

  /**
   * 트리거 목록 조회
   */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const status = req.query.status as string | undefined;

      const triggers = await this.triggerService.getUserTriggers(
        userId,
        status,
      );

      return ResponseUtil.success(res, triggers);
    } catch (error) {
      next(error);
    }
  };

  /**
   * 트리거 해결 처리
   */
  resolve = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const triggerId = req.params.id;

      const result = await this.triggerService.resolveTrigger(
        userId,
        triggerId,
      );

      return ResponseUtil.success(res, result, "Trigger resolved");
    } catch (error) {
      next(error);
    }
  };
}
