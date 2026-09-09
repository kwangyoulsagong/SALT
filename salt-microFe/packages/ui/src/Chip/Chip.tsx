"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { chipStyles } from "./styles/chip.css";

export type ChipSize = "sm" | "md";

export interface ChipProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick"> {
  children: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  size?: ChipSize;
  onPress?: () => void;
  leading?: ReactNode;
}

/**
 * 단독 또는 자유 배치로 쓰는 선택 칩.
 * 하나만 고르는 탭 그룹이 필요하면 `FilterTabs`를 쓴다.
 */
export const Chip = ({
  children,
  selected = false,
  disabled = false,
  size = "md",
  onPress,
  leading,
  className,
  ...rest
}: ChipProps) => {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onPress}
      className={`${chipStyles({ selected, size })} ${className || ""}`}
      {...rest}
    >
      {leading}
      {children}
    </button>
  );
};
