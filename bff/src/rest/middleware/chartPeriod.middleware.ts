import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/error.util";

/**
 * 차트 주기 유효값 (`BFF-REQ-007` FR-52).
 *
 * **서버가 실제로 주는 값과 같아야 한다.** REQ 초안은 `week`·`month` 까지 넷을 적었지만
 * 서버에 그 경로가 없다 — 여기에만 넣으면 BFF 는 통과시키고 서버가 422 를 준다.
 * 서버가 주기를 늘릴 때 이 목록도 같이 늘린다.
 */
export const CHART_PERIODS = ["minute", "day"] as const;

/**
 * 잘못된 `period` 를 **교정하지 않고 거부한다** (FR-50·FR-51).
 *
 * 프론트가 `miniute`(오타)를 보내고 있었다. BFF 가 그것을 `minute` 로 고쳐 주면 화면은
 * 정상 동작하고 **오타는 영원히 남는다.** 422 로 돌려보내면 고치는 쪽이 프론트가 된다.
 *
 * 값이 없으면 통과시킨다 — 기본값 판단은 서버의 몫이다.
 */
export const assertChartPeriod = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const period = req.query.period;
  if (period === undefined) return next();

  if (
    typeof period !== "string" ||
    !(CHART_PERIODS as readonly string[]).includes(period)
  ) {
    return next(
      new AppError(
        `Unsupported chart period: ${String(period)}`,
        422
      )
    );
  }

  return next();
};
