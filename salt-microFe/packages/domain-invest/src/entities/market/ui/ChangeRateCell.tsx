"use client";

// 클라이언트 잎: 상태·effect·memo 를 갖는다. barrel 로 노출되므로 경계를 스스로 갖는다.
import React from "react";
import { Text } from "@repo/ui/text";
import * as styles from "./ChangeRateCell.css";

interface Props {
  value: number;
  blink?: boolean;
}

export const ChangeRateCell = React.memo(({ value, blink }: Props) => {
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
