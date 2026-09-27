import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ForecastReader } from "../../domain";
import { GetSymbolPositioning } from "../GetSymbolPositioning";

const reader = (calls: string[]): ForecastReader =>
  ({
    positioning: async (symbol: string) => {
      calls.push(symbol);
      return { row: null, reactions: [] };
    },
  }) as unknown as ForecastReader;

describe("GetSymbolPositioning", () => {
  it("소유자가 아니면 404 — 읽지도 않는다 (ADR-003)", async () => {
    const calls: string[] = [];
    await assert.rejects(
      new GetSymbolPositioning(reader(calls), ["owner@x.com"]).execute({ userId: "u", email: "other@x.com" }, "btc"),
      /Forecast not available/
    );
    assert.equal(calls.length, 0);
  });

  it("소유자면 대문자 심볼로 읽고 매매 신호 아님 라벨 · 면책을 싣는다", async () => {
    const calls: string[] = [];
    const view = await new GetSymbolPositioning(reader(calls), ["owner@x.com"]).execute(
      { userId: "u", email: "Owner@X.com" },
      " btc "
    );
    assert.deepEqual(calls, ["BTC"]);
    assert.equal(view.label, "쏠림 신호 (매매 신호 아님)");
    assert.equal(view.blockedReason, "not_generated");
    assert.ok(view.disclaimer.length > 0);
  });
});
