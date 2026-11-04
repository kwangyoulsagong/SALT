"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@repo/ui/button";
import { TextField } from "@repo/ui/textField";

import { isApiError } from "@repo/web-shared/api";
import { parseAmountInput, useNumberFields } from "@repo/web-shared/lib";

import { ChallengeHead, formatDay, formatWon, type Challenge, type GoalOption } from "@/entities/household";

import { useDeleteChallengeSaving, useEndChallenge, useMarkChallengeDay, useRecordChallengeSaving } from "../api";
import { TRACK_CHALLENGE_MESSAGES as M } from "../model";
import { ContributeControl } from "./ContributeControl";
import * as s from "./track.css";

/**
 * 챌린지 카드(`FE-REQ-057` FR-9 · 가계부 S1d) — 머리(엔티티) + 오늘 한 날 · 아낀 돈 적기 · 목표에 보태기 · 그만두기.
 * 누를 수 있는지는 서버 값(`todayMarkable` · `phase`). 오늘 날짜도 서버(`today`). **실패 · 연속 · 달성률 0** — 그만두기는 확인 창 없이 한 번에(되돌릴 일이 아니다).
 */
export const ChallengeCard = ({ challenge, today, goals }: { challenge: Challenge; today: string; goals: GoalOption[] | null }) => {
  const mark = useMarkChallengeDay();
  const record = useRecordChallengeSaving();
  const remove = useDeleteChallengeSaving();
  const end = useEndChallenge();
  const nums = useNumberFields({ amount: "won" });
  const [note, setNote] = useState("");
  const amount = parseAmountInput(nums.value("amount"));
  const todayDone = challenge.days.includes(today);
  const canRecord = challenge.todayMarkable;
  const codeOf = (e: unknown) => (isApiError(e) ? e.code : null);
  // 실패 한 줄은 마지막 동작의 것만 — 새 동작을 시작하면 다른 동작의 지난 실패를 지운다(지난 실패가 성공 뒤에도 남지 않게)
  const actions = [mark, record, remove, end];
  const fresh = () => actions.forEach((m) => m.reset());
  const failure = actions.find((m) => m.isError);
  const failureCode = failure ? codeOf(failure.error) : null;
  const failureLine =
    failureCode === "CHALLENGE_DATE_OUTSIDE" ? M.outside : failureCode === "CHALLENGE_SAVING_CONTRIBUTED" ? M.contributed : failure ? M.failed : "";

  const onRecord = (event: FormEvent) => {
    event.preventDefault();
    if (amount === null) return;
    fresh();
    record.mutate(
      { id: challenge.id, amount, note: note.trim() || null },
      {
        onSuccess: () => {
          nums.reset(["amount"]);
          setNote("");
        },
      },
    );
  };

  return (
    <article className={s.card} aria-label={challenge.title}>
      <ChallengeHead challenge={challenge} />
      {canRecord || todayDone ? (
        <div className={s.actions}>
          <Button
            size="sm"
            variant={todayDone ? "primary" : "weak"}
            aria-pressed={todayDone}
            disabled={mark.isPending || (!todayDone && !canRecord)}
            onClick={() => {
              fresh();
              mark.mutate({ id: challenge.id, date: today, on: !todayDone });
            }}
          >
            {M.today}
          </Button>
          <span className={s.note}>{todayDone ? M.todayDone : ""}</span>
        </div>
      ) : null}
      {canRecord ? (
        <form className={s.form} onSubmit={onRecord} aria-label={M.savingTitle}>
          <TextField
            className={s.amountField}
            label={M.amount}
            value={nums.value("amount")}
            onChange={(v) => nums.change("amount", v)}
            inputMode="numeric"
            error={nums.message("amount")}
          />
          <TextField className={s.noteField} label={M.note} value={note} onChange={setNote} placeholder={M.notePlaceholder} maxLength={100} />
          <Button type="submit" size="sm" variant="weak" disabled={amount === null || record.isPending} loading={record.isPending}>
            {M.record}
          </Button>
        </form>
      ) : null}
      {canRecord ? <p className={s.note}>{M.savingHint}</p> : null}
      {challenge.savings.length > 0 ? (
        <section aria-label={M.savingsList}>
          <h4 className={s.subTitle}>{M.savingsList}</h4>
          <ul className={s.list}>
            {challenge.savings.map((saving) => {
              const goal = saving.goalId ? goals?.find((g) => g.id === saving.goalId) : undefined;
              return (
                <li key={saving.id} className={s.row}>
                  <span className={s.rowText}>
                    <span>{M.savingLine(formatDay(saving.savedOn), formatWon(saving.amount), saving.note)}</span>
                    {saving.goalId ? <span className={s.rowSub}>{goal ? M.contributedTo(goal.title) : M.contributedUnknown}</span> : null}
                  </span>
                  {saving.goalId ? null : (
                    <span className={s.actions}>
                      <ContributeControl saving={saving} goals={goals} />
                      <Button
                        size="xs"
                        variant="weak"
                        disabled={remove.isPending}
                        onClick={() => {
                          fresh();
                          remove.mutate(saving.id);
                        }}
                      >
                        {M.remove}
                      </Button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      {challenge.phase === "ended" ? null : (
        <div className={s.actions}>
          <Button
            size="xs"
            variant="weak"
            disabled={end.isPending}
            onClick={() => {
              fresh();
              end.mutate(challenge.id);
            }}
          >
            {M.end}
          </Button>
        </div>
      )}
      <p className={s.note} role="status">
        {failureLine}
      </p>
    </article>
  );
};
