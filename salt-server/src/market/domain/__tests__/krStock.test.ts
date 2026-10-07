import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  KR_QUOTE_STALE_MS,
  isKrQuoteWindow,
  krFeedState,
  krLimitState,
  krMarketSession,
  krStatusBadges,
  krTickSize,
} from "../index";

/** KST 시각 → UTC Date */
const kst = (iso: string) => new Date(`${iso}+09:00`);

describe("krMarketSession — 장 상태는 KST 시계 + 달력 (F011 FR-26)", () => {
  // 2026-10-07 수 · 10-08 목 · 10-09 금(한글날) · 10-10 토
  const calendar = new Map([
    ["2026-10-07", true],
    ["2026-10-08", true],
    ["2026-10-09", false],
    ["2026-10-12", true],
  ]);

  it("정규장 중에는 마지막 마감 · 다음 개장이 없다", () => {
    const v = krMarketSession(kst("2026-10-07T14:00:00"), calendar);
    assert.equal(v.session, "regular");
    assert.equal(v.lastCloseAt, null);
    assert.equal(v.nextOpenAt, null);
    assert.equal(v.calendarKnown, true);
  });

  it("경계 — 08:30 장전 · 15:20 동시호가 · 15:30~15:40 빈 칸은 closed · 16:00 단일가 · 18:00 closed", () => {
    assert.equal(krMarketSession(kst("2026-10-07T08:30:00"), calendar).session, "pre_open");
    assert.equal(krMarketSession(kst("2026-10-07T15:20:00"), calendar).session, "closing_auction");
    assert.equal(krMarketSession(kst("2026-10-07T15:35:00"), calendar).session, "closed");
    assert.equal(krMarketSession(kst("2026-10-07T15:40:00"), calendar).session, "after_hours_close");
    assert.equal(krMarketSession(kst("2026-10-07T16:00:00"), calendar).session, "after_hours_single");
    assert.equal(krMarketSession(kst("2026-10-07T18:00:00"), calendar).session, "closed");
  });

  it("목요일 밤 — 다음 개장은 휴장 금요일과 주말을 건너 월요일 09:00", () => {
    const v = krMarketSession(kst("2026-10-08T21:00:00"), calendar);
    assert.equal(v.session, "closed");
    assert.deepEqual(v.lastCloseAt, kst("2026-10-08T15:30:00"));
    assert.deepEqual(v.nextOpenAt, kst("2026-10-12T09:00:00"));
  });

  it("장 시작 전 아침 — 마지막 마감은 전 개장일", () => {
    const v = krMarketSession(kst("2026-10-08T07:00:00"), calendar);
    assert.deepEqual(v.lastCloseAt, kst("2026-10-07T15:30:00"));
    assert.deepEqual(v.nextOpenAt, kst("2026-10-08T09:00:00"));
  });

  it("평일 휴장은 holiday, 주말은 closed — 화면이 '휴장' 과 '정규장 아님' 을 구분한다", () => {
    assert.equal(krMarketSession(kst("2026-10-09T11:00:00"), calendar).session, "holiday");
    assert.equal(krMarketSession(kst("2026-10-10T11:00:00"), calendar).session, "closed");
  });

  it("달력에 없는 날은 평일 = 개장으로 추정하고 그 사실을 calendarKnown=false 로 드러낸다", () => {
    const v = krMarketSession(kst("2026-11-04T10:00:00"), new Map());
    assert.equal(v.session, "regular");
    assert.equal(v.calendarKnown, false);
  });
});

describe("krTickSize — 호가 단위(FR-42)", () => {
  it("가격대 경계", () => {
    assert.equal(krTickSize(1_999), 1);
    assert.equal(krTickSize(2_000), 5);
    assert.equal(krTickSize(19_990), 10);
    assert.equal(krTickSize(20_000), 50);
    assert.equal(krTickSize(199_900), 100);
    assert.equal(krTickSize(270_750), 500);
    assert.equal(krTickSize(500_000), 1_000);
  });
});

describe("상태 배지 · 상하한 · 지연 — 서버가 판정한다(FR-43 · 44 · 45)", () => {
  it("종목상태 · 시장경고 코드를 합친다. 55(신용가능)는 배지가 아니다", () => {
    assert.deepEqual(krStatusBadges({ statusCode: "55", warnCode: "00", isHalted: false }), []);
    assert.deepEqual(krStatusBadges({ statusCode: "58", warnCode: "00", isHalted: false }), ["halted"]);
    assert.deepEqual(krStatusBadges({ statusCode: "51", warnCode: "02", isHalted: true }).sort(), ["administrative", "halted", "warning"]);
  });

  it("상한가 · 하한가 — 값이 없으면 판단하지 않는다", () => {
    assert.equal(krLimitState({ price: 353_500, upperLimit: 353_500, lowerLimit: 190_500 }), "upper");
    assert.equal(krLimitState({ price: 190_500, upperLimit: 353_500, lowerLimit: 190_500 }), "lower");
    assert.equal(krLimitState({ price: 270_750, upperLimit: null, lowerLimit: null }), null);
  });

  it("시세 받는 시간대에만 오래된 값을 stale 로 — 밤에 오후 3시 값은 정상 값이다", () => {
    const calendar = new Map([["2026-10-07", true]]);
    const updated = kst("2026-10-07T15:30:00");
    const old = new Date(kst("2026-10-07T14:00:00").getTime() - KR_QUOTE_STALE_MS - 1);
    assert.equal(krFeedState({ feed: "poll_1m", priceUpdatedAt: updated }, kst("2026-10-07T21:00:00"), krMarketSession(kst("2026-10-07T21:00:00"), calendar)), "poll_1m");
    assert.equal(krFeedState({ feed: "poll_1m", priceUpdatedAt: old }, kst("2026-10-07T14:00:00"), krMarketSession(kst("2026-10-07T14:00:00"), calendar)), "stale");
  });
});

describe("isKrQuoteWindow — 시세 받는 창 08:30~16:00 (시간외 단일가 제외)", () => {
  const calendar = new Map([["2026-10-07", true]]);
  const at = (hhmm: string) => isKrQuoteWindow(krMarketSession(kst(`2026-10-07T${hhmm}:00`), calendar));

  it("장전 · 정규장 · 동시호가 · 장후 시간외 종가는 받고, 16:00 시간외 단일가부터는 받지 않는다", () => {
    assert.deepEqual(["08:20", "08:30", "10:00", "15:25", "15:45", "16:00", "17:59", "18:30"].map(at), [
      false, true, true, true, true, false, false, false,
    ]);
  });
});

