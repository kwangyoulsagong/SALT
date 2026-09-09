"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { iconButtonStyles } from "./styles/iconButton.css";

export type IconButtonVariant = "ghost" | "tonal" | "solid";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children"> {
  /** 아이콘. 장식이므로 `aria-hidden`을 붙여 넘긴다. */
  icon: ReactNode;
  /** 버튼이 하는 일. 아이콘만 있으므로 필수다. */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  round?: boolean;
}

export const IconButton = ({
  icon,
  label,
  variant = "ghost",
  size = "md",
  round = false,
  className,
  ...rest
}: IconButtonProps) => {
  return (
    <button
      type="button"
      aria-label={label}
      className={`${iconButtonStyles({ variant, size, round })} ${
        className || ""
      }`}
      {...rest}
    >
      {icon}
    </button>
  );
};
