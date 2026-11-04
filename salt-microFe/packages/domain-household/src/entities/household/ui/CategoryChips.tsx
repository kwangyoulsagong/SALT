"use client";

import { Chip } from "@repo/ui/chip";

import { CATEGORY_LABEL, EXPENSE_MESSAGES as E } from "../model/messages";
import type { CategoryKey } from "../model/types";
import * as s from "./expense.css";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as CategoryKey[];

/**
 * 분류 고르기 — 바로 적기 · 한 줄 · 붙여넣기 후보 · 반복 템플릿이 같은 칩 묶음을 쓴다(가계부 S1b 에 `record-expense` 에서 내림).
 * 표시 + 받은 `onChange` 호출만 — mutation 0(`fsd-entities.md`).
 */
export const CategoryChips = ({ value, onChange, label = E.category }: { value: CategoryKey | null; onChange: (key: CategoryKey) => void; label?: string }) => (
  <div className={s.chips} role="group" aria-label={label}>
    {CATEGORIES.map((key) => (
      <Chip key={key} size="sm" selected={value === key} onPress={() => onChange(key)}>
        {CATEGORY_LABEL[key]}
      </Chip>
    ))}
  </div>
);
