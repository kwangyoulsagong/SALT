import { FormatPrice } from "@/utils/FormatPrice";
import { Text, TextColor } from "@repo/ui/text";
import React, { useMemo } from "react";

const PriceCell = React.memo(
  ({ value, color = "primary" }: { value: number; color?: TextColor }) => {
    const formatted = useMemo(() => FormatPrice(value), [value]);
    return (
      <Text variant="bodyLarge" color={color}>
        {formatted} 원
      </Text>
    );
  }
);
PriceCell.displayName = "PriceCell";

export default PriceCell;
