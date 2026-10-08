"use client";

// 클라이언트 잎: 상태·effect·memo 를 갖는다. barrel 로 노출되므로 경계를 스스로 갖는다.
import { Text, TextColor } from "@repo/ui/text";
import React, { useMemo } from "react";

import { formatPrice } from "@/shared/lib";

import { MARKET_CHANGE_MESSAGES } from "../model/messages";

/** 표시 전용 (`fsd-entities.md`). 값 계산은 하지 않는다. */
export const PriceCell = React.memo(
  ({ value, color = "primary" }: { value: number; color?: TextColor }) => {
    const formatted = useMemo(() => formatPrice(value), [value]);
    // 값이 없는 칸(국내 주식 당일 고가 · 저가를 아직 못 받은 행 — `krQuoteToOverviewItem`)은 0원이 아니라 "—"
    if (!Number.isFinite(value)) {
      return (
        <Text variant="bodyLarge" color="tertiary">
          {MARKET_CHANGE_MESSAGES.unknown}
        </Text>
      );
    }
    return (
      <Text variant="bodyLarge" color={color}>
        {formatted} 원
      </Text>
    );
  }
);
PriceCell.displayName = "PriceCell";

export default PriceCell;
