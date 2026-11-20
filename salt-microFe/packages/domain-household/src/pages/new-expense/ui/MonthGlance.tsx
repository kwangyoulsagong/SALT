"use client";

import { todayInKorea } from "@repo/web-shared/lib";

import {
  BOARD_MESSAGES as B,
  CategoryNamesProvider,
  CategoryRatio,
  DailySpendBars,
  EXPENSE_MESSAGES as E,
  formatWon,
  useHouseholdMonth,
} from "@/entities/household";

import { NEW_EXPENSE_PAGE as M } from "../model";
import * as s from "./newExpense.css";

/**
 * 적는 동안 보는 이번 달(2026-11-20) — 폼 옆이 비어 있던 자리. 쓴 돈 · 날마다 막대 · 분류별(가계부 첫 화면과 같은 조각 · 같은 조회 키라 요청 0 — 사이드 최근 내역과 공유).
 * 저장하면 조회가 다시 받아져 방금 적은 것이 막대에 바로 보인다. 숫자는 서버 값 그대로
 */
export const MonthGlance = () => {
  const month = useHouseholdMonth(todayInKorea().slice(0, 7));
  const m = month.data;
  if (!m) return null;
  return (
    <CategoryNamesProvider categories={m.categories}>
      <section className={s.glance} aria-labelledby="new-expense-glance">
        <div className={s.glanceHead}>
          <h2 id="new-expense-glance" className={s.sideTitle}>
            {M.glanceTitle}
          </h2>
          <span className={s.glanceTotal}>{formatWon(m.totals.total)}</span>
        </div>
        <span className={s.glanceHint}>{E.count(m.totals.count)}</span>
        <DailySpendBars days={m.calendar.days} selected={null} />
        <h3 className={s.sideTitle}>{B.ratioTitle}</h3>
        <CategoryRatio byCategory={m.byCategory} />
      </section>
    </CategoryNamesProvider>
  );
};
