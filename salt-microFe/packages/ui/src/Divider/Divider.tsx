import type { HTMLAttributes } from "react";
import { dividerStyles } from "./styles/divider.css";

export type DividerOrientation = "horizontal" | "vertical";
export type DividerTone = "light" | "default" | "strong";
/** `row`는 리스트 행 패딩(20px), `leading`은 아이콘 폭만큼 들여쓴다. */
export type DividerInset = "none" | "row" | "leading";

export interface DividerProps extends HTMLAttributes<HTMLHRElement> {
  orientation?: DividerOrientation;
  tone?: DividerTone;
  inset?: DividerInset;
}

/** 그룹 안 항목을 나누는 선. 그룹과 그룹 사이는 `SectionBand`를 쓴다. */
export const Divider = ({
  orientation = "horizontal",
  tone = "default",
  inset = "none",
  className,
  ...rest
}: DividerProps) => {
  return (
    <hr
      aria-orientation={orientation}
      className={`${dividerStyles({ orientation, tone, inset })} ${
        className || ""
      }`}
      {...rest}
    />
  );
};
