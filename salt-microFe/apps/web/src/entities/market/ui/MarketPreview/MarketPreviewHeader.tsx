"use client";

// 클라이언트 잎: 상태·effect·memo 를 갖는다. barrel 로 노출되므로 경계를 스스로 갖는다.
import { MarketOverviewItem } from "../../model/types";
import { FlexBox } from "@repo/ui/flexBox";
import { Image } from "@repo/ui/image";
import { Text } from "@repo/ui/text";
import React from "react";
import { ChangeRateCell } from "../ChangeRateCell";
import { PriceCell } from "../PriceCell";

export const MarketPreviewHeader = React.memo(
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
MarketPreviewHeader.displayName = "MarketPreviewHeader";

export default MarketPreviewHeader;
