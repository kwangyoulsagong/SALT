import { NextFunction, Request, Response } from "express";
import { PlaybookService } from "./playbook.service";
import { ResponseUtil } from "../../utils/response.util";

export class PlaybookController {
  private playbookService = new PlaybookService();

  /**
   * 전략 생성
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      const result = await this.playbookService.createPlaybook(
        userId,
        req.body,
      );

      return ResponseUtil.success(res, result, "Playbook created");
    } catch (error) {
      next(error);
    }
  };

  /**
   * 전략 목록 조회
   */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      const playbooks = await this.playbookService.getPlaybooks(userId);

      return ResponseUtil.success(res, playbooks);
    } catch (error) {
      next(error);
    }
  };

  /**
   * 전략 삭제
   */
  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const playbookId = req.params.id;

      const result = await this.playbookService.deletePlaybook(
        userId,
        playbookId,
      );

      return ResponseUtil.success(res, result, "Playbook deleted");
    } catch (error) {
      next(error);
    }
  };
}
