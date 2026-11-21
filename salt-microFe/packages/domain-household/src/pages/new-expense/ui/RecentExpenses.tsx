"use client";

import Link from "next/link";

import { ROUTES } from "@repo/web-shared/config";
import { todayInKorea } from "@repo/web-shared/lib";

import {
  CategoryNamesProvider,
  ExpenseRow,
  useHouseholdMonth,
} from "@/entities/household";

import { NEW_EXPENSE_PAGE as M } from "../model";
import * as s from "./newExpense.css";

/** 사이드에 보이는 줄 수 */
const SHOWN = 8;

/** 이 달 최근 쓴 내역(`FE-REQ-060` FR-6) — 방금 적은 지출이 여기 바로 붙는다(기록 성공이 월 조회를 다시 받는다). 숫자는 서버 */
export const RecentExpenses = () => {
  const month = useHouseholdMonth(todayInKorea().slice(0, 7));
  const m = month.data;
  if (!m) return null;
  return (
    <CategoryNamesProvider categories={m.categories}>
      <section className={s.sideBlock} aria-labelledby="new-recent">
        <div className={s.sideHead}>
          <h2 id="new-recent" className={s.sideTitle}>
            {M.recent}
          </h2>
          <Link href={ROUTES.household} className={s.sideLink}>
            {M.recentAll}
          </Link>
        </div>
        {m.expenses.length === 0 ? (
          <p className={s.sideEmpty}>{M.recentEmpty}</p>
        ) : (
          <ul className={s.rows}>
            {m.expenses.slice(0, SHOWN).map((e) => (
              <ExpenseRow key={e.id} expense={e} />
            ))}
          </ul>
        )}
      </section>
    </CategoryNamesProvider>
  );
};
