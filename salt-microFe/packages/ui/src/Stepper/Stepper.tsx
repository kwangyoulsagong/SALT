"use client";

import { useId } from "react";
import type { ChangeEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { IconButton } from "../IconButton/IconButton";
import {
  controlStyles,
  helperStyles,
  inputStyles,
  labelStyles,
  unitStyles,
  wrapperStyles,
} from "./styles/stepper.css";

export type StepperSize = "sm" | "md";

export interface StepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** 값 오른쪽에 붙는 단위. 예: `주`, `개` */
  unit?: string;
  /** 아래 보조 문구. 예: 최대 수량 안내 */
  helperText?: string;
  /** 라벨을 화면에 보여줄지. 숨기면 `label`은 accessible name으로만 쓰인다. */
  hideLabel?: boolean;
  size?: StepperSize;
  disabled?: boolean;
  className?: string;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** 수량처럼 한 칸씩 올리고 내리는 값. 직접 입력도 된다. */
export const Stepper = ({
  label,
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  unit,
  helperText,
  hideLabel = false,
  size = "md",
  disabled = false,
  className,
}: StepperProps) => {
  const id = useId();
  const inputId = `${id}-input`;
  const helperId = `${id}-helper`;

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    if (Number.isNaN(next)) return;
    onChange(clamp(next, min, max));
  };

  return (
    <div className={`${wrapperStyles} ${className || ""}`}>
      {hideLabel ? null : (
        <label className={labelStyles} htmlFor={inputId}>
          {label}
        </label>
      )}

      <div className={controlStyles({ size })}>
        <IconButton
          icon={<Minus size={16} aria-hidden="true" />}
          label={`${label} 줄이기`}
          size={size === "sm" ? "sm" : "md"}
          disabled={disabled || value <= min}
          onClick={() => onChange(clamp(value - step, min, max))}
        />

        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          className={inputStyles({ size })}
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-label={hideLabel ? label : undefined}
          aria-describedby={helperText ? helperId : undefined}
          onChange={handleInput}
        />
        {unit ? <span className={unitStyles}>{unit}</span> : null}

        <IconButton
          icon={<Plus size={16} aria-hidden="true" />}
          label={`${label} 늘리기`}
          size={size === "sm" ? "sm" : "md"}
          disabled={disabled || value >= max}
          onClick={() => onChange(clamp(value + step, min, max))}
        />
      </div>

      {helperText ? (
        <p id={helperId} className={helperStyles}>
          {helperText}
        </p>
      ) : null}
    </div>
  );
};
