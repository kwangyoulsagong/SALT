import { ReactNode } from "react";
import { headingStyles } from "./styles/heading.css.ts";

export interface HeadingProps {
  children: ReactNode;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  color?: "primary" | "secondary" | "tertiary" | "brand" | "white";
  lineClamp?: 1 | 2 | 3;
}

export const Heading = ({
  children,
  level,
  size,
  color,
  lineClamp,
}: HeadingProps) => {
  const Tag = `h${level}` as const;

  return (
    <Tag className={headingStyles({ level, size, color, lineClamp })}>
      {children}
    </Tag>
  );
};
