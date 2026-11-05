"use client";

import type { FormEvent } from "react";

import { Button } from "@repo/ui/button";
import { TextField } from "@repo/ui/textField";

import { parseAmountInput, useNumberFields } from "@repo/web-shared/lib";

import { formatWon, type OccasionEnvelope } from "@/entities/household";

import { useSetOccasionEnvelope } from "../api";
import { OCCASION_ENVELOPE_MESSAGES as M } from "../model";
import * as s from "./envelope.css";

/**
 * 해 경조사 봉투(가계부 S1h). 준 합 · 남은 금액은 서버 값 — 넘으면 회색 음수 그대로(막지 않는다 · 경고 색 0).
 * [envelope] 이 null 이면 아직 정하지 않은 해.
 */
export const OccasionEnvelopeEditor = ({ year, envelope }: { year: number; envelope: OccasionEnvelope | null }) => {
  const save = useSetOccasionEnvelope();
  const nums = useNumberFields({ amount: "won" }, envelope ? { amount: String(envelope.amount) } : {});
  const amount = parseAmountInput(nums.value("amount"));

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (amount === null) return;
    save.mutate({ year, amount });
  };

  return (
    <form className={s.form} onSubmit={onSubmit} aria-label={M.title(year)}>
      <h2 className={s.title}>{M.title(year)}</h2>
      {envelope ? (
        <div className={s.row}>
          <span className={s.label}>{M.status(formatWon(envelope.gave), formatWon(envelope.amount))}</span>
          <span className={s.value}>{M.remaining(formatWon(envelope.remaining))}</span>
        </div>
      ) : (
        <p className={s.note}>{M.description}</p>
      )}
      <TextField label={M.amount} value={nums.value("amount")} onChange={(v) => nums.change("amount", v)} inputMode="numeric" error={nums.message("amount")} />
      <span className={s.note} role="status">
        {save.isError ? M.failed : ""}
      </span>
      <div className={s.actions}>
        <Button type="submit" size="sm" disabled={amount === null || save.isPending} loading={save.isPending}>
          {envelope ? M.change : M.set}
        </Button>
        {envelope ? (
          <Button type="button" size="sm" variant="weak" onClick={() => save.mutate({ year, amount: null }, { onSuccess: () => nums.reset() })} disabled={save.isPending}>
            {M.remove}
          </Button>
        ) : null}
      </div>
    </form>
  );
};
