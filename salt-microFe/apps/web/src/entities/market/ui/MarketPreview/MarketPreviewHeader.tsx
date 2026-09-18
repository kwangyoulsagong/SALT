"use client";

// 클라이언트 잎: 상태·effect·memo 를 갖는다. barrel 로 노출되므로 경계를 스스로 갖는다.
import { FlexBox } from "@repo/ui/flexBox";
import { Image } from "@repo/ui/image";
import { Text } from "@repo/ui/text";
import React from "react";

import { WATCHLIST_MESSAGES } from "../../model/messages";
import { MarketPreviewSubject } from "../../model/types";
import { ChangeRateCell } from "../ChangeRateCell";
import { PriceCell } from "../PriceCell";

/**
 * 프리뷰 헤더.
 *
 * 시세 목록 한 줄이 아니라 **`MarketPreviewSubject`** 를 받는다 — 그래야 목록에 없는
 * 종목(시세 100위 밖 · 주식)도 관심 목록 항목만으로 헤더를 그릴 수 있다.
 *
 * 가격이 없으면 `—` 다. 0 을 그리면 "가격이 0원"으로 읽힌다.
 */
export const MarketPreviewHeader = React.memo(
  ({ subject }: { subject: MarketPreviewSubject }) => {
    return (
      <FlexBox align="center" gap="lg">
        {subject.logoUrl ? (
          <Image
            radius={9999}
            width={40}
            height={40}
            src={subject.logoUrl}
            alt={subject.displayName}
          />
        ) : null}
        <FlexBox direction="column">
          <Text variant="bodyLarge">{subject.displayName}</Text>
          <FlexBox align="center">
            {subject.currentPrice === null ? (
              <Text variant="bodyLarge" color="tertiary">
                {WATCHLIST_MESSAGES.priceUnknown}
              </Text>
            ) : (
              <PriceCell value={subject.currentPrice} color="tertiary" />
            )}
            {subject.change24h === null ? null : (
              <ChangeRateCell value={subject.change24h} />
            )}
          </FlexBox>
        </FlexBox>
      </FlexBox>
    );
  },
);
MarketPreviewHeader.displayName = "MarketPreviewHeader";

export default MarketPreviewHeader;
