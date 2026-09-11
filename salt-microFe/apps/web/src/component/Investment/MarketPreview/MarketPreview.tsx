import { MarketOverviewItem } from "@/api/investments/investments";
import { FlexBox } from "@repo/ui/flexBox";
import { Root } from "@repo/ui/root";
import React, { Suspense } from "react";
import { ScrollContainer } from "@repo/ui/scrollContainer";
import MarketPreviewHeader from "./MarketPreviewHeader/MarketPreviewHeader";
import { Padding } from "@repo/ui/padding";
import MarketPreviewChart from "./MarketPreviewChart/MarketPreviewChart";
import { Heading } from "@repo/ui/heading";
import MarketIntelligencePreview from "./MarketIntelligencePreview/MarketIntelligencePreview";
interface MarketPreviewProps {
  selectedSymbolItem: MarketOverviewItem | undefined;
  symbol: string;
}
const MarketPreview = ({ selectedSymbolItem, symbol }: MarketPreviewProps) => {
  if (!selectedSymbolItem) return null;
  return (
    <Root width="lg">
      <ScrollContainer maxHeight="2xl">
        <Suspense fallback={<div> 로딩중</div>}>
          <FlexBox direction="column" gap="4xl">
            <Padding paddingTop="sm">
              <MarketPreviewHeader item={selectedSymbolItem} />
            </Padding>
            <Heading level={5} color="tertiary">
              실시간 차트 (5분 봉)
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
