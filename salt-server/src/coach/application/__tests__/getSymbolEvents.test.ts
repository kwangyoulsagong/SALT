import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ForecastReader } from "../../domain";
import { GetSymbolEvents } from "../GetSymbolEvents";

const reader = (calls: string[]): ForecastReader =>
  ({
    eventCards: async (symbol: string) => {
      calls.push(symbol);
      return [];
    },
    earningsOutlook: async (symbol: string) => {
      calls.push(`earnings:${symbol}`);
      return { window: null, reactions: [] };
    },
  }) as unknown as ForecastReader;

describe("GetSymbolEvents", () => {
  it("소유자가 아니면 404 — 읽지도 않는다 (ADR-003)", async () => {
    const calls: string[] = [];
    await assert.rejects(
      new GetSymbolEvents(reader(calls), ["owner@x.com"]).execute({ userId: "u", email: "other@x.com" }, "btc"),
      /Forecast not available/
    );
    assert.equal(calls.length, 0);
  });

  it("소유자면 대문자 심볼로 읽고 판정 아님 라벨 · 면책을 싣는다", async () => {
    const calls: string[] = [];
    const view = await new GetSymbolEvents(reader(calls), ["owner@x.com"]).execute(
      { userId: "u", email: "Owner@X.com" },
      " btc "
    );
    assert.deepEqual(calls, ["BTC", "earnings:BTC"]);
    assert.equal(view.earnings, null);
    assert.equal(view.label, "주요 사건 (호재 · 악재 판정 아님)");
    assert.ok(view.disclaimer.length > 0);
  });
});
