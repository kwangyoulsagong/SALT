"use client";

// 클라이언트 잎: 상태·effect·memo 를 갖는다. barrel 로 노출되므로 경계를 스스로 갖는다.
import { FlexBox } from "@repo/ui/flexBox";
import { Heading } from "@repo/ui/heading";
import { Padding } from "@repo/ui/padding";
import { Root } from "@repo/ui/root";
import { ScrollContainer } from "@repo/ui/scrollContainer";
import { Text } from "@repo/ui/text";
import React, { Suspense } from "react";

import { MARKET_MESSAGES } from "../../model";
import { MarketPreviewSubject } from "../../model/types";
import { MarketIntelligencePreview } from "./MarketIntelligencePreview";
import { previewPanel } from "./MarketPreview.css";
import { MarketPreviewChart } from "./MarketPreviewChart";
import { MarketPreviewHeader } from "./MarketPreviewHeader";

interface MarketPreviewProps {
  subject: MarketPreviewSubject | undefined;
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
export const MarketPreview = ({ subject }: MarketPreviewProps) => {
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
                  <MarketIntelligencePreview symbol={subject.symbol} />
                </>
              ) : (
                <Text color="tertiary">
                  {MARKET_MESSAGES.marketDataUnavailable}
                </Text>
              )}
            </FlexBox>
          ) : null}
        </Suspense>
      </ScrollContainer>
    </Root>
  );
};
export default MarketPreview;
