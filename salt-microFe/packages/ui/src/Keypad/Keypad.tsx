"use client";

import { Delete } from "lucide-react";
import { gridStyles, iconKeyStyles, keyStyles } from "./styles/keypad.css";

/** 숫자 뒤 세 번째 칸에 넣을 키. */
export type KeypadExtraKey = "00" | "." | "none";

export interface KeypadProps {
  /** 현재 입력값. 숫자 문자열로 다룬다. */
  value: string;
  onChange: (value: string) => void;
  /** 최대 자릿수. 소수점과 `-`는 세지 않는다. */
  maxLength?: number;
  extraKey?: KeypadExtraKey;
  disabled?: boolean;
  className?: string;
}

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

const countDigits = (value: string) => value.replace(/[^0-9]/g, "").length;

/** 모바일 금액·수량 입력용 숫자 키패드. */
export const Keypad = ({
  value,
  onChange,
  maxLength = 12,
  extraKey = "00",
  disabled = false,
  className,
}: KeypadProps) => {
  const append = (input: string) => {
    if (input === "." && value.includes(".")) return;
    if (input !== "." && countDigits(value + input) > maxLength) return;

    // 맨 앞 0은 소수점이 따라올 때만 남긴다.
    if (value === "0" && input !== ".") {
      onChange(input);
      return;
    }
    onChange(value + input);
  };

  const backspace = () => {
    onChange(value.slice(0, -1));
  };

  return (
    <div className={`${gridStyles} ${className || ""}`}>
      {DIGITS.map((digit) => (
        <button
          key={digit}
          type="button"
          className={keyStyles}
          disabled={disabled}
          onClick={() => append(digit)}
        >
          {digit}
        </button>
      ))}

      {extraKey === "none" ? (
        <span aria-hidden="true" />
      ) : (
        <button
          type="button"
          className={keyStyles}
          disabled={disabled}
          onClick={() => append(extraKey)}
          aria-label={extraKey === "00" ? "0 두 번" : "소수점"}
        >
          {extraKey}
        </button>
      )}

      <button
        type="button"
        className={keyStyles}
        disabled={disabled}
        onClick={() => append("0")}
      >
        0
      </button>

      <button
        type="button"
        className={`${keyStyles} ${iconKeyStyles}`}
        disabled={disabled || value.length === 0}
        onClick={backspace}
        aria-label="한 글자 지우기"
      >
        <Delete size={22} aria-hidden="true" />
      </button>
    </div>
  );
};
