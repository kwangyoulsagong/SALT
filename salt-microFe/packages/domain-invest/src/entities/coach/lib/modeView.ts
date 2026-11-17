import type {
  CoachMode,
  ModeCoachViewModel,
  SymbolCoachViewModel,
} from "@repo/core/coach";

const MODES: readonly CoachMode[] = ["scalp", "long_term"];

export const isCoachMode = (value: unknown): value is CoachMode =>
  MODES.includes(value as CoachMode);

/**
 * 모드 하나를 꺼낸다. `null` = BFF 가 계약이 깨진 모드를 막았다(`degradedFields`).
 * 화면은 그것을 "불러올 수 없음"으로 그린다 — 판단을 지어내지 않는다.
 */
export const selectModeView = (
  view: SymbolCoachViewModel,
  mode: CoachMode,
): ModeCoachViewModel | null =>
  mode === "scalp" ? view.modes.scalp : view.modes.longTerm;
