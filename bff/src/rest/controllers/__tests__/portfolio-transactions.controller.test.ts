import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, afterEach, before, describe, it, mock } from "node:test";

import app from "../../app";
import { appPortfolioService } from "../../../services/app-portfolio.service";
import { backendApi } from "../../../services/backend-api.service";
import {
  toPositionTransactionPageViewModel,
  toTransactionPreviewViewModel,
} from "../../../services/position.viewmodel";

/**
 * 거래 기록 중계(F006 G절 2단계 · `BFF-REQ-027` FR-80~85) — 실제 Express 앱에 붙여 모양 검사 · 서버 코드 전달 · 재시도 0 을 본다.
 */
let server: Server;
let base: string;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());
afterEach(() => mock.restoreAll());

const call = async (method: string, path: string, body?: unknown) => {
  const res = await fetch(`${base}/api/app/portfolio${path}`, {
    method,
    headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as { success?: boolean; data?: unknown; code?: string; message?: string } };
};

const buy = { assetType: "kr_stock", symbol: "005930", side: "buy", quantity: 10, price: 70_000, transactionDate: "2026-11-18T00:00:00.000Z" };

describe("입력 모양 — 서버를 부르기 전에 400", () => {
  const cases: Array<[string, string, string, unknown]> = [
    ["자산군 빠짐", "POST", "/transactions", { ...buy, assetType: undefined }],
    ["수량 0", "POST", "/transactions", { ...buy, quantity: 0 }],
    ["방향 틀림", "POST", "/transactions", { ...buy, side: "short" }],
    ["날짜 아님", "POST", "/transactions", { ...buy, transactionDate: "어제" }],
    ["수정에 종목", "PATCH", "/transactions/t1", { symbol: "BTC" }],
    ["수정에 매수/매도", "PATCH", "/transactions/t1", { side: "sell" }],
    ["미리보기 빈 거래 id", "POST", "/transactions/preview", { transactionId: " " }],
    ["목록 쪽 0", "GET", "/transactions?page=0", undefined],
  ];
  for (const [name, method, path, body] of cases) {
    it(name, async () => {
      const proxied = mock.method(backendApi, "proxyAuthRequest", async () => {
        throw new Error("부르면 안 된다");
      });
      const res = await call(method, path, body);
      assert.equal(res.status, 400);
      assert.equal(res.body.code, "VALIDATION_ERROR");
      assert.equal(proxied.mock.callCount(), 0);
    });
  }
});

describe("서버로 — 한 번만 · 코드 그대로", () => {
  it("저장은 서버 모양으로 바꿔 한 번 부른다(재시도 0) · 201", async () => {
    const calls: unknown[][] = [];
    mock.method(backendApi, "proxyAuthRequest", async (...args: unknown[]) => {
      calls.push(args);
      if (String(args[1]).startsWith("/market/kr/assets")) return { data: { data: { items: [{ code: "005930", name: "삼성전자" }] } } };
      return { data: { data: { id: "n1", symbol: "005930", assetType: "kr_stock", transactionType: "buy", quantity: 10, price: 70_000, totalAmount: 700_000, fee: 0, transactionDate: buy.transactionDate } } };
    });
    const res = await call("POST", "/transactions", buy);
    assert.equal(res.status, 201);
    const writes = calls.filter((c) => c[0] === "POST");
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0][3], { assetType: "kr_stock", symbol: "005930", transactionType: "buy", quantity: 10, price: 70_000, transactionDate: buy.transactionDate });
    assert.equal((res.body.data as { name: string }).name, "삼성전자");
  });

  it("서버 과매도 거부는 코드 그대로 · 한 번만 부른다", async () => {
    const proxied = mock.method(backendApi, "proxyAuthRequest", async () => {
      throw Object.assign(new Error("400"), {
        isAxiosError: true,
        response: { status: 400, data: { success: false, code: "PORTFOLIO_INSUFFICIENT_QUANTITY", message: "Insufficient quantity to sell" } },
      });
    });
    const res = await call("POST", "/transactions", { ...buy, side: "sell" });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, "PORTFOLIO_INSUFFICIENT_QUANTITY");
    assert.equal(proxied.mock.callCount(), 1);
  });

  it("남의 거래 삭제 — 서버 404 그대로", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw Object.assign(new Error("404"), {
        isAxiosError: true,
        response: { status: 404, data: { success: false, code: "PORTFOLIO_TRANSACTION_NOT_FOUND", message: "Transaction not found" } },
      });
    });
    const res = await call("DELETE", "/transactions/x1");
    assert.equal(res.status, 404);
    assert.equal(res.body.code, "PORTFOLIO_TRANSACTION_NOT_FOUND");
  });

  it("미리보기 — 수정 모양은 거래 id 와 바꾼 칸만 넘긴다", async () => {
    const seen = mock.method(appPortfolioService, "previewTransaction", async () => ({
      symbol: "BTC",
      assetType: "crypto" as const,
      before: { quantity: 6, averageBuyPrice: 100, totalInvested: 600 },
      after: { quantity: 9, averageBuyPrice: 100, totalInvested: 900 },
    }));
    const res = await call("POST", "/transactions/preview", { transactionId: "t2", quantity: 1 });
    assert.equal(res.status, 200);
    assert.deepEqual(seen.mock.calls[0].arguments[1], { quantity: 1, transactionId: "t2" });
  });
});

describe("뷰모델 — 계산 0", () => {
  it("모르는 자산군 행은 싣지 않고 · 이름이 없으면 심볼 · 날짜는 ISO", () => {
    const vm = toPositionTransactionPageViewModel(
      {
        transactions: [
          { id: "a", symbol: "BTC", assetType: "crypto", transactionType: "sell", quantity: 1, price: 2, totalAmount: 2, fee: 0, transactionDate: "2026-11-18T01:02:03Z" },
          { id: "b", symbol: "AAPL", assetType: "stock", transactionType: "buy", quantity: 1, price: 2, totalAmount: 2, fee: 0, transactionDate: "2026-11-18T01:02:03Z" },
        ],
        pagination: { page: 1, limit: 50, total: 2, totalPages: 1 },
      },
      new Map(),
      true,
    );
    assert.deepEqual(vm.items.map((i) => [i.id, i.name, i.side, i.transactionDate]), [["a", "BTC", "sell", "2026-11-18T01:02:03.000Z"]]);
    assert.equal(vm.namesDegraded, true);
  });

  it("미리보기는 서버 숫자 그대로 — 반올림 · 재계산 없음", () => {
    const server = { symbol: "BTC", assetType: "crypto" as const, before: { quantity: 0.1, averageBuyPrice: 123.456, totalInvested: 12.3456 }, after: { quantity: 0, averageBuyPrice: 0, totalInvested: 0 } };
    assert.deepEqual(toTransactionPreviewViewModel(server), server);
  });
});
