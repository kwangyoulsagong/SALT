import { Request, Response, NextFunction } from "express";
import { appTargetWeightService } from "../../services/app-target-weight.service";

/**
 * 목표 비중 안내 (F010 슬라이스 5 · `BFF-REQ-041`). 화면을 떠나면 upstream 도 끊는다(`judgment-scoreboard.controller` 와 같은 규칙).
 */
export class AppTargetWeightController {
  targetWeights = async (req: Request, res: Response, next: NextFunction) => {
    const aborter = new AbortController();
    res.on("close", () => {
      if (!res.writableFinished) aborter.abort();
    });
    try {
      const data = await appTargetWeightService.get(req.token!, aborter.signal);
      return res.json({ success: true, data });
    } catch (error) {
      if (aborter.signal.aborted) return;
      next(error);
    }
  };
}

export const appTargetWeightController = new AppTargetWeightController();
