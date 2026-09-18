"use client";

// 클라이언트 잎: 조회 결과를 받아 표시만 한다.
import { Badge } from "@repo/ui/badge";
import { FlexBox } from "@repo/ui/flexBox";
import { Text } from "@repo/ui/text";
import React from "react";

import { formatPrice } from "@/shared/lib";

import {
  PORTFOLIO_ASSET_LABELS,
  PORTFOLIO_MESSAGES,
} from "../model/messages";
import { PortfolioSummaryItem } from "../model/types";

/**
 * 보유 요약 목록 (`FE-REQ-010` FR-5).
 *
 * "주식" 제목 아래가 **비어 있었다** — `<Heading>주식</Heading>` 만 있고 자식이 없었다.
 *
 * 표시 전용이다. 평가금액·손익률은 서버가 계산한 값을 그대로 쓴다 — 프론트에서
 * 금액을 만들지 않는다(전 영역 공통 수용 기준).
 *
 * 손익 부호는 색과 **문자(`+`/`−`)를 함께** 쓴다. 색만으로 상태를 표현하지 않는다
 * (`a11y-policy.md`).
 */
export const HoldingSummaryList = React.memo(
  ({ items }: { items: readonly PortfolioSummaryItem[] }) => {
    if (items.length === 0) {
      return <Text color="tertiary">{PORTFOLIO_MESSAGES.holdingsEmpty}</Text>;
    }

    return (
      <FlexBox direction="column" gap="md" fullWidth>
        {items.map((item) => {
          const isUp = item.profitRate > 0;
          const isFlat = item.profitRate === 0;

          return (
            <FlexBox
              key={`${item.assetType}-${item.symbol}`}
              justify="between"
              align="center"
              fullWidth
            >
              <FlexBox align="center" gap="md">
                <Text variant="bodyLarge">{item.name}</Text>
                {PORTFOLIO_ASSET_LABELS[item.assetType] ? (
                  <Badge tone="neutral" size="sm">
                    {PORTFOLIO_ASSET_LABELS[item.assetType]}
                  </Badge>
                ) : null}
              </FlexBox>
              <FlexBox align="center" gap="md">
                <Text variant="bodyLarge">
                  {PORTFOLIO_MESSAGES.amount(formatPrice(item.currentValue))}
                </Text>
                <Text
                  variant="bodyLarge"
                  color={isFlat ? "tertiary" : isUp ? "up" : "down"}
                >
                  {PORTFOLIO_MESSAGES.profitRate(item.profitRate)}
                </Text>
              </FlexBox>
            </FlexBox>
          );
        })}
      </FlexBox>
    );
  },
);
HoldingSummaryList.displayName = "HoldingSummaryList";

export default HoldingSummaryList;
