import type { HTMLAttributes, ReactNode } from "react";
import { badgeStyles } from "./styles/badge.css";

export type BadgeTone =
  | "neutral"
  | "brand"
  | "up"
  | "down"
  | "success"
  | "warning"
  | "ai";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  tone?: BadgeTone;
  size?: BadgeSize;
  /** 배지 앞에 붙는 작은 아이콘. 의미는 반드시 텍스트에도 담는다. */
  leading?: ReactNode;
}

export const Badge = ({
  children,
  tone = "neutral",
  size = "md",
  leading,
  className,
  ...rest
}: BadgeProps) => {
  return (
    <span
      className={`${badgeStyles({ tone, size })} ${className || ""}`}
      // 표면이 크기를 고를 수 있게 하는 표지(휴대폰 `/m` 은 sm 11 → 13 — `FE-REQ-072`). 디자인 시스템은 표면을 모른다
      data-badge={size}
      {...rest}
    >
      {leading}
      {children}
    </span>
  );
};
