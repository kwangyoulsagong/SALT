import {
  ReactNode,
  ElementType,
  ComponentPropsWithoutRef,
  CSSProperties,
} from "react";
import { paddingStyles } from "./styles/padding.css";

export type PaddingSize =
  | "none"
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl";

type PaddingPolymorphicProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  padding?: PaddingSize;
  paddingX?: PaddingSize;
  paddingY?: PaddingSize;
  paddingTop?: PaddingSize;
  paddingBottom?: PaddingSize;
  paddingLeft?: PaddingSize;
  paddingRight?: PaddingSize;
  className?: string;
  style?: CSSProperties;
} & Omit<
  ComponentPropsWithoutRef<T>,
  "children" | "as" | "className" | "style"
>;

export type PaddingProps<T extends ElementType = "div"> =
  PaddingPolymorphicProps<T>;

export const Padding = <T extends ElementType = "div">({
  children,
  padding,
  paddingX,
  paddingY,
  paddingTop,
  paddingBottom,
  paddingLeft,
  paddingRight,
  as,
  className,
  style,
  ...rest
}: PaddingProps<T>) => {
  const Component = as || "div";

  return (
    <Component
      className={`${paddingStyles({
        padding,
        paddingX,
        paddingY,
        paddingTop,
        paddingBottom,
        paddingLeft,
        paddingRight,
      })} ${className || ""}`}
      style={style}
      {...rest}
    >
      {children}
    </Component>
  );
};
