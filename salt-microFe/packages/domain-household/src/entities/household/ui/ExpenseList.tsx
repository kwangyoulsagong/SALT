import type { ReactNode } from "react";

import { CATEGORY_LABEL, EXPENSE_MESSAGES as M, formatDay, formatWon } from "../model/messages";
import type { HouseholdExpense } from "../model/types";
import * as s from "./expense.css";

/** 쓴 내역 — 날짜 최신순(서버 순서 그대로). 줄 끝 동작(지우기)은 부르는 쪽이 넣는다(엔티티는 쓰기를 모른다) */
export const ExpenseList = ({ expenses, action }: { expenses: HouseholdExpense[]; action?: (expense: HouseholdExpense) => ReactNode }) => {
  if (expenses.length === 0) return <p className={s.note}>{M.listEmpty}</p>;
  return (
    <ul className={s.list} aria-label={M.list}>
      {expenses.map((e) => (
        <li key={e.id} className={s.item}>
          <div className={s.itemMain}>
            <span className={s.itemTitle}>{e.merchant ?? CATEGORY_LABEL[e.category]}</span>
            <span className={s.note}>
              {formatDay(e.spentOn)} · {CATEGORY_LABEL[e.category]}
              {e.installmentMonths ? ` · ${M.installment(e.installmentMonths)}` : ""}
            </span>
          </div>
          <div className={s.itemSide}>
            {e.precision === "approx" ? <span className={s.badge}>{M.approxBadge}</span> : null}
            <span className={s.value}>{formatWon(e.amount)}</span>
            {action ? action(e) : null}
          </div>
        </li>
      ))}
    </ul>
  );
};
