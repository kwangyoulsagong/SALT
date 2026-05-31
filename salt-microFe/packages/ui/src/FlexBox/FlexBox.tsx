import { ReactNode, HTMLAttributes } from "react";
import { flexBoxStyles } from "./styles/flexBox.css";

export type FlexDirection = "row" | "column" | "rowReverse" | "columnReverse";
export type FlexJustify =
  | "start"
  | "center"
  | "end"
  | "between"
  | "around"
  | "evenly";
export type FlexAlign = "start" | "center" | "end" | "stretch" | "baseline";
export type FlexGap =
  | "none"
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl";
export type FlexWrap = "nowrap" | "wrap" | "wrapReverse";

export interface FlexBoxProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  direction?: FlexDirection;
  justify?: FlexJustify;
  align?: FlexAlign;
  gap?: FlexGap;
  wrap?: FlexWrap;
  fullWidth?: boolean;
  fullHeight?: boolean;
  as?: "div" | "section" | "article" | "nav" | "header" | "footer" | "main";
}

export const FlexBox = ({
  children,
  direction = "row",
  justify = "start",
  align = "start",
  gap = "none",
  wrap = "nowrap",
  fullWidth = false,
  fullHeight = false,
  as: Component = "div",
  className,
  ...rest
}: FlexBoxProps) => {
  return (
    <Component
      className={`${flexBoxStyles({
        direction,
        justify,
        align,
        gap,
        wrap,
        fullWidth,
        fullHeight,
      })} ${className || ""}`}
      {...rest}
    >
      {children}
    </Component>
  );
};
