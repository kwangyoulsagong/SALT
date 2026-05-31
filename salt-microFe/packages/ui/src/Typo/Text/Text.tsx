import { ReactNode } from "react";
import { textVariant } from "./styles/text.css";

export type TextVariant = "body" | "bodyLarge" | "caption";
export type TextColor =
  | "primary"
  | "secondary"
  | "tertiary"
  | "muted"
  | "brand"
  | "white"
  | "success"
  | "up"
  | "down";

export interface TextProps {
  variant?: TextVariant;
  color?: TextColor;
  children: ReactNode;
}

export const Text = ({
  variant = "body",
  color = "primary",
  children,
}: TextProps) => {
  return <p className={textVariant({ variant, color })}>{children}</p>;
};
