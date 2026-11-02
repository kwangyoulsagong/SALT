"use client";

import type { EntryChecklistView } from "@repo/core/coach";
import { TextField } from "@repo/ui/textField";
import { ChevronDown } from "lucide-react";
import { useId } from "react";

import { RECORD_TRANSACTION_MESSAGES as MSG } from "../model";
import {
  checklistBody,
  checklistBox,
  checklistItem,
  checklistItems,
  chevron,
  chevronOpen,
  hint,
  label,
  subToggle,
} from "./RecordTrade.css";

const PREMORTEM_MAX_LENGTH = 200;

interface EntryChecklistProps {
  /** 서버가 본인 실수 태그에서 뽑은 질문(size-check `behavior.checklist`) */
  checklist: EntryChecklistView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checked: readonly string[];
  onCheckedChange: (checked: string[]) => void;
  premortem: string;
  onPremortemChange: (value: string) => void;
}

/**
 * 진입 전 체크 (F009 FR-30 · `FE-REQ-039` FR-22) — "계획(선택)" 안의 또 한 번 접힌 묶음.
 *
 * 질문은 **본인 실수 태그**에서 자란다(서버). 체크는 **기록만** 한다 — 체크하지 않아도, 전부 "예"여도 기록하기 버튼은
 * 그대로다(막지 않는다 · 2026-09-08 결정). 프리모템 답은 계획의 무효화 조건으로 저장된다.
 */
export const EntryChecklist = ({
  checklist,
  open,
  onOpenChange,
  checked,
  onCheckedChange,
  premortem,
  onPremortemChange,
}: EntryChecklistProps) => {
  const ids = { body: useId(), premortem: useId() };
  const toggle = (tag: string, next: boolean) =>
    onCheckedChange(next ? [...checked, tag] : checked.filter((item) => item !== tag));

  return (
    <div>
      <button
        type="button"
        className={subToggle}
        aria-expanded={open}
        aria-controls={ids.body}
        onClick={() => onOpenChange(!open)}
      >
        {MSG.checklist.toggle}
        <ChevronDown size={16} className={open ? chevronOpen : chevron} aria-hidden="true" />
      </button>
      {open && (
        <div id={ids.body} className={checklistBody}>
          <p className={hint}>{checklist.items.length ? MSG.checklist.hint : MSG.checklist.noItems}</p>
          {checklist.items.length > 0 && (
            <ul className={checklistItems} aria-label={MSG.checklist.listLabel}>
              {checklist.items.map((item) => (
                <li key={item.tag}>
                  {/* 선택은 체크 표시로만 — 보라 면을 쓰지 않는다(태그 확정 · 표 선택과 같은 팔레트) */}
                  <label className={checklistItem}>
                    <input
                      type="checkbox"
                      className={checklistBox}
                      checked={checked.includes(item.tag)}
                      onChange={(event) => toggle(item.tag, event.target.checked)}
                    />
                    {item.question}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <label className={label} htmlFor={ids.premortem}>
            {checklist.premortemQuestion}
          </label>
          <TextField
            id={ids.premortem}
            variant="compact"
            autoComplete="off"
            maxLength={PREMORTEM_MAX_LENGTH}
            placeholder={MSG.checklist.premortemPlaceholder}
            value={premortem}
            onChange={onPremortemChange}
          />
        </div>
      )}
    </div>
  );
};
