import { FormatPrice } from "@/utils/FormatPrice";
import { Text } from "@repo/ui/text";
import React, { useMemo } from "react";

const PriceCell = React.memo(({ value }: { value: number }) => {
  const formatted = useMemo(() => FormatPrice(value), [value]);
  return <Text variant="bodyLarge">{formatted} 원</Text>;
});
export default PriceCell;
