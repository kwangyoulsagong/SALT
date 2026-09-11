import { AssetType } from "./AssetType";

/**
 * 종목 식별자.
 *
 * **대문자 정규화가 규칙이다** — 거래소는 `btc`·`BTC`·`KRW-BTC` 를 섞어 보내고,
 * 정규화가 없으면 같은 종목이 원장에 두 행으로 남는다.
 */
export class TickerSymbol {
  private constructor(
    readonly code: string,
    readonly assetType: AssetType
  ) {}

  static of(code: string, assetType: AssetType): TickerSymbol {
    const normalized = code?.trim().toUpperCase();
    if (!normalized) {
      throw new Error("종목 코드가 비어 있다");
    }
    return new TickerSymbol(normalized, assetType);
  }

  equals(other: TickerSymbol): boolean {
    return this.code === other.code && this.assetType === other.assetType;
  }

  toString(): string {
    return this.code;
  }
}
