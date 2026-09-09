"use client";

import { useEffect, useId, useRef } from "react";
import type { TextareaHTMLAttributes, ReactNode } from "react";
import {
  autoResizeStyles,
  counterStyles,
  fieldStyles,
  headerStyles,
  labelStyles,
  messageStyles,
  textAreaStyles,
  wrapperStyles,
} from "./styles/textArea.css";

export type TextAreaVariant = "box" | "line";

export interface TextAreaProps
  extends Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    "value" | "onChange"
  > {
  value: string;
  onChange: (value: string) => void;
  /** 위에 보이는 이름. 없으면 `aria-label`을 넘긴다. */
  label?: ReactNode;
  variant?: TextAreaVariant;
  error?: string;
  helperText?: string;
  /** 글자 수를 세어 보여준다. 초과해도 입력은 막지 않고 표시만 붉어진다. */
  maxLength?: number;
  /** 내용에 따라 높이가 늘어난다. 채팅 입력창에 쓴다. */
  autoResize?: boolean;
  /** `autoResize`일 때 늘어날 수 있는 최대 높이(px) */
  maxHeight?: number;
  className?: string;
}

export const TextArea = ({
  value,
  onChange,
  label,
  variant = "box",
  error,
  helperText,
  maxLength,
  autoResize = false,
  maxHeight = 160,
  rows = 3,
  disabled = false,
  className,
  id,
  ...rest
}: TextAreaProps) => {
  const generatedId = useId();
  const fieldId = id || `${generatedId}-textarea`;
  const messageId = `${generatedId}-message`;
  const message = error || helperText;
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // 높이를 한 번 0으로 줄였다가 scrollHeight로 다시 잡아야 줄어들 때도 맞는다.
  useEffect(() => {
    if (!autoResize) return;
    const node = textAreaRef.current;
    if (!node) return;

    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, maxHeight)}px`;
    node.style.overflowY = node.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [autoResize, maxHeight, value]);

  const over = maxLength !== undefined && value.length > maxLength;

  return (
    <div className={`${wrapperStyles} ${className || ""}`}>
      {label || maxLength !== undefined ? (
        <div className={headerStyles}>
          {label ? (
            <label className={labelStyles} htmlFor={fieldId}>
              {label}
            </label>
          ) : (
            <span />
          )}
          {maxLength !== undefined ? (
            <span className={counterStyles({ over })}>
              {value.length} / {maxLength}
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        className={fieldStyles({
          variant,
          invalid: Boolean(error) || over,
          disabled,
        })}
      >
        <textarea
          ref={textAreaRef}
          id={fieldId}
          className={`${textAreaStyles} ${autoResize ? autoResizeStyles : ""}`}
          value={value}
          rows={autoResize ? 1 : rows}
          disabled={disabled}
          aria-invalid={error || over ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          onChange={(event) => onChange(event.target.value)}
          {...rest}
        />
      </div>

      {message ? (
        <p
          id={messageId}
          className={messageStyles({ tone: error ? "error" : "help" })}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
};
