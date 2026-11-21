"use client";

import { Skeleton } from "@repo/ui/skeleton";
import { StatusLine } from "@repo/ui/statusLine";

import { todayInKorea } from "@repo/web-shared/lib";

import {
  CategoryNamesProvider,
  EXPENSE_MESSAGES as E,
  useHouseholdBudget,
  useHouseholdMonth,
  useWorkHours,
  BOARD_MESSAGES as B,
  CategoryRatio,
} from "@/entities/household";
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

/** 오른쪽 사이드 — 내 분류(봉투 칸 · 칩에 같이 쓰인다) · 근무 시간 */
export const BudgetSide = () => (
  <>
    <section className={s.sideBlock} aria-labelledby="budget-categories">
      <h2 id="budget-categories" className={s.sideTitle}>
        {M.categories}
      </h2>
      <CategoryManager />
    </section>
    {/* 근무 시간 — 편집기가 자기 제목을 갖는다(같은 제목 두 번 금지) */}
    <WorkHoursBlock />
  </>
);

/**
 * 지금 예산 + 이번 달 분류별 쓴 돈(서버 `byCategory` — 봉투 행 보조 줄)을 받아 편집기에 넣는다. 받은 뒤에 그려야 입력 칸 초기값이 맞다.
 * 쓴 돈을 못 받아도 편집은 된다(보조 줄만 빠진다)
 */
export const BudgetBoard = () => {
  const budget = useHouseholdBudget();
  const month = useHouseholdMonth(todayInKorea().slice(0, 7));
  // 상태는 한 줄(`FE-REQ-060` FR-13)
  if (budget.isSignedOut)
    return <StatusLine kind="blocked">{E.signedOut}</StatusLine>;
  if (budget.isError)
    return <StatusLine kind="error">{E.loadFailed}</StatusLine>;
  if (budget.data === undefined) return <Skeleton height={400} />;
  const spent = Object.fromEntries(
    (month.data?.byCategory ?? []).map((c) => [c.key, c.spent]),
  );
  return (
    <CategoryNamesProvider categories={month.data?.categories ?? []}>
      {/* 예산 칸 | 이번 달 분류별로 쓴 돈(2026-11-20 — 칸을 정할 때 볼 숫자가 옆에, 오른쪽이 비어 있었다). 1280 미만은 위아래 */}
      <div className={s.split}>
        <div className={s.editorCard}>
          <BudgetEditor budget={budget.data} spent={spent} />
        </div>
        {month.data ? (
          <section className={s.ratioCard} aria-labelledby="budget-ratio">
            <h2 id="budget-ratio" className={s.sideTitle}>
              {B.ratioTitle}
            </h2>
            <CategoryRatio byCategory={month.data.byCategory} />
          </section>
        ) : null}
      </div>
    </CategoryNamesProvider>
  );
};
