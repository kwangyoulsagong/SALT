"use client";

import { isApiError } from "@repo/web-shared/api";

import { NoSpendCalendar, calendarDayButton, type HouseholdMonth } from "@/entities/household";

import { useMarkNoSpend } from "../api";
import { MARK_MESSAGES as M } from "../model";
import * as s from "./mark.css";

/**
 * 무지출 달력 + 표시(`FE-REQ-057` FR-9). 누를 수 있는 칸은 서버가 정한다(`markable` · 이미 붙은 no_spend 는 지우기).
 * 연속 일수 · 칭찬 문구 0. 실패는 한 줄로만(팝업 0).
 */
export const MarkableCalendar = ({ month }: { month: HouseholdMonth }) => {
  const mark = useMarkNoSpend(month.month);
  const code = isApiError(mark.error) ? mark.error.code : null;
  return (
    <div className={s.wrap}>
      <NoSpendCalendar
        days={month.calendar.days}
        noSpendDays={month.calendar.noSpendDays}
        challengeDays={month.calendar.challengeDays}
        action={(day, label) => {
          const on = day.state !== "no_spend";
          return (
            <button
              type="button"
              className={calendarDayButton}
              aria-label={`${label} — ${on ? M.mark : M.unmark}`}
              aria-pressed={!on}
              disabled={mark.isPending}
              onClick={() => mark.mutate({ date: day.date, on })}
            >
              {Number(day.date.slice(8))}
            </button>
          );
        }}
      />
      <p className={s.note} role="status">
        {mark.isError ? (code === "STICKER_DAY_HAS_EXPENSE" ? M.hasExpense : M.failed) : ""}
      </p>
    </div>
  );
};
