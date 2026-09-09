"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Check, Minus } from "lucide-react";
import {
  boxStyles,
  labelStyles,
  nativeInputStyles,
  wrapperStyles,
} from "./styles/checkbox.css";

export type CheckboxSize = "sm" | "md";

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** 하위 항목이 일부만 선택된 상태. `checked`보다 우선해 표시된다. */
  indeterminate?: boolean;
  disabled?: boolean;
  /** 옆에 보이는 이름. 없으면 `ariaLabel`을 넘긴다. */
  label?: ReactNode;
  ariaLabel?: string;
  size?: CheckboxSize;
  round?: boolean;
  name?: string;
  value?: string;
  className?: string;
}

export const Checkbox = ({
  checked,
  onChange,
  indeterminate = false,
  disabled = false,
  label,
  ariaLabel,
  size = "md",
  round = false,
  name,
  value,
  className,
}: CheckboxProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // indeterminate는 속성이 아니라 DOM 프로퍼티라서 ref로만 설정된다.
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const iconSize = size === "sm" ? 12 : 15;

  return (
    <label className={`${wrapperStyles} ${className || ""}`}>
      <input
        ref={inputRef}
        type="checkbox"
        className={nativeInputStyles}
        checked={checked}
        disabled={disabled}
        name={name}
        value={value}
        aria-label={label ? undefined : ariaLabel}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={boxStyles({ size, round })} aria-hidden="true">
        {indeterminate ? (
          <Minus size={iconSize} strokeWidth={3} />
        ) : checked ? (
          <Check size={iconSize} strokeWidth={3} />
        ) : null}
      </span>
      {label ? <span className={labelStyles}>{label}</span> : null}
    </label>
  );
};
