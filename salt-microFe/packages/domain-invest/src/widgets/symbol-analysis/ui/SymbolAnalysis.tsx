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
import { SignInRequired } from "@repo/web-shared/ui";

import { SYMBOL_ANALYSIS_MESSAGES as M } from "../model";
import {
  area,
  card,
  cardHead,
  cardTitle,
  foldSummary,
  grid,
  layout,
  more,
  moreBody,
  moreHint,
  moreSummary,
  tradeCell,
} from "./SymbolAnalysis.css";

/**
 * 코인 상세 본문 — **4블록 + 펼침**(F017 v4 순서 6 · `FE-REQ-064` FR-12 · 시안 "PC · 종목 상세").
 *
 * 가격 줄(머리 — 페이지가 서버에서 그린다) · 차트 · 한 장 패널 · 내 거래. 나머지는 펼침.
 * 기준은 "사기 전 · 들고 있을 때 · 팔기 전 결정에 쓰이나"(사용자 위임 2026-11-13).
 *
 * - **패널로 합침**: 판단 카드(요약 · 상세 · 단타/장기 스위치) · 왜 움직였나 카드 · 성적 — 한 장 패널이 그린다
 * - **자리만 옮김**: 주문 전 체크 · 계획(내 선) · 익절 플랜 → 내 거래 한 칸 · 관찰 구간 → 차트 위 틀리는 선(패널과 같은 기간 탭)
 * - **펼침**: 일정(주요 사건)
 * - **삭제**: 쏠림 카드(내 선과 겹침) · 구간 표 · 범례 · 하단 고정 면책(패널 아래 한 번) — 계산은 서버에 남는다
 *
 * 조회: 패널(`useCoachPanel`) · 판단(`useSymbolCoach`)은 패널 위젯과 같은 쿼리 키 — 요청은 한 번씩. 패널 위젯은 다른 위젯이라 페이지가
 * 끼워 준다(`fsd-widgets.md` cross-slice 금지)
 */
export const SymbolAnalysis = ({ symbol, scenarioPanel }: { symbol: string; scenarioPanel?: ReactNode }) => {
  const panel = useCoachPanel(symbol);
  const coach = useSymbolCoach(symbol);
  const [horizon] = usePanelHorizonParam();
  // 주요 사건(거시 일정) — 소유자 규칙(F008 슬라이스 22). 불러오는 중 · 비소유자엔 펼침 자리도 없다(ADR-003 "응답에 없다")
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

  return (
    <div className={layout}>
      <div className={grid}>
        <section className={`${card} ${area.chart}`}>
          <div className={cardHead}>
            <h2 className={cardTitle}>{M.chartHeading}</h2>
          </div>
          <MarketDetailChart symbol={symbol} displayName={listing.item?.koreanName ?? symbol} priceLines={priceLines} />
        </section>

        {/* 한 장 패널 — 로그인 없이 보면 유리막(AI 칸, `FE-REQ-070`). 겉 카드는 이 화면 카드와 같게 */}
        <div className={area.panel}>
          {scenarioPanel && (
            <SignInRequired what={M.guestWhat.scenario} minHeight={480}>
              <div className={card}>{scenarioPanel}</div>
            </SignInRequired>
          )}
        </div>

        {/* 내 거래 — 계획(내 선) · 주문 전 체크 · 거래 기록 · 익절 플랜을 한 칸으로(시안 "내 거래 · 내 선") */}
        <section className={`${card} ${area.trade}`} aria-labelledby="my-trade-heading">
          <div className={cardHead}>
            <h2 id="my-trade-heading" className={cardTitle}>
              {M.tradeHeading}
            </h2>
          </div>
          {plans.data && <TradePlanCard className={tradeCell} result={plans.data} livePrice={livePrice} showDisclosure={false} />}
          {plans.isError && !plans.isSignedOut && (
            <TradePlanCard className={tradeCell} result={{ status: "unavailable" }} livePrice={livePrice} showDisclosure={false} />
          )}
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

        {showEvents && events.data && (
          <details className={`${more} ${area.more}`}>
            <summary className={moreSummary}>
              {M.moreSummary}
              <span className={moreHint}>{M.moreHint}</span>
            </summary>
            <div className={moreBody}>
              <EventsCard className={card} result={events.data} />
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

export default SymbolAnalysis;
