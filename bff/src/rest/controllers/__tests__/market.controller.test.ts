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

    await marketController.overview(req({ period: "7d" }), res, () => undefined);

    assert.equal(out.status, 200);
    assert.deepEqual(out.body, body);
  });

  it("실패는 직접 응답하지 않고 error middleware 로 넘긴다 — 422 가 500 이 되지 않게", async () => {
    const failure = Object.assign(new Error("422"), {
      response: { status: 422, data: { code: "MARKET_OVERVIEW_PERIOD_UNSUPPORTED" } },
    });
    mock.method(marketOverviewService, "getOverview", async () => {
      throw failure;
    });
    const { res, out } = fakeRes();
    let passed: unknown;

    await marketController.overview(req({ period: "2w" }), res, (e?: unknown) => {
      passed = e;
    });

    assert.equal(passed, failure);
    assert.equal(out.body, undefined);
  });
});
