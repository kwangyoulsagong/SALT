import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RECENT_FLOW_MAX_STALE_DAYS, recentFlow, recentFlowText } from "../policy";

/** KST 그날 봉 — 국내 봉은 그날 00:00 UTC 로 온다(`dailyOpenTime`) */
const bar = (day: string, close: number) => ({ openTime: new Date(`${day}T00:00:00Z`), close });
// 2026-11-26 13:35 KST — 실제 삼성전자 닫힌 일봉(forecast.v_daily_close)
const NOW = new Date("2026-11-26T04:35:00Z");
const SAMSUNG = [
  bar("2026-11-17", 194700),
  bar("2026-11-18", 196900),
  bar("2026-11-19", 196900),
  bar("2026-11-20", 183100),
  bar("2026-11-23", 177500),
  bar("2026-11-24", 189400),
  bar("2026-11-25", 170700),
];

describe("recentFlow — 오늘 등락을 하루만 떼어 읽히지 않게(SRV-REQ-063 FR-2)", () => {
  it("직전 거래일 −9.87% · 5거래일 전 종가 대비 · 20거래일 최고 종가 대비", () => {
    const flow = recentFlow({ closes: SAMSUNG, currentPrice: 174500, now: NOW });
    assert.deepEqual(flow, { previousSession: -9.87, week: -11.38, fromHigh: -11.38 });
    assert.equal(
      recentFlowText(flow!),
      "직전 거래일 -9.87% · 5거래일 전 종가 대비 -11.38% · 최근 20거래일 최고 종가 대비 -11.38%"
    );
  });

  it("장 마감 뒤 오늘 봉이 닫혀도 직전 거래일은 어제다(오늘 등락과 같은 숫자 0)", () => {
    const flow = recentFlow({ closes: [...SAMSUNG, bar("2026-11-26", 174500)], currentPrice: 174500, now: NOW });
    assert.equal(flow?.previousSession, -9.87);
  });

  const table: Array<[string, Parameters<typeof recentFlow>[0], "null" | "flow"]> = [
    ["봉 하나", { closes: [bar("2026-11-25", 100)], currentPrice: 100, now: NOW }, "null"],
    ["현재가 없음", { closes: SAMSUNG, currentPrice: 0, now: NOW }, "null"],
    [
      `마지막 봉이 ${RECENT_FLOW_MAX_STALE_DAYS}일보다 오래(수집 멈춤)`,
      { closes: [bar("2026-11-10", 100), bar("2026-11-11", 101)], currentPrice: 101, now: NOW },
      "null",
    ],
    ["봉 둘(5거래일 · 고점 칸 없이)", { closes: [bar("2026-11-24", 100), bar("2026-11-25", 102)], currentPrice: 103, now: NOW }, "flow"],
  ];
  for (const [name, input, want] of table) {
    it(`${name} → ${want}`, () => {
      const flow = recentFlow(input);
      assert.equal(flow === null ? "null" : "flow", want);
    });
  }

  it("고점 근처(1% 안)면 고점 칸을 싣지 않는다 · 봉이 모자라면 5거래일 칸도", () => {
    const flow = recentFlow({ closes: [bar("2026-11-24", 100), bar("2026-11-25", 102)], currentPrice: 101.5, now: NOW });
    assert.deepEqual(flow, { previousSession: 2, week: null, fromHigh: null });
    assert.equal(recentFlowText(flow!), "직전 거래일 +2.00%");
  });
});
