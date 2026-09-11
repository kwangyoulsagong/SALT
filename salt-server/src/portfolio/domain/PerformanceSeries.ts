import Decimal from "decimal.js";

/**
 * 성과 시계열 — 보유 수량 × 시점별 종가를 시점마다 합한다.
 *
 * ## 원문의 두 가지를 그대로 뒀다
 *
 * 1. **보유 수량은 현재 수량이다.** 과거 시점에 실제로 얼마를 들고 있었는지를 쓰지
 *    않는다 — 원장 시계열이 필요하고 그건 `ledger`(F001)의 일이다. 그래서 이 곡선은
 *    "지금 보유를 과거 가격으로 평가한 것"이고 실제 자산 추이가 아니다.
 * 2. **가격이 있는 심볼만 합산된다.** 어떤 심볼의 캔들이 결측이면 그 시점 합계가
 *    작아지고, 그 사실이 응답에 드러나지 않는다.
 *
 * > 둘 다 화면의 의미를 바꾸는 문제이고 `degraded` 로 드러내야 한다
 * > (`ddd-presentation.md` §5). 이 REQ 의 범위가 아니라 **F006 홈 블록**에서 닫는다.
 */

export interface PerformancePoint {
  timestamp: number;
  value: number;
}

export interface ClosePriceFact {
  symbol: string;
  close: number;
  timestamp: Date;
}

export const buildPerformanceSeries = (
  holdings: Array<{ symbol: string; totalQuantity: number }>,
  closes: ClosePriceFact[]
): PerformancePoint[] => {
  const quantityBySymbol = new Map(
    holdings.map((h) => [h.symbol, new Decimal(h.totalQuantity)])
  );

  const valueByTimestamp = new Map<number, Decimal>();

  for (const close of closes) {
    const quantity = quantityBySymbol.get(close.symbol);
    if (!quantity) continue;

    const key = close.timestamp.getTime();
    const previous = valueByTimestamp.get(key) ?? new Decimal(0);
    valueByTimestamp.set(key, previous.plus(quantity.times(close.close)));
  }

  return [...valueByTimestamp.entries()].map(([timestamp, value]) => ({
    timestamp,
    value: value.toNumber(),
  }));
};

/** 조회 구간. `all` 은 전체다(원문의 `default`). */
export type PerformanceRange = "1d" | "7d" | "30d" | "90d" | "all";

const RANGE_DAYS: Record<Exclude<PerformanceRange, "all">, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/**
 * 구간 시작 시각.
 *
 * 아는 구간이 아니면 **전체**다 — 원문의 `default: new Date(0)` 과 같다.
 * 알 수 없는 값을 오류로 만들지 않는 것이 원문 계약이다.
 */
export const rangeStart = (range: string, now: Date): Date => {
  const days = RANGE_DAYS[range as Exclude<PerformanceRange, "all">];
  if (!days) return new Date(0);
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
};
