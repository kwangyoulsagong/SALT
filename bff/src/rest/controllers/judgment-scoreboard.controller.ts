import { Request, Response, NextFunction } from "express";
import { appJudgmentScoreboardService } from "../../services/app-judgment-scoreboard.service";

/**
 * 판정 성적표 (F010 슬라이스 3 · `BFF-REQ-039` FR-5). 화면을 떠나면 upstream 도 끊는다(`behavior-mirror.controller` 와 같은 규칙).
 */
export class AppJudgmentScoreboardController {
  scoreboard = async (req: Request, res: Response, next: NextFunction) => {
    const aborter = new AbortController();
    res.on("close", () => {
      if (!res.writableFinished) aborter.abort();
    });
    try {
      const data = await appJudgmentScoreboardService.get(req.token!, aborter.signal);
      return res.json({ success: true, data });
    } catch (error) {
      if (aborter.signal.aborted) return;
      next(error);
    }
  };
}

export const appJudgmentScoreboardController = new AppJudgmentScoreboardController();
