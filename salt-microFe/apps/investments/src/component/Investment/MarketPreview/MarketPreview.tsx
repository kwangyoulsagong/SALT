import { MarketOverviewItem } from "@/api/investments/investments";
import { Container } from "@repo/ui/container";
import { FlexBox } from "@repo/ui/flexBox";
import { Image } from "@repo/ui/image";
import { Text } from "@repo/ui/text";
import { Root } from "@repo/ui/root";
import React from "react";
import PriceCell from "../PriceCell/PriceCell";
import ChangeRateCell from "../ChangeRateCell/ChangeRateCell";
interface MarketPreviewProps {
  selectedSymbolItem: MarketOverviewItem | undefined;
}
const MarketPreview = React.memo(
  ({ selectedSymbolItem }: MarketPreviewProps) => {
    if (!selectedSymbolItem) return null;
    return (
      <Root width="lg">
        <Container size="full">
          <FlexBox direction="column">
            <FlexBox align="center" gap="lg">
              <Image
                radius={9999}
                width={30}
                height={30}
                src={selectedSymbolItem.logoUrl}
                alt={selectedSymbolItem.koreanName}
              />
              <FlexBox direction="column">
                <Text variant="bodyLarge">{selectedSymbolItem.koreanName}</Text>
                <FlexBox align="center">
                  <PriceCell
                    value={selectedSymbolItem.currentPrice}
                    color="tertiary"
                  />
                  <ChangeRateCell value={selectedSymbolItem.change24h} />
                </FlexBox>
              </FlexBox>
            </FlexBox>
          </FlexBox>
        </Container>
      </Root>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.selectedSymbolItem === nextProps.selectedSymbolItem;
  }
);
export default MarketPreview;
