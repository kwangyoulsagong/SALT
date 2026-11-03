"use client";

import type { BudgetUnit, RiskBudgetView } from "@repo/core/coach";
import { SegmentedControl } from "@repo/ui/segmentedControl";
import { StatusLine } from "@repo/ui/statusLine";
import { TextField } from "@repo/ui/textField";
import { useId, useState, type FormEvent } from "react";

import { formatRatio } from "@/entities/coach";
import { useNumberFields } from "@repo/web-shared/lib";

import { useSetRiskBudget } from "../api";
import {
  ratioToPercentText,
  toBudgetInput,
  toBudgetSetting,
  toCapRatio,
  toInvestableCapital,
  toTargetVolRatio,
  capitalToInputText,
  type BudgetInput,
} from "../lib";
import { SET_RISK_BUDGET_MESSAGES as MSG } from "../model";
import {
  actions,
  fieldGrow,
  fieldWithUnit,
  form,
  hint,
  intro,
  label,
  primaryButton,
  rows,
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
  onTextChange,
  onUnitChange,
  error,
}: {
  id: string;
  name: string;
  value: BudgetInput;
  onTextChange: (raw: string) => void;
  onUnitChange: (unit: BudgetUnit) => void;
  error: string | undefined;
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
          onChange={onTextChange}
          trailing={
            <span className={unitStyle}>
              {value.unit === "krw" ? MSG.unitKrw : MSG.unitPercent}
            </span>
          }
          error={error}
        />
      </div>
      <SegmentedControl
        options={UNIT_OPTIONS}
        value={value.unit}
        onChange={onUnitChange}
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
  const initialMonthly = toBudgetInput(settings.monthlyLossBudget);
  const initialPerTrade = toBudgetInput(settings.perTradeMaxLoss);
  const [monthlyUnit, setMonthlyUnit] = useState(initialMonthly.unit);
  const [perTradeUnit, setPerTradeUnit] = useState(initialPerTrade.unit);
  const initialCap =
    settings.maxSingleAssetWeight === null
      ? ""
      : ratioToPercentText(settings.maxSingleAssetWeight);
  // 목표 변동성은 기본값이면 칸을 비운 채로 둔다 — 기본값을 저장하면 기본이 바뀔 때 따라가지 않는다
  const initialVol =
    settings.targetVolatility === null || settings.targetVolatilityIsDefault
      ? ""
      : ratioToPercentText(settings.targetVolatility);
  const initialCapital = capitalToInputText(settings.investableCapitalKrw);
  // 숫자 칸 다섯의 값과 안내를 한 덩어리로(`useNumberFields`) — 원 칸은 소수 금액(price), % 칸은 소수(decimal).
  // 단위를 바꾸면 그 칸을 비우고 안내도 지운다. 받을 수 없는 글자는 값을 두고 칸 아래 안내(전각 점 · 가운뎃점이 숫자를 이어 붙이던 결함, 2026-11-03)
  const kindOf = (unit: BudgetUnit) => (unit === "krw" ? "price" : "decimal");
  const nums = useNumberFields(
    { monthly: kindOf(monthlyUnit), perTrade: kindOf(perTradeUnit), cap: "decimal", targetVol: "decimal", capital: "price" },
    { monthly: initialMonthly.text, perTrade: initialPerTrade.text, cap: initialCap, targetVol: initialVol, capital: initialCapital },
  );
  const monthly: BudgetInput = { text: nums.value("monthly"), unit: monthlyUnit };
  const perTrade: BudgetInput = { text: nums.value("perTrade"), unit: perTradeUnit };
  const cap = nums.value("cap");
  const targetVol = nums.value("targetVol");
  const capital = nums.value("capital");
  const budgetError = (key: "monthly" | "perTrade", input: BudgetInput, invalid: boolean) =>
    nums.message(key) ?? (invalid ? (input.unit === "krw" ? MSG.invalid : MSG.invalidPercent) : undefined);
  const save = useSetRiskBudget();
  const ids = {
    monthly: useId(),
    perTrade: useId(),
    cap: useId(),
    capital: useId(),
    targetVol: useId(),
    body: useId(),
  };

  const monthlySetting = toBudgetSetting(monthly);
  const perTradeSetting = toBudgetSetting(perTrade);
  const capRatio = toCapRatio(cap);
  const volRatio = toTargetVolRatio(targetVol);
  const capitalKrw = toInvestableCapital(capital);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (
      monthlySetting === undefined ||
      perTradeSetting === undefined ||
      capRatio === undefined ||
      volRatio === undefined ||
      capitalKrw === undefined
    )
      return;
    save.mutate({
      // 고치지 않은 예산은 보내지 않는다 — 저장된 값이 칸 규칙(자릿수 상한 · 소수 8자리) 밖이면 빈칸 · 반올림으로 열리는데,
      // 그대로 보내면 사용자가 손대지 않은 예산이 지워지거나 바뀐다(리뷰 12차 — 상한을 넣은 11차의 퇴행)
      ...(monthly.text !== initialMonthly.text || monthly.unit !== initialMonthly.unit ? { monthlyLossBudget: monthlySetting } : {}),
      ...(perTrade.text !== initialPerTrade.text || perTrade.unit !== initialPerTrade.unit ? { perTradeMaxLoss: perTradeSetting } : {}),
      // 고치지 않은 상한은 보내지 않는다 — 다른 칸만 저장했는데 상한이 기본값으로 돌아가지 않게
      ...(cap !== initialCap ? { maxSingleAssetWeight: capRatio } : {}),
      ...(targetVol !== initialVol ? { targetVolatility: volRatio } : {}),
      ...(capital !== initialCapital ? { investableCapital: capitalKrw } : {}),
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
          <StatusLine kind="success" live>
            {MSG.saved}
          </StatusLine>
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
          onTextChange={(raw) => nums.change("monthly", raw)}
          onUnitChange={(unit) => {
            nums.reset(["monthly"]);
            setMonthlyUnit(unit);
          }}
          error={budgetError("monthly", monthly, monthlySetting === undefined)}
        />
        <BudgetRow
          id={ids.perTrade}
          name={MSG.perTrade}
          value={perTrade}
          onTextChange={(raw) => nums.change("perTrade", raw)}
          onUnitChange={(unit) => {
            nums.reset(["perTrade"]);
            setPerTradeUnit(unit);
          }}
          error={budgetError("perTrade", perTrade, perTradeSetting === undefined)}
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
          onChange={(text) => nums.change("cap", text)}
          trailing={<span className={unitStyle}>{MSG.unitPercent}</span>}
          error={nums.message("cap") ?? (capRatio === undefined ? MSG.invalidCap : undefined)}
        />
        <label className={label} htmlFor={ids.capital}>
          {MSG.capital}
        </label>
        <TextField
          id={ids.capital}
          variant="compact"
          inputMode="numeric"
          autoComplete="off"
          placeholder={MSG.capitalPlaceholder}
          value={capital}
          onChange={(text) => nums.change("capital", text)}
          trailing={<span className={unitStyle}>{MSG.unitKrw}</span>}
          error={nums.message("capital") ?? (capitalKrw === undefined ? MSG.invalidCapital : undefined)}
        />
        <label className={label} htmlFor={ids.targetVol}>
          {MSG.targetVolatility}
        </label>
        <TextField
          id={ids.targetVol}
          variant="compact"
          inputMode="decimal"
          autoComplete="off"
          placeholder={MSG.targetVolatilityPlaceholder}
          value={targetVol}
          onChange={(text) => nums.change("targetVol", text)}
          trailing={<span className={unitStyle}>{MSG.unitPercent}</span>}
          error={nums.message("targetVol") ?? (volRatio === undefined ? MSG.invalidTargetVolatility : undefined)}
        />
      </div>
      <p className={hint}>
        {MSG.hint}
        {settings.targetVolatility !== null &&
          ` · ${MSG.targetVol(formatRatio(settings.targetVolatility), settings.targetVolatilityIsDefault)}`}
      </p>
      <p className={hint}>{MSG.capitalHint}</p>
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
          {/* 저장 결과는 글자만 바꾸지 않고 그래픽과 함께 (FE-REQ-044 P-5) */}
          {save.isSuccess && <StatusLine kind="success">{MSG.saved}</StatusLine>}
          {save.isError && <StatusLine kind="error">{MSG.failed}</StatusLine>}
        </div>
      </div>
    </form>
  );
};
