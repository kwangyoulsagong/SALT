import { formatPrice } from "@/shared/lib";

import { COACH_MESSAGES } from "../model";

/** 음수 부호는 하이픈이 아니라 U+2212 다 — 색과 함께 문자로도 부호를 준다(`FE-REQ-026` FR-105) */
const MINUS = "−";
const PERCENT_DIGITS = 1;

/**
 * 비율(0.021 = 2.1%) → `+2.1%` · `−9.4%`. **과거 분포를 보여줄 때만** 쓴다.
 * 가격 차이를 %로 바꾸는 데 쓰지 않는다(D13).
 */
export const formatSignedRate = (ratio: number): string => {
  const percent = (ratio * 100).toFixed(PERCENT_DIGITS);
  if (Number(percent) === 0) return `0.${"0".repeat(PERCENT_DIGITS)}%`;
  return ratio > 0 ? `+${percent}%` : `${MINUS}${percent.slice(1)}%`;
};

/** 가격 차이 금액의 크기만. 방향(위 · 아래)은 문구가 말한다 */
export const formatGapAmount = (gap: number): string => formatPrice(Math.abs(gap));

/** 비율(0.57) → `57%`. 부호 없는 몫(적중률 · 비중)만. 점수에 쓰지 않는다(`FE-REQ-027` FR-83) */
export const formatRatio = (ratio: number): string => `${Math.round(ratio * 100)}%`;

/** 현재가와의 차이 문장 — "현재가보다 N원 위/아래". 방향은 말로, 크기는 금액으로(D13) */
export const describePriceGap = (gap: number): string => {
  const { zone } = COACH_MESSAGES;
  if (gap === 0) return zone.gapNone;
  const amount = formatGapAmount(gap);
  return gap > 0 ? zone.gapAbove(amount) : zone.gapBelow(amount);
};
