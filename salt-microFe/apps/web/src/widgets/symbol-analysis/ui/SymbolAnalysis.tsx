"use client";

import { Text } from "@repo/ui/text";
import { useMemo } from "react";

import {
  COACH_MESSAGES,
  CoachBlockSkeleton,
  EventsCard,
  ExchangeCautionNote,
  PositioningCard,
  ForecastCard,
  JudgmentDetail,
  ProfitPlan,
  selectModeView,
  TradePlanCard,
  useSymbolCoach,
  useSymbolEvents,
  useSymbolPositioning,
  useSymbolForecast,
  useTradePlans,
  ZoneLegend,
  ZoneSummary,
  zoneToPriceBand,
  zoneToPriceLines,
} from "@/entities/coach";
import { MarketDetailChart, useMarketListing } from "@/entities/market";
import { ExplainCard } from "@/features/explain-symbol";
import { RecordTradeCard } from "@/features/record-transaction";
import {
  CoachModeSwitch,
  useCoachModeParam,
} from "@/features/switch-coach-mode";
import { useLivePrice } from "@/shared/api";

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
  more,
  moreBody,
  moreHint,
  moreSummary,
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
 * 레이아웃(F010 슬라이스 3 재배치 · 리서치 §9-4): PC 는 좌(코치 판단 → 차트 · 구간) / 우(자세히[변동 범위 · 주요 사건 ·
 * 쏠림] → 해설 → 수익 플랜 → 내 계획 → 거래 기록), 1024px 이하는 그 순서 그대로 한 줄이다. 첫 화면에 판정이 있다. 머리(뒤로 · 종목 · 가격)는 서버에서도 그려지도록 페이지(`pages/investment-detail`)에 있다.
 */
export const SymbolAnalysis = ({ symbol }: { symbol: string }) => {
  const coach = useSymbolCoach(symbol);
  // 가격 변동 범위 — 소유자만(F008 `FE-REQ-038`). 404 는 "없는 섹션"이다 — 자리도 문구도 없다
  const forecast = useSymbolForecast(symbol);
  const showForecast = !forecast.isSignedOut && !forecast.notOwner;
  // 주요 사건(거시 일정) — 전망과 같은 소유자 규칙(F008 슬라이스 22)
  const events = useSymbolEvents(symbol);
  const showEvents = !events.isSignedOut && !events.notOwner;
  // 쏠림 신호(펀딩비 · 김치 프리미엄) — 같은 소유자 규칙(F008 슬라이스 23)
  const positioning = useSymbolPositioning(symbol);
  const showPositioning = !positioning.isSignedOut && !positioning.notOwner;
  // 현재가 — 전망 차트 선 끝 · 거래 기록의 [현재가] · 내 계획 카드가 같이 쓴다(F009). 구독은 머리 가격과
  // 참조 카운트로 합쳐져 소켓 메시지가 늘지 않는다
  const livePrice = useLivePrice(symbol)?.currentPrice ?? null;
  // 내 계획(F009 `FE-REQ-039`) — 모든 계정. 로그인 안 했으면 부르지 않는다
  const plans = useTradePlans(symbol);
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

  // 소유자 카드(변동 범위 · 주요 사건 · 쏠림)는 "자세히" 뒤로 접는다(F010 `FE-REQ-040` FR-8 · 리서치 §9-4 ⑤).
  // 판정 · 차트 · 내 계획보다 먼저 보일 이유가 없다. 셋 다 그릴 것이 없으면(비소유자 · 불러오는 중) 접는 자리도 없다 —
  // 비소유자에게 "자세히"가 스치면 기능이 있다는 것이 드러난다(ADR-003)
  const hasOwnerCards =
    (showForecast && (Boolean(forecast.data) || forecast.isError)) ||
    (showEvents && Boolean(events.data)) ||
    (showPositioning && Boolean(positioning.data));
  const ownerCards = hasOwnerCards ? (
    <details className={more}>
      <summary className={moreSummary}>
        {SYMBOL_ANALYSIS_MESSAGES.moreSummary}
        <span className={moreHint}>{SYMBOL_ANALYSIS_MESSAGES.moreHint}</span>
      </summary>
      <div className={moreBody}>
        {/*
          불러오는 중에는 자리를 그리지 않는다 — 비소유자에게 "불러오는 중"이 스쳤다 사라지면 기능이 있다는 것이
          드러난다(ADR-003 "응답에 없다"). 데이터가 오면 그때 나타난다(배치가 미리 계산해 빠르다 — 뷰 5ms).
        */}
        {showForecast &&
          (forecast.data ? (
            <ForecastCard
              className={card}
              result={forecast.data}
              livePrice={livePrice}
            />
          ) : forecast.isError ? (
            <ForecastCard className={card} result={{ status: "unavailable" }} />
          ) : null)}
        {showEvents && events.data && (
          <EventsCard className={card} result={events.data} />
        )}
        {showPositioning && positioning.data && (
          <PositioningCard className={card} result={positioning.data} />
        )}
      </div>
    </details>
  ) : null;

  const renderCoach = () => {
    if (coach.isSignedOut)
      return <Text color="tertiary">{COACH_MESSAGES.signedOut}</Text>;
    if (coach.isError) {
      return <Text color="tertiary">{COACH_MESSAGES.judgmentUnavailable}</Text>;
    }
    if (coach.isPending || !coach.data || !mode) {
      return <CoachBlockSkeleton block="judgment" />;
    }
    return (
      <>
        <JudgmentDetail view={modeView} mode={mode} />
        <ExchangeCautionNote flag={coach.data.exchangeFlag} />
      </>
    );
  };

  return (
    <>
      <div className={layout}>
        <div className={grid}>
          <div className={column}>
            {/* 판정이 첫 카드다(F010 `FE-REQ-040` FR-8 · 리서치 §9-4 ①) — 차트는 판정을 읽은 뒤 확인하는 자리 */}
            <section className={card}>
              <div className={cardHead}>
                <h2 className={cardTitle}>
                  {SYMBOL_ANALYSIS_MESSAGES.coachHeading}
                </h2>
                {coach.data && mode && (
                  <CoachModeSwitch value={mode} onChange={setMode} />
                )}
              </div>
              {renderCoach()}
            </section>

            <section className={card}>
              <div className={cardHead}>
                <h2 className={cardTitle}>
                  {SYMBOL_ANALYSIS_MESSAGES.chartHeading}
                </h2>
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
                coach.isPending &&
                !coach.isSignedOut && <CoachBlockSkeleton block="zone" />
              )}
            </section>
          </div>

          <aside className={column}>
            {ownerCards}
            {/* 해설은 판단 바로 옆 정보다 — 거래 기록 폼(펼치면 길다) 아래로 밀리지 않게 위에 둔다 */}
            {coach.data && mode && (
              <>
                <ExplainCard
                  key={mode}
                  className={card}
                  view={coach.data}
                  mode={mode}
                />
                {/* 제목을 붙이지 않는다 — `ProfitPlan` 이 자기 제목을 그린다(두 번 나온다) */}
                {modeView && (
                  <section className={card}>
                    <ProfitPlan zone={modeView.zone} />
                  </section>
                )}
              </>
            )}
            {/* F009 — 변동 범위 카드 아래 "내 계획", 그 아래 거래 기록(시나리오 1 · 2). 새 화면이 아니다 */}
            {plans.data && (
              <TradePlanCard
                className={card}
                result={plans.data}
                livePrice={livePrice}
              />
            )}
            {plans.isError && !plans.isSignedOut && (
              <TradePlanCard
                className={card}
                result={{ status: "unavailable" }}
                livePrice={livePrice}
              />
            )}
            <RecordTradeCard
              className={card}
              symbol={symbol}
              livePrice={livePrice}
            />
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
