import { Request, Response, NextFunction } from "express";
import { appCoachReportService } from "../../services/app-coach-report.service";

export class AppCoachController {
  report = async (req: Request, res: Response, next: NextFunction) => {
    // 화면을 떠나면 upstream 도 끊는다 (`detail` 과 같은 규칙)
    const aborter = new AbortController();
    res.on("close", () => {
      if (!res.writableFinished) aborter.abort();
    });

    try {
      const data = await appCoachReportService.getReport(
        req.token!,
        aborter.signal,
      );
      return res.json({ success: true, data });
    } catch (error) {
      if (aborter.signal.aborted) return;
      next(error);
    }
  };

  generationStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await appCoachReportService.getGenerationStatus(req.token!);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

export const appCoachController = new AppCoachController();
