import { apiFetch, authHeader, readApiError } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

import type { SavingsGoalDetail } from "@/entities/goal";

const SAVINGS = `${INVESTMENTS_BASE_URL}/api/app/savings`;

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

const post = async <T>(url: string, body: unknown, name: string): Promise<T> => {
  const response = await apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await readApiError(response, name);
  return (await response.json()) as T;
};

/** 적립 — 응답은 서버가 다시 계산한 상세(진척 · 이정표 · 새 구간). 합계 검증도 서버(`SRV-REQ-045` FR-4) */
export const recordDepositApi = {
  single: (goalId: string, body: DepositRequest) =>
    post<SavingsGoalDetail>(`${SAVINGS}/goals/${encodeURIComponent(goalId)}/deposits`, body, "savings-deposit"),
  split: (body: SplitRequest) => post<SplitResult>(`${SAVINGS}/deposits/split`, body, "savings-split"),
};
