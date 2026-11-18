import { NextFunction, Request, Response } from "express";
import { appAlertsService } from "../../services/app-alerts.service";

/** 알림 · 알림 설정(`BFF-REQ-046` FR-8 · `SRV-REQ-048` FR-5). 요청 파싱 · 서비스 1회 호출 · 응답 변환만. 개인 응답이라 `no-store` */
export class AppAlertsController {
  async getAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      // 쪽 번호는 1 이상 정수만 — 틀리면 1(목록 화면이 오류 대신 첫 쪽을 그린다)
      const raw = Number(req.query.page ?? 1);
      const page = Number.isInteger(raw) && raw >= 1 ? raw : 1;
      res.set("Cache-Control", "no-store").json(await appAlertsService.getAlerts(req.token!, page));
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      res.set("Cache-Control", "no-store").json(await appAlertsService.getUnreadCount(req.token!));
    } catch (error) {
      next(error);
    }
  }

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      await appAlertsService.markRead(req.token!, String(req.params.id));
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      await appAlertsService.markAllRead(req.token!);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  async getPrefs(req: Request, res: Response, next: NextFunction) {
    try {
      res.set("Cache-Control", "no-store").json(await appAlertsService.getPrefs(req.token!));
    } catch (error) {
      next(error);
    }
  }

  async setPref(req: Request, res: Response, next: NextFunction) {
    try {
      res.set("Cache-Control", "no-store").json(await appAlertsService.setPref(req.token!, String(req.params.domain), req.body?.enabled));
    } catch (error) {
      next(error);
    }
  }
}

export const appAlertsController = new AppAlertsController();
