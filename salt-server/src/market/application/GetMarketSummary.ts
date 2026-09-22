import { logger } from "../../shared/config/logger";
import {
  change24hAmountOf,
  SUMMARY_SPARKLINE,
  SUMMARY_SPARKLINE_WINDOW_MINUTES,
  summaryTagsOf,
  type ExchangeQuotePort,
  type MarketAssetRepository,
  type MarketAssetView,
  type MarketSummaryPolicy,
  type MarketSummaryTag,
} from "../domain";

/**
 * 스파크라인 캐시 수명. 5분봉이라 1분 안에 모양이 바뀌는 것은 마지막 봉 하나다 —
 * 화면이 열릴 때마다 종목 수만큼 거래소를 부르지 않는다(거래소 초당 호출 제한).
 */
const SPARKLINE_TTL_MS = 60 * 1000;

export interface MarketSummaryItem {
  symbol: string;
  koreanName: string | null;
  logoUrl: string;
  currentPrice: number;
  change24h: number;
  /** 24시간 등락 금액. 반올림 전 값이다 — 원 단위 반올림은 `presentation` 이 한다. */
  change24hAmount: number | null;
  tags: MarketSummaryTag[];
  /** 종가(시간순). 거래소 조회가 실패하면 `null` — 항목은 남는다(부분 실패). */
  sparkline: number[] | null;
  priceUpdatedAt: Date | null;
}

export interface MarketSummaryView {
  /** 큰 차트의 대표. 설정 첫 심볼이 목록에 없으면 `null`. */
  featured: MarketSummaryItem | null;
  items: MarketSummaryItem[];
  sparklineWindowMinutes: number;
  /** 스파크라인을 못 받은 종목이 있으면 `true` (`ddd-presentation.md` §5 `degraded`). */
  degraded: boolean;
}

/**
 * 시장 요약 띠 (`SRV-REQ-036`).
 *
 * **종목은 설정이 정하고, 값은 저장 시세다.** 거래소를 부르는 것은 스파크라인뿐이고 그것도 1분 캐시다.
 * 등락 금액 · 태그 판정은 도메인(`MarketSummary.ts`)이 한다 — 이 클래스는 조합만 한다.
 */
export class GetMarketSummary {
  private readonly sparklineCache = new Map<
    string,
    { at: number; closes: number[] }
  >();

  constructor(
    private readonly assets: MarketAssetRepository,
    private readonly exchange: ExchangeQuotePort,
    private readonly policy: MarketSummaryPolicy,
    private readonly now: () => number = () => Date.now()
  ) {}

  async execute(): Promise<MarketSummaryView> {
    const views = await this.assets.findViews(this.policy.symbols);
    const bySymbol = new Map(views.map((view) => [view.symbol.toUpperCase(), view]));
    // 설정 순서가 화면 순서다. 목록에 없는(상장 폐지 · 미수집) 심볼은 빠진다
    const ordered = this.policy.symbols
      .map((symbol) => bySymbol.get(symbol))
      .filter((view): view is MarketAssetView => view !== undefined);

    const sparklines = await Promise.all(
      ordered.map((view) => this.sparkline(view.symbol))
    );
    const items = ordered.map((view, index) =>
      this.toItem(view, sparklines[index] ?? null)
    );

    const featured =
      items[0] && items[0].symbol === this.policy.symbols[0] ? items[0] : null;
    return {
      featured,
      items: featured ? items.slice(1) : items,
      sparklineWindowMinutes: SUMMARY_SPARKLINE_WINDOW_MINUTES,
      degraded: sparklines.some((closes) => closes === null),
    };
  }

  private toItem(view: MarketAssetView, sparkline: number[] | null): MarketSummaryItem {
    return {
      symbol: view.symbol,
      koreanName: view.koreanName,
      logoUrl: view.logoUrl,
      currentPrice: view.currentPrice,
      change24h: view.change24h,
      change24hAmount: change24hAmountOf(view.currentPrice, view.change24h),
      tags: summaryTagsOf(view.change24h, this.policy),
      sparkline,
      priceUpdatedAt: view.priceUpdatedAt,
    };
  }

  /** 트랜잭션 밖에서 부른다(거래소 I/O). 실패는 `null` 로 — 요약 전체를 실패시키지 않는다. */
  private async sparkline(symbol: string): Promise<number[] | null> {
    const cached = this.sparklineCache.get(symbol);
    if (cached && this.now() - cached.at < SPARKLINE_TTL_MS) return cached.closes;

    try {
      const candles = await this.exchange.minuteCandles(
        symbol,
        SUMMARY_SPARKLINE.unit,
        SUMMARY_SPARKLINE.count
      );
      // 거래소는 최신이 앞이다 — 시간순으로 뒤집는다
      const closes = candles.map((candle) => candle.close).reverse();
      this.sparklineCache.set(symbol, { at: this.now(), closes });
      return closes;
    } catch (error: any) {
      logger.warn(`시장 요약 스파크라인 실패 ${symbol}:`, error?.message);
      // 오래된 캐시라도 있으면 그것을 쓴다 — 빈 차트보다 몇 분 전 모양이 낫다
      return cached?.closes ?? null;
    }
  }
}
