import { LANDING_MESSAGES as L, formatWon, trackLine } from "../model/messages";
import type { HouseholdMonth } from "../model/types";
import * as s from "./expense.css";

/**
 * 월말 착지 구간 + 지난달 같은 날 적중 + 쌓인 적중 기록(FR-7 — 예측 채점 집계). 한 점으로 단정하지 않는다 — 구간이 없으면 이유를 말한다(수용 기준 "적중 또는 기록 부족 이유").
 */
export const LandingBox = ({ month, hideRange = false }: { month: HouseholdMonth; /** 구간 숫자는 요약 띠가 이미 보인다 — 같은 숫자 두 번 금지(`FE-REQ-060`) */ hideRange?: boolean }) => {
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
          {hideRange ? null : <span className={s.value}>{L.range(formatWon(l.low), formatWon(l.high))}</span>}
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
      {month.coverage ? (
        <>
          <span className={s.label}>{L.coverageTitle}</span>
          <p className={s.note}>{L.coverage(month.coverage)}</p>
        </>
      ) : month.coverageReason && L.coverageReason[month.coverageReason] ? (
        <p className={s.note}>{L.coverageReason[month.coverageReason]}</p>
      ) : null}
    </section>
  );
};
