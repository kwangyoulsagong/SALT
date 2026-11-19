"use client";

import { useMemo, type ReactNode } from "react";

import {
  EventsCard,
  invalidationToPriceLines,
  ProfitPlan,
  selectModeView,
  TradePlanCard,
  useCoachPanel,
  useSymbolCoach,
  useSymbolEvents,
  useTradePlans,
} from "@/entities/coach";
import { MarketDetailChart, useMarketListing } from "@/entities/market";
import { RecordTradeCard } from "@/features/record-transaction";
import { PreflightCard } from "@/features/run-preflight";
import { usePanelHorizonParam } from "@/features/switch-coach-mode";
import { useLivePrice } from "@repo/web-shared/api";
import { type DetailTab, DetailTabs, SignInRequired } from "@repo/web-shared/ui";
import { detailPanel, detailPanelHead, detailPanelTitle } from "@repo/web-shared/ui/surface.css";

import { SYMBOL_ANALYSIS_MESSAGES as M } from "../model";
import { foldSummary, tradeCell } from "./SymbolAnalysis.css";

/**
 * 코인 상세 본문 — **알약 탭 + 오른쪽 고정 열**(`FE-REQ-049` FR-2 · 3, 사용자 결정 2026-11-19 "합치기").
 *
 * - **개요**: 차트 → 한 장 패널(판단 · 근거 · 성적 · 실패 사례 · 해설). 4블록 결정(F017 v4 순서 6 · `FE-REQ-064` FR-12)을 그대로 —
 *   판단과 3종이 차트와 같은 탭 · 같은 패널에 있다(공통 수용 기준 1)
 * - **일정**: 펼침에 있던 주요 사건(소유자만 — 비소유자 · 불러오는 중엔 탭도 없다, ADR-003 "응답에 없다")
 * - **오른쪽 고정 열 = 내 거래**: 주문 전 체크 → 내 계획(내 선) → 거래 기록 → 익절 플랜(접힘). 1280 미만이면 탭 "내 거래"
 *
 * 조회: 패널(`useCoachPanel`) · 판단(`useSymbolCoach`)은 패널 위젯과 같은 쿼리 키 — 요청은 한 번씩. 패널 위젯은 다른 위젯이라 페이지가
 * 끼워 준다(`fsd-widgets.md` cross-slice 금지)
 */
export const SymbolAnalysis = ({ symbol, scenarioPanel }: { symbol: string; scenarioPanel?: ReactNode }) => {
  const panel = useCoachPanel(symbol);
  const coach = useSymbolCoach(symbol);
  const [horizon] = usePanelHorizonParam();
  const events = useSymbolEvents(symbol);
  const showEvents = !events.isSignedOut && !events.notOwner && Boolean(events.data);
  // 현재가 — 거래 기록의 [현재가] · 내 선 카드가 같이 쓴다(F009). 구독은 머리 가격과 참조 카운트로 합쳐진다
  const livePrice = useLivePrice(symbol)?.currentPrice ?? null;
  const plans = useTradePlans(symbol);
  const listing = useMarketListing(symbol);

  // 기간 탭이 고른 모드(서버 `horizonMode`) — 주문 전 체크 · 익절 플랜이 같은 모드를 쓴다. 패널이 오기 전엔 판단 기본 모드
  const panelMode = panel.data ? panel.data.horizonMode[horizon] : undefined;
  const mode = panelMode ?? coach.data?.mode;
  const modeView = coach.data && mode ? selectModeView(coach.data, mode) : null;
  // 주문 전 체크의 모드 — 판단이 오기 전에는 기다리고(모드가 바뀌며 두 번 계산하지 않게), 못 받았으면 서버 기본값
  const preflightMode = mode ?? (coach.isPending && !coach.isSignedOut ? null : "scalp");
  // 차트 위 틀리는 선 — 패널 ④ 줄과 같은 칸(같은 기간)
  const priceLines = useMemo(
    () => invalidationToPriceLines(panel.data?.scenario.horizons.find((h) => h.horizon === horizon)),
    [panel.data, horizon],
  );

  const overview = (
    <>
      <section className={detailPanel} aria-labelledby="chart-heading">
        <div className={detailPanelHead}>
          <h2 id="chart-heading" className={detailPanelTitle}>
            {M.chartHeading}
          </h2>
        </div>
        <MarketDetailChart symbol={symbol} displayName={listing.item?.koreanName ?? symbol} priceLines={priceLines} />
      </section>
      {/* 한 장 패널 — 로그인 없이 보면 유리막(AI 칸, `FE-REQ-070`). 패널 면은 끼우는 페이지가 준다(국내와 같은 면) */}
      {scenarioPanel && (
        <SignInRequired what={M.guestWhat.scenario} minHeight={480}>
          {scenarioPanel}
        </SignInRequired>
      )}
    </>
  );

  const tabs: DetailTab[] = [{ id: "overview", label: M.tabs.overview, content: overview }];
  if (showEvents && events.data) {
    tabs.push({ id: "events", label: M.tabs.events, content: <EventsCard className={detailPanel} result={events.data} /> });
  }

  // 내 거래 — 주문 전 체크 · 계획(내 선) · 거래 기록 · 익절 플랜을 한 패널로(FR-3 순서: 주문 전 체크 → 내 계획 · 거래 기록)
  const trade = (
    <section className={detailPanel} aria-labelledby="my-trade-heading">
      <div className={detailPanelHead}>
        <h2 id="my-trade-heading" className={detailPanelTitle}>
          {M.tradeHeading}
        </h2>
      </div>
      <SignInRequired what={M.guestWhat.preflight} minHeight={120}>
        {preflightMode && (
          <PreflightCard
            className={tradeCell}
            symbol={symbol}
            mode={preflightMode}
            // 실시간 값이 아직 없으면 공개 시세(서버 조회)로 — 진입가 기본 = 현재가(FR-151)
            livePrice={livePrice ?? listing.item?.currentPrice ?? null}
          />
        )}
      </SignInRequired>
      {plans.data && <TradePlanCard className={tradeCell} result={plans.data} livePrice={livePrice} showDisclosure={false} />}
      {plans.isError && !plans.isSignedOut && (
        <TradePlanCard className={tradeCell} result={{ status: "unavailable" }} livePrice={livePrice} showDisclosure={false} />
      )}
      <SignInRequired what={M.guestWhat.record} minHeight={120}>
        <RecordTradeCard className={tradeCell} symbol={symbol} livePrice={livePrice} />
      </SignInRequired>
      {/* 익절 플랜 — 기능은 그대로, 내 선 아래 접힘(FR-12 "익절 플랜 → 내 선") */}
      {modeView && (
        <details className={tradeCell}>
          <summary className={foldSummary}>{M.profitPlanHeading}</summary>
          <ProfitPlan zone={modeView.zone} headingAs={3} />
        </details>
      )}
    </section>
  );

  return <DetailTabs label={M.tabsLabel} tabs={tabs} aside={{ id: "trade", label: M.tabs.trade, content: trade }} />;
};

export default SymbolAnalysis;
