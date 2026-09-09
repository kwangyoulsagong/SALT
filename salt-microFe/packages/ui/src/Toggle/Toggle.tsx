"use client";

import { useId } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  labelStyles,
  thumbStyles,
  trackStyles,
  wrapperStyles,
} from "./styles/toggle.css";

export interface ToggleProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "type" | "onChange" | "children"
  > {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** 옆에 보이는 이름. 없으면 `aria-label`을 반드시 넘긴다. */
  label?: ReactNode;
}

export const Toggle = ({
  checked,
  onChange,
  disabled = false,
  label,
  className,
  ...rest
}: ToggleProps) => {
  const id = useId();
  const labelId = `${id}-label`;

  return (
    <span className={wrapperStyles}>
      {label ? (
        <span id={labelId} className={labelStyles}>
          {label}
        </span>
      ) : null}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={label ? labelId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`${trackStyles({ checked })} ${className || ""}`}
        {...rest}
      >
        <span className={thumbStyles({ checked })} />
      </button>
    </span>
  );
};
