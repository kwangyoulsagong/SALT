"use client";

import type { BudgetSetting, RiskBudgetView } from "@repo/core/coach";
import { TextField } from "@repo/ui/textField";
import { useId, useState, type FormEvent } from "react";

import { formatRatio } from "@/entities/coach";
import { formatAmountInput, formatPrice, parseAmountInput } from "@/shared/lib";

import { useSetRiskBudget } from "../api";
import { SET_RISK_BUDGET_MESSAGES as MSG } from "../model";
import {
  actions,
  errorText,
  form,
  hint,
  label,
  primaryButton,
  rows,
  statusText,
  unit,
  weakButton,
} from "./RiskBudgetForm.css";

/** 저장된 원 기준 예산을 입력 칸 글자로. 비율 기준이면 칸은 비우고 지금 기준을 한 줄로 보인다 */
const toInput = (setting: BudgetSetting | null): string =>
  setting && setting.unit === "krw" ? formatAmountInput(formatPrice(setting.amount)) : "";

/** 칸 글자 → 보낼 값. 비었으면 지운다(`null`), 숫자가 아니면 `undefined`(오류) */
const toSetting = (text: string): BudgetSetting | null | undefined => {
  if (text.trim() === "") return null;
  const amount = parseAmountInput(text);
  return amount === null ? undefined : { amount, unit: "krw" };
};

/**
 * 리스크 예산 입력 (F009 FR-1~2 · `FE-REQ-039`). 게이지 카드 안에 접혀 있다 — 새 화면이 아니다.
 *
 * - **필수가 아니다.** 비우고 저장하면 그 기준을 지운다(`null`). 0 · 기본값으로 채우지 않는다
 * - 원 단위만 받는다. 이미 총자산 % 로 정한 기준은 한 줄로 보이고, 원으로 적으면 바뀐다
 * - 원 환산 · 게이지는 서버가 한다 — 응답이 곧 새 게이지다
 */
export const RiskBudgetForm = ({ view }: { view: RiskBudgetView }) => {
  const { settings } = view;
  const noBudget = settings.monthlyLossBudget === null && settings.perTradeMaxLoss === null;
  const [open, setOpen] = useState(noBudget);
  const [monthly, setMonthly] = useState(() => toInput(settings.monthlyLossBudget));
  const [perTrade, setPerTrade] = useState(() => toInput(settings.perTradeMaxLoss));
  const save = useSetRiskBudget();
  const ids = { monthly: useId(), perTrade: useId(), body: useId() };

  const monthlySetting = toSetting(monthly);
  const perTradeSetting = toSetting(perTrade);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (monthlySetting === undefined || perTradeSetting === undefined) return;
    save.mutate({ monthlyLossBudget: monthlySetting, perTradeMaxLoss: perTradeSetting });
  };

  const percentNote = (setting: BudgetSetting | null) =>
    setting?.unit === "percent" ? <p className={hint}>{MSG.percentNow(formatRatio(setting.amount))}</p> : null;

  if (!open) {
    return (
      <div className={actions}>
        <button type="button" className={weakButton} aria-expanded={false} onClick={() => setOpen(true)}>
          {noBudget ? MSG.open : MSG.edit}
        </button>
        {save.isSuccess && <p className={statusText} aria-live="polite">{MSG.saved}</p>}
      </div>
    );
  }

  return (
    <form id={ids.body} className={form} onSubmit={onSubmit} noValidate>
      <div className={rows}>
        <label className={label} htmlFor={ids.monthly}>
          {MSG.monthly}
        </label>
        <TextField
          id={ids.monthly}
          variant="compact"
          inputMode="numeric"
          autoComplete="off"
          placeholder={MSG.placeholder}
          value={monthly}
          onChange={(value) => setMonthly(formatAmountInput(value))}
          trailing={<span className={unit}>{MSG.unit}</span>}
          error={monthlySetting === undefined ? MSG.invalid : undefined}
        />
        <label className={label} htmlFor={ids.perTrade}>
          {MSG.perTrade}
        </label>
        <TextField
          id={ids.perTrade}
          variant="compact"
          inputMode="numeric"
          autoComplete="off"
          placeholder={MSG.placeholder}
          value={perTrade}
          onChange={(value) => setPerTrade(formatAmountInput(value))}
          trailing={<span className={unit}>{MSG.unit}</span>}
          error={perTradeSetting === undefined ? MSG.invalid : undefined}
        />
      </div>
      {percentNote(settings.monthlyLossBudget)}
      {percentNote(settings.perTradeMaxLoss)}
      <p className={hint}>
        {MSG.hint}
        {settings.targetVolatility !== null &&
          ` · ${MSG.targetVol(formatRatio(settings.targetVolatility), settings.targetVolatilityIsDefault)}`}
      </p>
      <div className={actions}>
        <button type="submit" className={primaryButton} disabled={save.isPending}>
          {save.isPending ? MSG.saving : MSG.save}
        </button>
        {!noBudget && (
          <button type="button" className={weakButton} aria-expanded={true} aria-controls={ids.body} onClick={() => setOpen(false)}>
            {MSG.close}
          </button>
        )}
        <div aria-live="polite">
          {save.isSuccess && <p className={statusText}>{MSG.saved}</p>}
          {save.isError && <p className={errorText}>{MSG.failed}</p>}
        </div>
      </div>
    </form>
  );
};
