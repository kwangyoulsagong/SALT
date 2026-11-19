"use client";

import { BOARD_MESSAGES as B, CALENDAR_MESSAGES as C, formatWon } from "../model/messages";
import type { CalendarDay } from "../model/types";
import * as s from "./spendCalendar.css";

interface SpendCalendarProps {
  days: CalendarDay[];
  /** 고른 날 "YYYY-MM-DD" — 없으면 `null` */
  selected: string | null;
  onSelect: (date: string) => void;
}

/**
 * 한 달 달력(`FE-REQ-060` FR-4) — 칸마다 그날 쓴 돈(서버 `calendar.days[].spent`) · 안 쓴 날 점 · 챌린지 동그라미. 칸을 누르면 그날을 고른다
 * (그날 내역 · 안 쓴 날 표시는 고른 날 칸이 한다). 미래 칸은 못 누른다. 색으로 칭찬하지 않는다 — 회색 하나
 */
export const SpendCalendar = ({ days, selected, onSelect }: SpendCalendarProps) => {
  // 일요일 시작 칸 — ISO 7(일) 은 0번 칸
  const lead = days.length > 0 ? days[0].weekday % 7 : 0;
  return (
    <div className={s.wrap}>
      <div className={s.grid} aria-hidden>
        {B.weekday.map((w) => (
          <span key={w} className={s.weekday}>
            {w}
          </span>
        ))}
      </div>
      <ol className={s.grid} aria-label={B.calendarTitle}>
        {Array.from({ length: lead }, (_, i) => (
          <li key={`lead-${i}`} aria-hidden />
        ))}
        {days.map((d) => {
          const spent = d.state === "spent" && d.spent > 0 ? formatWon(d.spent) : null;
          const base = C.dayLabel(d.date, C.state[d.state], spent);
          const label = d.challenge ? `${base} · ${C.challengeDay}` : base;
          const isSelected = selected === d.date;
          return (
            <li key={d.date}>
              <button
                type="button"
                className={s.cell}
                data-state={d.state}
                aria-label={label}
                aria-pressed={isSelected}
                disabled={d.state === "future"}
                onClick={() => onSelect(d.date)}
              >
                <span className={s.dayNumber} aria-hidden>
                  {Number(d.date.slice(8))}
                </span>
                {spent ? (
                  <span className={s.amount} aria-hidden>
                    {spent.replace("원", "")}
                  </span>
                ) : null}
                {d.state === "no_spend" ? <span className={s.sticker} aria-hidden /> : null}
                {d.challenge ? <span className={s.challenge} aria-hidden /> : null}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
