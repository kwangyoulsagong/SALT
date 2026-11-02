import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MarketScheduleUnavailableError, type MarketScheduleReader } from "../../domain";
import { GetKrMarketSchedule } from "../GetKrMarketSchedule";

describe("GetKrMarketSchedule", () => {
  it("뷰 한 번 읽고 기간으로 자른다 — 소유자 · 키 검사 없음", async () => {
    let calls = 0;
    const reader: MarketScheduleReader = {
      upcoming: async () => {
        calls += 1;
        return [{ kind: "kr_bok_rate", eventAt: new Date("2026-11-26T01:00:00Z"), eventSymbol: "" }];
      },
    };
    const view = await new GetKrMarketSchedule(reader).execute(35, new Date("2026-11-02T04:00:00Z"));
    assert.equal(calls, 1);
    assert.deepEqual(view.items.map((i) => [i.kind, i.daysUntil]), [["kr_bok_rate", 24]]);
  });

  it("예측 DB 를 못 읽으면 503 그대로", async () => {
    const reader: MarketScheduleReader = {
      upcoming: async () => {
        throw new MarketScheduleUnavailableError();
      },
    };
    await assert.rejects(new GetKrMarketSchedule(reader).execute(14), (e: unknown) => {
      assert.ok(e instanceof MarketScheduleUnavailableError);
      assert.equal(e.kind, "UNAVAILABLE");
      return true;
    });
  });
});
