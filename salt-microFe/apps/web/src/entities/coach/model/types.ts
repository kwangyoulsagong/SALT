/**
 * 뷰모델 타입은 `@repo/core/coach` 가 원본이다(`BFF-REQ-024` FR-30). 앱에서 다시 정의하지 않고
 * 슬라이스 barrel 로 다시 내보내기만 한다.
 */
export type {
  CoachMode,
  GaugeTrackRecord,
  ModeCoachViewModel,
  SymbolCoachViewModel,
  Zone,
} from "@repo/core/coach";
