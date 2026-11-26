"use client";

// 클라이언트 잎: 블록마다 BFF 를 따로 받는다(하나가 늦거나 실패해도 나머지는 그린다 — `bff-architecture.md` §4).
import type { ReactNode } from "react";

import { Skeleton } from "@repo/ui/skeleton";
import { StatusLine } from "@repo/ui/statusLine";

import { countUsage } from "@repo/web-shared/api";

import {
  HOME_CARD_MESSAGES,
  HOME_DASHBOARD_MESSAGES as M,
  HomeBlock,
  HomeBriefingView,
  HomeChartBlock,
  HomeKpiStrip,
  HomeMarketEvents,
  HomeMarketView,
  HomeRecentList,
  HomeUpcomingList,
  useHomeBriefing,
  useHomeCards,
  useHomeMarket,
  useHomeWeeklyPlan,
  type HomeDomain,
  type HomeSummaryCard,
} from "@/entities/home";

import { cell, dashboard, fill, grid, skeletonKpi, skeletonRow, wide } from "./HomeCards.css";

type BlockState = "ok" | "loading" | "error";
const stateOf = (query: { isPending: boolean; isError: boolean }): BlockState => (query.isError ? "error" : query.isPending ? "loading" : "ok");

/** 카드 → 클릭 계측(도메인 사용 한 번 — `FE-REQ-055` FR-9, 기다리지 않는다) */
const Tracked = ({ domain, children }: { domain: HomeDomain; children: ReactNode }) => (
  <div className={fill} onClickCapture={() => countUsage(domain, "card_click")}>
    {children}
  </div>
);

/**
 * 홈 대시보드(2026-11-26 — `FE-REQ-048` FR-14~18). 순서 · 숨김은 BFF `order` · `hidden`(숨긴 도메인 블록은 그리지 않는다 · 투자를 숨기면
 * 시장 · 코치 · 적립도 부르지 않는다). 값은 전부 서버 · BFF — 화면은 칸에 놓기만.
 */
export const HomeCards = () => {
  const home = useHomeCards();
  const investOn = home.data ? !home.data.hidden.includes("invest") : false;
  const market = useHomeMarket(investOn);
  const briefing = useHomeBriefing(investOn);
  const plan = useHomeWeeklyPlan(investOn);

  if (home.isPending) {
    return (
      <div role="status" aria-busy="true" aria-label={HOME_CARD_MESSAGES.loading} className={dashboard}>
        <div className={skeletonKpi}>
          <Skeleton height={108} radius="medium" />
        </div>
        <div className={grid}>
          {[0, 1, 2].map((index) => (
            <div key={index} className={skeletonRow}>
              <Skeleton height={300} radius="medium" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (home.isError) return <StatusLine kind="error">{HOME_CARD_MESSAGES.loadFailed}</StatusLine>;

  const hidden = new Set(home.data.hidden);
  const cards = home.data.order
    .filter((domain) => !hidden.has(domain))
    .map((domain) => home.data.cards.find((card) => card.domain === domain))
    .filter((card): card is HomeSummaryCard => card !== undefined);
  const card = (domain: HomeDomain) => cards.find((c) => c.domain === domain);
  const household = card("household");
  const savings = card("savings");
  const invest = card("invest");

  return (
    <div className={dashboard}>
      <HomeKpiStrip cards={cards} plan={!investOn ? "hidden" : plan.data ?? (plan.isError ? "error" : "loading")} />
      <div className={grid}>
        {household ? (
          <div className={wide}>
            <Tracked domain="household">
              <HomeChartBlock card={household} title={M.spendingTitle} emptyText={M.spendingEmpty} labelledBy="home-spending" />
            </Tracked>
          </div>
        ) : null}
        {savings ? (
          <div className={cell}>
            <Tracked domain="savings">
              <HomeChartBlock card={savings} title={M.goalsTitle} emptyText={M.goalsEmpty} labelledBy="home-goals" />
            </Tracked>
          </div>
        ) : null}
        {invest ? (
          <>
            <div className={wide}>
              <HomeBlock title={M.marketTitle} icon="analysis" href="/investments" labelledBy="home-market">
                <HomeMarketView items={market.data?.items ?? []} state={stateOf(market)} />
              </HomeBlock>
            </div>
            <div className={cell}>
              <HomeBlock title={M.briefingTitle} icon="tip" labelledBy="home-briefing">
                <HomeBriefingView briefing={briefing.data ?? null} state={stateOf(briefing)} />
              </HomeBlock>
            </div>
          </>
        ) : null}
        <div className={wide}>
          <HomeRecentList items={home.data.recent} />
        </div>
        <div className={cell}>
          <HomeUpcomingList items={home.data.upcoming} extra={investOn && market.data ? <HomeMarketEvents events={market.data.events} /> : null} />
        </div>
      </div>
    </div>
  );
};
