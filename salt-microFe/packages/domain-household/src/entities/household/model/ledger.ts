import { formatMonth, formatWon } from "./messages";

/**
 * 리볼빙 명세서 · 사람 장부 계약(가계부 S1h — `BFF-REQ-048` `HouseholdRevolving*VM` · `HouseholdPeopleVM`).
 * 금액 · 청구 · 수수료 · 남는 잔액 · 합은 전부 서버 값 — 화면은 글자만 바꾼다(더하기 · 비율 계산 0).
 */

export interface RevolvingPlan {
  id: string;
  label: string | null;
  balance: number;
  payRatio: number;
  /** 연 % 문자열("16.50") */
  annualRate: string;
  statementMonth: string;
  endedOn: string | null;
}

export interface RevolvingCharge {
  month: string;
  principal: number;
  fee: number;
  total: number;
  balanceAfter: number;
}

export interface RevolvingProjection {
  plan: RevolvingPlan;
  charges: RevolvingCharge[];
  feeTotal: number;
  balanceAtEnd: number;
  horizonEnd: string;
}

export interface RevolvingList {
  open: RevolvingProjection[];
  ended: RevolvingPlan[];
  limit: number;
  canAdd: boolean;
  ratioMin: number;
  ratioMax: number;
  rateMax: string;
  monthMin: string;
  monthMax: string;
  horizonMonths: number;
  assumption: string;
}

/** 월 화면 리볼빙 띠 — 지출 합에 더하지 않는다 · stale = 추정 기간이 지난 명세서 */
export interface HouseholdRevolvingBand {
  lines: Array<{ plan: RevolvingPlan; charge: RevolvingCharge }>;
  monthCharge: number;
  upcoming: Array<{ month: string; amount: number }>;
  stale: RevolvingPlan[];
  assumption: string;
}

export interface RevolvingRequest {
  label?: string;
  balance: number;
  payRatio: number;
  /** 문자열 그대로 — 소수 검사는 서버 */
  annualRate: string;
  statementMonth: string;
}

export type GiftDirection = "gave" | "received";

export interface PersonEntry {
  id: string;
  person: string;
  direction: GiftDirection;
  amount: number;
  occasion: string;
  happenedOn: string;
  memo: string | null;
}

export interface PersonTally {
  person: string;
  gave: number;
  received: number;
  count: number;
  lastOn: string;
}

export interface OccasionEnvelope {
  year: number;
  amount: number;
  gave: number;
  /** 음수 가능 — 막지 않는다 */
  remaining: number;
}

export interface HouseholdPeople {
  year: number;
  person: string | null;
  people: PersonTally[];
  entries: PersonEntry[];
  envelope: OccasionEnvelope | null;
  gave: number;
  received: number;
  occasions: string[];
  today: string;
  yearMin: number;
  yearMax: number;
}

export interface PersonEntryRequest {
  person: string;
  direction: GiftDirection;
  amount: number;
  occasion: string;
  happenedOn?: string;
  memo?: string;
}

/**
 * 문구 — 사실만. 리볼빙은 "리볼빙(일부결제금액이월약정)"으로 부른다 — "최소결제" · "일부만 결제"는 쓰지 않는다(다른 서비스로 읽힌다).
 * 결제비율을 올리라 · 해지하라는 말 0. 사람 장부는 "갚을 돈" · "덜 줬다" 같은 판단 0
 */
export const REVOLVING_MESSAGES = {
  title: "리볼빙",
  fullName: "리볼빙(일부결제금액이월약정)",
  monthCharge: (amount: string) => `이 달 추정 청구 ${amount}`,
  empty: "이 달에 추정할 리볼빙 명세서가 없어요",
  line: (principal: string, fee: string) => `이월 잔액에서 ${principal} · 수수료 ${fee}`,
  balanceAfter: (amount: string) => `그 뒤 이월 잔액 ${amount}`,
  upcoming: "앞으로 6개월 추정 청구",
  stale: (label: string, end: string) => `${label} — ${end} 명세서로는 6개월까지만 추정해요. 새 명세서를 적으면 다시 보여요`,
  note: "적어 둔 명세서로 계산한 추정이에요. 새로 쓰는 돈 없이 약정결제비율대로 낸다고 봤어요 — 실제 청구는 카드사 명세서가 정해요",
  manage: "리볼빙 명세서 적기",
  unnamed: (month: string, balance: string) => `리볼빙 · ${month} 명세서 ${balance}`,
  assumption: { no_new_use: "새로 쓰는 돈 없이 이대로 낸다면" } as Record<string, string>,
} as const;

export const PEOPLE_MESSAGES = {
  direction: { gave: "준 돈", received: "받은 돈" } as Record<GiftDirection, string>,
  occasions: {
    wedding: "결혼",
    funeral: "조의",
    first_birthday: "돌",
    birthday: "생일",
    housewarming: "집들이",
    holiday: "명절",
    other: "그 밖",
  } as Record<string, string>,
} as const;

export const occasionLabel = (key: string): string => PEOPLE_MESSAGES.occasions[key] ?? PEOPLE_MESSAGES.occasions.other;

/**
 * 이름이 없으면 명세서 달 · 이월 잔액으로 — 그 명세서 자신의 값이라 월 띠 · 관리 화면 · 끝낸 목록이 같은 이름을 쓴다
 * (확인 단계 결함 — 목록 순번으로 지으면 띠와 관리 화면의 "리볼빙 N"이 갈렸다)
 */
export const revolvingName = (plan: RevolvingPlan): string => plan.label ?? REVOLVING_MESSAGES.unnamed(formatMonth(plan.statementMonth), formatWon(plan.balance));

/** "2025-05-01" → "2025년 5월 1일" — 사람 장부는 해를 넘겨 보므로 해까지 */
export const formatFullDay = (date: string): string => {
  const [year, month, day] = date.split("-");
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
};

/** "16.50" → "연 16.5%" — 글자만 */
export const formatRate = (rate: string): string => `연 ${Number(rate)}%`;
