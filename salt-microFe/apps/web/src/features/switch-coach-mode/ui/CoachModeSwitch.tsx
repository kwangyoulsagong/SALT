"use client";

import type { CoachMode } from "@repo/core/coach";
import { SegmentedControl, type SegmentedOption } from "@repo/ui/segmentedControl";

import { COACH_MESSAGES } from "@/entities/coach";

const OPTIONS: SegmentedOption<CoachMode>[] = [
  { label: COACH_MESSAGES.modes.scalp, value: "scalp" },
  { label: COACH_MESSAGES.modes.long_term, value: "long_term" },
];

interface CoachModeSwitchProps {
  value: CoachMode;
  onChange: (next: CoachMode) => void;
}

/**
 * ① 모드 스위치 [단타 | 장기] (`FE-REQ-026` FR-111 · FR-121).
 *
 * `role="radiogroup"` 이다 — 값이 늘 하나이고 화살표로 옮긴다. 값은 부르는 쪽이
 * `useCoachModeParam` 으로 URL 에서 읽어 넘긴다.
 */
export const CoachModeSwitch = ({ value, onChange }: CoachModeSwitchProps) => (
  <SegmentedControl
    options={OPTIONS}
    value={value}
    onChange={onChange}
    label={COACH_MESSAGES.modeGroupLabel}
  />
);

export default CoachModeSwitch;
