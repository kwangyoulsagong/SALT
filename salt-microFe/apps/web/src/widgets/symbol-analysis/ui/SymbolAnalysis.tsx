"use client";

import { Text } from "@repo/ui/text";
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
  zoneToPriceBand,
  zoneToPriceLines,
} from "@/entities/coach";
import { MarketDetailChart, useMarketListing } from "@/entities/market";
import { ExplainCard } from "@/features/explain-symbol";
import { CoachModeSwitch, useCoachModeParam } from "@/features/switch-coach-mode";

import { SYMBOL_ANALYSIS_MESSAGES } from "../model";
import {
  card,
  cardHead,
  cardTitle,
  column,
  disclaimerBar,
  disclaimerLabel,
  grid,
  layout,
} from "./SymbolAnalysis.css";

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
 * 그대로 한 줄이다. 머리(뒤로 · 종목 · 가격)는 서버에서도 그려지도록 페이지(`pages/investment-detail`)에 있다.
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
  const priceBand = useMemo(
    () => (modeView ? zoneToPriceBand(modeView.zone) : null),
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
    return <JudgmentDetail view={modeView} mode={mode} />;
  };

  return (
    <>
      <div className={layout}>
        <div className={grid}>
          <div className={column}>
            <section className={card}>
              <div className={cardHead}>
                <h2 className={cardTitle}>{SYMBOL_ANALYSIS_MESSAGES.chartHeading}</h2>
              </div>
              <MarketDetailChart
                symbol={symbol}
                displayName={listing.item?.koreanName ?? symbol}
                priceLines={priceLines}
                priceBand={priceBand}
                legend={<ZoneLegend lines={priceLines} />}
              />
              {modeView ? (
                <ZoneSummary zone={modeView.zone} />
              ) : (
                coach.isPending && !coach.isSignedOut && <CoachBlockSkeleton block="zone" />
              )}
            </section>

            <section className={card}>
              <div className={cardHead}>
                <h2 className={cardTitle}>{SYMBOL_ANALYSIS_MESSAGES.coachHeading}</h2>
                {coach.data && mode && <CoachModeSwitch value={mode} onChange={setMode} />}
              </div>
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
                {/* 제목을 붙이지 않는다 — `ProfitPlan` 이 자기 제목을 그린다(두 번 나온다) */}
                {modeView && (
                  <section className={card}>
                    <ProfitPlan zone={modeView.zone} />
                  </section>
                )}
              </>
            )}
          </aside>
        </div>
      </div>

      {coach.data?.disclaimer && (
        <div className={disclaimerBar} role="note">
          <span className={disclaimerLabel}>
            {SYMBOL_ANALYSIS_MESSAGES.disclaimerLabel}
          </span>
          <span>{coach.data.disclaimer}</span>
        </div>
      )}
    </>
  );
};

export default SymbolAnalysis;
