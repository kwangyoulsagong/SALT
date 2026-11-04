"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@repo/ui/button";
import { SegmentedControl } from "@repo/ui/segmentedControl";
import { TextField } from "@repo/ui/textField";

import { parseAmountInput, useNumberFields } from "@repo/web-shared/lib";

import { CATEGORY_LABEL, formatWon, type BudgetMethodKey, type CategoryKey, type HouseholdBudget } from "@/entities/expense";

import { useSetBudget } from "../api";
import { BUDGET_MESSAGES as M } from "../model";
import * as s from "./budget.css";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as CategoryKey[];
const METHODS: BudgetMethodKey[] = ["50_30_20", "envelope"];

const initialTexts = (budget: HouseholdBudget | null): Record<string, string> => {
  if (!budget) return {};
  if (budget.method === "50_30_20") return budget.income ? { income: String(budget.income) } : {};
  return Object.fromEntries(budget.envelopes.map((e) => [e.key, String(e.amount)]));
};

/**
 * 예산 방식 고르기 · 봉투 편집(`FE-REQ-057` FR-6). 금액 나누기(50/30/20)는 서버가 한다 — 화면은 소득만 보낸다.
 * 저장 실패 시 입력값을 둔다(FR-10).
 */
export const BudgetEditor = ({ budget }: { budget: HouseholdBudget | null }) => {
  const save = useSetBudget();
  const [method, setMethod] = useState<BudgetMethodKey>(budget?.method ?? "envelope");
  const nums = useNumberFields({ income: "won" }, initialTexts(budget), "won");

  const envelopes = Object.fromEntries(
    CATEGORIES.map((key) => [key, parseAmountInput(nums.value(key))] as const).filter((entry): entry is readonly [CategoryKey, number] => entry[1] !== null && entry[1] > 0),
  );
  const income = parseAmountInput(nums.value("income"));
  const ready = method === "50_30_20" ? income !== null && income > 0 : Object.keys(envelopes).length > 0;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    save.mutate(method === "50_30_20" ? { method, income: income ?? undefined } : { method, envelopes });
  };

  return (
    <form className={s.form} onSubmit={onSubmit} aria-label={M.title}>
      <p className={s.note}>{M.description}</p>
      <SegmentedControl label={M.method} value={method} onChange={setMethod} options={METHODS.map((m) => ({ value: m, label: M.methods[m] }))} />
      <p className={s.note}>{M.methodNote[method]}</p>
      {method === "50_30_20" ? (
        <TextField label={M.income} value={nums.value("income")} onChange={(v) => nums.change("income", v)} inputMode="numeric" error={nums.message("income")} />
      ) : (
        <div className={s.grid}>
          {CATEGORIES.map((key) => (
            <TextField key={key} label={CATEGORY_LABEL[key]} value={nums.value(key)} onChange={(v) => nums.change(key, v)} inputMode="numeric" error={nums.message(key)} />
          ))}
        </div>
      )}
      {save.data?.savingsShare != null ? <p className={s.note}>{M.savingsShare(formatWon(save.data.savingsShare))}</p> : null}
      <span className={s.note} role="status">
        {save.isError ? M.failed : save.isSuccess ? M.saved : method === "envelope" && !ready ? M.needOne : ""}
      </span>
      <Button type="submit" disabled={!ready || save.isPending} loading={save.isPending}>
        {M.submit}
      </Button>
    </form>
  );
};
