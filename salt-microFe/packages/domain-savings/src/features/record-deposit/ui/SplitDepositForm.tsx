"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@repo/ui/button";
import { TextField } from "@repo/ui/textField";

import { AMOUNT_INPUT_MESSAGES } from "@repo/web-shared/i18n";
import { isApiError } from "@repo/web-shared/api";
import { parseAmountInput, labelOr, useAmountInputGuard } from "@repo/web-shared/lib";

import { type SavingsGoal } from "@/entities/goal";

import { useSplitDeposit } from "../api";
import { RECORD_DEPOSIT_MESSAGES as M } from "../model";
import * as s from "./deposit.css";

export interface SplitDepositFormProps {
  goals: SavingsGoal[];
}

/**
 * 여러 목표에 나눠 넣기(`FE-REQ-056` FR-4 · 서버 `SRV-REQ-045` FR-4). 합계와 나눈 금액을 **사용자가 둘 다 적고 서버가 맞는지 본다** —
 * 화면이 나눈 금액을 더해 합계를 만들지 않는다(금액 계산 0). 어긋나면 서버 `SPLIT_SUM_MISMATCH` 를 문장으로.
 */
export const SplitDepositForm = ({ goals }: SplitDepositFormProps) => {
  const split = useSplitDeposit();
  const [total, setTotal] = useState("");
  const guard = useAmountInputGuard();
  const [parts, setParts] = useState<Record<string, string>>({});

  const filled = goals
    .map((g) => ({ goalId: g.id, amount: parseAmountInput(parts[g.id] ?? "") }))
    .filter((p): p is { goalId: string; amount: number } => p.amount !== null);
  const totalValue = parseAmountInput(total);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (totalValue === null || filled.length < 2) return;
    split.mutate({ total: totalValue, parts: filled }, { onSuccess: () => { setTotal(""); setParts({}); } });
  };

  const errorCode = isApiError(split.error) ? split.error.code : null;

  return (
    <form className={s.form} onSubmit={onSubmit} aria-label={M.split.title}>
      <TextField label={M.split.total} value={total} onChange={(v) => guard.take(v, setTotal)} inputMode="numeric" />
      {goals.map((g) => (
        <TextField
          key={g.id}
          label={M.split.part(g.title)}
          value={parts[g.id] ?? ""}
          onChange={(v) => guard.take(v, (value) => setParts((prev) => ({ ...prev, [g.id]: value })))}
          inputMode="numeric"
        />
      ))}
      <span className={s.hint}>{M.split.hint}</span>
      <span className={s.hint} role="status">
        {guard.rejected ? AMOUNT_INPUT_MESSAGES.numbersOnly : split.isError ? labelOr(M.errorCode, errorCode, M.failed) : split.isSuccess ? M.recorded : filled.length === 1 ? M.split.tooFew : ""}
      </span>
      <Button type="submit" disabled={totalValue === null || filled.length < 2 || split.isPending} loading={split.isPending}>
        {M.split.submit}
      </Button>
    </form>
  );
};
