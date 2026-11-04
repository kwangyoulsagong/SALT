import { todayInKorea } from "@repo/web-shared/lib";

const YM = /^\d{4}-(0[1-9]|1[0-2])$/;

/** 이번 달 "YYYY-MM"(한국 시간) */
export const currentMonth = (): string => todayInKorea().slice(0, 7);

/** 주소의 달이 형식에 맞나 — 틀리면 404 */
export const isMonth = (value: string): boolean => YM.test(value);

/** 앞뒤 달 — 달력 글자 이동(금액 계산 아님) */
export const shiftMonth = (ym: string, delta: number): string => {
  const [y, m] = ym.split("-").map(Number);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
};
