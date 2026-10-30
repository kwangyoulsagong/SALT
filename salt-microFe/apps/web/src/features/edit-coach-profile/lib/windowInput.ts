import { PANIC_SELL_WINDOW_MAX_HOURS, PANIC_SELL_WINDOW_MIN_HOURS } from "@/entities/coach";

/** 시간 칸은 정수만 — 숫자 아닌 글자를 지운다 */
export const formatHoursInput = (raw: string): string => raw.replace(/[^0-9]/g, "");

/** 시간 칸 → 보낼 값. 서버 범위(1~168) 밖이거나 비었으면 `undefined`(오류) — 비워서 지우는 칸이 아니다 */
export const toWindowHours = (text: string): number | undefined => {
  if (text.trim() === "") return undefined;
  const value = Number(text);
  if (!Number.isInteger(value)) return undefined;
  if (value < PANIC_SELL_WINDOW_MIN_HOURS || value > PANIC_SELL_WINDOW_MAX_HOURS) return undefined;
  return value;
};
