"use client";

import { Chip } from "@repo/ui/chip";

import { EMOTION_LABEL, FEELING_MESSAGES as F } from "../model/messages";
import type { EmotionKey } from "../model/types";
import * as s from "./expense.css";

const SCALE = [1, 2, 3, 4, 5] as const;

/**
 * 감정 고르기(가계부 S1c FR-13) — 키 목록은 서버(`emotions`). 다시 누르면 비운다(선택 사항이라).
 * 표시 + 받은 `onChange` 호출만 — mutation 0(`fsd-entities.md`).
 */
export const EmotionChips = ({ emotions, value, onChange }: { emotions: EmotionKey[]; value: EmotionKey | null; onChange: (key: EmotionKey | null) => void }) => (
  <div className={s.chips} role="group" aria-label={F.tag}>
    {emotions.map((key) => (
      <Chip key={key} size="sm" selected={value === key} onPress={() => onChange(value === key ? null : key)}>
        {EMOTION_LABEL[key]}
      </Chip>
    ))}
  </div>
);

/** 만족 1~5 — 숫자만(좋다 · 나쁘다 낱말 0). [allowClear] 면 다시 누를 때 비운다 */
export const FeltScale = ({ label, value, onChange, allowClear = true }: { label: string; value: number | null; onChange: (v: number | null) => void; allowClear?: boolean }) => (
  <div className={s.chips} role="group" aria-label={label}>
    {SCALE.map((v) => (
      <Chip key={v} size="sm" selected={value === v} onPress={() => onChange(allowClear && value === v ? null : v)} aria-label={F.feltScale(v)}>
        {String(v)}
      </Chip>
    ))}
  </div>
);
