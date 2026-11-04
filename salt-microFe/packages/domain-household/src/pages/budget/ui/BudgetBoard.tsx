"use client";

import { EmptyState } from "@repo/ui/emptyState";
import { Skeleton } from "@repo/ui/skeleton";

import { EXPENSE_MESSAGES as E, useHouseholdBudget } from "@/entities/expense";
import { BudgetEditor } from "@/features/edit-budget";

/** 지금 예산을 받아 편집기에 넣는다 — 받은 뒤에 그려야 입력 칸 초기값이 맞다 */
export const BudgetBoard = () => {
  const budget = useHouseholdBudget();
  if (budget.isSignedOut) return <EmptyState title={E.signedOut} />;
  if (budget.isError) return <EmptyState title={E.loadFailed} tone="error" />;
  if (budget.data === undefined) return <Skeleton height={200} />;
  return <BudgetEditor budget={budget.data} />;
};
