"use client";

import type { FormEvent, InputHTMLAttributes } from "react";
import { Search, X } from "lucide-react";
import { IconButton } from "../IconButton/IconButton";
import {
  formStyles,
  iconStyles,
  inputStyles,
} from "./styles/searchField.css";

export interface SearchFieldProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "type" | "onSubmit"
  > {
  value: string;
  onChange: (value: string) => void;
  /** 지우기 버튼을 눌렀을 때. 없으면 빈 문자열로 `onChange`한다. */
  onClear?: () => void;
  /** Enter를 눌렀을 때 */
  onSubmit?: (value: string) => void;
  /** 스크린 리더가 읽을 검색창 이름 */
  label?: string;
  placeholder?: string;
  className?: string;
}

/**
 * 검색 전용 입력창.
 * 일반 폼 입력은 `TextField`를 쓴다.
 */
export const SearchField = ({
  value,
  onChange,
  onClear,
  onSubmit,
  label = "검색",
  placeholder = "검색어를 입력하세요",
  className,
  ...rest
}: SearchFieldProps) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.(value);
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
      return;
    }
    onChange("");
  };

  return (
    <form
      role="search"
      aria-label={label}
      onSubmit={handleSubmit}
      className={`${formStyles} ${className || ""}`}
    >
      <span className={iconStyles} aria-hidden="true">
        <Search size={18} />
      </span>

      <input
        type="search"
        className={inputStyles}
        value={value}
        placeholder={placeholder}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        {...rest}
      />

      {value ? (
        <IconButton
          icon={<X size={16} aria-hidden="true" />}
          label="검색어 지우기"
          size="sm"
          round
          onClick={handleClear}
        />
      ) : null}
    </form>
  );
};
