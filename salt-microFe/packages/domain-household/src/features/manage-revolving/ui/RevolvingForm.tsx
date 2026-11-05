"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@repo/ui/button";
import { TextField } from "@repo/ui/textField";

import { isApiError } from "@repo/web-shared/api";
import { parseAmountInput, useNumberFields } from "@repo/web-shared/lib";

import type { RevolvingList, RevolvingPlan, RevolvingRequest } from "@/entities/household";

import { useAddRevolving, useEditRevolving } from "../api";
import { MANAGE_REVOLVING_MESSAGES as M } from "../model";
import * as s from "./revolving.css";

/**
 * 리볼빙 명세서 적기 · 고치기(가계부 S1h). 칸 범위(결제비율 · 수수료율 상한 · 명세서 달 min/max)는 서버 값 — 화면은 안내 글자로만 쓰고
 * 거절은 서버가 한다(코드를 한 줄로). 수수료율은 글자 그대로 보낸다(소수 검사는 서버). 저장 실패 시 입력값을 둔다(FR-10).
 */
export const RevolvingForm = ({ list, plan, onDone }: { list: RevolvingList; plan?: RevolvingPlan; onDone?: () => void }) => {
  const add = useAddRevolving();
  const edit = useEditRevolving();
  const save = plan ? edit : add;
  const [label, setLabel] = useState(plan?.label ?? "");
  const [month, setMonth] = useState(plan?.statementMonth ?? list.monthMax);
  const nums = useNumberFields(
    { balance: "won", payRatio: "count", annualRate: "decimal" },
    plan ? { balance: String(plan.balance), payRatio: String(plan.payRatio), annualRate: String(Number(plan.annualRate)) } : {},
  );
  const balance = parseAmountInput(nums.value("balance"));
  const ratio = parseAmountInput(nums.value("payRatio"));
  const rate = nums.value("annualRate").trim();
  const ready = balance !== null && ratio !== null && rate !== "" && month !== "";
  const code = isApiError(save.error) ? save.error.code : null;
  const failure = code ? (M.errors[code] ?? M.failed) : save.isError ? M.failed : "";

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    const body: RevolvingRequest = { balance, payRatio: ratio, annualRate: rate, statementMonth: month, ...(label.trim() ? { label: label.trim() } : {}) };
    const done = {
      onSuccess: () => {
        if (!plan) {
          setLabel("");
          nums.reset();
        }
        onDone?.();
      },
    };
    if (plan) edit.mutate({ id: plan.id, body }, done);
    else add.mutate(body, done);
  };

  return (
    <form className={s.form} onSubmit={onSubmit} aria-label={plan ? M.editTitle : M.addTitle}>
      <h2 className={s.title}>{plan ? M.editTitle : M.addTitle}</h2>
      {plan ? null : <p className={s.note}>{M.description}</p>}
      <TextField label={M.label} value={label} onChange={setLabel} placeholder={M.labelPlaceholder} maxLength={20} />
      <div className={s.fields}>
        <TextField
          label={M.balance}
          value={nums.value("balance")}
          onChange={(v) => nums.change("balance", v)}
          inputMode="numeric"
          error={nums.message("balance")}
          helperText={M.balanceHint}
        />
        <TextField label={M.statementMonth} type="month" value={month} onChange={setMonth} min={list.monthMin} max={list.monthMax} />
        <TextField
          label={M.payRatio}
          value={nums.value("payRatio")}
          onChange={(v) => nums.change("payRatio", v)}
          inputMode="numeric"
          error={nums.message("payRatio")}
          helperText={M.ratioHint(list.ratioMin, list.ratioMax)}
        />
        <TextField
          label={M.annualRate}
          value={nums.value("annualRate")}
          onChange={(v) => nums.change("annualRate", v)}
          inputMode="decimal"
          error={nums.message("annualRate")}
          helperText={M.rateHint(list.rateMax)}
        />
      </div>
      <span className={s.note} role="status">
        {failure}
      </span>
      <div className={s.actions}>
        <Button type="submit" size="sm" disabled={!ready || save.isPending} loading={save.isPending}>
          {plan ? M.save : M.submit}
        </Button>
        {onDone ? (
          <Button type="button" size="sm" variant="weak" onClick={onDone}>
            {M.cancel}
          </Button>
        ) : null}
      </div>
    </form>
  );
};
