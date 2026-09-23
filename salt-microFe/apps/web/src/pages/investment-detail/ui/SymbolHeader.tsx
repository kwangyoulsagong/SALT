"use client";

import { Image } from "@repo/ui/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { useSymbolCoach } from "@/entities/coach";
import {
  ChangeRateCell,
  indexWatchlistBySymbol,
  type MarketOverviewItem,
  useMarketListing,
  useWatchlist,
  WatchlistAssetType,
} from "@/entities/market";
import { COACH_MODE_PARAM } from "@/features/switch-coach-mode";
import { WatchlistStarButton } from "@/features/toggle-watchlist";
import { useHasAccessToken } from "@/shared/api";
import { ROUTES } from "@/shared/config";
import { formatClockTime, formatKrwCompact, formatPrice } from "@/shared/lib";
import { backLink } from "@/shared/ui/surface.css";

import { INVESTMENT_DETAIL_PAGE_MESSAGES as MESSAGES } from "../model";
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
} from "./SymbolHeader.css";

/** 헤더 로고 — 참고 화면 실측 28px 원형 */
const LOGO_SIZE = 28;

/**
 * 종목 헤더 (`FE-REQ-026` FR-131) — **서버에서도 렌더된다.**
 *
 * ## 서버 HTML 에 종목 이름 · 가격이 있어야 한다 (SEO)
 *
 * 본문(차트 · 판단)은 토큰 · 캔버스 때문에 브라우저 전용이다. 머리까지 그 안에 있으면 크롤러가 받는
 * HTML 에 종목 이름도 가격도 없었다. 그래서 머리를 페이지로 꺼내고, 서버가 받은 공개 시세
 * (`initialListing`)로 첫 렌더를 한다. 브라우저에서는 같은 시세를 다시 받아 갈아 끼운다.
 *
 * ## 수화가 어긋나지 않게
 *
 * - 관심 별은 **토큰이 있다고 확인된 뒤**(`useHasAccessToken() === true`)에만 그린다 — 렌더 중
 *   `localStorage` 를 읽으면 서버(없음)와 브라우저(있음)가 갈린다
 * - 시세 기준 시각은 타임존에 따라 문자열이 달라 그 칸만 수화 경고를 끈다
 * - 심리 온도는 코치 판단이 온 뒤(브라우저)에만 생긴다 — 첫 렌더에는 양쪽 다 없다
 *
 * ## 이름과 가격을 같은 크기로 두지 않는다
 *
 * 이 화면에서 사람이 가장 먼저 찾는 것은 **가격**이다 — 이름은 한 줄 위 작게, 가격은 그 아래 크게.
 * 지표는 서버가 준 값만 싣는다 — 범위 막대의 점 위치만 세 값으로 정하는 표시 기하다.
 */
export const SymbolHeader = ({
  symbol,
  initialListing,
}: {
  symbol: string;
  initialListing: MarketOverviewItem | null;
}) => {
  const live = useMarketListing(symbol);
  const listing = live.item ?? initialListing ?? undefined;
  const view = useSymbolCoach(symbol).data;
  const signedIn = useHasAccessToken();
  const watchlist = useWatchlist();
  const watched = useMemo(
    () => indexWatchlistBySymbol(watchlist.data?.items ?? []),
    [watchlist.data],
  );

  const mode = useSearchParams()?.get(COACH_MODE_PARAM);
  const backHref = mode
    ? `${ROUTES.investments}?${COACH_MODE_PARAM}=${encodeURIComponent(mode)}`
    : ROUTES.investments;

  const displayName = listing?.koreanName ?? symbol;
  const currentPrice = listing?.currentPrice ?? view?.evidence.price ?? null;
  const change = listing?.change24h ?? view?.evidence.change24h ?? null;

  return (
    <>
    <Link href={backHref} className={backLink}>
      {`\u2039 ${MESSAGES.back}`}
    </Link>
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
            <dt className={statLabel}>{MESSAGES.statRange}</dt>
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
            <dt className={statLabel}>{MESSAGES.statTradeValue}</dt>
            <dd className={statValue}>{formatKrwCompact(listing.tradeValue24h)}</dd>
          </div>
        )}

        {view?.evidence.sentiment && (
          <div className={stat}>
            <dt className={statLabel}>{MESSAGES.statSentiment}</dt>
            <dd className={statValue}>{view.evidence.sentiment.score}</dd>
          </div>
        )}

        {listing?.priceUpdatedAt && (
          <div className={stat}>
            <dt className={statLabel}>{MESSAGES.statUpdatedAt}</dt>
            <dd className={statValue} suppressHydrationWarning>
              {formatClockTime(new Date(listing.priceUpdatedAt))}
            </dd>
          </div>
        )}
        </dl>
        {signedIn === true && !watchlist.isSignedOut && (
          <WatchlistStarButton
            entry={watched.get(symbol.toUpperCase())}
            displayName={displayName}
            request={{ assetType: WatchlistAssetType.Crypto, symbol, name: displayName }}
          />
        )}
      </div>
    </header>
    </>
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
