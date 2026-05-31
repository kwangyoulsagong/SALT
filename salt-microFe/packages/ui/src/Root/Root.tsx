import { HTMLAttributes, ReactNode } from "react";
import { rootStyles } from "./styles/root.css";

export type RootBackground =
  | "transparent"
  | "white"
  | "gray"
  | "brand"
  | "dark"
  | "gradient";
export type RootWidth =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "full";
export interface RootProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  background?: RootBackground;
  fullHeight?: boolean;
  width?: RootWidth;
}
export const Root = ({
  children,
  background = "transparent",
  width = "full",
  fullHeight = false,
  className,
  ...rest
}: RootProps) => {
  return (
    <div
      className={`${rootStyles({ background, width, fullHeight })} ${
        className || ""
      }`}
      {...rest}
    >
      {children}
    </div>
  );
};
