import { ReactNode } from "react";
import { cardStyles } from "./styles/Card.css";

export type CardPadding = "none" | "sm" | "md" | "lg" | "xl";
export type CardElevation = "none" | "sm" | "md" | "lg";

export interface CardProps {
  children: ReactNode;
  padding?: CardPadding;
  /** 기본은 그림자 없음. 위계는 `SectionBand`로 만든다 (FE-REQ-005 D-8). */
  elevation?: CardElevation;
  bordered?: boolean;
  className?: string;
}

export const Card = ({
  children,
  padding = "md",
  elevation = "none",
  bordered = false,
  className,
}: CardProps) => {
  return (
    <section
      className={`${cardStyles({ padding, elevation, bordered })} ${
        className || ""
      }`}
    >
      {children}
    </section>
  );
};
