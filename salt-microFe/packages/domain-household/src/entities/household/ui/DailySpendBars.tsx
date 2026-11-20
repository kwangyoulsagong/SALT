"use client";

import { BOARD_MESSAGES as B, formatWon } from "../model/messages";
import type { CalendarDay } from "../model/types";
import * as s from "./dailySpend.css";

/** 막대 최소 높이(%) — 쓴 날이 작아도 보이게(그리기 전용). 안 쓴 날은 바닥 점 */
const MIN_PERCENT = 6;
/** 아래 눈금 — 1 · 8 · 15 · 22 · 29일(한 주 간격) */
const TICKS = new Set([1, 8, 15, 22, 29]);

/**
 * 날마다 쓴 돈(2026-11-20 가계부 개편 — 리서치: 가계부 위는 이번 달 숫자 한 줄 + 날마다 막대). 달력 칸 값(`calendar.days[].spent`) 그대로,
 * 막대 높이만 화면(가장 많이 쓴 날 = 100%). 오지 않은 날은 빈 자리. 고른 날(`selected`)은 진하게 — 누르면 그날로(`onSelect`).
 * 그림만으로 끝나지 않게 막대마다 이름(날짜 · 금액)을 단다
 */
export const DailySpendBars = ({
  days,
  selected,
  onSelect,
}: {
  days: CalendarDay[];
  selected: string | null;
  onSelect?: (date: string) => void;
}) => {
  const peak = Math.max(0, ...days.map((d) => (d.state === "future" ? 0 : d.spent)));
  return (
    <div className={s.frame}>
      <div className={s.bars} role="list" aria-label={B.dailyTitle}>
        {days.map((d) => {
          const day = Number(d.date.slice(8, 10));
          const future = d.state === "future" || d.state === "blank";
          const height = future || d.spent === 0 || peak === 0 ? 0 : Math.max(MIN_PERCENT, (d.spent / peak) * 100);
          const label = B.dailyBar(day, future ? null : formatWon(d.spent));
          return (
            <div key={d.date} role="listitem" className={s.col}>
              {onSelect && !future ? (
                <button type="button" className={s.hit} aria-label={label} aria-pressed={selected === d.date} onClick={() => onSelect(d.date)}>
                  <span className={selected === d.date ? s.barSelected : height === 0 ? s.dot : s.bar} style={height === 0 ? undefined : { height: `${height}%` }} />
                </button>
              ) : (
                <span className={s.hit} aria-label={label}>
                  <span className={future ? s.futureDot : height === 0 ? s.dot : s.bar} style={height === 0 || future ? undefined : { height: `${height}%` }} />
                </span>
              )}
              <span className={s.tick} aria-hidden="true">
                {TICKS.has(day) ? day : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
