import { savingsRequest, type SavingsGoalDetail } from "@/entities/goal";

export interface DepositRequest {
  amount: number;
  /** "2026-11-03" — 없으면 서버가 오늘(KST) */
  depositedOn?: string;
  note?: string;
}

export interface SplitRequest {
  total: number;
  parts: { goalId: string; amount: number }[];
  depositedOn?: string;
}

export interface SplitResult {
  splitGroupId: string | null;
  goals: SavingsGoalDetail[];
}

/** 적립 — 응답은 서버가 다시 계산한 상세(진척 · 이정표 · 새 구간). 합계 검증도 서버(`SRV-REQ-045` FR-4) */
export const recordDepositApi = {
  single: (goalId: string, body: DepositRequest) =>
    savingsRequest<SavingsGoalDetail>("POST", `/goals/${encodeURIComponent(goalId)}/deposits`, body, "savings-deposit"),
  split: (body: SplitRequest) => savingsRequest<SplitResult>("POST", "/deposits/split", body, "savings-split"),
};
