import type { CoachProfileSettings } from "@repo/core/coach";

import { isCoachMode } from "./modeView";

/** 서버 zod 와 같은 범위(`updateCoachProfileSchema`) — 매도 돌아보는 기간(시간) */
export const PANIC_SELL_WINDOW_MIN_HOURS = 1;
export const PANIC_SELL_WINDOW_MAX_HOURS = 168;

const isWindowHours = (value: unknown): value is number =>
  Number.isInteger(value) &&
  (value as number) >= PANIC_SELL_WINDOW_MIN_HOURS &&
  (value as number) <= PANIC_SELL_WINDOW_MAX_HOURS;

/**
 * 코치 설정 응답 → 화면이 읽는 것 (`GET · PATCH /api/app/ai-coach/profile`). 조회와 저장 두 곳이 같은 매퍼를 쓴다 —
 * 저장 응답을 캐시에 그대로 넣으므로 한쪽만 필드를 덜 읽으면 다른 칸이 비어 버린다(매입가 토글이 그랬다).
 *
 * 모르는 값은 `null` — 기본값을 지어내지 않는다. 숨김은 서버가 안 주면 `false`(BFF 와 같다).
 */
export const toCoachProfileSettings = (data: Record<string, unknown>): CoachProfileSettings => ({
  hidePurchasePrice: data.hidePurchasePrice === true,
  defaultMode: isCoachMode(data.defaultMode) ? data.defaultMode : null,
  panicSellWindowHours: isWindowHours(data.panicSellWindowHours) ? data.panicSellWindowHours : null,
});
