import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ReportTriadGaps } from "../ReportTriadGaps";
import { drainTriadGaps, recordTriad } from "../lib/triadGaps";

/** 3종 결함 세기(`SRV-REQ-053` FR-8) — 종목 수(같은 종목 여러 번 = 한 번) · 결함 꼬리표만 · 마지막 상태 · 비우기 */
describe("3종 결함 세기", () => {
  it("결함 셋만 센다 · 같은 종목은 한 번 · 나중 응답이 결함을 지우면 빠진다", () => {
    drainTriadGaps();
    recordTriad("crypto", "long_term", "BTC", ["backtest_missing"]);
    recordTriad("crypto", "long_term", "BTC", ["backtest_missing"]);
    recordTriad("crypto", "long_term", "ETH", ["live_sample_short", "insufficient_history"]);
    recordTriad("kr_stock", "scalp", "005930", ["inputs_missing"]);
    recordTriad("kr_stock", "scalp", "005930", []);

    assert.deepEqual(drainTriadGaps(), [
      { group: "crypto.long_term", judged: 2, defects: 1, reasons: { backtest_missing: 1 } },
      { group: "kr_stock.scalp", judged: 1, defects: 0, reasons: {} },
    ]);
    assert.deepEqual(drainTriadGaps(), [], "비운다");
  });

  it("10분 줄의 합 — 판단이 없으면 '판단 없음 · 합 0'", () => {
    recordTriad("crypto", "scalp", "XRP", ["track_record_unavailable"]);
    assert.equal(new ReportTriadGaps().execute().total, 1);
    assert.equal(new ReportTriadGaps().execute().total, 0);
  });
});
