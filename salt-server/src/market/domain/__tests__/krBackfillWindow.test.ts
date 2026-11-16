import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { krBackfillWindow } from "../KrStock";

/**
 * 불변식(2026-11-16): KIS 큰 백필(전 종목 일봉 · 5분봉 1년)은 **개장일 08:30~16:00 KST 엔 부르지 않는다.**
 * 그 밖이면 다음 개장일 08:30 까지 부르고, 깨거나 다시 불리면 이어 받는다.
 * 맥이 평일 업무 시간에만 켜져 밤 회차가 돌지 않게 된 뒤, "밤에만 · 07:20 멈춤"을 시세 창 기준으로 바꿨다.
 */

/** KST 벽시계 → Date */
const kst = (local: string) => new Date(Date.parse(`${local}:00Z`) - 9 * 3_600_000);

// 2026-11-16(월) ~ 11-29(일). 11-18(수)은 휴장으로 둔다(시험용 — 실제 공시와 무관)
const CALENDAR = new Map<string, boolean>();
for (let d = 16; d <= 29; d++) {
  const date = `2026-11-${String(d).padStart(2, "0")}`;
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  CALENDAR.set(date, dow !== 0 && dow !== 6 && date !== "2026-11-18");
}

describe("krBackfillWindow — 경계 표", () => {
  const rows: Array<[string, string, string | null, Map<string, boolean>?]> = [
    // [지금 KST, 설명, 멈춤 KST(null = 거절)]
    ["2026-11-16T08:29", "개장일 08:29 — 허용, 1분 뒤 멈춤", "2026-11-16T08:30"],
    ["2026-11-16T08:30", "개장일 08:30 — 거절(시세 창 시작)", null],
    ["2026-11-16T12:00", "개장일 장중 — 거절", null],
    ["2026-11-16T15:59", "개장일 15:59 — 거절", null],
    ["2026-11-16T16:00", "개장일 16:00 — 허용, 다음 개장일 08:30", "2026-11-17T08:30"],
    ["2026-11-16T16:15", "장 마감 뒤 회차 16:15", "2026-11-17T08:30"],
    ["2026-11-16T23:59", "밤", "2026-11-17T08:30"],
    ["2026-11-17T00:00", "자정 넘김 — 같은 날 08:30", "2026-11-17T08:30"],
    ["2026-11-17T16:15", "휴장 전날 — 휴장을 건너뛴다", "2026-11-19T08:30"],
    ["2026-11-18T10:00", "평일 휴장 장중 시각 — 허용", "2026-11-19T08:30"],
    ["2026-11-20T16:15", "금요일 — 월요일 08:30 까지", "2026-11-23T08:30"],
    ["2026-11-21T10:00", "토요일 깸", "2026-11-23T08:30"],
    ["2026-11-22T12:00", "일요일 깸", "2026-11-23T08:30"],
    ["2026-11-23T08:45", "주말 회차가 월요일 창 안까지 잠들었다 깸 — 거절", null],
    // 달력이 없는 평일은 개장으로 추정한다 — 모르면 창을 지킨다
    ["2026-11-16T10:00", "달력 없음 · 평일 장중 — 거절", null, new Map()],
    ["2026-11-16T17:00", "달력 없음 · 평일 장 뒤", "2026-11-17T08:30", new Map()],
  ];
  for (const [now, label, stop, calendar] of rows) {
    it(`${now} ${label}`, () => {
      const w = krBackfillWindow(kst(now), calendar ?? CALENDAR);
      if (stop === null) {
        assert.equal(w.open, false);
      } else {
        assert.equal(w.open, true);
        if (w.open) assert.equal(w.stopAt.toISOString(), kst(stop).toISOString());
      }
    });
  }

  it("거절이면 같은 날 16:00 에 다시 열린다", () => {
    const w = krBackfillWindow(kst("2026-11-16T09:00"), CALENDAR);
    assert.equal(w.open, false);
    if (!w.open) assert.equal(w.reopensAt.toISOString(), kst("2026-11-16T16:00").toISOString());
  });
});

describe("krBackfillWindow — 불변식 전수(2주 · 5분 간격)", () => {
  /** 독립 판정 — 개장일이고 08:30 ≤ 분 < 16:00 */
  const inQuoteWindow = (at: Date) => {
    const local = new Date(at.getTime() + 9 * 3_600_000);
    const date = local.toISOString().slice(0, 10);
    const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
    return (CALENDAR.get(date) ?? false) && minutes >= 8 * 60 + 30 && minutes < 16 * 60;
  };

  it("창 안이면 거절, 밖이면 허용 · 멈춤까지 창에 닿지 않고 멈춤은 다음 창 시작", () => {
    const STEP = 5 * 60_000;
    const from = kst("2026-11-16T00:00").getTime();
    const to = kst("2026-11-22T23:55").getTime();
    for (let t = from; t <= to; t += STEP) {
      const at = new Date(t);
      const w = krBackfillWindow(at, CALENDAR);
      assert.equal(w.open, !inQuoteWindow(at), at.toISOString());
      if (!w.open) continue;
      assert.ok(w.stopAt.getTime() > t, `멈춤이 지금 뒤 — ${at.toISOString()}`);
      for (let u = t; u < w.stopAt.getTime(); u += STEP) {
        assert.ok(!inQuoteWindow(new Date(u)), `멈춤 전에 창에 닿음 — ${at.toISOString()} → ${new Date(u).toISOString()}`);
      }
      assert.ok(inQuoteWindow(w.stopAt), `멈춤은 창 시작 — ${w.stopAt.toISOString()}`);
    }
  });
});
