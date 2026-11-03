import Link from "next/link";

import { ProgressBar } from "@repo/ui/progressBar";

import { formatPrice } from "@repo/web-shared/lib";

import { GOAL_MESSAGES, TEMPLATE_LABEL } from "../model/messages";
import type { SavingsGoal } from "../model/types";
import * as s from "./goal.css";

const won = (value: number) => `${formatPrice(value)}원`;

export interface GoalCardProps {
  goal: SavingsGoal;
  /** 상세 주소 — 같은 zone 안이라 `<Link>` */
  href: string;
}

/**
 * 목록 한 칸 — 진척 · 프레임 · 이번 달 이정표 한 줄. 프레임(모은 돈 ↔ 남은 돈)은 서버가 정한 값으로 앞자리를 바꾼다(FR-9).
 * 진척 막대는 서버 `progressPercent` 를 그대로 — 비율을 다시 계산하지 않는다. 스크린리더는 막대 라벨로 진척을 읽는다.
 */
export const GoalCard = ({ goal, href }: GoalCardProps) => {
  const lead =
    goal.frame === "saved"
      ? { label: GOAL_MESSAGES.saved, value: won(goal.saved) }
      : { label: GOAL_MESSAGES.remaining, value: won(goal.remaining) };
  return (
    <Link href={href} className={s.card}>
      <div className={s.row}>
        <h3 className={s.title}>{goal.title}</h3>
        <span className={s.label}>{TEMPLATE_LABEL[goal.template]}</span>
      </div>
      <div className={s.row}>
        <span className={s.label}>{lead.label}</span>
        <span className={s.bigValue}>{lead.value}</span>
      </div>
      <ProgressBar value={goal.progressRatio} label={`${goal.title} ${goal.progressPercent}%`} />
      <div className={s.row}>
        <span className={s.label}>
          {GOAL_MESSAGES.target} {won(goal.targetAmount)}
        </span>
        <span className={s.label}>{goal.status === "completed" ? GOAL_MESSAGES.completed : `${goal.progressPercent}%`}</span>
      </div>
      <span className={s.label}>{GOAL_MESSAGES.milestoneState[goal.milestone.state]}</span>
    </Link>
  );
};
