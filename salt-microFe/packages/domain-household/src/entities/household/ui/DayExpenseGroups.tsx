"use client";

import type { ReactNode } from "react";

import { BOARD_MESSAGES as B, EMOTION_LABEL, EXPENSE_MESSAGES as M, FIXED_COST_MESSAGES as F, WORK_MESSAGES as W, formatWon, formatWorkMinutes } from "../model/messages";
import { groupExpensesByDay } from "../lib/board";
import type { CalendarDay, HouseholdExpense } from "../model/types";
import { useCategoryLabel } from "./CategoryNames";
import * as s from "./board.css";

/** 그날 합 · 요일 — 서버 달력 칸에서(화면에서 더하지 않는다, `FE-REQ-060` 영향 절) */
const dayIndex = (days: CalendarDay[]) => new Map(days.map((d) => [d.date, d]));

/** 지출 한 줄 — 왼쪽 분류 판 · 이름 + 보조 · 오른쪽 금액(+ 지우기 같은 행동) */
export const ExpenseRow = ({ expense: e, action }: { expense: HouseholdExpense; action?: ReactNode }) => {
  const label = useCategoryLabel();
  const category = label.category(e.category);
  const extras = [
    e.installmentMonths ? M.installment(e.installmentMonths) : null,
    e.workMinutes !== null ? W.line(formatWorkMinutes(e.workMinutes)) : null,
    e.typicalAmount != null ? F.typical(formatWon(e.typicalAmount)) : null,
  ].filter(Boolean);
  return (
    <li className={s.row}>
      <span className={s.plate} aria-hidden>
        {category.slice(0, 1)}
      </span>
      <span className={s.rowMain}>
        <span className={s.rowTitle}>{e.merchant ?? category}</span>
        {/* 쓴 곳이 없으면 이름이 이미 분류 — 보조 줄에 다시 쓰지 않는다(같은 글자 두 번) */}
        {e.merchant || extras.length > 0 ? (
          <span className={s.rowCaption}>{(e.merchant ? [category, ...extras] : extras).join(" · ")}</span>
        ) : null}
      </span>
      <span className={s.rowSide}>
        {e.feeling ? <span className={s.badge}>{EMOTION_LABEL[e.feeling.emotion]}</span> : null}
        {e.precision === "approx" ? <span className={s.badge}>{M.approxBadge}</span> : null}
        {e.typicalAmount != null ? <span className={s.badge}>{F.unusualBadge}</span> : null}
        <span className={s.amount}>{formatWon(e.amount)}</span>
        {action}
      </span>
    </li>
  );
};

/**
 * 날짜로 묶은 쓴 내역(`FE-REQ-060` FR-4 · H3) — 묶음 머리 = 날짜(요일) · 그날 합. 합은 서버 달력 칸(`calendar.days[].spent`) — 화면 합산 0.
 * 지출 순서는 서버가 준 그대로(최근이 위)
 */
export const DayExpenseGroups = ({
  expenses,
  days,
  action,
}: {
  expenses: HouseholdExpense[];
  days: CalendarDay[];
  action?: (expense: HouseholdExpense) => ReactNode;
}) => {
  if (expenses.length === 0) return <p className={s.note}>{M.listEmpty}</p>;
  const byDay = dayIndex(days);
  return (
    <div className={s.groups} aria-label={B.groupsLabel}>
      {groupExpensesByDay(expenses).map(({ date, items }) => {
        const day = byDay.get(date);
        const head = B.dayHead(date, day ? B.weekday[day.weekday % 7] : "");
        return (
          <section key={date} aria-label={head}>
            <h3 className={s.groupHead}>
              <span>{head}</span>
              {day ? <span>{B.dayTotal(formatWon(day.spent))}</span> : null}
            </h3>
            <ul className={s.rows}>
              {items.map((e) => (
                <ExpenseRow key={e.id} expense={e} action={action?.(e)} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};
