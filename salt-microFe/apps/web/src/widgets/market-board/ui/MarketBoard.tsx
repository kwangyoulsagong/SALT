"use client";

// 클라이언트 잎: 탭 상태를 갖고, 실시간 테이블을 ssr:false 로 내린다.
import { FlexBox } from "@repo/ui/flexBox";
import { Heading } from "@repo/ui/heading";
import { Margin } from "@repo/ui/margin";
import { Section } from "@repo/ui/section";
import { ServiceIcon } from "@repo/ui/serviceicon";
import { Tabs } from "@repo/ui/tabs";
import dynamic from "next/dynamic";
import React, { Suspense, useState } from "react";

import {
  DEFAULT_MARKET_BOARD_TAB,
  MARKET_BOARD_MESSAGES,
  MARKET_BOARD_TABS,
} from "../model";

const RealtimeMarketTable = dynamic(
  () =>
    import("./RealtimeMarketTable").then((mod) => mod.RealtimeMarketTable),
  {
    ssr: false,
    loading: () => null,
  }
);

/** 조합만 한다. 비즈니스 로직은 `entities/market` 과 그 위의 feature 가 갖는다. */
export const MarketBoard = () => {
  const [activeTab, setActiveTab] = useState(DEFAULT_MARKET_BOARD_TAB);
  return (
    <Section noContainer>
      <FlexBox direction="column">
        <FlexBox direction="row" align="center" gap="lg">
          <ServiceIcon variant="analysis" />
          <Heading level={2}>{MARKET_BOARD_MESSAGES.heading}</Heading>
        </FlexBox>
        <Margin top="xl">
          <Tabs
            tabs={MARKET_BOARD_TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </Margin>
        <Margin top="md">
          <Suspense fallback={null}>
            {activeTab === DEFAULT_MARKET_BOARD_TAB && <RealtimeMarketTable />}
          </Suspense>
        </Margin>
      </FlexBox>
    </Section>
  );
};

export default MarketBoard;
