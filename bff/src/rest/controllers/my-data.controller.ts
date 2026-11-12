import { Request, Response, NextFunction } from "express";
import { appMyDataService } from "../../services/app-my-data.service";

/** 내 데이터 — 내보내기 zip · 계정 삭제(`BFF-REQ-046` FR-7). 조립 · 순서는 서비스 */
class MyDataController {
  async exportData(req: Request, res: Response, next: NextFunction) {
    try {
      const { fileName, body } = await appMyDataService.exportZip(req.token!);
      res
        .set("Cache-Control", "no-store")
        .set("Content-Type", "application/zip")
        .set("Content-Disposition", `attachment; filename="${fileName}"`)
        .send(body);
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      res.set("Cache-Control", "no-store").json(await appMyDataService.deleteAccount(req.token!, req.body?.password));
    } catch (error) {
      next(error);
    }
  }
}

export const myDataController = new MyDataController();
