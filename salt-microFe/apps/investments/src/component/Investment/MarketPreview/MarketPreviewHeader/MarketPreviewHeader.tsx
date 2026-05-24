import { MarketOverviewItem } from "@/api/investments/investments";
import { FlexBox } from "@repo/ui/flexBox";
import { Image } from "@repo/ui/image";
import { Text } from "@repo/ui/text";
import React from "react";
import PriceCell from "../../PriceCell/PriceCell";
import ChangeRateCell from "../../ChangeRateCell/ChangeRateCell";

const MarketPreviewHeader = React.memo(
  ({ item }: { item: MarketOverviewItem }) => {
    return (
      <FlexBox align="center" gap="lg">
        <Image
          radius={9999}
          width={40}
          height={40}
          src={item.logoUrl}
          alt={item.koreanName}
        />
        <FlexBox direction="column">
          <Text variant="bodyLarge">{item.koreanName}</Text>
          <FlexBox align="center">
            <PriceCell value={item.currentPrice} color="tertiary" />
            <ChangeRateCell value={item.change24h} />
          </FlexBox>
        </FlexBox>
      </FlexBox>
    );
  }
);
export default MarketPreviewHeader;
