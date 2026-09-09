import type { HTMLAttributes } from "react";
import { sectionBandStyles } from "./styles/sectionBand.css";

export type SectionBandThickness = "thin" | "base" | "thick";

export interface SectionBandProps extends HTMLAttributes<HTMLDivElement> {
  thickness?: SectionBandThickness;
}

/**
 * 그룹과 그룹 사이를 끊는 회색 밴드.
 * 카드 그림자 대신 이 밴드로 위계를 만든다 (FE-REQ-005 D-8).
 */
export const SectionBand = ({
  thickness = "base",
  className,
  ...rest
}: SectionBandProps) => {
  return (
    <div
      aria-hidden="true"
      className={`${sectionBandStyles({ thickness })} ${className || ""}`}
      {...rest}
    />
  );
};
