import { formatWon, GOAL_MESSAGES } from "../model/messages";
import type { SavingsMilestone } from "../model/types";
import * as s from "./goal.css";

/** 차이는 부호를 글자로(색만으로 방향을 전하지 않는다) — 값은 서버 계산 그대로, 음수 부호는 포맷이 붙인다 */
const signed = (value: number) => `${value > 0 ? "+" : ""}${formatWon(value)}`;

export interface MilestoneBoxProps {
  milestone: SavingsMilestone;
}

/** 이번 달 이정표 — 넣은 돈 · 계획 · 차이와 사실 한 줄(`FE-REQ-056` FR-7, 서버 `SRV-REQ-045` FR-8) */
export const MilestoneBox = ({ milestone }: MilestoneBoxProps) => (
  <section className={s.box} aria-label={GOAL_MESSAGES.milestone.title(milestone.month)}>
    <span className={s.label}>{GOAL_MESSAGES.milestone.title(milestone.month)}</span>
    <div className={s.grid}>
      <div className={s.cell}>
        <span className={s.label}>{GOAL_MESSAGES.milestone.deposited}</span>
        <span className={s.value}>{formatWon(milestone.deposited)}</span>
      </div>
      <div className={s.cell}>
        <span className={s.label}>{GOAL_MESSAGES.milestone.plan}</span>
        <span className={s.value}>{milestone.plan === null ? "—" : formatWon(milestone.plan)}</span>
      </div>
      <div className={s.cell}>
        <span className={s.label}>{GOAL_MESSAGES.milestone.difference}</span>
        <span className={s.value}>{milestone.difference === null ? "—" : signed(milestone.difference)}</span>
      </div>
    </div>
    <span className={s.label}>{GOAL_MESSAGES.milestoneState[milestone.state]}</span>
  </section>
);
