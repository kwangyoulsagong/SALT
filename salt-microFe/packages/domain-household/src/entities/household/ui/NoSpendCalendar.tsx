"use client";

import type { ReactNode } from "react";

import { CALENDAR_MESSAGES as C, formatWon } from "../model/messages";
import type { CalendarDay } from "../model/types";
import * as s from "./calendar.css";

/**
 * 무지출 달력(`FE-REQ-057` FR-9 · `SRV-REQ-046` FR-16) — 칸 상태 · 표시 가능 여부는 서버 값. **연속 일수를 보이지 않는다.**
 * 기록 없는 날은 비워 둔다(안 쓴 날로 세지 않는다). 칸 동작(표시 · 지우기)은 부르는 쪽이 `action` 으로 넣는다 — 엔티티는 쓰기를 모른다.
 * 요일 자리는 서버 `weekday`(ISO) — 날짜 계산을 화면에 두지 않는다.
 * 화면 읽기: 요일 머리는 숨기고, 날마다 목록 항목 하나에 "11월 2일 안 쓴 날" 글자(누를 수 있는 칸은 버튼 이름)로 읽힌다.
 * 챌린지 "한 날"(가계부 S1d)은 칸 상태와 따로 — 테두리 동그라미 하나 + 글자 "챌린지 한 날". 개수만(연속 0).
 */
export const NoSpendCalendar = ({
  days,
  noSpendDays,
  challengeDays = 0,
  action,
}: {
  days: CalendarDay[];
  noSpendDays: number;
  challengeDays?: number;
  action?: (day: CalendarDay, label: string) => ReactNode;
}) => {
  // 일요일 시작 칸 — ISO 7(일) 은 0번 칸
  const lead = days.length > 0 ? days[0].weekday % 7 : 0;
  return (
    <section className={s.box} aria-label={C.title}>
      <div className={s.head}>
        <h2 className={s.title}>{C.title}</h2>
        <span className={s.count}>
          {C.count(noSpendDays)}
          {challengeDays > 0 ? ` · ${C.challengeCount(challengeDays)}` : ""}
        </span>
      </div>
      <div className={s.grid} aria-hidden>
        {C.weekdays.map((w) => (
          <span key={w} className={s.weekday}>
            {w}
          </span>
        ))}
      </div>
      <ol className={s.grid} aria-label={C.title}>
        {Array.from({ length: lead }, (_, i) => (
          <li key={`lead-${i}`} aria-hidden />
        ))}
        {days.map((d) => {
          const base = C.dayLabel(d.date, C.state[d.state], d.state === "spent" ? formatWon(d.spent) : null);
          const label = d.challenge ? `${base} · ${C.challengeDay}` : base;
          const dayNumber = Number(d.date.slice(8));
          const pressable = action && (d.markable || d.state === "no_spend");
          return (
            <li key={d.date} className={s.cell[d.state]}>
              {pressable ? (
                action(d, label)
              ) : (
                <>
                  <span className={s.dayNumber} aria-hidden>
                    {dayNumber}
                  </span>
                  <span className={s.srOnly}>{label}</span>
                </>
              )}
              {d.state === "no_spend" ? <span className={s.sticker} aria-hidden /> : null}
              {d.challenge ? <span className={s.challengeSticker} aria-hidden /> : null}
            </li>
          );
        })}
      </ol>
      <p className={s.note}>{C.note}</p>
    </section>
  );
};
