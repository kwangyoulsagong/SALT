"use client";

import Link from "next/link";

import { ROUTES } from "@repo/web-shared/config";
import { labelOr } from "@repo/web-shared/lib";

import { formatWon, GOAL_MESSAGES, GoalScene, MilestoneBox, ProjectionLine, templateTag, type SavingsGoal } from "@/entities/goal";
import { DepositForm } from "@/features/record-deposit";

import { GOALS_PAGE as M } from "../model";
import * as s from "./goals.css";

/**
 * 미리보기 칸(`FE-REQ-060` FR-8 · FR-11) — 고른 목표의 장면 · 앞 숫자(프레임은 서버) · 이번 달 이정표 · 도달 시점 · 넣기. 목록 응답 그대로라 요청 0.
 * 목표를 바꾸면 칸이 8px 아래에서 올라온다(`key` = 목표, 블록 등장 장치). 넣기가 이 화면의 주 버튼 하나
 */
export const GoalPreview = ({ goal }: { goal: SavingsGoal }) => {
  const lead =
    goal.frame === "saved"
      ? { label: GOAL_MESSAGES.saved, value: formatWon(goal.saved), sub: `${GOAL_MESSAGES.remaining} ${formatWon(goal.remaining)}` }
      : { label: GOAL_MESSAGES.remaining, value: formatWon(goal.remaining), sub: `${GOAL_MESSAGES.saved} ${formatWon(goal.saved)}` };
  const active = goal.status === "active";
  return (
    <div className={s.preview} aria-live="polite">
      <div className={s.previewHead}>
        <span className={s.previewTitle}>
          {goal.title} {templateTag(goal) ? <span className={s.hint}>{templateTag(goal)}</span> : null}
        </span>
        <Link href={ROUTES.goal(goal.id)} className={s.detailLink}>
          {M.openDetail}
        </Link>
      </div>
      <GoalScene scene={goal.scene} size="sm" />
      <div className={s.lead}>
        <span className={s.hint}>{lead.label}</span>
        <span className={s.leadValue}>{lead.value}</span>
        <span className={s.hint}>
          {goal.status === "completed" ? GOAL_MESSAGES.completed : `${goal.progressPercent}% · ${lead.sub}`} · {GOAL_MESSAGES.target} {formatWon(goal.targetAmount)}
        </span>
        {goal.unitLine ? <span className={s.hint}>{GOAL_MESSAGES.unitLine(goal.unitLine.name, goal.unitLine.count)}</span> : null}
      </div>
      <MilestoneBox milestone={goal.milestone} />
      <ProjectionLine projection={goal.projection} />
      {goal.degraded ? <span className={s.hint}>{labelOr(GOAL_MESSAGES.projectionReason, "degraded", "")}</span> : null}
      {active ? (
        <section className={s.depositBlock} aria-label={M.deposit}>
          <DepositForm goalId={goal.id} compact />
        </section>
      ) : null}
    </div>
  );
};
