/**
 * 거래 계획 — FEATURE-009 FR-9~10 (`SRV-REQ-038`). W06 "결정과 결과를 나눠 기록한다".
 *
 * ## 어떤 필드도 필수가 아니다
 *
 * 종목 · 방향 말고는 전부 비워도 저장된다(FR-10). 손절가가 없으면 사이즈 · R 이 "계산 불가"일 뿐이다.
 *
 * ## 거래에 연결된 뒤에는 채점 대상 필드를 바꿀 수 없다
 *
 * 손절가 · 계획 수량 · 오를 확률은 준수 판정(FR-11)과 Brier 채점(FR-13)의 기준이다. 결정한 뒤에
 * 기준을 옮기면 채점이 자기 채점이 된다. 그래서 거래가 연결되면 이 셋을 잠근다. 이유 · 무효화 조건 ·
 * 복기일 · 목표가는 기록이라 계속 고칠 수 있다. 잘못 적었으면 새 계획을 쓴다 — 이전 것은 남는다.
 */

import type Decimal from "decimal.js";

import { DomainError, ErrorKind } from "../../../shared/domain";
import type { SampleOrigin } from "./symbolJudgment";

export type TradePlanSide = "buy" | "sell";
export type AdherenceLabel =
  | "honored"
  | "stop_not_honored"
  | "stop_slipped"
  | "size_exceeded";

export const ADHERENCE_LABELS: readonly AdherenceLabel[] = [
  "honored",
  "stop_not_honored",
  "stop_slipped",
  "size_exceeded",
];

/** 거래가 연결되면 바꿀 수 없는 필드 */
export const LOCKED_AFTER_EXECUTION = ["stopPrice", "plannedQuantity", "probabilityUp"] as const;
export type LockedPlanField = (typeof LOCKED_AFTER_EXECUTION)[number];

export class TradePlanNotFoundError extends DomainError {
  constructor() {
    super("COACH_TRADE_PLAN_NOT_FOUND", ErrorKind.NotFound, "Trade plan not found");
  }
}

export class TradePlanLockedError extends DomainError {
  constructor(fields: LockedPlanField[]) {
    super(
      "COACH_TRADE_PLAN_LOCKED",
      ErrorKind.Conflict,
      `거래에 연결된 계획은 ${fields.join(", ")} 을(를) 바꿀 수 없다 — 새 계획을 적는다`
    );
  }
}

/** 거래 연결은 한 번뿐이다. 다른 거래로 옮기면 이미 채점된 결과가 다른 거래를 가리킨다 */
export class TradePlanAlreadyLinkedError extends DomainError {
  constructor() {
    super("COACH_TRADE_PLAN_ALREADY_LINKED", ErrorKind.Conflict, "Trade plan is already linked");
  }
}

/** 연결하려는 거래가 없거나 남의 것 · 다른 종목 · 다른 방향이다 */
export class TradePlanTransactionMismatchError extends DomainError {
  constructor(reason: "not_found" | "symbol" | "side") {
    super(
      `COACH_TRADE_PLAN_TRANSACTION_${reason.toUpperCase()}`,
      reason === "not_found" ? ErrorKind.NotFound : ErrorKind.Invalid,
      `Transaction ${reason === "not_found" ? "not found" : `${reason} mismatch`}`
    );
  }
}

export interface TradePlan {
  id: string;
  userId: string;
  transactionId: string | null;
  symbol: string;
  side: TradePlanSide;
  stopPrice: Decimal | null;
  targetPrice: Decimal | null;
  plannedQuantity: Decimal | null;
  thesis: string | null;
  invalidation: string | null;
  reviewAt: Date | null;
  probabilityUp: Decimal | null;
  plannedAt: Date;
  sampleOrigin: SampleOrigin;
  adherenceLabel: AdherenceLabel | null;
  adherenceEvaluatedAt: Date | null;
  userAdherenceLabel: AdherenceLabel | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TradePlanDraft = Omit<
  TradePlan,
  "id" | "adherenceLabel" | "adherenceEvaluatedAt" | "userAdherenceLabel" | "createdAt" | "updatedAt"
>;

/**
 * `undefined` 는 그대로 둔다, `null` 은 지운다.
 * 판정 수정(`userAdherenceLabel`)은 없다 — 판정 배치(슬라이스 4)가 생기기 전에는 고칠 원본 판정이 없다.
 */
export type TradePlanPatch = Partial<
  Pick<
    TradePlan,
    | "transactionId"
    | "stopPrice"
    | "targetPrice"
    | "plannedQuantity"
    | "thesis"
    | "invalidation"
    | "reviewAt"
    | "probabilityUp"
  >
>;

const sameDecimal = (a: Decimal | null, b: Decimal | null): boolean =>
  a === null || b === null ? a === b : a.eq(b);

/** 수정 요청 중 잠긴 필드를 **실제로 바꾸는** 것만 고른다. 같은 값을 다시 보내는 것은 허용한다 */
export const lockedFieldChanges = (plan: TradePlan, patch: TradePlanPatch): LockedPlanField[] => {
  if (plan.transactionId === null) return [];
  return LOCKED_AFTER_EXECUTION.filter(
    (field) => patch[field] !== undefined && !sameDecimal(plan[field], patch[field] ?? null)
  );
};
