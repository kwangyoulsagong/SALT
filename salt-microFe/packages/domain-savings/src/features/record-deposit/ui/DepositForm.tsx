"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@repo/ui/button";
import { TextField } from "@repo/ui/textField";

import { isApiError } from "@repo/web-shared/api";
import { parseAmountInput, labelOr, useNumberFields } from "@repo/web-shared/lib";

import { useRecordDeposit } from "../api";
import { RECORD_DEPOSIT_MESSAGES as M } from "../model";
import * as s from "./deposit.css";

export interface DepositFormProps {
  goalId: string;
}

/** 적립 한 건(`FE-REQ-056` FR-4). 저장 뒤 진척 · 이정표 · 구간은 서버 응답으로 바뀐다. 장면 한 칸 이동은 응답의 `scene.step` 으로 `GoalScene` 이 그린다(S1b FR-8) */
export const DepositForm = ({ goalId }: DepositFormProps) => {
  const record = useRecordDeposit(goalId);
  // 값과 안내를 한 덩어리로 — 입력 · 초기화가 같은 규칙을 지나고 안내는 그 칸 아래(`useNumberFields`)
  const nums = useNumberFields({ amount: "won" });
  const amount = nums.value("amount");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const value = parseAmountInput(amount);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (value === null) return;
    record.mutate(
      { amount: value, ...(date ? { depositedOn: date } : {}), ...(note.trim() ? { note: note.trim() } : {}) },
      { onSuccess: () => { nums.reset(["amount"]); setNote(""); } },
    );
  };

  const errorCode = isApiError(record.error) ? record.error.code : null;

  return (
    <form className={s.form} onSubmit={onSubmit} aria-label={M.title}>
      <TextField label={M.amount} value={amount} onChange={(v) => nums.change("amount", v)} inputMode="numeric" error={nums.message("amount")} />
      <TextField label={M.date} type="date" value={date} onChange={setDate} />
      <TextField label={M.note} value={note} onChange={setNote} maxLength={200} />
      <span className={s.hint} role="status">
        {record.isError ? labelOr(M.errorCode, errorCode, M.failed) : record.isSuccess ? M.recorded : ""}
      </span>
      <Button type="submit" disabled={value === null || record.isPending} loading={record.isPending}>
        {M.submit}
      </Button>
    </form>
  );
};
