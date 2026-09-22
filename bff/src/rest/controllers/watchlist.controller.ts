import { NextFunction, Request, Response } from "express";
import { appWatchlistService } from "../../services/app-watchlist.service";
import { AppError } from "../../utils/error.util";

/**
 * 관심 종목 화면 (`BFF-REQ-008`).
 *
 * 요청 파싱 · 서비스 호출 · 응답 변환만 한다. 조립은 서비스가 갖는다
 * (`rest-contract.md`). 서버 4xx 는 error middleware 가 **원 status 와 `code` 를 보존**한다 —
 * 중복 추가(409)와 없는 항목(404)을 화면이 구분해야 한다.
 */
class AppWatchlistController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await appWatchlistService.list(req.token!);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  };

  add = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { assetType, symbol, name } = req.body ?? {};

      if (!assetType || !symbol || !name) {
        throw new AppError("assetType, symbol, name are required", 400);
      }

      await appWatchlistService.add(req.token!, { assetType, symbol, name });
      return res.status(201).end();
    } catch (error) {
      return next(error);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await appWatchlistService.remove(req.token!, req.params.id);
      return res.status(204).end();
    } catch (error) {
      return next(error);
    }
  };
}

export const appWatchlistController = new AppWatchlistController();
