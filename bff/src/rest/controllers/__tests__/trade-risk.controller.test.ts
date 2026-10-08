import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, afterEach, before, describe, it, mock } from "node:test";

import app from "../../app";
import { appTradeRiskService } from "../../../services/app-trade-risk.service";

/** `POST /api/app/coach/trades` — 국내 주식 거래 입력(F011 슬라이스 3b · `BFF-REQ-040` FR-14) */
let server: Server;
let base: string;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const post = async (body: unknown) => {
  const res = await fetch(`${base}/api/app/coach/trades`, {
    method: "POST",
    headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as { message?: string } };
};

const trade = { symbol: "005930", side: "buy", quantity: 10, price: 70_050 };

describe("POST /api/app/coach/trades — assetType", () => {
  afterEach(() => mock.restoreAll());

  it("kr_stock 을 서버로 넘긴다 · 주지 않으면 crypto", async () => {
    const call = mock.method(appTradeRiskService, "recordTrade", async () => ({}) as never);
    assert.equal((await post({ ...trade, assetType: "kr_stock" })).status, 201);
    assert.equal((await post({ ...trade, symbol: "btc" })).status, 201);
    assert.equal(call.mock.calls[0]?.arguments[1].assetType, "kr_stock");
    assert.equal(call.mock.calls[0]?.arguments[1].symbol, "005930");
    assert.equal(call.mock.calls[1]?.arguments[1].assetType, "crypto");
  });

  it("모르는 자산군은 400 — 서버를 부르지 않는다", async () => {
    const call = mock.method(appTradeRiskService, "recordTrade", async () => ({}) as never);
    assert.equal((await post({ ...trade, assetType: "us_stock" })).status, 400);
    assert.equal(call.mock.callCount(), 0);
  });

  it("국내 주식에 계획을 붙이면 400 — 조용히 버리지 않는다(코치가 국내 주식 거래를 아직 모른다)", async () => {
    const call = mock.method(appTradeRiskService, "recordTrade", async () => ({}) as never);
    const r = await post({ ...trade, assetType: "kr_stock", plan: { stopPrice: 65_000 } });
    assert.equal(r.status, 400);
    assert.match(r.body.message ?? "", /국내 주식/);
    assert.equal(call.mock.callCount(), 0);
  });
});
