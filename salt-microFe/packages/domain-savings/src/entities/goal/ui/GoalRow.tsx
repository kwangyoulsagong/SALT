"use client";

import { formatWon, GOAL_MESSAGES, TEMPLATE_LABEL, templateTag } from "../model/messages";
import type { SavingsGoal } from "../model/types";
import { reachText } from "../lib/reachText";
import * as s from "./goalRow.css";

export interface GoalRowProps {
  goal: SavingsGoal;
  /** 미리보기 칸에 열린 목표 */
  selected: boolean;
  /** 고르기 — 주소 `?goal=` 를 바꾸는 것은 부르는 쪽(`pages/goals`) */
  onSelect: (goalId: string) => void;
}

/**
 * 목표 목록 행(`FE-REQ-060` FR-3 · FR-8 · FR-11) — 왼쪽 템플릿 판 32 · 가운데 이름 13/600 + 진척 막대 4 + 도달 한 줄 12/500 · 오른쪽 모은 돈 13/600 + 목표 12/500.
 * 장면 그림은 미리보기 칸 · 상세에서만 — 행은 판 하나. 숫자 · 막대 비율 · 도달은 서버 값(막대 길이만 화면)
 */
export const GoalRow = ({ goal, selected, onSelect }: GoalRowProps) => {
  const template = TEMPLATE_LABEL[goal.template];
  const done = goal.status === "completed";
  return (
    <li>
      <button type="button" className={s.row} aria-current={selected ? "true" : undefined} onClick={() => onSelect(goal.id)}>
        <span className={s.plate} aria-hidden>
          {template.slice(0, 1)}
        </span>
        <span className={s.main}>
          <span className={s.title}>{goal.title}</span>
          <span className={s.bar} aria-hidden>
            <span className={s.barFill} style={{ transform: `scaleX(${Math.min(1, Math.max(0, goal.progressRatio))})` }} />
          </span>
          <span className={s.caption}>
            {[templateTag(goal), done ? GOAL_MESSAGES.completed : reachText(goal.projection)].filter(Boolean).join(" · ")}
          </span>
        </span>
        <span className={s.side}>
          <span className={s.amount}>{formatWon(goal.saved)}</span>
          <span className={s.caption}>
            {GOAL_MESSAGES.rowTarget(formatWon(goal.targetAmount), goal.progressPercent)}
          </span>
        </span>
      </button>
    </li>
  );
};
