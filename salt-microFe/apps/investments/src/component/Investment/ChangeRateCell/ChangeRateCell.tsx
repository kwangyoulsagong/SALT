import React from "react";
import { Text } from "@repo/ui/text";
import * as styles from "./styles/changeRateCell.css";

interface Props {
  value: number;
  blink?: boolean;
}

const ChangeRateCell = React.memo(({ value, blink }: Props) => {
  const isUp = value > 0;

  const className = blink
    ? isUp
      ? styles.blinkUpClass
      : styles.blinkDownClass
    : styles.wrapper;

  return (
    <div className={className}>
      <Text variant="bodyLarge" color={isUp ? "up" : "down"}>
        {isUp && "+"}
        {value.toFixed(2)} %
      </Text>
    </div>
  );
});

ChangeRateCell.displayName = "changeRateCell";

export default ChangeRateCell;
