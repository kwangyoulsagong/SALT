import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Request, Response } from "express";

import { AppError } from "../../../utils/error.util";
import { assertChartPeriod } from "../chartPeriod.middleware";

/** 미들웨어가 `next` 에 넘긴 값 — 통과면 `undefined` */
const run = (period: unknown) => {
  let passed: unknown = "not-called";
  assertChartPeriod({ query: period === undefined ? {} : { period } } as unknown as Request, {} as Response, (err?: unknown) => {
    passed = err;
  });
  return passed;
};

describe("assertChartPeriod", () => {
  it("서버가 주는 세 주기(minute · day · week)와 값 없음은 통과한다", () => {
    for (const period of ["minute", "day", "week", undefined]) assert.equal(run(period), undefined, String(period));
  });

  it("서버에 없는 주기(month · 오타)는 고치지 않고 422 로 막는다", () => {
    for (const period of ["month", "miniute"]) {
      const err = run(period);
      assert.ok(err instanceof AppError, period);
      assert.equal(err.statusCode, 422);
      assert.equal(err.code, "MARKET_CHART_PERIOD_UNSUPPORTED");
    }
  });
});
