"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@repo/ui/button";
import { TextField } from "@repo/ui/textField";

import { isApiError } from "@repo/web-shared/api";
import { formatAmountInput, parseAmountInput } from "@repo/web-shared/lib";

import { useRecordDeposit } from "../api";
import { RECORD_DEPOSIT_MESSAGES as M } from "../model";
import * as s from "./deposit.css";

export interface DepositFormProps {
  goalId: string;
}

/** 적립 한 건(`FE-REQ-056` FR-4). 저장 뒤 진척 · 이정표 · 구간은 서버 응답으로 바뀐다. 장면 한 칸 이동 모션은 S1b(FR-8) */
export const DepositForm = ({ goalId }: DepositFormProps) => {
  const record = useRecordDeposit(goalId);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const value = parseAmountInput(amount);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (value === null) return;
    record.mutate(
      { amount: value, ...(date ? { depositedOn: date } : {}), ...(note.trim() ? { note: note.trim() } : {}) },
      { onSuccess: () => { setAmount(""); setNote(""); } },
    );
  };

  const errorCode = isApiError(record.error) ? record.error.code : null;

  return (
    <form className={s.form} onSubmit={onSubmit} aria-label={M.title}>
      <TextField label={M.amount} value={amount} onChange={(v) => setAmount(formatAmountInput(v))} inputMode="numeric" />
      <TextField label={M.date} type="date" value={date} onChange={setDate} />
      <TextField label={M.note} value={note} onChange={setNote} maxLength={200} />
      <span className={s.hint} role="status">
        {record.isError ? ((errorCode && M.errorCode[errorCode]) ?? M.failed) : record.isSuccess ? M.recorded : ""}
      </span>
      <Button type="submit" disabled={value === null || record.isPending} loading={record.isPending}>
        {M.submit}
      </Button>
    </form>
  );
};
