"use client";

import { useState } from "react";

import { Button } from "@repo/ui/button";
import { Chip } from "@repo/ui/chip";

import type { ChallengeSaving, GoalOption } from "@/entities/household";

import { useContributeSaving } from "../api";
import { TRACK_CHALLENGE_MESSAGES as M } from "../model";
import * as s from "./track.css";

/**
 * 아낀 돈 한 줄을 저축 목표에 보태기(가계부 S1d 판단 4). 목표 목록은 서버(진행 중만) — `null` 이면 저축이 답하지 못한 것이라 이 칸만 안내.
 * 금액은 보내지 않는다(BFF 가 가계부 기록에서 읽는다). 실패하면 다시 누르면 된다 — 같은 아낀 돈은 저축에 한 번만 들어간다.
 */
export const ContributeControl = ({ saving, goals }: { saving: ChallengeSaving; goals: GoalOption[] | null }) => {
  const contribute = useContributeSaving();
  const [open, setOpen] = useState(false);
  const [goalId, setGoalId] = useState<string | null>(null);

  if (!open) {
    return (
      <Button size="xs" variant="weak" onClick={() => setOpen(true)}>
        {M.contribute}
      </Button>
    );
  }
  if (goals === null) return <p className={s.note}>{M.goalsUnavailable}</p>;
  if (goals.length === 0) return <p className={s.note}>{M.noGoals}</p>;
  return (
    <div className={s.actions}>
      <div className={s.chips} role="group" aria-label={M.contributeTo}>
        {goals.map((g) => (
          <Chip key={g.id} size="sm" selected={goalId === g.id} onPress={() => setGoalId(g.id)}>
            {g.title}
          </Chip>
        ))}
      </div>
      <Button
        size="xs"
        disabled={goalId === null || contribute.isPending}
        loading={contribute.isPending}
        onClick={() => goalId && contribute.mutate({ savingId: saving.id, goalId })}
      >
        {M.contributeConfirm}
      </Button>
      <Button size="xs" variant="weak" onClick={() => setOpen(false)}>
        {M.cancel}
      </Button>
      <span className={s.note} role="status">
        {contribute.isError ? M.failed : ""}
      </span>
    </div>
  );
};
