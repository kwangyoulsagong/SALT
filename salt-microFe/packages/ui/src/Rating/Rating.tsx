"use client";

import { Star } from "lucide-react";
import {
  starButtonStyles,
  valueStyles,
  wrapperStyles,
} from "./styles/rating.css";

export type RatingSize = "sm" | "md";

export interface RatingProps {
  value: number;
  max?: number;
  /** 넘기면 누를 수 있는 평가 입력이 된다. 없으면 읽기 전용 표시다. */
  onChange?: (value: number) => void;
  size?: RatingSize;
  /** 별 옆에 숫자도 보여준다. */
  showValue?: boolean;
  /** 무엇에 대한 평가인지 */
  label?: string;
  className?: string;
}

/** 별점 표시와 입력. 색만으로 전달하지 않도록 숫자를 함께 읽어준다. */
export const Rating = ({
  value,
  max = 5,
  onChange,
  size = "md",
  showValue = false,
  label = "별점",
  className,
}: RatingProps) => {
  const interactive = Boolean(onChange);
  const iconSize = size === "sm" ? 16 : 20;

  return (
    <span
      className={`${wrapperStyles} ${className || ""}`}
      role={interactive ? "radiogroup" : "img"}
      aria-label={interactive ? label : `${label} ${max}점 중 ${value}점`}
    >
      {Array.from({ length: max }, (_, index) => {
        const score = index + 1;
        const filled = score <= Math.round(value);

        return (
          <button
            key={score}
            type="button"
            role={interactive ? "radio" : undefined}
            aria-checked={interactive ? score === Math.round(value) : undefined}
            aria-label={interactive ? `${score}점` : undefined}
            aria-hidden={interactive ? undefined : true}
            tabIndex={interactive ? 0 : -1}
            disabled={!interactive}
            onClick={() => onChange?.(score)}
            className={starButtonStyles({ interactive, filled })}
          >
            <Star
              size={iconSize}
              fill={filled ? "currentColor" : "none"}
              aria-hidden="true"
            />
          </button>
        );
      })}
      {showValue ? (
        <span className={valueStyles}>
          {value.toFixed(1)} / {max}
        </span>
      ) : null}
    </span>
  );
};
