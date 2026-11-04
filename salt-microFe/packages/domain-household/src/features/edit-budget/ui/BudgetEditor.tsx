"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@repo/ui/button";
import { SegmentedControl } from "@repo/ui/segmentedControl";
import { TextField } from "@repo/ui/textField";

import { parseAmountInput, useNumberFields } from "@repo/web-shared/lib";

import {
  ACCOUNT_LABEL,
  CATEGORY_LABEL,
  formatWon,
  useCategoryLabel,
  useCategoryTable,
  type AccountKey,
  type BudgetMethodKey,
  type BudgetRequest,
  type CategoryKey,
  type DefaultCategoryKey,
  type HouseholdBudget,
} from "@/entities/household";

import { useSetBudget } from "../api";
import { BUDGET_MESSAGES as M } from "../model";
import * as s from "./budget.css";

const DEFAULTS = Object.keys(CATEGORY_LABEL) as DefaultCategoryKey[];
const METHODS: BudgetMethodKey[] = ["50_30_20", "envelope", "account_split"];
/** 사용자가 넣는 통장 — 급여 통장 몫은 서버가 소득에서 뺀다(가계부 S1f) */
const INPUT_ACCOUNTS: AccountKey[] = ["spending", "saving", "emergency"];

const initialTexts = (budget: HouseholdBudget | null): Record<string, string> => {
  if (!budget) return {};
  const income: Record<string, string> = budget.income ? { income: String(budget.income) } : {};
  if (budget.method === "50_30_20") return income;
  return { ...income, ...Object.fromEntries(budget.envelopes.map((e) => [e.key, String(e.amount)])) };
};

/**
 * 예산 방식 고르기 · 봉투 · 통장 편집(`FE-REQ-057` FR-6 · S1f FR-12). 금액 나누기(50/30/20) · 급여 통장 몫(통장 쪼개기)은 서버가 한다 —
 * 화면은 넣은 값만 보낸다. 봉투 칸은 기본 12 + 보관하지 않은 내 분류. 저장 실패 시 입력값을 둔다(FR-10).
 */
export const BudgetEditor = ({ budget }: { budget: HouseholdBudget | null }) => {
  const save = useSetBudget();
  const table = useCategoryTable();
  const label = useCategoryLabel();
  const [method, setMethod] = useState<BudgetMethodKey>(budget?.method ?? "envelope");
  const nums = useNumberFields({ income: "won" }, initialTexts(budget), "won");

  const categories: CategoryKey[] = [...DEFAULTS, ...(table ?? []).filter((c) => c.custom && !c.archived).map((c) => c.key)];
  const filled = (keys: readonly string[]) =>
    Object.fromEntries(keys.map((key) => [key, parseAmountInput(nums.value(key))] as const).filter((entry): entry is readonly [string, number] => entry[1] !== null && entry[1] > 0));
  const income = parseAmountInput(nums.value("income"));
  const hasIncome = income !== null && income > 0;
  const envelopes = filled(categories);
  const accounts = filled(INPUT_ACCOUNTS);
  const ready = method === "50_30_20" ? hasIncome : method === "envelope" ? Object.keys(envelopes).length > 0 : hasIncome && accounts.spending !== undefined;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    const body: BudgetRequest =
      method === "50_30_20"
        ? { method, income: income ?? undefined }
        : method === "envelope"
          ? { method, envelopes }
          : { method, income: income ?? undefined, envelopes: accounts };
    save.mutate(body);
  };

  // 저장한 예산(방금 · 전에)의 서버 몫 — 지금 고른 방식과 같을 때만
  const saved = save.data ?? budget;
  const shown = saved?.method === method ? saved : null;

  return (
    <form className={s.form} onSubmit={onSubmit} aria-label={M.title}>
      <p className={s.note}>{M.description}</p>
      <SegmentedControl label={M.method} value={method} onChange={setMethod} options={METHODS.map((m) => ({ value: m, label: M.methods[m] }))} />
      <p className={s.note}>{M.methodNote[method]}</p>
      {method !== "envelope" ? (
        <TextField label={M.income} value={nums.value("income")} onChange={(v) => nums.change("income", v)} inputMode="numeric" error={nums.message("income")} />
      ) : null}
      {method === "envelope" ? (
        <div className={s.grid}>
          {categories.map((key) => (
            <TextField key={key} label={label.category(key)} value={nums.value(key)} onChange={(v) => nums.change(key, v)} inputMode="numeric" error={nums.message(key)} />
          ))}
        </div>
      ) : null}
      {method === "account_split" ? (
        <div className={s.grid}>
          {INPUT_ACCOUNTS.map((key) => (
            <TextField key={key} label={ACCOUNT_LABEL[key]} value={nums.value(key)} onChange={(v) => nums.change(key, v)} inputMode="numeric" error={nums.message(key)} />
          ))}
        </div>
      ) : null}
      {shown?.savingsShare != null ? <p className={s.note}>{M.savingsShare(formatWon(shown.savingsShare))}</p> : null}
      {shown?.salaryShare != null ? <p className={s.note}>{M.salaryShare(formatWon(shown.salaryShare))}</p> : null}
      <span className={s.note} role="status">
        {save.isError ? M.failed : save.isSuccess ? M.saved : !ready ? M.needOne[method] : ""}
      </span>
      <Button type="submit" disabled={!ready || save.isPending} loading={save.isPending}>
        {M.submit}
      </Button>
    </form>
  );
};
