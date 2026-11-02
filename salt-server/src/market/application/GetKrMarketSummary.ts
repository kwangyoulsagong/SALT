import { logger } from "../../shared/config/logger";
import {
  bucketLastValues,
  isKrStockViewer,
  KR_INDEX_NAMES,
  KR_REGULAR_SESSION_MINUTES,
  KR_SPARKLINE_BUCKET_MINUTES,
  KR_SUMMARY_SCHEDULE_COUNT,
  KR_SUMMARY_SCHEDULE_DAYS,
  krBreadthOf,
  krSessionDateOf,
  krStockLogoUrl,
  KrStockNotAvailableError,
  pickKrSummaryStocks,
  summaryTagsOf,
  toKrSchedule,
  type KrIntradayPoint,
  type KrScheduleItem,
  type KrStockStore,
  type KrSummaryPolicy,
  type KrSupplementStore,
  type MarketBreadth,
  type MarketScheduleReader,
  type MarketSummaryTag,
  type StoredKrIndexQuote,
  type StoredKrStockQuote,
} from "../domain";
import type { ResolveKrStockUniverse } from "./SyncKrStock";

/**
 * 국내 요약 한 칸 — 코인 `MarketSummaryItem` 과 **같은 열**(화면이 같은 칸 컴포넌트로 그린다) + `kind`.
 * `change24h` · `change24hAmount` 는 **전일 종가 대비**다(응답의 `changeBasis`). 이름은 코인 칸과 맞췄다.
 * 반올림 전 값 — 원 · 포인트 반올림은 `presentation` 이 한다.
 */
export interface KrSummaryItem {
  symbol: string;
  /** 지수 칸은 링크가 없다(상세 화면이 없다) */
  kind: "index" | "stock";
  koreanName: string;
  /** 지수는 `null`(화면 이니셜 대신 로고 자리 없음) */
  logoUrl: string | null;
  currentPrice: number;
  change24h: number;
  change24hAmount: number;
  tags: MarketSummaryTag[];
  sparkline: number[] | null;
  /** 당일 고가 · 저가 · 거래대금 — 받지 못했으면 `null`(0 이 아니다) */
  high24h: number | null;
  low24h: number | null;
  tradeValue24h: number | null;
  priceUpdatedAt: Date;
}

export interface KrMarketSummaryView {
  assetClass: "kr_stock";
  /** 등락 기준 — 국내는 전일 종가(코인은 24시간) */
  changeBasis: "prev_close";
  featured: KrSummaryItem | null;
  items: KrSummaryItem[];
  /** 정규장 길이 — 스파크라인은 마지막 거래일 하루치다 */
  sparklineWindowMinutes: number;
  /** 스파크라인이 그린 날(KST) — 대표 기준. 없으면 `null` */
  sparklineDate: string | null;
  breadth: MarketBreadth | null;
  /** 국내 뉴스는 모으지 않는다 — 소식 줄을 지어내지 않고 빈 배열(FR-5) */
  headlines: [];
  /** 다가오는 국내 일정(그 자리) — 못 읽으면 빈 배열 + `degraded` */
  schedule: KrScheduleItem[];
  degraded: boolean;
}

export interface GetKrMarketSummaryDependencies {
  store: KrStockStore;
  supplement: KrSupplementStore;
  universe: ResolveKrStockUniverse;
  schedule: MarketScheduleReader;
  policy: KrSummaryPolicy;
  viewerEmails: readonly string[];
  logoDevToken?: string;
  now?: () => Date;
}

/**
 * 국내 주식 시장 요약 띠(`SRV-REQ-042`) — **저장값만 읽는다**(요청이 KIS 를 부르지 않는다).
 *
 * 읽기는 두 번에 나눠 병렬로: ① 지수 행 · 지수 분 기록 · 유니버스 · 일정 ② 종목 현재가 · 5분봉. 부가 읽기(분 기록 · 5분봉 ·
 * 일정)가 실패하면 그 칸만 비우고 `degraded` — 띠 전체를 실패시키지 않는다(FR-7). 칸 고르기 · 태그 · 분위기는 도메인 함수다.
 */
export class GetKrMarketSummary {
  private readonly now: () => Date;

  constructor(private readonly deps: GetKrMarketSummaryDependencies) {
    this.now = deps.now ?? (() => new Date());
  }

  async execute(viewer: { userId: string; email?: string }): Promise<KrMarketSummaryView> {
    if (!isKrStockViewer(viewer.email, this.deps.viewerEmails)) throw new KrStockNotAvailableError();
    const now = this.now();
    const { policy } = this.deps;
    const indexCodes = [...new Set([policy.featured, ...policy.indexItems])];

    const [indexRows, indexTicks, universe, schedule] = await Promise.all([
      this.deps.supplement.indexQuotes(indexCodes),
      this.soft("지수 분 기록", () => this.deps.supplement.latestSessionIndexTicks(indexCodes)),
      this.deps.universe.execute(),
      this.soft("일정", async () => toKrSchedule(await this.deps.schedule.upcoming(), now, KR_SUMMARY_SCHEDULE_DAYS)),
    ]);
    const indexByCode = new Map(indexRows.map((row) => [row.code, row]));
    const shownIndexItems = policy.indexItems.filter((code) => code !== policy.featured && indexByCode.has(code));

    const codes = pickKrSummaryStocks(universe, shownIndexItems.length);
    const [quotes, closes] = await Promise.all([
      codes.length > 0 ? this.deps.store.quotes({ codes, limit: codes.length, offset: 0 }) : [],
      this.soft("5분봉", () => this.deps.store.latestSessionCloses(codes)),
    ]);
    const quoteByCode = new Map(quotes.map((q) => [q.code, q]));

    const indexItem = (code: string) => {
      const row = indexByCode.get(code);
      return row ? this.indexItem(row, indexTicks?.get(code)) : null;
    };
    const featured = indexItem(policy.featured);
    const stockItems = codes.flatMap((code) => {
      const q = quoteByCode.get(code);
      return q ? [this.stockItem(q, closes?.get(code))] : [];
    });
    const items = [...shownIndexItems.map(indexItem).filter((i): i is KrSummaryItem => i !== null), ...stockItems];

    const sparklineMissing = [featured, ...items].some((item) => item !== null && item.sparkline === null);
    return {
      assetClass: "kr_stock",
      changeBasis: "prev_close",
      featured,
      items,
      sparklineWindowMinutes: KR_REGULAR_SESSION_MINUTES,
      sparklineDate: krSessionDateOf(indexTicks?.get(policy.featured)),
      breadth: krBreadthOf(indexRows),
      headlines: [],
      schedule: schedule?.items.slice(0, KR_SUMMARY_SCHEDULE_COUNT) ?? [],
      degraded: indexTicks === null || closes === null || schedule === null || sparklineMissing,
    };
  }

  private indexItem(row: StoredKrIndexQuote, ticks: KrIntradayPoint[] | undefined): KrSummaryItem {
    return {
      symbol: row.code,
      kind: "index",
      koreanName: KR_INDEX_NAMES[row.code] ?? row.code,
      logoUrl: null,
      currentPrice: row.value,
      change24h: row.changeRate,
      change24hAmount: row.change,
      tags: summaryTagsOf(row.changeRate, this.deps.policy),
      sparkline: ticks ? bucketLastValues(ticks, KR_SPARKLINE_BUCKET_MINUTES) : null,
      high24h: row.high,
      low24h: row.low,
      tradeValue24h: row.tradeValue,
      priceUpdatedAt: row.updatedAt,
    };
  }

  private stockItem(q: StoredKrStockQuote, bars: KrIntradayPoint[] | undefined): KrSummaryItem {
    return {
      symbol: q.code,
      kind: "stock",
      koreanName: q.name,
      logoUrl: krStockLogoUrl(q, this.deps.logoDevToken),
      currentPrice: q.price,
      change24h: q.changeRate,
      change24hAmount: q.change,
      tags: summaryTagsOf(q.changeRate, this.deps.policy),
      sparkline: bars ? bucketLastValues(bars, KR_SPARKLINE_BUCKET_MINUTES) : null,
      high24h: q.highPrice,
      low24h: q.lowPrice,
      tradeValue24h: q.tradeValue,
      priceUpdatedAt: q.priceUpdatedAt,
    };
  }

  /** 부가 읽기 — 실패는 `null`(그 칸만 비우고 `degraded`) */
  private async soft<T>(label: string, read: () => Promise<T>): Promise<T | null> {
    try {
      return await read();
    } catch (error) {
      logger.warn(`국내 요약 ${label} 읽기 실패: ${(error as Error).message}`);
      return null;
    }
  }
}
