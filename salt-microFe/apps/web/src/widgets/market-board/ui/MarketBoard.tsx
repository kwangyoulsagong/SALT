"use client";

// 클라이언트 잎: 탭 상태를 갖고, 실시간 테이블을 ssr:false 로 내린다.
import { FlexBox } from "@repo/ui/flexBox";
import { Heading } from "@repo/ui/heading";
import { Margin } from "@repo/ui/margin";
import { Section } from "@repo/ui/section";
import { ServiceIcon } from "@repo/ui/serviceicon";
import { Tabs } from "@repo/ui/tabs";
import dynamic from "next/dynamic";
import Link from "next/link";
import React, { Suspense, useState } from "react";

import { ROUTES } from "@/shared/config";

import {
  DEFAULT_MARKET_BOARD_TAB,
  MARKET_BOARD_MESSAGES,
  MARKET_BOARD_TABS,
  WATCH_LIST_TAB,
  type PreviewRenderer,
} from "../model";
import { headingRow, reportLink } from "./MarketBoardLayout.css";
import { placeholder as summaryPlaceholder } from "./MarketSummaryStrip.css";

const RealtimeMarketTable = dynamic(
  () =>
    import("./RealtimeMarketTable").then((mod) => mod.RealtimeMarketTable),
  {
    ssr: false,
    loading: () => null,
  }
);

/**
 * 관심 종목 탭도 `ssr:false` 다.
 *
 * 토큰이 `localStorage` 에 있어서(`FE-REQ-008` §6-4) 서버 렌더는 언제나 "로그인 안 됨"을
 * 그리고 클라이언트는 다른 것을 그린다 — 하이드레이션 불일치다. 쿠키로 옮기면
 * (`FE-REQ-013`) 이 탭이 서버 컴포넌트로 내려갈 수 있다.
 */
const WatchlistTab = dynamic(
  () => import("./WatchlistTab").then((mod) => mod.WatchlistTab),
  {
    ssr: false,
    loading: () => null,
  }
);

/**
 * 시장 요약 띠(`FE-REQ-037`)도 `ssr:false` 잎이다. 시세 조회 · WS 가 브라우저에만 있고, 정적으로 부르면
 * 엔티티 barrel 이 페이지 첫 로드에 들어온다(`model/index.ts` 주석). 청크가 오기 전에는 카드 높이만큼
 * 자리를 잡아 탭 · 표가 밀리지 않게 한다(FR-8).
 */
const MarketSummaryStrip = dynamic(
  () => import("./MarketSummaryStrip").then((mod) => mod.MarketSummaryStrip),
  {
    ssr: false,
    loading: () => <div className={summaryPlaceholder} aria-hidden="true" />,
  }
);

interface MarketBoardProps {
  /** 우측 패널. 페이지가 AI 코치 패널을 주입한다 — `model/previewSlot.ts` */
  renderPreview?: PreviewRenderer;
}

/** 조합만 한다. 비즈니스 로직은 `entities/market` 과 그 위의 feature 가 갖는다. */
export const MarketBoard = ({ renderPreview }: MarketBoardProps) => {
  const [activeTab, setActiveTab] = useState(DEFAULT_MARKET_BOARD_TAB);
  return (
    <Section noContainer>
      <FlexBox direction="column">
        <div className={headingRow}>
          <FlexBox direction="row" align="center" gap="lg">
            <ServiceIcon variant="analysis" />
            <Heading level={2}>{MARKET_BOARD_MESSAGES.heading}</Heading>
          </FlexBox>
          {/* 코치 리포트 진입(`FE-REQ-026` FR-140). 보유 전체의 리포트라 종목 패널이 아니라 화면 머리에 둔다 */}
          <Link href={ROUTES.coachReport} className={reportLink}>
            {MARKET_BOARD_MESSAGES.coachReportLink}
          </Link>
        </div>
        <Margin top="xl">
          <MarketSummaryStrip />
        </Margin>
        <Margin top="xl">
          <Tabs
            tabs={MARKET_BOARD_TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </Margin>
        <Margin top="md">
          <Suspense fallback={null}>
            {activeTab === DEFAULT_MARKET_BOARD_TAB && (
              <RealtimeMarketTable renderPreview={renderPreview} />
            )}
            {activeTab === WATCH_LIST_TAB && (
              <WatchlistTab renderPreview={renderPreview} />
            )}
          </Suspense>
        </Margin>
      </FlexBox>
    </Section>
  );
};

export default MarketBoard;
