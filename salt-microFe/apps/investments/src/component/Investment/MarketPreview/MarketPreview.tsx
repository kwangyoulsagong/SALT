import { MarketOverviewItem } from "@/api/investments/investments";
import { FlexBox } from "@repo/ui/flexBox";
import { Root } from "@repo/ui/root";
import React from "react";
import { ScrollContainer } from "@repo/ui/scrollContainer";
import MarketPreviewHeader from "./MarketPreviewHeader/MarketPreviewHeader";
import { Padding } from "@repo/ui/padding";
import MarketPeviewChart from "./MarketPeviewChart/MarketPeviewChart";
import { Heading } from "@repo/ui/heading";
interface MarketPreviewProps {
  selectedSymbolItem: MarketOverviewItem | undefined;
  symbol: string;
}
const MarketPreview = ({ selectedSymbolItem, symbol }: MarketPreviewProps) => {
  if (!selectedSymbolItem) return null;
  return (
    <Root width="lg">
      <ScrollContainer maxHeight="2xl">
        <FlexBox direction="column" gap="4xl">
          <Padding paddingTop="sm">
            <MarketPreviewHeader item={selectedSymbolItem} />
          </Padding>
          <Heading level={5} color="tertiary">
            실시간 차트 (5분 봉)
          </Heading>
          <MarketPeviewChart symbol={symbol} />
        </FlexBox>
      </ScrollContainer>
    </Root>
  );
};
export default MarketPreview;
