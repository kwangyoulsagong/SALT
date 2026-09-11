/**
 * 계산이 불완전한 상태.
 *
 * 청구서·세금·적립이 공유한다 — **"값이 없다"와 "값을 못 믿는다"는 다르다.** 후자를
 * 표현할 자리가 없으면 화면이 0원을 사실처럼 그린다.
 *
 * 이유 코드는 **누적**된다. 하나라도 있으면 그 계산은 degraded 다.
 */
export enum DegradedReason {
  /** 원장에 빠진 거래가 있다 */
  LedgerIncomplete = "LEDGER_INCOMPLETE",
  /** 결제일 기준환율을 못 구했다 */
  FxRateMissing = "FX_RATE_MISSING",
  /** 취득가액 lot 이 부족하다 */
  CostBasisMissing = "COST_BASIS_MISSING",
  /** 가격 이력이 끊겼다 */
  PriceHistoryGap = "PRICE_HISTORY_GAP",
  /** 외부 지표 수집이 실패했다 */
  IndicatorStale = "INDICATOR_STALE",
}

export class Degraded {
  private constructor(readonly reasons: readonly DegradedReason[]) {}

  static none(): Degraded {
    return new Degraded([]);
  }

  static of(...reasons: DegradedReason[]): Degraded {
    return new Degraded([...new Set(reasons)]);
  }

  with(...reasons: DegradedReason[]): Degraded {
    return Degraded.of(...this.reasons, ...reasons);
  }

  merge(other: Degraded): Degraded {
    return this.with(...other.reasons);
  }

  get isDegraded(): boolean {
    return this.reasons.length > 0;
  }
}
