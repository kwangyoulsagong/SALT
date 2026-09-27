"use client";

import type { BudgetUnit, RiskBudgetView } from "@repo/core/coach";
import { SegmentedControl } from "@repo/ui/segmentedControl";
import { TextField } from "@repo/ui/textField";
import { useId, useState, type FormEvent } from "react";

import { formatRatio } from "@/entities/coach";
import { formatAmountInput } from "@/shared/lib";

import { useSetRiskBudget } from "../api";
import {
  formatPercentInput,
  ratioToPercentText,
  toBudgetInput,
  toBudgetSetting,
  toCapRatio,
  type BudgetInput,
} from "../lib";
import { SET_RISK_BUDGET_MESSAGES as MSG } from "../model";
import {
  actions,
  errorText,
  fieldGrow,
  fieldWithUnit,
  form,
  hint,
  intro,
  label,
  primaryButton,
  rows,
  statusText,
  unit as unitStyle,
  weakButton,
} from "./RiskBudgetForm.css";

const UNIT_OPTIONS: { label: string; value: BudgetUnit }[] = [
  { label: MSG.unitKrw, value: "krw" },
  { label: MSG.unitPercent, value: "percent" },
];

/** 예산 한 줄 — 금액 칸 + 원/% 고르기. 단위를 바꾸면 칸을 비운다(원 숫자가 % 로 읽히지 않게) */
const BudgetRow = ({
  id,
  name,
  value,
  onChange,
  invalid,
}: {
  id: string;
  name: string;
  value: BudgetInput;
  onChange: (value: BudgetInput) => void;
  invalid: boolean;
}) => (
  <>
    <label className={label} htmlFor={id}>
      {name}
    </label>
    <div className={fieldWithUnit}>
      <div className={fieldGrow}>
        <TextField
          id={id}
          variant="compact"
          inputMode={value.unit === "krw" ? "numeric" : "decimal"}
          autoComplete="off"
          placeholder={MSG.placeholder}
          value={value.text}
          onChange={(text) =>
            onChange({
              ...value,
              text:
                value.unit === "krw"
                  ? formatAmountInput(text)
                  : formatPercentInput(text),
            })
          }
          trailing={
            <span className={unitStyle}>
              {value.unit === "krw" ? MSG.unitKrw : MSG.unitPercent}
            </span>
          }
          error={
            invalid
              ? value.unit === "krw"
                ? MSG.invalid
                : MSG.invalidPercent
              : undefined
          }
        />
      </div>
      <SegmentedControl
        options={UNIT_OPTIONS}
        value={value.unit}
        onChange={(unit) => onChange({ text: "", unit })}
        label={MSG.unitLabel(name)}
      />
    </div>
  </>
);

/**
 * 내 기준 — IPS 3문항 (F009 FR-1~2 · 시나리오 7 · `FE-REQ-039` FR-9 · FR-22). 게이지 카드 안에 접혀 있다 — 새 화면이 아니다.
 *
 * 코치 대화 화면이 웹에 없어 3문항(월 허용 손실 · 1회 최대 손실 · 한 종목 상한)을 여기서 받는다(2026-09-27 결정).
 * 기준이 하나도 없으면 펼친 채로 시작하고 첫 줄이 "세 가지만 정하면" 안내다.
 *
 * - **필수가 아니다.** 예산 칸을 비우고 저장하면 그 기준을 지운다(`null`). 0 · 기본값으로 채우지 않는다
 * - 한 종목 상한은 비우면 서버 기본(60%)으로 돌아간다 — 컬럼이 비어 있을 수 없다
 * - 원 환산 · 게이지는 서버가 한다 — 응답이 곧 새 게이지다
 */
export const RiskBudgetForm = ({ view }: { view: RiskBudgetView }) => {
  const { settings } = view;
  const noBudget =
    settings.monthlyLossBudget === null && settings.perTradeMaxLoss === null;
  const [open, setOpen] = useState(noBudget);
  const [monthly, setMonthly] = useState(() =>
    toBudgetInput(settings.monthlyLossBudget),
  );
  const [perTrade, setPerTrade] = useState(() =>
    toBudgetInput(settings.perTradeMaxLoss),
  );
  const initialCap =
    settings.maxSingleAssetWeight === null
      ? ""
      : ratioToPercentText(settings.maxSingleAssetWeight);
  const [cap, setCap] = useState(initialCap);
  const save = useSetRiskBudget();
  const ids = {
    monthly: useId(),
    perTrade: useId(),
    cap: useId(),
    body: useId(),
  };

  const monthlySetting = toBudgetSetting(monthly);
  const perTradeSetting = toBudgetSetting(perTrade);
  const capRatio = toCapRatio(cap);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (
      monthlySetting === undefined ||
      perTradeSetting === undefined ||
      capRatio === undefined
    )
      return;
    save.mutate({
      monthlyLossBudget: monthlySetting,
      perTradeMaxLoss: perTradeSetting,
      // 고치지 않은 상한은 보내지 않는다 — 다른 칸만 저장했는데 상한이 기본값으로 돌아가지 않게
      ...(cap !== initialCap ? { maxSingleAssetWeight: capRatio } : {}),
    });
  };

  if (!open) {
    return (
      <div className={actions}>
        <button
          type="button"
          className={weakButton}
          aria-expanded={false}
          onClick={() => setOpen(true)}
        >
          {noBudget ? MSG.open : MSG.edit}
        </button>
        {save.isSuccess && (
          <p className={statusText} aria-live="polite">
            {MSG.saved}
          </p>
        )}
      </div>
    );
  }

  return (
    <form id={ids.body} className={form} onSubmit={onSubmit} noValidate>
      {noBudget && <p className={intro}>{MSG.intro}</p>}
      <div className={rows}>
        <BudgetRow
          id={ids.monthly}
          name={MSG.monthly}
          value={monthly}
          onChange={setMonthly}
          invalid={monthlySetting === undefined}
        />
        <BudgetRow
          id={ids.perTrade}
          name={MSG.perTrade}
          value={perTrade}
          onChange={setPerTrade}
          invalid={perTradeSetting === undefined}
        />
        <label className={label} htmlFor={ids.cap}>
          {MSG.cap}
        </label>
        <TextField
          id={ids.cap}
          variant="compact"
          inputMode="decimal"
          autoComplete="off"
          placeholder={MSG.capPlaceholder}
          value={cap}
          onChange={(text) => setCap(formatPercentInput(text))}
          trailing={<span className={unitStyle}>{MSG.unitPercent}</span>}
          error={capRatio === undefined ? MSG.invalidCap : undefined}
        />
      </div>
      <p className={hint}>
        {MSG.hint}
        {settings.targetVolatility !== null &&
          ` · ${MSG.targetVol(formatRatio(settings.targetVolatility), settings.targetVolatilityIsDefault)}`}
      </p>
      <div className={actions}>
        <button
          type="submit"
          className={primaryButton}
          disabled={save.isPending}
        >
          {save.isPending ? MSG.saving : MSG.save}
        </button>
        {!noBudget && (
          <button
            type="button"
            className={weakButton}
            aria-expanded={true}
            aria-controls={ids.body}
            onClick={() => setOpen(false)}
          >
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
