import { EXPENSE_MESSAGES as M, WORK_MESSAGES as W, formatWon, formatWorkMinutes } from "../model/messages";
import type { HouseholdMonth } from "../model/types";
import * as s from "./expense.css";

/** 이 달 쓴 돈 — 정확 · 대략을 나눠 보인다(FR-5 "통계에서 정확/대략 분리"). 숫자는 서버 값 */
export const MonthTotals = ({ month }: { month: HouseholdMonth }) => (
  <div className={s.box}>
    <span className={s.label}>{month.current ? M.spent : M.spentOf(month.month)}</span>
    <span className={s.bigValue}>{formatWon(month.totals.total)}</span>
    <span className={s.note}>
      {M.count(month.totals.count)}
      {month.totals.approx > 0 ? ` · ${M.exact} ${formatWon(month.totals.exact)} · ${M.approx} ${formatWon(month.totals.approx)}` : ""}
    </span>
    {month.workHours ? (
      <span className={s.note}>
        {W.total(formatWorkMinutes(month.workHours.totalMinutes))} · {W.hourly(formatWon(month.workHours.hourly))}
      </span>
    ) : null}
    {month.remaining !== null ? (
      <div className={s.row}>
        <span className={s.label}>{M.remaining}</span>
        <span className={s.value}>{formatWon(month.remaining)}</span>
      </div>
    ) : null}
    {month.dailyAvailable !== null && month.daysLeft !== null ? (
      <div className={s.row}>
        <span className={s.label}>
          {M.dailyAvailable} · {M.daysLeft(month.daysLeft)}
        </span>
        <span className={s.value}>{formatWon(month.dailyAvailable)}</span>
      </div>
    ) : null}
  </div>
);
