"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { textButtonStyles } from "./styles/textButton.css";

export type TextButtonTone = "brand" | "neutral" | "danger";
export type TextButtonSize = "sm" | "md";

export interface TextButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  children: ReactNode;
  tone?: TextButtonTone;
  size?: TextButtonSize;
  /** 오른쪽에 이동 표시를 붙인다. */
  chevron?: boolean;
}

/** 배경 없는 텍스트 버튼. "더보기", "전체 보기" 같은 보조 행동에 쓴다. */
export const TextButton = ({
  children,
  tone = "brand",
  size = "md",
  chevron = false,
  className,
  ...rest
}: TextButtonProps) => {
  return (
    <button
      type="button"
      className={`${textButtonStyles({ tone, size })} ${className || ""}`}
      {...rest}
    >
      {children}
      {chevron ? (
        <ChevronRight size={size === "sm" ? 14 : 16} aria-hidden="true" />
      ) : null}
    </button>
  );
};
