"use client";

import { Chip } from "@repo/ui/chip";

import { CATEGORY_LABEL, type CategoryKey } from "@/entities/expense";

import { RECORD_MESSAGES as M } from "../model";
import * as s from "./record.css";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as CategoryKey[];

/** 분류 고르기 — 바로 적기 · 한 줄 · 붙여넣기 후보가 같은 칩 묶음을 쓴다 */
export const CategoryChips = ({ value, onChange, label = M.category }: { value: CategoryKey | null; onChange: (key: CategoryKey) => void; label?: string }) => (
  <div className={s.chips} role="group" aria-label={label}>
    {CATEGORIES.map((key) => (
      <Chip key={key} size="sm" selected={value === key} onPress={() => onChange(key)}>
        {CATEGORY_LABEL[key]}
      </Chip>
    ))}
  </div>
);
