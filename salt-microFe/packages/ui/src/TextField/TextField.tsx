"use client";

import { useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import {
  affixStyles,
  fieldStyles,
  inputSizeStyles,
  inputStyles,
  labelStyles,
  messageStyles,
  wrapperStyles,
} from "./styles/textField.css";

export type TextFieldVariant = "box" | "line" | "big" | "hero";

export interface TextFieldProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "size"
  > {
  value: string;
  onChange: (value: string) => void;
  /** 위에 보이는 이름. 없으면 `aria-label`을 넘긴다. */
  label?: ReactNode;
  variant?: TextFieldVariant;
  /** 채워지면 테두리가 붉어지고 메시지가 에러로 바뀐다. */
  error?: string;
  helperText?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}

export const TextField = ({
  value,
  onChange,
  label,
  variant = "box",
  error,
  helperText,
  leading,
  trailing,
  disabled = false,
  className,
  id,
  ...rest
}: TextFieldProps) => {
  const generatedId = useId();
  const inputId = id || `${generatedId}-input`;
  const messageId = `${generatedId}-message`;
  const message = error || helperText;

  return (
    <div className={`${wrapperStyles} ${className || ""}`}>
      {label ? (
        <label className={labelStyles} htmlFor={inputId}>
          {label}
        </label>
      ) : null}

      <div
        className={fieldStyles({
          variant,
          invalid: Boolean(error),
          disabled,
        })}
      >
        {leading ? <span className={affixStyles}>{leading}</span> : null}
        <input
          id={inputId}
          className={`${inputStyles} ${inputSizeStyles({ variant })}`}
          value={value}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          onChange={(event) => onChange(event.target.value)}
          {...rest}
        />
        {trailing ? <span className={affixStyles}>{trailing}</span> : null}
      </div>

      {message ? (
        <p id={messageId} className={messageStyles({ tone: error ? "error" : "help" })}>
          {message}
        </p>
      ) : null}
    </div>
  );
};
