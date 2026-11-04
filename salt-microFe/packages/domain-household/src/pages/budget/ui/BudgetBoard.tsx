"use client";

import { EmptyState } from "@repo/ui/emptyState";
import { Skeleton } from "@repo/ui/skeleton";

import { panel, panelTitle } from "@repo/web-shared/ui/surface.css";

import { EXPENSE_MESSAGES as E, useHouseholdBudget, useWorkHours } from "@/entities/household";
import { BudgetEditor } from "@/features/edit-budget";
import { CategoryManager } from "@/features/manage-categories";
import { WorkHoursEditor } from "@/features/set-work-hours";

import { BUDGET_PAGE as M } from "../model";
import * as s from "./budget.css";

/** 근무 시간 설정(가계부 S1c) — 받은 뒤에 그려야 입력 칸 초기값이 맞다. 실패해도 예산 편집은 막지 않는다 */
const WorkHoursBlock = () => {
  const work = useWorkHours();
  if (work.isSignedOut || work.isError) return null;
  if (work.data === undefined) return <Skeleton height={160} />;
  return <WorkHoursEditor setting={work.data} />;
};

/** 지금 예산을 받아 편집기에 넣는다 — 받은 뒤에 그려야 입력 칸 초기값이 맞다 */
export const BudgetBoard = () => {
  const budget = useHouseholdBudget();
  if (budget.isSignedOut) return <EmptyState title={E.signedOut} />;
  if (budget.isError) return <EmptyState title={E.loadFailed} tone="error" />;
  if (budget.data === undefined) return <Skeleton height={200} />;
  return (
    <>
      <BudgetEditor budget={budget.data} />
      {/* 내 분류(가계부 S1f) — 봉투 칸 · 칩에 같이 쓰인다. 분류 표 조회 하나(예산 실패와 따로) */}
      <section className={`${panel} ${s.categoryPanel}`} aria-label={M.categories}>
        <h2 className={panelTitle}>{M.categories}</h2>
        <CategoryManager />
      </section>
      <WorkHoursBlock />
    </>
  );
};
