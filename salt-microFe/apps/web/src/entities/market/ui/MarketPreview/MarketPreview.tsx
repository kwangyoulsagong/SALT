"use client";

// 클라이언트 잎: 상태·effect·memo 를 갖는다. barrel 로 노출되므로 경계를 스스로 갖는다.
import { FlexBox } from "@repo/ui/flexBox";
import { Heading } from "@repo/ui/heading";
import { Padding } from "@repo/ui/padding";
import { Root } from "@repo/ui/root";
import { ScrollContainer } from "@repo/ui/scrollContainer";
import { Text } from "@repo/ui/text";
import React, { type ReactNode, Suspense } from "react";

import { MARKET_MESSAGES } from "../../model";
import { MarketPreviewSubject } from "../../model/types";
import {
  type GaugeFooters,
  MarketIntelligencePreview,
} from "./MarketIntelligencePreview";
import { previewPanel } from "./MarketPreview.css";
import { MarketPreviewChart } from "./MarketPreviewChart";
import { MarketPreviewHeader } from "./MarketPreviewHeader";

interface MarketPreviewProps {
  subject: MarketPreviewSubject | undefined;
  /**
   * 차트와 게이지 사이에 끼우는 블록. 우측 AI 코치 패널(`widgets/coach-panel`)이
   * 모드 스위치 · 판단 · 구간을 여기로 넣는다(`FE-REQ-026` FR-110).
   *
   * **슬롯인 이유:** 시세 슬라이스가 코치 슬라이스를 import 하면 같은 레이어 cross-slice 다.
   * 조합은 위 레이어가 하고 이 컴포넌트는 자리만 낸다.
   */
  coachSlot?: ReactNode;
  /** 각 게이지 바로 아래 한 줄(적중률, FR-118). 자리만 낸다 — 위와 같은 이유 */
  gaugeFooters?: GaugeFooters;
  /** 패널 맨 아래. 코치 패널의 ⑦ [상세 분석 보기](FR-119)가 들어온다 — 위와 같은 이유로 자리만 낸다 */
  footerSlot?: ReactNode;
}

/** 차트·심리·스마트머니의 소스가 업비트다. 이 자산군에만 있다. */
const MARKET_DATA_ASSET_TYPE = "crypto";

/**
 * 우측 프리뷰 패널.
 *
 * ## 패널은 **언제나 자리를 지킨다**
 *
 * 선택된 항목이 없을 때 `null` 을 돌려주면 500px 열이 사라지고 왼쪽 테이블이 그 폭만큼
 * 늘어난다. 첫 선택이 들어오는 순간 다시 줄어들어 **화면이 한 번 크게 흔들린다.**
 * 내용만 비우고 폭·높이는 유지한다.
 *
 * ## 자산군에 따라 아래 두 블록이 빠진다
 *
 * 차트와 심리·스마트머니는 업비트에서 온다. 주식 심볼로 그 블록을 그리면 없는 데이터를
 * 기다리는 빈 영역이 된다 — 대신 **왜 없는지 한 줄**을 보여준다.
 */
export const MarketPreview = ({
  subject,
  coachSlot,
  gaugeFooters,
  footerSlot,
}: MarketPreviewProps) => {
  const hasMarketData = subject?.assetType === MARKET_DATA_ASSET_TYPE;

  return (
    <Root width="lg" className={previewPanel}>
      <ScrollContainer maxHeight="2xl">
        <Suspense fallback={null}>
          {subject ? (
            <FlexBox direction="column" gap="4xl">
              <Padding paddingTop="sm">
                <MarketPreviewHeader subject={subject} />
              </Padding>
              {hasMarketData ? (
                <>
                  <Heading level={5} color="tertiary">
                    {MARKET_MESSAGES.chartHeading}
                  </Heading>
                  <MarketPreviewChart symbol={subject.symbol} />
                  {coachSlot}
                  <MarketIntelligencePreview
                    symbol={subject.symbol}
                    gaugeFooters={gaugeFooters}
                  />
                </>
              ) : (
                <>
                  {coachSlot}
                  <Text color="tertiary">
                    {MARKET_MESSAGES.marketDataUnavailable}
                  </Text>
                </>
              )}
              {footerSlot}
            </FlexBox>
          ) : null}
        </Suspense>
      </ScrollContainer>
    </Root>
  );
};
export default MarketPreview;
