"use client";

import { SearchField } from "@repo/ui/searchField";

import { SEARCH_MESSAGES } from "@/entities/market";

import { SEARCH_QUERY_MAX_LENGTH } from "../model/constants";

interface AssetSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Enter · 지우기 — 디바운스를 기다리지 않는다 */
  onCommit: (value: string) => void;
  /** 놓이는 자리의 폭 — 배치는 부르는 쪽이 정한다 */
  className?: string;
}

/**
 * 종목 검색 입력 (`FE-REQ-010` FR-71 · 78). `type="search"` 라 `role="searchbox"` 이고 이름은 `aria-label`.
 * 화면에 들어오면 바로 친다 — 이 화면의 일이 검색 하나다
 */
export const AssetSearchField = ({ value, onChange, onCommit, className }: AssetSearchFieldProps) => (
  <SearchField
    className={className}
    value={value}
    onChange={onChange}
    onSubmit={onCommit}
    onClear={() => onCommit("")}
    label={SEARCH_MESSAGES.fieldLabel}
    placeholder={SEARCH_MESSAGES.placeholder}
    maxLength={SEARCH_QUERY_MAX_LENGTH}
    autoComplete="off"
    // 검색 전용 화면의 첫 입력(FR-71) — 다른 입력이 없다
    autoFocus
  />
);
