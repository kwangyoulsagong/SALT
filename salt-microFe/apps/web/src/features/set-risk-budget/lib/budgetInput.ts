import type { BudgetSetting, BudgetUnit } from "@repo/core/coach";

import { formatAmountInput, formatPrice, parseAmountInput } from "@/shared/lib";

/**
 * 기준 입력 칸 ↔ 보낼 값 (F009 FR-1~2 · IPS 3문항).
 *
 * **금액을 계산하지 않는다.** 원은 그대로, % 는 적은 숫자를 비율로 옮길 뿐이다(5 → 0.05, 서버 계약이 비율이다).
 * 총자산 대비 원 환산은 서버가 한다 — 게이지 응답이 곧 그 값이다.
 */

const PERCENT = 100;
/** 한 종목 상한 — 서버 zod 와 같은 범위(0.05~1) */
export const CAP_MIN_PERCENT = 5;
export const CAP_MAX_PERCENT = 100;

const percentFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2, useGrouping: false });

/** 비율(0.05) → 칸 글자(`5`) */
export const ratioToPercentText = (ratio: number): string => percentFormatter.format(ratio * PERCENT);

export interface BudgetInput {
  text: string;
  unit: BudgetUnit;
}

/** 저장된 기준 → 칸. 없으면 원 단위 빈 칸 */
export const toBudgetInput = (setting: BudgetSetting | null): BudgetInput =>
  setting === null
    ? { text: "", unit: "krw" }
    : setting.unit === "krw"
      ? { text: formatAmountInput(formatPrice(setting.amount)), unit: "krw" }
      : { text: ratioToPercentText(setting.amount), unit: "percent" };

/** 칸 → 보낼 값. 비었으면 지운다(`null`), 숫자가 아니거나 범위 밖이면 `undefined`(오류) */
export const toBudgetSetting = (input: BudgetInput): BudgetSetting | null | undefined => {
  if (input.text.trim() === "") return null;
  const value = parseAmountInput(input.text);
  if (value === null) return undefined;
  if (input.unit === "krw") return { amount: value, unit: "krw" };
  return value <= PERCENT ? { amount: value / PERCENT, unit: "percent" } : undefined;
};

/** 한 종목 상한 칸 → 보낼 값. 비었으면 `null`(서버 기본 60%), 범위 밖이면 `undefined` */
export const toCapRatio = (text: string): number | null | undefined => {
  if (text.trim() === "") return null;
  const value = parseAmountInput(text);
  if (value === null || value < CAP_MIN_PERCENT || value > CAP_MAX_PERCENT) return undefined;
  return value / PERCENT;
};

/** % 칸은 콤마를 넣지 않는다(최대 100). 숫자 · 점만 남긴다 */
export const formatPercentInput = (raw: string): string => {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const [integer = "", ...rest] = cleaned.split(".");
  return cleaned.includes(".") ? `${integer || "0"}.${rest.join("")}` : integer;
};
