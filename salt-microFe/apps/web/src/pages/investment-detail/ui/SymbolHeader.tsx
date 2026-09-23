import { AssetIcon } from "@repo/ui/assetIcon";
import Link from "next/link";

import type { MarketOverviewItem } from "@/entities/market";
import { COACH_MODE_PARAM, ROUTES } from "@/shared/config";
import { formatKrwCompact, formatPrice, formatSeoulClockTime } from "@/shared/lib";
import { backLink } from "@/shared/ui/surface.css";

import { INVESTMENT_DETAIL_PAGE_MESSAGES as MESSAGES } from "../model";
import { HeaderWatchlistStar } from "./HeaderWatchlistStar";
import {
  change as changeStyle,
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

const MINUS = "−";

const formatChange = (percent: number) => {
  const fixed = Math.abs(percent).toFixed(2);
  if (Number(fixed) === 0) return { text: "0.00%", tone: "flat" as const };
  return percent > 0
    ? { text: `+${fixed}%`, tone: "up" as const }
    : { text: `${MINUS}${fixed}%`, tone: "down" as const };
};

/**
 * 저가~고가 사이에서 현재가가 앉는 위치(%). 폭이 0 이면(고가 = 저가) 가운데 둔다 —
 * 0 으로 나누지 않는다. 금액이 아니라 표시 기하다.
 */
const rangePosition = (listing: MarketOverviewItem): number => {
  const span = listing.high24h - listing.low24h;
  if (span <= 0) return 50;
  const ratio = (listing.currentPrice - listing.low24h) / span;
  return Math.min(Math.max(ratio, 0), 1) * 100;
};

interface SymbolHeaderProps {
  symbol: string;
  /** 서버가 받은 공개 시세. 못 받았으면 `null` — 이름 자리에 심볼만 둔다 */
  listing: MarketOverviewItem | null;
  /** 지금 보는 판단 모드 — 뒤로 갈 때 들고 간다(FR-111) */
  mode: string | null;
}

/**
 * 종목 머리 (`FE-REQ-026` FR-131) — **서버 컴포넌트다. 브라우저 JS 가 0 이다.**
 *
 * ## 왜 서버인가
 *
 * 1. SEO — 크롤러가 받는 HTML 에 종목 이름 · 가격 · 지표가 있어야 한다. 본문(차트 · 판단)은 토큰 ·
 *    캔버스 때문에 브라우저 전용이다.
 * 2. 번들 — 클라이언트로 두었더니 `entities/market` 배럴을 따라 미리보기 패널(visx) · 차트 로더가
 *    첫 로드에 딸려 와 110 → 161 kB 가 됐다(2026-09-23 빌드 실측).
 *
 * 잃은 것: 머리 가격의 30초 재조회(실시간 가격은 차트가 보여 준다) · 코치 판단에서 오던 "심리 온도"
 * 칸. 관심 별만 상호작용이라 지연 로딩되는 클라이언트 잎(`HeaderWatchlistStar`)이다.
 *
 * 이름은 한 줄 위 작게, 가격은 그 아래 크게 — 이 화면에서 사람이 먼저 찾는 것은 가격이다.
 * 시세 기준 시각은 서울 시각으로 고정한다 — 서버 타임존이 무엇이든 같은 글자가 나온다.
 */
export const SymbolHeader = ({ symbol, listing, mode }: SymbolHeaderProps) => {
  const displayName = listing?.koreanName ?? symbol;
  const backHref = mode
    ? `${ROUTES.investments}?${COACH_MODE_PARAM}=${encodeURIComponent(mode)}`
    : ROUTES.investments;
  const change = listing ? formatChange(listing.change24h) : null;

  return (
    <>
      <Link href={backHref} className={backLink}>
        {`‹ ${MESSAGES.back}`}
      </Link>
      <header className={headerCard}>
        <div className={identity}>
          <div className={nameRow}>
            <AssetIcon
              symbol={symbol}
              src={listing?.logoUrl || undefined}
              name={displayName}
              size="md"
            />
            <h1 className={nameStyle}>{displayName}</h1>
            <span className={ticker}>{symbol.toUpperCase()}</span>
          </div>

          <div className={priceRow}>
            {listing && <span className={priceStyle}>{formatPrice(listing.currentPrice)}</span>}
            {change && <span className={changeStyle[change.tone]}>{change.text}</span>}
          </div>
        </div>

        <div className={statsRow}>
          {listing && (
            <dl className={stats}>
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
              <div className={stat}>
                <dt className={statLabel}>{MESSAGES.statTradeValue}</dt>
                <dd className={statValue}>{formatKrwCompact(listing.tradeValue24h)}</dd>
              </div>
              {listing.priceUpdatedAt && (
                <div className={stat}>
                  <dt className={statLabel}>{MESSAGES.statUpdatedAt}</dt>
                  <dd className={statValue}>
                    {formatSeoulClockTime(new Date(listing.priceUpdatedAt))}
                  </dd>
                </div>
              )}
            </dl>
          )}
          <HeaderWatchlistStar symbol={symbol} displayName={displayName} />
        </div>
      </header>
    </>
  );
};

export default SymbolHeader;
