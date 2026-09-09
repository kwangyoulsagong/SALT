import type { HTMLAttributes } from "react";
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
  className,
  ...rest
}: NumberTextProps) => {
  const sign = readSign(value);
  const magnitude = readMagnitude(value);

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
