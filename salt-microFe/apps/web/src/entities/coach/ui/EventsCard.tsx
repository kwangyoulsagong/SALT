"use client";

import { useState } from "react";

import type { SymbolEventsResult } from "@repo/core/coach";

import { EVENT_MESSAGES as M } from "../model";
import * as s from "./EventsCard.css";
import { ReactionDetail } from "./ReactionDetail";

const KST = "Asia/Seoul";
const whenFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KST,
  month: "numeric",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const dayKey = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: KST }).format(d);
/** 달력 날짜 차이(서울 기준) — 시각이 아니라 날짜로 센다 */
const daysUntil = (iso: string, now: Date) =>
  Math.round(
    (Date.parse(dayKey(new Date(iso))) - Date.parse(dayKey(now))) / 86_400_000,
  );

/**
 * 주요 사건 카드 — 표시 전용 (`fsd-entities.md`, F008 `FE-REQ-038` FR-13 · FEATURE-008 FR-29~31).
 *
 * 다가오는 거시 일정마다 과거 같은 일정 뒤의 수익률 분포를 **평소 날과 같은 축에** 둔다. "호재 · 악재"는
 * 판정하지 않는다. 숫자는 전부 서버 값 — 여기서 하는 계산은 그리기 좌표와 D-day 뿐이다.
 * 한 번에 한 일정만 펼친다(첫 일정이 펼쳐져 있다).
 */
export const EventsCard = ({
  result,
  className,
}: {
  result: SymbolEventsResult;
  className?: string;
}) => {
  const [open, setOpen] = useState(0);

  if (result.status !== "ok") {
    return (
      <section className={className}>
        <p className={s.note}>{M.unavailable}</p>
      </section>
    );
  }
  const now = new Date();

  return (
    <section
      className={`${className ?? ""} ${s.section}`}
      aria-labelledby="events-heading"
    >
      <div className={s.head}>
        <h2 id="events-heading" className={s.title}>
          {M.heading}
        </h2>
        <span className={s.badge}>{M.badge}</span>
      </div>
      <p className={s.lead}>{M.lead}</p>

      {result.events.length === 0 ? (
        <p className={s.note}>{M.empty}</p>
      ) : (
        <ul className={s.list}>
          {result.events.map((event, i) => {
            const expanded = i === open;
            const id = `event-${event.kind}-${i}`;
            return (
              <li
                key={`${event.kind}-${event.eventAt}`}
                className={s.item}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <button
                  type="button"
                  className={s.rowButton}
                  aria-expanded={expanded}
                  aria-controls={id}
                  onClick={() => setOpen(expanded ? -1 : i)}
                >
                  <span className={s.dday}>
                    {M.dday(daysUntil(event.eventAt, now))}
                  </span>
                  <span className={s.eventName}>{M.kind[event.kind]}</span>
                  <span className={s.when}>
                    {whenFormat.format(new Date(event.eventAt))}
                  </span>
                  <span
                    className={
                      expanded ? `${s.chevron} ${s.chevronOpen}` : s.chevron
                    }
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </button>
                {expanded && (
                  <div id={id}>
                    <ReactionDetail
                      horizons={event.horizons}
                      labels={{
                        kind: M.kind[event.kind],
                        row: M.rowEvent,
                        pre: M.preReturn,
                      }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className={s.disclaimer}>{result.disclaimer}</p>
    </section>
  );
};
