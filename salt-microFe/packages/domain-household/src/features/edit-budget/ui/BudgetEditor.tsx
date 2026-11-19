"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@repo/ui/button";
import { SegmentedControl } from "@repo/ui/segmentedControl";
import { TextField } from "@repo/ui/textField";

import { isApiError } from "@repo/web-shared/api";
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
/**
 * 예산 편집(`FE-REQ-057` FR-6 → `FE-REQ-060` FR-7 · H7) — 봉투를 목록 행으로(분류 · 이번 달 쓴 돈 2단 · 금액 입력 오른쪽). 빈 봉투는 입력의
 * 자리 표시 글 "정하지 않음". 아래 합은 **저장한** 합(서버 `total`) — 입력 중 합을 화면에서 더하지 않는다(금액은 서버)
 */
export const BudgetEditor = ({ budget, spent = {} }: { budget: HouseholdBudget | null; /** 이번 달 분류별 쓴 돈(서버 `byCategory`) */ spent?: Readonly<Record<string, number>> }) => {
  const save = useSetBudget();
  const table = useCategoryTable();
  const label = useCategoryLabel();
  const [method, setMethod] = useState<BudgetMethodKey>(budget?.method ?? "envelope");
  const nums = useNumberFields({ income: "won" }, initialTexts(budget), "won");

  // 봉투 칸 — 기본 12 + 보관 안 한 내 분류 + 지금 예산에 봉투가 있는 지운 분류(서버가 다시 받는다 — 조용히 빠지지 않게. 비우면 빠진다)
  const kept = new Set(budget?.method === "envelope" ? budget.envelopes.map((e) => e.key) : []);
  const archived = new Set((table ?? []).filter((c) => c.custom && c.archived && kept.has(c.key)).map((c) => c.key));
  const categories: CategoryKey[] = [...DEFAULTS, ...(table ?? []).filter((c) => c.custom && (!c.archived || archived.has(c.key))).map((c) => c.key)];
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
        <TextField className={s.incomeInput} variant="compact" label={M.income} value={nums.value("income")} onChange={(v) => nums.change("income", v)} inputMode="numeric" error={nums.message("income")} trailing="원" />
      ) : null}
      {method === "envelope" ? (
        <ul className={s.rows} aria-label={M.rowsLabel}>
          {categories.map((key) => {
            const name = archived.has(key) ? M.archivedEnvelope(label.category(key)) : label.category(key);
            const used = spent[key] ?? 0;
            return (
              <li key={key} className={s.row}>
                <span className={s.rowMain}>
                  <span className={s.rowTitle}>{name}</span>
                  {used > 0 ? <span className={s.rowCaption}>{M.spentThisMonth(formatWon(used))}</span> : null}
                </span>
                <TextField
                  className={s.rowInput}
                  variant="compact"
                  aria-label={name}
                  placeholder={M.unset}
                  value={nums.value(key)}
                  onChange={(v) => nums.change(key, v)}
                  inputMode="numeric"
                  error={nums.message(key)}
                  trailing="원"
                />
              </li>
            );
          })}
        </ul>
      ) : null}
      {method === "account_split" ? (
        <ul className={s.rows} aria-label={M.methods.account_split}>
          {INPUT_ACCOUNTS.map((key) => (
            <li key={key} className={s.row}>
              <span className={s.rowMain}>
                <span className={s.rowTitle}>{ACCOUNT_LABEL[key]}</span>
              </span>
              <TextField
                className={s.rowInput}
                variant="compact"
                aria-label={ACCOUNT_LABEL[key]}
                placeholder={M.unset}
                value={nums.value(key)}
                onChange={(v) => nums.change(key, v)}
                inputMode="numeric"
                error={nums.message(key)}
                trailing="원"
              />
            </li>
          ))}
        </ul>
      ) : null}
      {shown?.total != null && method !== "50_30_20" ? <p className={s.total}>{M.savedTotal(formatWon(shown.total))}</p> : null}
      {shown?.savingsShare != null ? <p className={s.note}>{M.savingsShare(formatWon(shown.savingsShare))}</p> : null}
      {shown?.salaryShare != null ? <p className={s.note}>{M.salaryShare(formatWon(shown.salaryShare))}</p> : null}
      <span className={s.note} role="status">
        {save.isError ? (isApiError(save.error) && save.error.code ? M.errors[save.error.code] : undefined) ?? M.failed : save.isSuccess ? M.saved : !ready ? M.needOne[method] : ""}
      </span>
      <Button className={s.submit} type="submit" size="desk" disabled={!ready || save.isPending} loading={save.isPending}>
        {M.submit}
      </Button>
    </form>
  );
};
