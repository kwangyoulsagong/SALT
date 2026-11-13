import { Request, Response, NextFunction } from "express";
import { appPrivacyService } from "../../services/app-privacy.service";

/** 개인정보 — 저장하는 것 · AI 로 가는 것(`BFF-REQ-046` FR-9) · 도메인 사용 계측(FR-10). 조립은 서비스 */
class PrivacyController {
  async privacy(req: Request, res: Response, next: NextFunction) {
    try {
      res.set("Cache-Control", "no-store").json(await appPrivacyService.privacy(req.token!));
    } catch (error) {
      next(error);
    }
  }

  /** 응답 본문 없음 — 화면은 결과를 기다리지 않는다(보내기 실패가 화면에 영향 0) */
  async usage(req: Request, res: Response, next: NextFunction) {
    try {
      await appPrivacyService.countUsage(req.token!, req.body?.domain, req.body?.kind);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
}

export const privacyController = new PrivacyController();
