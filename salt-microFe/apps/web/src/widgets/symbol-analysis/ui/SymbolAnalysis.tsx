"use client";

import type { CoachMode, SymbolCoachViewModel } from "@repo/core/coach";
import { Heading } from "@repo/ui/heading";
import { Image } from "@repo/ui/image";
import { Text } from "@repo/ui/text";
import Link from "next/link";
import { useMemo } from "react";

import {
  COACH_MESSAGES,
  CoachBlockSkeleton,
  JudgmentDetail,
  ProfitPlan,
  selectModeView,
  useSymbolCoach,
  ZoneLegend,
  ZoneSummary,
  zoneToPriceLines,
} from "@/entities/coach";
import {
  ChangeRateCell,
  indexWatchlistBySymbol,
  MarketDetailChart,
  type MarketOverviewItem,
  PriceCell,
  useMarketListing,
  useWatchlist,
  WatchlistAssetType,
} from "@/entities/market";
import { ExplainCard } from "@/features/explain-symbol";
import {
  COACH_MODE_PARAM,
  CoachModeSwitch,
  useCoachModeParam,
} from "@/features/switch-coach-mode";
import { WatchlistStarButton } from "@/features/toggle-watchlist";

import { SYMBOL_ANALYSIS_MESSAGES } from "../model";
import {
  backLink,
  card,
  column,
  grid,
  hero,
  heroName,
  heroPrice,
  layout,
} from "./SymbolAnalysis.css";

const LOGO_SIZE = 48;

/** 뒤로 — 투자 화면으로. 모드를 들고 간다(패널과 같은 URL 상태, FR-111) */
const backHref = (mode: CoachMode | undefined) =>
  mode ? `/investments?${COACH_MODE_PARAM}=${mode}` : "/investments";

/**
 * Hero — 뒤로 · 종목 · 현재가 · 변동률 · [관심 추가] (`FE-REQ-026` FR-131).
 *
 * **[알림 만들기]가 없다**(B19 · B23). [주문 전 체크]도 아직 없다 — 서버가 손절 %(`stopLossRate`)
 * 를 받지 않아 주문 전 체크 슬라이스가 서버 뒤에 있다. 관심 추가는 기존 별 버튼이고, 성공하면
 * 관심 목록 쿼리만 무효화한다(`FE-REQ-028` FR-88 — 코치 쿼리를 건드리지 않는다).
 */
const Hero = ({
  symbol,
  listing,
  view,
  mode,
}: {
  symbol: string;
  listing: MarketOverviewItem | undefined;
  view: SymbolCoachViewModel | undefined;
  mode: CoachMode | undefined;
}) => {
  const watchlist = useWatchlist();
  const watched = useMemo(
    () => indexWatchlistBySymbol(watchlist.data?.items ?? []),
    [watchlist.data],
  );
  const name = listing?.koreanName ?? symbol;
  const price = listing?.currentPrice ?? view?.evidence.price ?? null;
  const change = listing?.change24h ?? view?.evidence.change24h ?? null;

  return (
    <header className={layout}>
      <Link href={backHref(mode)} className={backLink}>
        {`← ${SYMBOL_ANALYSIS_MESSAGES.back}`}
      </Link>
      <div className={hero}>
        {listing?.logoUrl && (
          <Image
            radius={9999}
            width={LOGO_SIZE}
            height={LOGO_SIZE}
            src={listing.logoUrl}
            alt={name}
          />
        )}
        <div className={heroName}>
          <Heading level={2}>{name}</Heading>
          <div className={heroPrice}>
            {price !== null && <PriceCell value={price} />}
            {change !== null && <ChangeRateCell value={change} />}
          </div>
        </div>
        {!watchlist.isSignedOut && (
          <WatchlistStarButton
            entry={watched.get(symbol.toUpperCase())}
            displayName={name}
            request={{ assetType: WatchlistAssetType.Crypto, symbol, name }}
          />
        )}
      </div>
    </header>
  );
};

/**
 * 상세 분석 페이지 본문 (`FE-REQ-026` L · FR-130~138).
 *
 * ## 한 번 불러 두 모드를 다 그린다
 *
 * 패널과 **같은** 조회 · 같은 쿼리 키다(`coachQueryKeys.symbol`). 모드 전환은 같은 응답을 다르게
 * 읽을 뿐이라 차트 선 · 구간 표 · 코치 카드가 **함께** 바뀌고 요청이 없다(FR-138 · FR-112).
 * 해설 카드는 `key={mode}` 라 모드가 바뀌면 새로 만들어진다 — 진행 중 요청은 끊기고 버튼
 * 상태로 돌아간다.
 *
 * ## 조회가 클라이언트다
 *
 * `FE-REQ-028` FR-84 는 서버 컴포넌트 1회 조회를 적었다. 토큰이 `localStorage` 에 있어 서버가
 * 볼 수 없다(`FE-REQ-013` 전). 경로가 하나라 FR-84 가 걱정한 "두 경로의 staleness 차이"도 없다.
 *
 * 레이아웃: PC 는 좌(차트 · 구간 · 코치 카드) / 우(해설 · 수익 플랜), 1024px 이하는 그 순서
 * 그대로 한 줄이다.
 */
export const SymbolAnalysis = ({ symbol }: { symbol: string }) => {
  const coach = useSymbolCoach(symbol);
  const listing = useMarketListing(symbol);
  const [mode, setMode] = useCoachModeParam(coach.data?.mode);

  const modeView = coach.data && mode ? selectModeView(coach.data, mode) : null;
  const priceLines = useMemo(
    () => (modeView ? zoneToPriceLines(modeView.zone) : []),
    [modeView],
  );

  const explainSubject = listing.item
    ? {
        symbol,
        koreanName: listing.item.koreanName,
        currentPrice: listing.item.currentPrice,
        change24h: listing.item.change24h,
        tradeValue24h: listing.item.tradeValue24h,
      }
    : null;

  const renderCoach = () => {
    if (coach.isSignedOut) return <Text color="tertiary">{COACH_MESSAGES.signedOut}</Text>;
    if (coach.isError) {
      return <Text color="tertiary">{COACH_MESSAGES.judgmentUnavailable}</Text>;
    }
    if (coach.isPending || !coach.data || !mode) {
      return <CoachBlockSkeleton block="judgment" />;
    }
    return (
      <>
        <CoachModeSwitch value={mode} onChange={setMode} />
        <JudgmentDetail view={modeView} mode={mode} />
      </>
    );
  };

  return (
    <div className={layout}>
      <Hero symbol={symbol} listing={listing.item} view={coach.data} mode={mode} />
      <div className={grid}>
        <div className={column}>
          <section className={card}>
            <MarketDetailChart
              symbol={symbol}
              priceLines={priceLines}
              legend={<ZoneLegend lines={priceLines} />}
            />
            {modeView ? (
              <ZoneSummary zone={modeView.zone} />
            ) : (
              coach.isPending && !coach.isSignedOut && <CoachBlockSkeleton block="zone" />
            )}
          </section>
          <section className={card}>
            <Heading level={4}>{SYMBOL_ANALYSIS_MESSAGES.coachHeading}</Heading>
            {renderCoach()}
          </section>
        </div>
        <aside className={column}>
          {coach.data && mode && (
            <>
              <ExplainCard
                key={mode}
                className={card}
                view={coach.data}
                mode={mode}
                subject={explainSubject}
              />
              {modeView && (
                <div className={card}>
                  <ProfitPlan zone={modeView.zone} />
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
};

export default SymbolAnalysis;
