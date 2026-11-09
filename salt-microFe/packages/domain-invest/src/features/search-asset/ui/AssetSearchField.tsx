"use client";

import { SearchField } from "@repo/ui/searchField";
import { forwardRef, type KeyboardEvent } from "react";

import { SEARCH_MESSAGES } from "@/entities/market";

import { SEARCH_QUERY_MAX_LENGTH } from "../model/constants";

interface AssetSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Enter(고른 행이 없을 때) · 지우기 — 디바운스를 기다리지 않는다 */
  onCommit: (value: string) => void;
  /** ↑↓ · Enter — 목록 키(`useSearchListKeys`) */
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  /** 결과 목록 id · 고른 행 id — 칸이 목록을 가리키는 콤보 상자다(`FE-REQ-066` FR-5) */
  listId: string;
  activeOptionId?: string;
  expanded: boolean;
  /** 목록 모양 — 첫 화면 순위는 `listbox`, 결과(★ 칸이 있는 줄)는 `grid` */
  popup: "listbox" | "grid";
  /** 놓이는 자리의 폭 — 배치는 부르는 쪽이 정한다 */
  className?: string;
}

/**
 * 종목 검색 입력 (`FE-REQ-010` FR-71 · 78 → `FE-REQ-066` FR-5). **포커스는 늘 여기** — 목록 행은 `aria-activedescendant` 로 가리킨다
 * (`role="combobox"` · `aria-controls`). 첫 포커스는 모달이 준다(`Modal` `initialFocusRef` — 그래서 `ref` 를 연다)
 */
export const AssetSearchField = forwardRef<HTMLInputElement, AssetSearchFieldProps>(
  ({ value, onChange, onCommit, onKeyDown, listId, activeOptionId, expanded, popup, className }, ref) => (
    <SearchField
      ref={ref}
      className={className}
      value={value}
      onChange={onChange}
      onSubmit={onCommit}
      onClear={() => onCommit("")}
      onKeyDown={onKeyDown}
      label={SEARCH_MESSAGES.fieldLabel}
      placeholder={SEARCH_MESSAGES.placeholder}
      maxLength={SEARCH_QUERY_MAX_LENGTH}
      autoComplete="off"
      role="combobox"
      aria-autocomplete="list"
      aria-haspopup={popup}
      aria-controls={listId}
      aria-expanded={expanded}
      aria-activedescendant={activeOptionId}
    />
  ),
);
AssetSearchField.displayName = "AssetSearchField";
