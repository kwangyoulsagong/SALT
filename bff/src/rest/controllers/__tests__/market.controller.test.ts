import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import type { Request, Response } from "express";

import { marketOverviewService } from "../../../services/market-overview.service";
import { marketController } from "../market.controller";

const fakeRes = () => {
  const out: { status: number; body: unknown } = { status: 200, body: undefined };
  const res = {
    status(code: number) {
      out.status = code;
      return this;
    },
    json(body: unknown) {
      out.body = body;
      return this;
    },
  } as unknown as Response;
  return { res, out };
};

const req = (query: Record<string, string>) => ({ query }) as unknown as Request;

describe("MarketController.overview", () => {
  afterEach(() => mock.restoreAll());

  it("서버 응답을 바꾸지 않고 넘긴다 — 필드 추가(periodChange)도 그대로", async () => {
    const body = {
      items: [{ symbol: "BTC", currentPrice: 1, change24h: 2, periodChange: 3 }],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    };
    mock.method(marketOverviewService, "getOverview", async () => body);
    const { res, out } = fakeRes();

    await marketController.overview(req({ period: "7d" }), res);

    assert.equal(out.status, 200);
    assert.deepEqual(out.body, body);
  });

  it("서버의 422 를 500 으로 바꾸지 않는다", async () => {
    const upstream = {
      success: false,
      code: "MARKET_OVERVIEW_PERIOD_UNSUPPORTED",
      message: "Unsupported market period: 2w",
    };
    mock.method(marketOverviewService, "getOverview", async () => {
      throw Object.assign(new Error("422"), { response: { status: 422, data: upstream } });
    });
    const { res, out } = fakeRes();

    await marketController.overview(req({ period: "2w" }), res);

    assert.equal(out.status, 422);
    assert.deepEqual(out.body, upstream);
  });

  it("서버가 없거나 5xx 면 500 이고 서버 원문을 싣지 않는다", async () => {
    mock.method(marketOverviewService, "getOverview", async () => {
      throw Object.assign(new Error("ECONNREFUSED"), { code: "ECONNREFUSED" });
    });
    mock.method(console, "error", () => undefined);
    const { res, out } = fakeRes();

    await marketController.overview(req({}), res);

    assert.equal(out.status, 500);
    assert.deepEqual(out.body, { message: "Failed to fetch market overview" });
  });
});
