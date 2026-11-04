"use client";

import { useState } from "react";

import { Button } from "@repo/ui/button";
import { TextField } from "@repo/ui/textField";

import { hasApiStatus } from "@repo/web-shared/api";
import { parseAmountInput, useNumberFields } from "@repo/web-shared/lib";

import { GoalClockLine, formatDay, formatWon, useGoalClockRetry, type ConfirmResult, type HouseholdOccurrence } from "@/entities/household";

import { useConfirmOccurrence, useSkipOccurrence } from "../api";
import { RECURRING_MESSAGES as M } from "../model";
import * as s from "./recurring.css";

/** 확인 뒤 한 줄 — 지출이 생겼으니 목표 시계도(저장과 같은 규칙: pending 이면 한 번 더 묻고, 그래도 못 받으면 줄을 지운다) */
const ConfirmedLine = ({ result }: { result: ConfirmResult }) => {
  const record = result.record;
  const retry = useGoalClockRetry(record.goalClock.state === "pending" ? record.savedTotal : null);
  const clock = record.goalClock.state !== "pending" ? record.goalClock : retry.data ?? (retry.isError ? null : record.goalClock);
  return (
    <div role="status">
      <p className={s.note}>{M.confirmed}</p>
      {clock ? <GoalClockLine clock={clock} /> : null}
    </div>
  );
};

/**
 * "이번 달에도 나갔나요?"(`FE-REQ-057` FR-4 · `SRV-REQ-046` FR-5). 보여 줄 행은 서버 단계(`stage`)가 정한다 — ask 만 묻고, upcoming 은 예정으로 한 줄.
 * 나갔어요 = 지출(금액은 고칠 수 있다) · 안 나가요 = 이 달 예정에서 뺀다. 경고 · 재촉 0. 결과 문장은 행이 사라져도 카드에 남는다.
 */
export const RecurringAskCard = ({ items }: { items: HouseholdOccurrence[] }) => {
  const asks = items.filter((o) => o.stage === "ask");
  const upcoming = items.filter((o) => o.stage === "upcoming");
  const confirm = useConfirmOccurrence();
  const skip = useSkipOccurrence();
  const nums = useNumberFields({}, Object.fromEntries(asks.map((o) => [o.id, String(o.amount)])), "won");
  const [last, setLast] = useState<"skipped" | null>(null);

  if (asks.length === 0 && upcoming.length === 0 && !confirm.data && !last) return null;
  const busy = confirm.isPending || skip.isPending;
  const failed = confirm.error ?? skip.error;

  return (
    <section className={s.card} aria-label={M.askTitle}>
      {asks.length > 0 ? (
        <>
          <h2 className={s.title}>{M.askTitle}</h2>
          <ul className={s.list}>
            {asks.map((o) => {
              const typed = parseAmountInput(nums.value(o.id));
              return (
                <li key={o.id} className={s.item}>
                  <span className={s.line}>{M.askLine(o.name, formatWon(o.amount), formatDay(o.dueOn))}</span>
                  <div className={s.actions}>
                    <TextField
                      className={s.amountField}
                      aria-label={M.amountLabel(o.name)}
                      value={nums.value(o.id)}
                      onChange={(v) => nums.change(o.id, v)}
                      inputMode="numeric"
                      error={nums.message(o.id)}
                    />
                    <Button
                      size="sm"
                      disabled={busy || typed === null}
                      loading={confirm.isPending && confirm.variables?.id === o.id}
                      onClick={() => {
                        setLast(null);
                        confirm.mutate({ id: o.id, amount: typed === o.amount ? null : typed });
                      }}
                    >
                      {M.confirm}
                    </Button>
                    <Button
                      size="sm"
                      variant="weak"
                      disabled={busy}
                      onClick={() => skip.mutate(o.id, { onSuccess: () => setLast("skipped") })}
                    >
                      {M.skip}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
      {upcoming.length > 0 ? (
        <>
          <h2 className={s.title}>{M.upcomingTitle}</h2>
          <ul className={s.list}>
            {upcoming.map((o) => (
              <li key={o.id} className={s.line}>
                {M.askLine(o.name, formatWon(o.amount), formatDay(o.dueOn))}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {failed ? (
        <p className={s.note} role="status">
          {hasApiStatus(failed, 409) ? M.decided : M.failed}
        </p>
      ) : last === "skipped" ? (
        <p className={s.note} role="status">
          {M.skipped}
        </p>
      ) : confirm.data ? (
        <ConfirmedLine result={confirm.data} />
      ) : null}
    </section>
  );
};
