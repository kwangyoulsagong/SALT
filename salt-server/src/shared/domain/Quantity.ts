import Decimal from "decimal.js";

/** 수량 — 정밀도 8자리(크립토 사토시 단위). */
export class Quantity {
  static readonly SCALE = 8;

  private constructor(private readonly value: Decimal) {}

  static of(value: Decimal.Value): Quantity {
    const decimal = new Decimal(value);
    if (decimal.isNegative()) {
      throw new Error(`수량은 음수가 될 수 없다: ${decimal.toFixed()}`);
    }
    return new Quantity(decimal.toDecimalPlaces(Quantity.SCALE));
  }

  static zero(): Quantity {
    return Quantity.of(0);
  }

  plus(other: Quantity): Quantity {
    return Quantity.of(this.value.plus(other.value));
  }

  /** 차감. 음수가 되면 던진다 — lot 소진량 ≤ 보유량 불변식이 여기 걸린다. */
  minus(other: Quantity): Quantity {
    const next = this.value.minus(other.value);
    if (next.isNegative()) {
      throw new Error(
        `수량이 음수가 된다: ${this.value.toFixed()} - ${other.value.toFixed()}`
      );
    }
    return Quantity.of(next);
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  compare(other: Quantity): number {
    return this.value.comparedTo(other.value);
  }

  toDecimal(): Decimal {
    return this.value;
  }

  toString(): string {
    return this.value.toFixed();
  }
}
