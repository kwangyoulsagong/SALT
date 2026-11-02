import type {
  CoachMode,
  GaugeTrackRecord,
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

/** 게이지 아래 한 줄의 재료. 없으면 줄을 그리지 않는다(`FE-REQ-026` FR-118) */
export const findGaugeTrackRecord = (
  records: readonly GaugeTrackRecord[],
  gauge: GaugeTrackRecord["gauge"],
): GaugeTrackRecord | undefined =>
  records.find((record) => record.gauge === gauge);
