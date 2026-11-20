"use client";

import { ReactNode, ButtonHTMLAttributes } from "react";
import { Spinner } from "../Spinner/Spinner";
import { buttonVariants } from "./styles/button.css";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "weak"
  | "outline"
  | "warning"
  | "danger"
  | "success";

export type ButtonSize = "desk" | "xs" | "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  /** 처리 중. 누를 수 없게 막고 회전 표시를 함께 보여준다. */
  loading?: boolean;
  onClick?: () => void;
}

export const Button = ({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  type = "button",
  disabled = false,
  loading = false,
  onClick,
  className,
  ...rest
}: ButtonProps) => {
  const spinnerTone =
    variant === "ghost" || variant === "outline" ? "brand" : "white";

  return (
    <button
      className={`${buttonVariants({ variant, size, fullWidth, loading })} ${
        className || ""
      }`}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      // 표면이 누름 칸을 고를 수 있게 하는 표지(휴대폰 `/m` 은 작은 단 → 44 — `FE-REQ-072`)
      data-button-size={size}
      onClick={onClick}
      {...rest}
    >
      {loading ? (
        <Spinner size={size === "xs" || size === "sm" ? "sm" : "md"} tone={spinnerTone} />
      ) : null}
      {children}
    </button>
  );
};
