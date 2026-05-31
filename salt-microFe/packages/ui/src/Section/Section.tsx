import { ReactNode, HTMLAttributes } from "react";
import { sectionStyles } from "./styles/section.css";
import { Container } from "../Container/Container";
import { ContainerSize } from "../Container/Container";

export type SectionPadding = "none" | "xs" | "sm" | "md" | "lg" | "xl";
export type SectionBackground =
  | "transparent"
  | "white"
  | "gray"
  | "brand"
  | "dark"
  | "gradient";

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  padding?: SectionPadding;
  background?: SectionBackground;
  fullWidth?: boolean;
  containerSize?: ContainerSize;
  noContainer?: boolean;
}

export const Section = ({
  children,
  padding = "md",
  background = "transparent",
  fullWidth = false,
  containerSize = "xl",
  noContainer = false,
  className,
  ...rest
}: SectionProps) => {
  const content = noContainer ? (
    children
  ) : (
    <Container size={containerSize}>{children}</Container>
  );

  return (
    <section
      className={`${sectionStyles({ padding, background, fullWidth })} ${
        className || ""
      }`}
      {...rest}
    >
      {content}
    </section>
  );
};
