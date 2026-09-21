/** 마켓 목록의 정렬 축. 자유 문자열을 받지 않는다 (`ddd-application.md` §6). */
export enum MarketOverviewSort {
  TradeValue = "trade_value",
  Change = "change",
  Price = "price",
  Name = "name",
}

export const isMarketOverviewSort = (
  value: unknown
): value is MarketOverviewSort =>
  typeof value === "string" &&
  (Object.values(MarketOverviewSort) as string[]).includes(value);

/**
 * 차트 주기.
 *
 * **서버가 실제로 주는 것은 둘뿐이다.** `FE-REQ-010` FR-50 은 `week`·`month` 까지
 * 네 값을 적었지만 거래소 호출도 소비 화면도 없다 — 목록에만 넣으면 200 을 기대하게
 * 되고 실제로는 빈 배열이 온다. 필요해질 때 `ExchangeQuotePort` 와 함께 늘린다.
 *
 * 자유 문자열을 받지 않는 이유는 `MarketOverviewSort` 와 같다 (`ddd-application.md` §6).
 */
export enum ChartPeriod {
  Minute = "minute",
  Day = "day",
}

export const isChartPeriod = (value: unknown): value is ChartPeriod =>
  typeof value === "string" &&
  (Object.values(ChartPeriod) as string[]).includes(value);

export type SortDirection = "asc" | "desc";

/**
 * 마켓 목록의 변동률 기간 — 화면 필터 7개(변경 금지 목록, `SRV-REQ-009` FR-11)와 같다.
 *
 * **원래 서버가 이 값을 읽지 않았다.** 프론트는 7개 버튼을 그리고 `period` 를 보냈지만
 * 응답은 버튼과 무관하게 같았다(2026-09-21 실측: `7d`·`1y` 응답의 심볼 순서 해시가 동일).
 *
 * 값 문자열은 프론트 `MarketPeriod` 가 보내는 것 그대로다. 실시간은 프론트가 빈 문자열을
 * 보내고, 그 번역은 `presentation` 이 한다.
 */
export enum MarketOverviewPeriod {
  Realtime = "realtime",
  OneDay = "1d",
  OneWeek = "7d",
  OneMonth = "1m",
  ThreeMonths = "3m",
  SixMonths = "6m",
  OneYear = "1y",
}

export const isMarketOverviewPeriod = (
  value: unknown
): value is MarketOverviewPeriod =>
  typeof value === "string" &&
  (Object.values(MarketOverviewPeriod) as string[]).includes(value);

export interface MarketOverviewQuery {
  page: number;
  limit: number;
  sort: MarketOverviewSort;
  order: SortDirection;
  search?: string;
  period: MarketOverviewPeriod;
}

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/**
 * 기간의 **기준 종가를 어디서 찾는가.**
 *
 * - `timeframe` — 어느 캔들을 볼지. 1일은 5분봉(롤링 24시간), 그 이상은 일봉이다
 * - `closedBy` — 기준 캔들이 **이 시각까지 닫혀 있어야** 한다. 캔들의 `timestamp` 는
 *   시작 시각이라, 시작이 `closedBy - 캔들 길이` 이하여야 종가가 기준 시각 이전 값이다
 * - `notBefore` — 이보다 오래된 캔들은 기준으로 쓰지 않는다. 수집이 며칠 빠졌을 때
 *   **엉뚱하게 먼 과거와 비교하지 않는다.** 없으면 `null` 이다
 *
 * 실시간은 기준을 찾지 않는다 — 거래소가 주는 24시간 변동률이 곧 값이다.
 */
export interface PeriodBaseline {
  timeframe: "5m" | "1d";
  candleStartAtOrBefore: Date;
  candleStartNotBefore: Date;
}

const PERIOD_SPAN: Record<
  Exclude<MarketOverviewPeriod, MarketOverviewPeriod.Realtime>,
  { timeframe: "5m" | "1d"; spanMs: number; toleranceMs: number }
> = {
  [MarketOverviewPeriod.OneDay]: { timeframe: "5m", spanMs: DAY_MS, toleranceMs: 30 * MINUTE_MS },
  [MarketOverviewPeriod.OneWeek]: { timeframe: "1d", spanMs: 7 * DAY_MS, toleranceMs: 3 * DAY_MS },
  [MarketOverviewPeriod.OneMonth]: { timeframe: "1d", spanMs: 30 * DAY_MS, toleranceMs: 3 * DAY_MS },
  [MarketOverviewPeriod.ThreeMonths]: { timeframe: "1d", spanMs: 91 * DAY_MS, toleranceMs: 3 * DAY_MS },
  [MarketOverviewPeriod.SixMonths]: { timeframe: "1d", spanMs: 182 * DAY_MS, toleranceMs: 3 * DAY_MS },
  [MarketOverviewPeriod.OneYear]: { timeframe: "1d", spanMs: 365 * DAY_MS, toleranceMs: 3 * DAY_MS },
};

const CANDLE_MS = { "5m": 5 * MINUTE_MS, "1d": DAY_MS } as const;

export const periodBaseline = (
  period: MarketOverviewPeriod,
  now: Date
): PeriodBaseline | null => {
  if (period === MarketOverviewPeriod.Realtime) return null;

  const { timeframe, spanMs, toleranceMs } = PERIOD_SPAN[period];
  const latestStart = now.getTime() - spanMs - CANDLE_MS[timeframe];
  return {
    timeframe,
    candleStartAtOrBefore: new Date(latestStart),
    candleStartNotBefore: new Date(latestStart - toleranceMs),
  };
};

/**
 * 기준 종가 대비 변동률(%).
 *
 * **기준이 없으면 `null` 이다.** 24시간 변동률로 대신 채우지 않는다 — 그러면 "1년"
 * 버튼이 24시간 값을 1년 값처럼 보여 준다. 상장한 지 6개월 된 종목의 1년 변동률은 없다.
 */
export const periodChange = (
  currentPrice: number,
  baseClose: number | undefined
): number | null => {
  if (baseClose === undefined || !(baseClose > 0) || !(currentPrice > 0)) {
    return null;
  }
  return ((currentPrice - baseClose) / baseClose) * 100;
};

/**
 * 기간 변동률 정렬. **값이 없는 종목은 방향과 무관하게 뒤로 보낸다** — 오름차순에서
 * 앞에 오면 표 첫 화면이 "—" 로 채워진다. 같은 값은 거래대금 순이다(기본 정렬과 같다).
 */
export const rankByPeriodChange = <
  T extends { periodChange: number | null; tradeValue24h: number },
>(
  items: T[],
  order: SortDirection
): T[] => {
  const sign = order === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    if (a.periodChange === null || b.periodChange === null) {
      if (a.periodChange === b.periodChange) return b.tradeValue24h - a.tradeValue24h;
      return a.periodChange === null ? 1 : -1;
    }
    if (a.periodChange !== b.periodChange) {
      return sign * (a.periodChange - b.periodChange);
    }
    return b.tradeValue24h - a.tradeValue24h;
  });
};

export interface MarketAssetView {
  symbol: string;
  market: string;
  koreanName: string | null;
  englishName: string | null;
  currentPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  tradeValue24h: number;
  logoUrl: string;
  priceUpdatedAt: Date | null;
}

/**
 * 목록 한 줄의 응답. `MarketAssetView` 에 **필드 하나를 더한다**(`SRV-REQ-009` FR-20 —
 * 추가는 하위 호환). `change24h` 는 뜻을 바꾸지 않는다: 실시간 WS 가 같은 이름으로
 * 덮어쓰는 값이라, 기간 값을 여기 담으면 다음 틱에 24시간 값으로 되돌아간다.
 */
export interface MarketOverviewItem extends MarketAssetView {
  /** 선택한 기간의 변동률(%). 실시간이면 `change24h` 와 같다. 기준이 없으면 `null`. */
  periodChange: number | null;
}

/**
 * 거래소 로고 URL.
 *
 * 원문은 이 문자열을 `investment.service` 두 곳과 `market-intelligence` 에 복사해 뒀다.
 * 기본값 규칙이 한 곳이면 거래소를 바꿀 때 고칠 자리가 하나다.
 */
export const UPBIT_LOGO_BASE = "https://static.upbit.com/logos/";

export const logoUrlOf = (symbol: string) => `${UPBIT_LOGO_BASE}${symbol}.png`;
