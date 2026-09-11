"use client";

// 클라이언트 잎: 상태·effect·memo 를 갖는다. barrel 로 노출되므로 경계를 스스로 갖는다.
import { Text, TextColor } from "@repo/ui/text";
import React, { useMemo } from "react";

import { formatPrice } from "@/shared/lib";

/** 표시 전용 (`fsd-entities.md`). 값 계산은 하지 않는다. */
export const PriceCell = React.memo(
  ({ value, color = "primary" }: { value: number; color?: TextColor }) => {
    const formatted = useMemo(() => formatPrice(value), [value]);
    return (
      <Text variant="bodyLarge" color={color}>
        {formatted} 원
      </Text>
    );
  }
);
PriceCell.displayName = "PriceCell";

export default PriceCell;
