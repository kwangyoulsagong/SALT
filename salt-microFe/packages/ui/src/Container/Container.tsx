import { ReactNode, HTMLAttributes } from "react";
import { containerStyles } from "./styles/container.css";

export type ContainerSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full";
export type ContainerPadding = "none" | "sm" | "md" | "lg" | "xl";

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  size?: ContainerSize;
  padding?: ContainerPadding;
  centered?: boolean;
  as?: "div" | "section" | "main" | "article" | "header" | "footer";
}

export const Container = ({
  children,
  size = "xl",
  padding = "lg",
  centered = false,
  as: Component = "div",
  className,
  ...rest
}: ContainerProps) => {
  return (
    <Component
      className={`${containerStyles({ size, padding, centered })} ${
        className || ""
      }`}
      {...rest}
    >
      {children}
    </Component>
  );
};
