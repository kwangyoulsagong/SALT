import { LANDING_MESSAGES as L, formatWon, trackLine } from "../model/messages";
import type { HouseholdMonth } from "../model/types";
import * as s from "./expense.css";

/**
 * 월말 착지 구간 + 지난달 같은 날 적중(FR-7). 한 점으로 단정하지 않는다 — 구간이 없으면 이유를 말한다(수용 기준 "적중 또는 기록 부족 이유").
 */
export const LandingBox = ({ month }: { month: HouseholdMonth }) => {
  const l = month.landing;
  return (
    <section className={s.box} aria-label={L.title}>
      <h2 className={s.title}>{L.title}</h2>
      {l === null ? (
        <p className={s.note}>{L.notCurrent}</p>
      ) : l.method === "month_over" ? (
        <p className={s.note}>{L.monthOver}</p>
      ) : l.low !== null && l.high !== null ? (
        <>
          <span className={s.value}>{L.range(formatWon(l.low), formatWon(l.high))}</span>
          <p className={s.note}>{L.note}</p>
          {l.scheduled > 0 ? <p className={s.note}>{L.scheduled(formatWon(l.scheduled))}</p> : null}
        </>
      ) : (
        <p className={s.note}>{L.historyShort(l.daysOfHistory)}</p>
      )}
      {month.track ? (
        <>
          <span className={s.label}>{L.trackTitle}</span>
          <p className={s.note}>{trackLine(month.track)}</p>
        </>
      ) : null}
    </section>
  );
};
