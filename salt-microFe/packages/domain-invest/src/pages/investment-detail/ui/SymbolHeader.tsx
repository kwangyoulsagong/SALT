import { AssetIcon } from "@repo/ui/assetIcon";
import { ShieldCheck } from "lucide-react";

import type { MarketOverviewItem } from "@/entities/market";
import { PREFLIGHT_ANCHOR_ID } from "@repo/web-shared/config";
import { formatKrwCompact, formatPrice, formatSeoulClockTime } from "@repo/web-shared/lib";

import { INVESTMENT_DETAIL_PAGE_MESSAGES as MESSAGES } from "../model";
import { actions, chip, code, head, headButton, headRow, name as nameStyle, nameRow, side, stat, statLabel, stats, statValue } from "./DetailHead.css";
import { HeaderWatchlistStar } from "./HeaderWatchlistStar";
import { LivePriceRow } from "./LivePriceRow";
import { RangeBar } from "./RangeBar";

interface SymbolHeaderProps {
  symbol: string;
  /** 서버가 받은 공개 시세. 못 받았으면 `null` — 이름 자리에 심볼만 둔다 */
  listing: MarketOverviewItem | null;
}

/**
 * 코인 상세 머리 2줄(`FE-REQ-049` FR-1 · `FE-REQ-026` FR-131) — **서버 컴포넌트다. 브라우저 JS 가 0 이다.**
 *
 * 1줄 로고 · 이름 · 코드 · 시장 칩 · 관심 별 / 2줄 가격 · 24시간 등락. 오른쪽 범위 막대(24시간) · 거래대금 · 시세 기준 · [주문 전 체크].
 * 코인 응답엔 52주 고저가 없어 범위 막대는 하나다(계약 변경 없음 — FR-1 · 체크리스트). 통계가 넷보다 적어 [더 보기] 도 없다.
 *
 * 왜 서버인가: SEO(크롤러가 받는 HTML 에 이름 · 가격 · 지표) · 번들(클라이언트로 두면 `entities/market` 배럴이 미리보기 · 차트 로더를
 * 끌고 와 110 → 161 kB, 2026-09-23 실측). 클라이언트 잎은 가격 줄(`LivePriceRow`, WS)과 관심 별(`HeaderWatchlistStar`, 지연 로딩)뿐.
 * 시세 기준 시각은 서울 시각으로 고정한다 — 서버 타임존이 무엇이든 같은 글자가 나온다.
 */
export const SymbolHeader = ({ symbol, listing }: SymbolHeaderProps) => {
  const displayName = listing?.koreanName ?? symbol;

  return (
    <header className={head}>
      <div className={headRow}>
        <div className={nameRow}>
          <AssetIcon symbol={symbol} src={listing?.logoUrl || undefined} name={displayName} size="sm" />
          <h1 className={nameStyle}>{displayName}</h1>
          <span className={code}>{symbol.toUpperCase()}</span>
          <span className={chip}>{MESSAGES.marketCrypto}</span>
          <HeaderWatchlistStar symbol={symbol} displayName={displayName} />
        </div>
        <div className={actions}>
          {/*
            주문 전 체크(FR-131 · FR-155) — 해시 링크 하나라 머리에 JS 가 늘지 않는다. 넓은 화면은 오른쪽 고정 열의 카드로 스크롤 + 포커스,
            1280 미만은 "내 거래" 탭을 연 뒤 같은 카드로(`DetailTabs`), 좁은 폭은 시트(`features/run-preflight`). 주문 버튼이 아니다
          */}
          <a href={`#${PREFLIGHT_ANCHOR_ID}`} className={headButton}>
            <ShieldCheck size={16} aria-hidden="true" />
            {MESSAGES.preflight}
          </a>
        </div>
      </div>

      <div className={headRow}>
        <LivePriceRow
          symbol={symbol}
          name={displayName}
          logoUrl={listing?.logoUrl || null}
          initialPrice={listing?.currentPrice ?? null}
          initialChange24h={listing?.change24h ?? null}
        />
        {listing && (
          <div className={side}>
            <RangeBar
              label={MESSAGES.statRange}
              low={listing.low24h}
              high={listing.high24h}
              current={listing.currentPrice}
              srText={MESSAGES.rangeSr(MESSAGES.statRange, formatPrice(listing.low24h), formatPrice(listing.high24h))}
            />
            <dl className={stats}>
              <div className={stat}>
                <dt className={statLabel}>{MESSAGES.statTradeValue}</dt>
                <dd className={statValue}>{formatKrwCompact(listing.tradeValue24h)}</dd>
              </div>
              {listing.priceUpdatedAt && (
                <div className={stat}>
                  <dt className={statLabel}>{MESSAGES.statUpdatedAt}</dt>
                  <dd className={statValue}>{formatSeoulClockTime(new Date(listing.priceUpdatedAt))}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </header>
  );
};

export default SymbolHeader;
