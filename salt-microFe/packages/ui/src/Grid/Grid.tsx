import {
  ReactNode,
  CSSProperties,
  ElementType,
  ComponentPropsWithoutRef,
} from "react";
import { gridStyles, responsiveGridStyles } from "./styles/grid.css";

export type GridColumns = 1 | 2 | 3 | 4 | 5 | 6 | 12;
export type GridGap = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
export type GridMinWidth = "xs" | "sm" | "md" | "lg" | "xl";

type PolymorphicProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  columns?: GridColumns;
  gap?: GridGap;
  rowGap?: GridGap;
  columnGap?: GridGap;
  responsive?: boolean;
  minWidth?: GridMinWidth;
  fullWidth?: boolean;
  className?: string;
  style?: CSSProperties;
} & Omit<
  ComponentPropsWithoutRef<T>,
  "children" | "as" | "className" | "style"
>;

export type GridProps<T extends ElementType = "div"> = PolymorphicProps<T>;

export const Grid = <T extends ElementType = "div">({
  children,
  columns = 3,
  gap = "md",
  rowGap,
  columnGap,
  responsive = false,
  minWidth = "md",
  fullWidth = false,
  as,
  className,
  style,
  ...rest
}: GridProps<T>) => {
  const Component = as || "div";

  const gridClassName = responsive
    ? responsiveGridStyles({ minWidth, gap })
    : gridStyles({ columns, gap, rowGap, columnGap, fullWidth });

  return (
    <Component
      className={`${gridClassName} ${className || ""}`}
      style={style}
      {...rest}
    >
      {children}
    </Component>
  );
};

// GridItem 컴포넌트
type GridItemPolymorphicProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  colSpan?: number;
  rowSpan?: number;
  className?: string;
  style?: CSSProperties;
} & Omit<
  ComponentPropsWithoutRef<T>,
  "children" | "as" | "className" | "style"
>;

export type GridItemProps<T extends ElementType = "div"> =
  GridItemPolymorphicProps<T>;

export const GridItem = <T extends ElementType = "div">({
  children,
  colSpan,
  rowSpan,
  as,
  className,
  style,
  ...rest
}: GridItemProps<T>) => {
  const Component = as || "div";

  const itemStyle: CSSProperties = {
    ...style,
    ...(colSpan && { gridColumn: `span ${colSpan}` }),
    ...(rowSpan && { gridRow: `span ${rowSpan}` }),
  };

  return (
    <Component className={className} style={itemStyle} {...rest}>
      {children}
    </Component>
  );
};
