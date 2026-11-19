import { formatPrice } from "@repo/web-shared/lib";

import { PLAN_MESSAGES } from "../model/messages";
import type { PlanBandRule, PlanIndicator } from "../model/types";

/**
 * 밴드 적립 **표시** 포맷 — 계산이 아니다. 서버 값의 단위만 바꿔 보인다(소수 → %, ISO → 날짜).
 * 배수 · 금액 · 관문 · 백분위는 전부 서버 값이고 여기서 만들지 않는다(`FE-REQ-023` FR-1~3)
 */

/** 원 — 서버가 1,000원 단위로 반올림한 정수를 콤마만 붙인다 */
export const won = (n: number) => formatPrice(n);

/** 부호를 글자로(색만으로 말하지 않는다 — `a11y-policy.md`) */
const sign = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "");

/** 소수(0.115) → "+11.5" — %p · % 단위 글자는 문구가 붙인다 */
export const signedPctOfFraction = (fraction: number) => `${sign(fraction)}${Math.abs(fraction * 100).toFixed(1)}`;

/** 이미 % 인 값(김프 2.94) → "+2.94" */
export const signedPct = (pct: number) => `${sign(pct)}${Math.abs(pct).toFixed(2)}`;

/** 배수 1 → "1.0", 0.25 → "0.25" — 서버 값 그대로 보이되 자릿수만 맞춘다 */
export const multiplierText = (m: number) => (Number.isInteger(m * 10) ? m.toFixed(1) : String(m));

/** ISO 시각 · 날짜 → YYYY-MM-DD(서버가 KST 월요일 · UTC 자정으로 준 날짜를 그대로 자른다) */
export const dateText = (iso: string) => iso.slice(0, 10);

/** YYYY-MM-DD → YYYY-MM */
export const monthText = (iso: string) => iso.slice(0, 7);

export const bandLabel = (key: string) => PLAN_MESSAGES.band[key] ?? key;

/** 지표 값 — BFF 숫자 그대로. MVRV Z 는 소수 둘, 코스피는 PER 배수 */
export const indicatorValueText = (indicator: PlanIndicator | null, value: number) =>
  indicator === "per_percentile" ? PLAN_MESSAGES.times(value.toFixed(1)) : value.toFixed(2);

/** 밴드 경계 글자 — 코스피 백분위(0~1)는 %로, MVRV Z 는 그대로 */
const edgeText = (indicator: PlanIndicator | null, v: number) =>
  indicator === "per_percentile" ? PLAN_MESSAGES.percentileValue((v * 100).toFixed(0)) : `Z ${v}`;

/** 사전등록 밴드 줄의 구간 글자 — 앞 줄 경계 이상 · 이 줄 경계 미만(끝 줄은 앞 경계 이상) */
export const bandRangeText = (indicator: PlanIndicator | null, rules: PlanBandRule[], index: number) => {
  const t = PLAN_MESSAGES.bandTable;
  const lower = index > 0 ? rules[index - 1].below : null;
  const upper = rules[index].below;
  if (lower === null && upper !== null) return t.below(edgeText(indicator, upper));
  if (lower !== null && upper === null) return t.above(edgeText(indicator, lower));
  if (lower !== null && upper !== null) return t.between(edgeText(indicator, lower), edgeText(indicator, upper));
  return "";
};
