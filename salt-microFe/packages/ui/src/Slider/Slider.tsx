"use client";

import { useId } from "react";
import type { ChangeEvent } from "react";
import {
  boundsStyles,
  headerStyles,
  inputStyles,
  labelStyles,
  rangeStyles,
  valueStyles,
  wrapperStyles,
} from "./styles/slider.css";

export interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  /** 현재 값과 양끝 값을 사람이 읽는 문자열로 바꾼다. */
  format?: (value: number) => string;
  /**
   * 값을 직접 입력하는 숫자 필드를 함께 보여준다.
   * 드래그가 어려운 사용자를 위한 대체 수단이라 기본값은 `true`다.
   */
  showNumberInput?: boolean;
  className?: string;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const Slider = ({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  format,
  showNumberInput = true,
  className,
}: SliderProps) => {
  const id = useId();
  const rangeId = `${id}-range`;
  const display = format ? format(value) : String(value);

  const handleRangeChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(event.target.value));
  };

  const handleNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    if (Number.isNaN(next)) return;
    onChange(clamp(next, min, max));
  };

  return (
    <div className={`${wrapperStyles} ${className || ""}`}>
      <div className={headerStyles}>
        <label className={labelStyles} htmlFor={rangeId}>
          {label}
        </label>
        {showNumberInput ? (
          <input
            type="number"
            className={inputStyles}
            value={value}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onChange={handleNumberChange}
            aria-label={`${label} 직접 입력`}
          />
        ) : (
          <span className={valueStyles}>{display}</span>
        )}
      </div>

      <input
        id={rangeId}
        type="range"
        className={rangeStyles}
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={handleRangeChange}
        aria-valuetext={display}
      />

      <div className={boundsStyles}>
        <span>{format ? format(min) : min}</span>
        <span>{format ? format(max) : max}</span>
      </div>
    </div>
  );
};
