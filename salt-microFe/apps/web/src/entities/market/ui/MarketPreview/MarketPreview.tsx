"use client";

// 클라이언트 잎: 상태·effect·memo 를 갖는다. barrel 로 노출되므로 경계를 스스로 갖는다.
import { MarketOverviewItem } from "../../model/types";
import { MARKET_MESSAGES } from "../../model";
import { FlexBox } from "@repo/ui/flexBox";
import { Root } from "@repo/ui/root";
import React, { Suspense } from "react";
import { ScrollContainer } from "@repo/ui/scrollContainer";
import { MarketPreviewHeader } from "./MarketPreviewHeader";
import { Padding } from "@repo/ui/padding";
import { MarketPreviewChart } from "./MarketPreviewChart";
import { Heading } from "@repo/ui/heading";
import { MarketIntelligencePreview } from "./MarketIntelligencePreview";
interface MarketPreviewProps {
  selectedSymbolItem: MarketOverviewItem | undefined;
  symbol: string;
}
export const MarketPreview = ({ selectedSymbolItem, symbol }: MarketPreviewProps) => {
  if (!selectedSymbolItem) return null;
  return (
    <Root width="lg">
      <ScrollContainer maxHeight="2xl">
        <Suspense fallback={<div>{MARKET_MESSAGES.previewLoading}</div>}>
          <FlexBox direction="column" gap="4xl">
            <Padding paddingTop="sm">
              <MarketPreviewHeader item={selectedSymbolItem} />
            </Padding>
            <Heading level={5} color="tertiary">
              {MARKET_MESSAGES.chartHeading}
            </Heading>
            <MarketPreviewChart symbol={symbol} />
            <MarketIntelligencePreview symbol={symbol} />
          </FlexBox>
        </Suspense>
      </ScrollContainer>
    </Root>
  );
};
export default MarketPreview;
