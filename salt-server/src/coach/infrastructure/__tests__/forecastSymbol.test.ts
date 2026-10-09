import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { dailyOpenTime, forecastKeys, fromForecastKey, widen } from "../forecastSymbol";

describe("forecastSymbol (F011 슬라이스 5b)", () => {
  it("두 키를 다 묻는다 — 코인은 KRW- 접두, 국내 주식은 맨 코드", () => {
    assert.deepEqual(forecastKeys("BTC"), ["KRW-BTC", "BTC"]);
    assert.deepEqual(forecastKeys("005930"), ["KRW-005930", "005930"]);
  });

  it("걸린 키로 자산군을 안다 — 6글자 코인도 코인", () => {
    assert.deepEqual(fromForecastKey("KRW-PUNDIX"), {
      symbol: "PUNDIX",
      assetClass: "crypto",
    });
    assert.deepEqual(fromForecastKey("005930"), {
      symbol: "005930",
      assetClass: "kr_stock",
    });
  });

  it("국내 주식 봉 시작(거래일 00:00 KST)을 그날 00:00 UTC 로 — 코인은 그대로", () => {
    const krOpen = new Date("2026-10-07T15:00:00Z"); // 2026-10-08 00:00 KST
    assert.equal(dailyOpenTime(krOpen, "kr_stock").toISOString(), "2026-10-08T00:00:00.000Z");
    const coinOpen = new Date("2026-10-08T00:00:00Z");
    assert.equal(dailyOpenTime(coinOpen, "crypto").toISOString(), "2026-10-08T00:00:00.000Z");
  });

  it("범위 시작을 9시간 넓힌다 — 보정 전 시각으로 거르는 SQL 에서 그날 국내 주식 봉이 빠지지 않게", () => {
    const from = new Date("2026-10-06T00:00:00Z");
    const krOpen = new Date("2026-10-05T15:00:00Z"); // 10-06 거래일 봉
    assert.ok(krOpen >= widen(from));
    assert.equal(dailyOpenTime(krOpen, "kr_stock").getTime(), from.getTime());
  });
});
