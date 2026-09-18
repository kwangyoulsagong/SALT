import { NextFunction, Request, Response } from "express";
import { appWatchlistService } from "../../services/app-watchlist.service";
import { AppError } from "../../utils/error.util";

/**
 * 관심 종목 화면 (`BFF-REQ-008`).
 *
 * 요청 파싱 · 서비스 호출 · 응답 변환만 한다. 조립은 서비스가 갖는다
 * (`rest-contract.md`). 서버 4xx 는 **원 status 와 body 를 보존**해서 올린다 —
 * 중복 추가(409)와 없는 항목(404)을 화면이 구분해야 한다.
 */
class AppWatchlistController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await appWatchlistService.list(req.token!);
      return res.json(result);
    } catch (error) {
      return next(toUpstreamError(error));
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
      return next(toUpstreamError(error));
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await appWatchlistService.remove(req.token!, req.params.id);
      return res.status(204).end();
    } catch (error) {
      return next(toUpstreamError(error));
    }
  };
}

/**
 * upstream 4xx 를 같은 status 의 `AppError` 로 옮긴다.
 *
 * 그대로 던지면 error middleware 가 `AppError` 가 아닌 것을 전부 500 으로 만들고,
 * "이미 관심 목록에 있다"가 "서버 오류"로 보인다 (`backend-integration.md` 실패 처리).
 */
const toUpstreamError = (error: unknown) => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (!status || status >= 500) return error;

  const message =
    (error as { response?: { data?: { message?: string } } }).response?.data
      ?.message ?? "Watchlist request failed";

  return new AppError(message, status);
};

export const appWatchlistController = new AppWatchlistController();
