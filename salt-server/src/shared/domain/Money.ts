import Decimal from "decimal.js";

import { Currency } from "./Currency";
import { Quantity } from "./Quantity";

/**
 * 금액 — **이 제품에서 가장 중요한 커널 타입**이다 (`ddd-shared.md` §3).
 *
 * ## 왜 `number` 가 아닌가
 *
 * 이 제품의 핵심 불변식이 금액에 있다 — 청구서 항등식 잔차 **≤ 100원**, 취득가액 lot
 * 소진량 ≤ 보유량, 솔버 매도 수량 ≤ 보유 수량. `Float` 위에서는 그 불변식을 표현할 자리가
 * 없다(`SRV-REQ-006` 문제 2).
 *
 * ## 규칙 셋
 *
 * 1. **중간 반올림 금지.** `toKrwInteger()` 는 `presentation` 에서 응답 직전 1회만 부른다.
 * 2. **통화가 다르면 던진다.** 조용히 더해지는 것이 가장 비싼 버그다.
 * 3. **절사/반올림 방식을 커널이 하드코딩하지 않는다.** 세법 파라미터(`TaxLawConfig`)가 준다.
 */
export class Money {
  private constructor(
    private readonly amount: Decimal,
    readonly currency: Currency
  ) {}

  static of(value: Decimal.Value, currency: Currency): Money {
    return new Money(new Decimal(value), currency);
  }

  static krw(value: Decimal.Value): Money {
    return Money.of(value, Currency.KRW);
  }

  static usd(value: Decimal.Value): Money {
    return Money.of(value, Currency.USD);
  }

  static zero(currency: Currency): Money {
    return Money.of(0, currency);
  }

  plus(other: Money): Money {
    this.assertSameCurrency(other, "더할");
    return new Money(this.amount.plus(other.amount), this.currency);
  }

  minus(other: Money): Money {
    this.assertSameCurrency(other, "뺄");
    return new Money(this.amount.minus(other.amount), this.currency);
  }

  /** 단가 × 수량. 수량은 통화가 없으므로 통화 검사가 없다. */
  times(quantity: Quantity): Money {
    return new Money(this.amount.times(quantity.toDecimal()), this.currency);
  }

  /** 배수(세율·비율 등). 무차원 값만 받는다. */
  scale(factor: Decimal.Value): Money {
    return new Money(this.amount.times(new Decimal(factor)), this.currency);
  }

  isNegative(): boolean {
    return this.amount.isNegative();
  }

  isZero(): boolean {
    return this.amount.isZero();
  }

  /** 비교. 통화가 다르면 던진다. */
  compare(other: Money): number {
    this.assertSameCurrency(other, "비교할");
    return this.amount.comparedTo(other.amount);
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.amount.equals(other.amount);
  }

  /** 계산용 원시값. 저장·전송에 쓰지 않는다. */
  toDecimal(): Decimal {
    return this.amount;
  }

  /** 저장용 문자열. `Float` 로 내려보내지 않는다. */
  toStorageString(): string {
    return this.amount.toFixed();
  }

  /**
   * 원 단위 정수.
   *
   * **응답 직전 1회만 부른다** — 중간에 부르면 반올림이 누적돼 청구서 항등식(잔차 ≤ 100원)이
   * 깨진다. 호출 위치는 `presentation` 으로 제한하고 `layer-check` 훅이 검사한다.
   */
  toKrwInteger(rounding: Decimal.Rounding = Decimal.ROUND_HALF_UP): number {
    if (this.currency !== Currency.KRW) {
      throw new Error(
        `원 단위로 바꿀 수 없다: 통화가 ${this.currency} 다. 환산은 fx 컨텍스트가 한다.`
      );
    }
    return this.amount.toDecimalPlaces(0, rounding).toNumber();
  }

  private assertSameCurrency(other: Money, action: string): void {
    if (this.currency !== other.currency) {
      throw new Error(
        `통화가 다른 금액을 ${action} 수 없다: ${this.currency} vs ${other.currency}. 환산은 fx 컨텍스트가 한다.`
      );
    }
  }
}
