"use client";

import type { HTMLAttributes } from "react";

import { useRolledNumber } from "../Motion/useRolledNumber";
import { numberTextStyles, unitStyles } from "./styles/numberText.css";

export type NumberTextTone = "auto" | "up" | "down" | "neutral" | "muted";
export type NumberTextSize =
  | "t1"
  | "t2"
  | "t3"
  | "t4"
  | "t5"
  | "t6"
  | "t7"
  | "t8";
export type NumberTextWeight = "regular" | "medium" | "semibold" | "bold";

export interface NumberTextProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** 숫자. 문자열을 넘기면 이미 포맷된 값으로 보고 그대로 출력한다. */
  value: number | string;
  /** 값 뒤에 붙는 단위. 예: `원`, `%`, `주` */
  unit?: string;
  /** 부호를 항상 문자로 출력한다. 색만으로 등락을 전달하지 않기 위한 장치. */
  signed?: boolean;
  tone?: NumberTextTone;
  size?: NumberTextSize;
  weight?: NumberTextWeight;
  /**
   * 값이 바뀌면 이전 값에서 굴러간다(숫자 `value` 일 때만, FE-REQ-044 FR-31).
   * 초당 여러 번 바뀌는 시세에는 켜지 않는다.
   */
  animate?: boolean;
}

/** U+2212. 하이픈보다 폭이 넓어 `+`와 자리가 맞는다. */
const MINUS = "−";

const readSign = (value: number | string): -1 | 0 | 1 => {
  if (typeof value === "number") {
    if (value > 0) return 1;
    if (value < 0) return -1;
    return 0;
  }

  const trimmed = value.trim();
  if (trimmed.startsWith("-") || trimmed.startsWith(MINUS)) return -1;
  if (trimmed.startsWith("+")) return 1;
  return Number(trimmed.replace(/[^0-9.]/g, "")) === 0 ? 0 : 1;
};

const readMagnitude = (value: number | string): string => {
  if (typeof value === "number") {
    return Math.abs(value).toLocaleString("ko-KR", {
      maximumFractionDigits: 20,
    });
  }
  return value.trim().replace(/^[+\-−]/, "");
};

export const NumberText = ({
  value,
  unit,
  signed = false,
  tone = "auto",
  size = "t6",
  weight = "semibold",
  animate = false,
  className,
  ...rest
}: NumberTextProps) => {
  // 훅은 늘 부르고, 굴릴 때만 그 값을 쓴다(문자열 값은 그대로)
  const rolled = useRolledNumber(typeof value === "number" ? value : 0);
  const shownValue = animate && typeof value === "number" ? rolled : value;
  const sign = readSign(shownValue);
  const magnitude = readMagnitude(shownValue);

  const prefix = signed
    ? sign > 0
      ? "+"
      : sign < 0
        ? MINUS
        : ""
    : sign < 0
      ? MINUS
      : "";

  const resolvedTone =
    tone === "auto"
      ? sign > 0
        ? "up"
        : sign < 0
          ? "down"
          : "neutral"
      : tone;

  return (
    <span
      className={`${numberTextStyles({ size, tone: resolvedTone, weight })} ${
        className || ""
      }`}
      {...rest}
    >
      {prefix}
      {magnitude}
      {unit ? <span className={unitStyles}>{unit}</span> : null}
    </span>
  );
};
