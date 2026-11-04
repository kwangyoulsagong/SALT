import { goalClockLine } from "../model/messages";
import type { GoalClock } from "../model/types";
import * as s from "./expense.css";

/** 저장 뒤 목표 시계 한 줄(FR-8). 목표가 없으면 아무것도 그리지 않는다 */
export const GoalClockLine = ({ clock }: { clock: GoalClock }) => {
  const line = goalClockLine(clock);
  return line ? (
    <p className={s.note} role="status">
      {line}
    </p>
  ) : null;
};
