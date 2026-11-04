"use client";

import { Chip } from "@repo/ui/chip";

import { CATEGORY_LABEL, EXPENSE_MESSAGES as E, isDefaultCategory } from "../model/messages";
import type { CategoryKey, DefaultCategoryKey } from "../model/types";
import { useCategoryLabel, useCategoryTable } from "./CategoryNames";
import * as s from "./expense.css";

const DEFAULTS = Object.keys(CATEGORY_LABEL) as DefaultCategoryKey[];

/**
 * 분류 고르기 — 바로 적기 · 한 줄 · 붙여넣기 후보 · 반복 템플릿이 같은 칩 묶음을 쓴다(가계부 S1b 에 `record-expense` 에서 내림).
 * 기본 12 다음 보관하지 않은 내 분류(가계부 S1f — 서버 표 순서). 표를 받기 전에도 기본 12 는 바로 그린다.
 * 지금 고른 값이 보관한 분류면(템플릿 고치기) 그 칩 하나를 끝에 남긴다 — 고른 것이 사라지지 않게.
 * 표시 + 받은 `onChange` 호출만 — mutation 0(`fsd-entities.md`).
 */
export const CategoryChips = ({ value, onChange, label = E.category }: { value: CategoryKey | null; onChange: (key: CategoryKey) => void; label?: string }) => {
  const table = useCategoryTable();
  const names = useCategoryLabel();
  const custom = (table ?? []).filter((c) => c.custom && !c.archived).map((c) => c.key);
  const keys: CategoryKey[] = [...DEFAULTS, ...custom];
  if (value !== null && !isDefaultCategory(value) && !custom.includes(value)) keys.push(value);
  return (
    <div className={s.chips} role="group" aria-label={label}>
      {keys.map((key) => (
        <Chip key={key} size="sm" selected={value === key} onPress={() => onChange(key)}>
          {names.category(key)}
        </Chip>
      ))}
    </div>
  );
};
