import { GOAL_MESSAGES } from "../model/messages";
import type { SavingsMissedMonths } from "../model/types";
import * as s from "./goal.css";

/** 놓친 달 회고(`FE-REQ-056` FR-7) — 건너뛴 달 수 · 계획 도달이 몇 달 옮겨졌나(서버 값). 재촉 문구 없이 사실만 */
export const MissedMonthsBox = ({ missed }: { missed: SavingsMissedMonths }) => {
  const M = GOAL_MESSAGES.missed;
  return (
    <div className={s.box} aria-label={M.title}>
      <span className={s.label}>{M.title}</span>
      <span className={s.value}>
        {missed.skippedMonths === 0 ? M.none(missed.observedMonths) : M.skipped(missed.skippedMonths, missed.observedMonths)}
      </span>
      {missed.skippedMonths > 0 && missed.shiftMonths !== null ? <span className={s.label}>{M.shift(missed.shiftMonths)}</span> : null}
      {missed.skippedMonths > 0 && missed.reason ? <span className={s.label}>{GOAL_MESSAGES.projectionReason[missed.reason]}</span> : null}
    </div>
  );
};
