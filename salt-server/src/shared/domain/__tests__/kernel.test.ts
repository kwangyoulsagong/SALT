import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AssetType } from "../AssetType";
import { Currency } from "../Currency";
import { Degraded, DegradedReason } from "../Degraded";
import { KstDate } from "../KstDate";
import { Money } from "../Money";
import { Quantity } from "../Quantity";
import { TickerSymbol } from "../Symbol";

describe("Money", () => {
  it("통화가 다르면 더할 수 없다", () => {
    assert.throws(
      () => Money.krw(1000).plus(Money.usd(1)),
      /통화가 다른 금액을 더할 수 없다/
    );
  });

  it("Float 오차를 만들지 않는다 — 0.1 + 0.2 === 0.3", () => {
    const sum = Money.krw("0.1").plus(Money.krw("0.2"));
    assert.equal(sum.toStorageString(), "0.3");
  });

  it("중간 반올림을 하지 않는다 — 0.5 를 세 번 더해야 2원이 된다", () => {
    // 각 단계에서 반올림하면 0 + 0 + 0 = 0 이거나 1 + 1 + 1 = 3 이 된다.
    const total = Money.krw("0.5")
      .plus(Money.krw("0.5"))
      .plus(Money.krw("0.5"));
    assert.equal(total.toStorageString(), "1.5");
    assert.equal(total.toKrwInteger(), 2);
  });

  it("수량을 곱해도 정밀도가 유지된다", () => {
    const amount = Money.krw("33333.33").times(Quantity.of("3"));
    assert.equal(amount.toStorageString(), "99999.99");
  });

  it("KRW 가 아니면 원 단위로 못 바꾼다 — 환산은 fx 컨텍스트가 한다", () => {
    assert.throws(() => Money.usd(10).toKrwInteger(), /통화가 USD 다/);
  });

  it("비교도 통화를 본다", () => {
    assert.equal(Money.krw(10).compare(Money.krw(5)), 1);
    assert.throws(() => Money.krw(10).compare(Money.usd(5)));
  });
});

describe("Quantity", () => {
  it("음수 수량을 만들 수 없다", () => {
    assert.throws(() => Quantity.of(-1), /수량은 음수가 될 수 없다/);
  });

  it("차감이 음수가 되면 던진다 — lot 소진량 ≤ 보유량 불변식", () => {
    assert.throws(
      () => Quantity.of("1.5").minus(Quantity.of("2")),
      /수량이 음수가 된다/
    );
  });

  it("8자리로 절사한다", () => {
    assert.equal(Quantity.of("0.123456789").toString(), "0.12345679");
  });
});

describe("KstDate", () => {
  it("UTC 15:00 은 KST 로 다음 날이다 — 12/30 과 12/31 의 차이가 공제 한 해분이다", () => {
    const instant = new Date("2026-12-30T15:00:00Z");
    assert.equal(KstDate.fromInstant(instant).toString(), "2026-12-31");
  });

  it("UTC 14:59 는 아직 같은 날이다", () => {
    const instant = new Date("2026-12-30T14:59:59Z");
    assert.equal(KstDate.fromInstant(instant).toString(), "2026-12-30");
  });

  it("남은 일수를 센다", () => {
    const today = KstDate.parse("2026-09-11");
    assert.equal(today.daysUntil(KstDate.parse("2026-12-29")), 109);
  });

  it("형식이 아니면 던진다", () => {
    assert.throws(() => KstDate.parse("2026/12/31"), /KST 날짜 형식이 아니다/);
  });
});

describe("TickerSymbol", () => {
  it("대문자로 정규화한다 — 정규화가 없으면 같은 종목이 두 행으로 남는다", () => {
    const symbol = TickerSymbol.of(" btc ", AssetType.Crypto);
    assert.equal(symbol.toString(), "BTC");
  });

  it("자산군이 다르면 다른 종목이다", () => {
    assert.equal(
      TickerSymbol.of("AAPL", AssetType.UsStock).equals(
        TickerSymbol.of("AAPL", AssetType.KrStock)
      ),
      false
    );
  });
});

describe("Degraded", () => {
  it("이유가 하나라도 있으면 degraded 다", () => {
    assert.equal(Degraded.none().isDegraded, false);
    assert.equal(Degraded.of(DegradedReason.FxRateMissing).isDegraded, true);
  });

  it("이유는 누적되고 중복되지 않는다", () => {
    const merged = Degraded.of(DegradedReason.FxRateMissing)
      .with(DegradedReason.LedgerIncomplete)
      .merge(Degraded.of(DegradedReason.FxRateMissing));
    assert.deepEqual(merged.reasons, [
      DegradedReason.FxRateMissing,
      DegradedReason.LedgerIncomplete,
    ]);
  });
});

describe("Currency", () => {
  it("KRW·USD 두 값이다", () => {
    assert.deepEqual(Object.values(Currency), ["KRW", "USD"]);
  });
});
