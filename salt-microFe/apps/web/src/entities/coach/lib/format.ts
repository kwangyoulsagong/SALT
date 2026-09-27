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

/** 비율 차이(0.1 = 10%p) → `+10%p` · `−4%p`. 적중률 − 기저율처럼 **두 비율의 차**에만(F010 슬라이스 0) */
export const formatSignedPoints = (diff: number): string => {
  const points = Math.round(diff * 100);
  if (points === 0) return "0%p";
  return points > 0 ? `+${points}%p` : `${MINUS}${Math.abs(points)}%p`;
};

/** 비율(0.57) → `57%`. 부호 없는 몫(적중률 · 비중)만. 점수에 쓰지 않는다(`FE-REQ-027` FR-83) */
export const formatRatio = (ratio: number): string => `${Math.round(ratio * 100)}%`;

/** 현재가와의 차이 문장 — "현재가보다 N원 위/아래". 방향은 말로, 크기는 금액으로(D13) */
export const describePriceGap = (gap: number): string => {
  const { zone } = COACH_MESSAGES;
  if (gap === 0) return zone.gapNone;
  const amount = formatGapAmount(gap);
  return gap > 0 ? zone.gapAbove(amount) : zone.gapBelow(amount);
};

const generatedAtFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * 리포트 생성 시각 → `9월 23일 13:40`. **클라이언트에서만** 부른다 — 타임존이 다르면
 * 서버와 문자열이 갈린다(`formatClockTime` 과 같은 조건). 읽을 수 없으면 `null`.
 */
export const formatGeneratedAt = (iso: string): string | null => {
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? null : generatedAtFormatter.format(at);
};

const fineRateFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 });
const quantityFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 8 });
const timesFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });

/** 작은 비율(0.0005) → `0.05%`. 수수료처럼 정수 %로 반올림하면 0 이 되는 값에만 */
export const formatFineRate = (ratio: number): string => `${fineRateFormatter.format(ratio * 100)}%`;

/** 코인 수량 — 서버가 소수 8자리로 내림해 준다. 표시만 한다 */
export const formatQuantity = (quantity: number): string => quantityFormatter.format(quantity);

/** 배수(회전율 3.2) → `3.2` */
export const formatTimes = (value: number): string => timesFormatter.format(value);

const DAY_MS = 86_400_000;

/**
 * 계획 뒤 지난 날 수(D+N). 날짜 차이일 뿐 금액이 아니다. **클라이언트에서만** 부른다(오늘이 기준).
 * 읽을 수 없는 시각이면 `null`.
 */
export const daysSince = (iso: string, now: number = Date.now()): number | null => {
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return null;
  return Math.max(0, Math.floor((now - at) / DAY_MS));
};

const signedDecimalFormatter = new Intl.NumberFormat("ko-KR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** 부호 있는 소수(R 배수 −0.84) → `−0.8` · `+1.2`. 음수 부호는 U+2212 */
export const formatSignedDecimal = (value: number): string => {
  const text = signedDecimalFormatter.format(Math.abs(value));
  if (Number(text) === 0) return text;
  return value > 0 ? `+${text}` : `${MINUS}${text}`;
};

/** 부호 있는 원 금액 → `+310,000` · `−280,000`. 0 은 부호 없음 */
export const formatSignedKrw = (value: number): string => {
  if (value === 0) return formatPrice(0);
  return value > 0 ? `+${formatPrice(value)}` : `${MINUS}${formatPrice(Math.abs(value))}`;
};

const shortDateFormatter = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" });

/** 날짜 → `9월 23일`. **클라이언트에서만** 부른다(타임존). 읽을 수 없으면 `null` */
export const formatShortDate = (iso: string): string | null => {
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? null : shortDateFormatter.format(at);
};

const scoreFormatter = new Intl.NumberFormat("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 3 });

/** Brier 점수(0.325) → `0.325`. 비율이 아니라 점수라 % 로 바꾸지 않는다 */
export const formatScore = (value: number): string => scoreFormatter.format(value);
