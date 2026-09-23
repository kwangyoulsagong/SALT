"use client";

import type { SymbolCoachViewModel } from "@repo/core/coach";
import { Image } from "@repo/ui/image";
import { useMemo } from "react";

import {
  ChangeRateCell,
  indexWatchlistBySymbol,
  type MarketOverviewItem,
  useWatchlist,
  WatchlistAssetType,
} from "@/entities/market";
import { WatchlistStarButton } from "@/features/toggle-watchlist";
import { formatClockTime, formatKrwCompact, formatPrice } from "@/shared/lib";

import { SYMBOL_ANALYSIS_MESSAGES } from "../model";
import {
  headerCard,
  identity,
  name as nameStyle,
  nameRow,
  price as priceStyle,
  priceRow,
  rangeDot,
  rangeTrack,
  stat,
  statLabel,
  stats,
  statsRow,
  statValue,
  ticker,
} from "./SymbolAnalysis.css";

const LOGO_SIZE = 36;

/**
 * 종목 헤더 (`FE-REQ-026` FR-131).
 *
 * ## 이름과 가격을 같은 크기로 두지 않는다
 *
 * 전에는 `Heading level=2` 옆에 가격이 붙어 둘이 경쟁했다. 이 화면에서 사람이 가장 먼저
 * 찾는 것은 **가격**이다 — 이름은 한 줄 위 작게, 가격은 그 아래 크게 둔다.
 *
 * ## 지표는 서버가 준 값만 싣는다
 *
 * 고가 · 저가 · 거래대금 · 심리 · 기준 시각은 전부 응답 필드다. **여기서 새 금액을 만들지
 * 않는다**(공통 수용 기준 3) — 범위 막대의 점 위치만 세 값으로 정하는데 그건 금액이 아니라
 * 표시 기하다.
 */
export const SymbolHeader = ({
  symbol,
  listing,
  view,
}: {
  symbol: string;
  listing: MarketOverviewItem | undefined;
  view: SymbolCoachViewModel | undefined;
}) => {
  const watchlist = useWatchlist();
  const watched = useMemo(
    () => indexWatchlistBySymbol(watchlist.data?.items ?? []),
    [watchlist.data],
  );

  const displayName = listing?.koreanName ?? symbol;
  const currentPrice = listing?.currentPrice ?? view?.evidence.price ?? null;
  const change = listing?.change24h ?? view?.evidence.change24h ?? null;

  return (
    <header className={headerCard}>
      <div className={identity}>
        <div className={nameRow}>
          {listing?.logoUrl && (
            <Image
              radius={9999}
              width={LOGO_SIZE}
              height={LOGO_SIZE}
              src={listing.logoUrl}
              alt={displayName}
            />
          )}
          <h1 className={nameStyle}>{displayName}</h1>
          <span className={ticker}>{symbol.toUpperCase()}</span>
        </div>

        <div className={priceRow}>
          {currentPrice !== null && (
            <span className={priceStyle}>{formatPrice(currentPrice)}</span>
          )}
          {change !== null && <ChangeRateCell value={change} />}
        </div>
      </div>

      <div className={statsRow}>
        <dl className={stats}>
        {listing && (
          <div className={stat}>
            <dt className={statLabel}>{SYMBOL_ANALYSIS_MESSAGES.statRange}</dt>
            <dd className={statValue}>
              {`${formatPrice(listing.low24h)} ~ ${formatPrice(listing.high24h)}`}
              <div className={rangeTrack}>
                <span
                  className={rangeDot}
                  style={{ left: `${rangePosition(listing)}%` }}
                  aria-hidden
                />
              </div>
            </dd>
          </div>
        )}

        {listing && (
          <div className={stat}>
            <dt className={statLabel}>{SYMBOL_ANALYSIS_MESSAGES.statTradeValue}</dt>
            <dd className={statValue}>{formatKrwCompact(listing.tradeValue24h)}</dd>
          </div>
        )}

        {view?.evidence.sentiment && (
          <div className={stat}>
            <dt className={statLabel}>{SYMBOL_ANALYSIS_MESSAGES.statSentiment}</dt>
            <dd className={statValue}>{view.evidence.sentiment.score}</dd>
          </div>
        )}

        {listing?.priceUpdatedAt && (
          <div className={stat}>
            <dt className={statLabel}>{SYMBOL_ANALYSIS_MESSAGES.statUpdatedAt}</dt>
            <dd className={statValue}>
              {formatClockTime(new Date(listing.priceUpdatedAt))}
            </dd>
          </div>
        )}
        </dl>
        {!watchlist.isSignedOut && (
          <WatchlistStarButton
            entry={watched.get(symbol.toUpperCase())}
            displayName={displayName}
            request={{ assetType: WatchlistAssetType.Crypto, symbol, name: displayName }}
          />
        )}
      </div>
    </header>
  );
};

/**
 * 저가~고가 사이에서 현재가가 앉는 위치(%). 폭이 0 이면(고가 = 저가) 가운데 둔다 —
 * 0 으로 나누지 않는다.
 */
const rangePosition = (listing: MarketOverviewItem): number => {
  const span = listing.high24h - listing.low24h;
  if (span <= 0) return 50;

  const ratio = (listing.currentPrice - listing.low24h) / span;
  return Math.min(Math.max(ratio, 0), 1) * 100;
};

export default SymbolHeader;
