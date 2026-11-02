import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toKrSchedule, type UpcomingEventRow } from "../KrMarketSchedule";

const at = (iso: string) => new Date(iso);
const row = (kind: string, iso: string, eventSymbol = ""): UpcomingEventRow => ({ kind, eventAt: at(iso), eventSymbol });

describe("toKrSchedule (SRV-REQ-041 FR-5)", () => {
  // 2026-11-02 월 13:00 KST
  const now = at("2026-11-02T04:00:00Z");

  it("국내 시장 일정만 · 지난 것 빼고 · 기간 안 · 시각 순, 남은 날은 KST 달력", () => {
    const view = toKrSchedule(
      [
        row("kr_bok_rate", "2026-11-26T01:00:00Z"),
        row("jobs", "2026-11-06T13:30:00Z"), // 미국 — 빠진다
        row("kr_cpi", "2026-11-02T23:00:00Z"), // 11-03 08:00 KST → 내일
        row("kr_cpi", "2026-11-01T23:00:00Z"), // 오늘 08:00 KST — 지났다
        row("kr_trade", "2026-12-01T00:00:00Z"), // 14일 밖
        row("kr_earnings", "2026-11-05T09:00:00Z", "005930"), // 종목 사건 — 빠진다
      ],
      now,
      14
    );
    assert.deepEqual(view, { days: 14, items: [{ kind: "kr_cpi", eventAt: "2026-11-02T23:00:00.000Z", daysUntil: 1 }] });
  });

  it("KST 자정을 넘는 날짜 계산 — UTC 날짜와 다르다", () => {
    // 2026-11-02 23:30 KST(14:30Z) 에 본 11-03 08:00 KST 일정 = 1일
    const late = at("2026-11-02T14:30:00Z");
    const view = toKrSchedule([row("kr_cpi", "2026-11-02T23:00:00Z")], late, 35);
    assert.equal(view.items[0]?.daysUntil, 1);
    const same = toKrSchedule([row("kr_bok_rate", "2026-11-02T05:00:00Z")], now, 35);
    assert.equal(same.items[0]?.daysUntil, 0);
  });
});
