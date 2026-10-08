import { describe, expect, it } from "vitest";

import {
  isKrRegularSession,
  isKrStockCode,
  kstClock,
  kstDayDiff,
  kstMonthDay,
  kstWeekday,
  krStaleMinutes,
} from "./krStock";

describe("isKrStockCode", () => {
  it("숫자로 시작하는 6자리만 국내 주식이다", () => {
    expect(isKrStockCode("005930")).toBe(true);
    expect(isKrStockCode("0126Z0")).toBe(true);
    expect(isKrStockCode("0126z0")).toBe(true);
  });

  it("코인 티커 · 모양이 다른 값은 아니다", () => {
    expect(isKrStockCode("BTC")).toBe(false);
    expect(isKrStockCode("STRIKE")).toBe(false);
    expect(isKrStockCode("1INCH")).toBe(false);
    expect(isKrStockCode("0059300")).toBe(false);
    expect(isKrStockCode("00593")).toBe(false);
  });
});

describe("KST 표시", () => {
  // 2026-10-08 06:30 UTC = 15:30 KST (목)
  const close = "2026-10-08T06:30:00.000Z";

  it("시각 · 요일 · 날짜를 브라우저 시간대와 무관하게 KST 로 읽는다", () => {
    expect(kstClock(close)).toBe("15:30");
    expect(kstWeekday(close)).toBe(4);
    expect(kstMonthDay(close)).toBe("10/8");
  });

  it("UTC 로는 전날이어도 KST 날짜로 센다", () => {
    // 2026-10-08 21:00 KST(목) → 2026-10-09 09:00 KST(금)
    expect(kstDayDiff("2026-10-08T12:00:00.000Z", "2026-10-09T00:00:00.000Z")).toBe(1);
    // 00:30 KST 와 09:00 KST 는 같은 날 — UTC 로는 전날 15:30
    expect(kstDayDiff("2026-10-08T15:30:00.000Z", "2026-10-09T00:00:00.000Z")).toBe(0);
    // 금요일 저녁 → 월요일
    expect(kstDayDiff("2026-10-09T12:00:00.000Z", "2026-10-12T00:00:00.000Z")).toBe(3);
  });
});

describe("isKrRegularSession", () => {
  it("정규장 · 동시호가만 체결이 흐른다", () => {
    expect(isKrRegularSession("regular")).toBe(true);
    expect(isKrRegularSession("closing_auction")).toBe(true);
    expect(isKrRegularSession("pre_open")).toBe(false);
    expect(isKrRegularSession("after_hours_single")).toBe(false);
    expect(isKrRegularSession("holiday")).toBe(false);
  });
});

describe("krStaleMinutes", () => {
  it("분 단위로 내리고 1분 미만은 1분", () => {
    expect(krStaleMinutes("2026-10-08T01:00:00.000Z", "2026-10-08T01:07:59.000Z")).toBe(7);
    expect(krStaleMinutes("2026-10-08T01:00:00.000Z", "2026-10-08T01:00:20.000Z")).toBe(1);
  });
});
