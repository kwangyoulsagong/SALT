"use client";

// 클라이언트 잎: 상태·effect·memo 를 갖는다. barrel 로 노출되므로 경계를 스스로 갖는다.
import { Text, TextColor } from "@repo/ui/text";
import { TickFlash } from "@repo/ui/tickFlash";
import React, { useMemo } from "react";

import { formatPrice } from "@/shared/lib";

/**
 * 표시 전용 (`fsd-entities.md`). 값 계산은 하지 않는다.
 * 가격이 바뀌면 방향 색 면이 한 번 옅어진다(`FE-REQ-044` P-37) — 옆 등락률 칸이 부호로 방향을 같이 말한다.
 */
export const PriceCell = React.memo(
  ({ value, color = "primary" }: { value: number; color?: TextColor }) => {
    const formatted = useMemo(() => formatPrice(value), [value]);
    return (
      <TickFlash value={value}>
        <Text variant="bodyLarge" color={color}>
          {formatted} 원
        </Text>
      </TickFlash>
    );
  }
);
PriceCell.displayName = "PriceCell";

export default PriceCell;
