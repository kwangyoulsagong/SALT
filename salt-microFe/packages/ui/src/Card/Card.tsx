import { ReactNode } from "react";
import { cardStyles } from "./styles/Card.css.ts";

export type CardPadding = "none" | "sm" | "md" | "lg" | "xl";

export interface CardProps {
  children: ReactNode;
  padding?: CardPadding;
  className?: string;
}

export const Card = ({ children, padding = "md", className }: CardProps) => {
  return (
    <section className={`${cardStyles({ padding })} ${className || ""}`}>
      {children}
    </section>
  );
};
