"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Button } from "@repo/ui/button";
import { Chip } from "@repo/ui/chip";
import { SegmentedControl } from "@repo/ui/segmentedControl";
import { TextField } from "@repo/ui/textField";
import { Toggle } from "@repo/ui/toggle";

import { ROUTES } from "@repo/web-shared/config";
import { parseAmountInput, useAmountInputGuard, labelOr } from "@repo/web-shared/lib";

import {
  GOAL_MESSAGES,
  StampBoard,
  TEMPLATE_LABEL,
  formatMonth,
  formatWon,
  useSavingsCalculation,
  useSavingsTemplates,
  type CalculationRequest,
  type GoalTemplateKey,
} from "@/entities/goal";

import { useAddGoal } from "../api";
import { ADD_GOAL_MESSAGES as M, type PlanMode } from "../model";
import * as s from "./addGoal.css";

/** 입력이 멈춘 뒤 계산을 부른다 — 글자마다 서버를 부르지 않게(FR-3) */
const CALC_DEBOUNCE_MS = 300;
const TEMPLATE_KEYS = Object.keys(TEMPLATE_LABEL) as GoalTemplateKey[];


/**
 * 목표 만들기 + 계산기(`FE-REQ-056` FR-2 · 3). **결과 숫자는 전부 서버 응답** — 입력을 읽어 보내고 응답을 보여 줄 뿐이다.
 * 기한 모드면 서버가 계산한 월 적립이 계획으로 저장된다. 기준 금액은 원문 대조 전이라 비어 있다(슬라이스 판단 3).
 */
export const AddGoalForm = () => {
  const router = useRouter();
  const templates = useSavingsTemplates();
  const add = useAddGoal();

  const [template, setTemplate] = useState<GoalTemplateKey>("travel");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<PlanMode>("deadline");
  const [deadline, setDeadline] = useState("");
  const [monthly, setMonthly] = useState("");
  const [includeInterest, setIncludeInterest] = useState(false);
  const [rate, setRate] = useState("");
  const guard = useAmountInputGuard();

  const request = useMemo<CalculationRequest | null>(() => {
    const targetAmount = parseAmountInput(amount);
    if (targetAmount === null) return null;
    const annualRate = includeInterest ? parseAmountInput(rate) : null;
    if (includeInterest && annualRate === null) return null;
    const base = { targetAmount, includeInterest, ...(annualRate !== null ? { annualRate } : {}) };
    if (mode === "deadline") return deadline ? { ...base, targetDate: deadline } : null;
    const perMonth = parseAmountInput(monthly);
    return perMonth === null ? null : { ...base, monthly: perMonth };
  }, [amount, mode, deadline, monthly, includeInterest, rate]);

  // 디바운스 — 마지막 입력 뒤 한 번만 계산 요청
  const [settled, setSettled] = useState<CalculationRequest | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(request), CALC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [request]);
  const calc = useSavingsCalculation(settled);
  const result = calc.data;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    guard.clear();
    if (!request || title.trim() === "") return;
    add.mutate(
      {
        title: title.trim(),
        template,
        targetAmount: request.targetAmount,
        includeInterest: request.includeInterest,
        ...(request.annualRate !== undefined ? { annualRate: request.annualRate } : {}),
        ...(request.targetDate ? { targetDate: request.targetDate } : {}),
        ...(request.monthly !== undefined ? { monthlyPlan: request.monthly } : {}),
      },
      { onSuccess: (detail) => router.push(ROUTES.goal(detail.goal.id)) },
    );
  };

  const canSubmit = request !== null && title.trim() !== "" && result?.state === "ok" && !add.isPending;

  return (
    <form className={s.form} onSubmit={onSubmit}>
      <fieldset className={s.fieldset}>
        <legend className={s.legend}>{M.template}</legend>
        <div className={s.chips}>
          {(templates.data?.map((t) => t.key) ?? TEMPLATE_KEYS).map((key) => (
            <Chip key={key} selected={template === key} onPress={() => setTemplate(key)}>
              {TEMPLATE_LABEL[key]}
            </Chip>
          ))}
        </div>
        <span className={s.hint}>{GOAL_MESSAGES.baselineUnverified}</span>
      </fieldset>

      <TextField label={M.title} value={title} onChange={setTitle} placeholder={M.titlePlaceholder} maxLength={100} />
      <TextField
        label={M.amount}
        value={amount}
        onChange={(v) => guard.take(v, setAmount)}
        placeholder={M.amountPlaceholder}
        inputMode="numeric"
      />

      <SegmentedControl
        label={M.modeLabel}
        value={mode}
        onChange={setMode}
        options={[
          { label: M.modeDeadline, value: "deadline" },
          { label: M.modeMonthly, value: "monthly" },
        ]}
      />
      {mode === "deadline" ? (
        <TextField label={M.deadline} type="date" value={deadline} onChange={setDeadline} />
      ) : (
        <TextField label={M.monthly} value={monthly} onChange={(v) => guard.take(v, setMonthly)} inputMode="numeric" />
      )}

      <Toggle checked={includeInterest} onChange={setIncludeInterest} label={M.interest} />
      {includeInterest ? <TextField label={M.rate} value={rate} onChange={(v) => guard.take(v, setRate, "decimal")} inputMode="decimal" /> : null}

      {guard.message ? (
        <span className={s.hint} role="status">
          {guard.message}
        </span>
      ) : null}
      <section className={s.result} aria-live="polite" aria-busy={calc.isFetching}>
        {calc.isError ? <span className={s.hint}>{M.calcFailed}</span> : null}
        {result && result.state !== "ok" ? <span className={s.hint}>{labelOr(GOAL_MESSAGES.calculationState, result.state, "")}</span> : null}
        {result && result.state === "ok" ? (
          <>
            <div className={s.resultRow}>
              <span className={s.hint}>{mode === "deadline" ? M.resultMonthly : M.resultReach}</span>
              <strong className={s.resultValue}>
                {mode === "deadline"
                  ? result.monthly !== null
                    ? formatWon(result.monthly)
                    : "—"
                  : result.reachMonth
                    ? GOAL_MESSAGES.projection.plan(result.reachMonth)
                    : "—"}
              </strong>
            </div>
            {result.months !== null ? (
              <span className={s.hint}>
                {M.resultMonths(result.months)}
                {result.reachMonth ? ` · ${formatMonth(result.reachMonth)}` : ""}
              </span>
            ) : null}
            {includeInterest ? (
              <>
                <span className={s.hint}>
                  {M.resultInterest} {formatWon(result.expectedInterest)}
                </span>
                <span className={s.hint}>{M.assumption(result.assumptions.interestTaxRatePercent)}</span>
              </>
            ) : null}
          </>
        ) : null}
      </section>

      {/* 첫 도장 미리보기(FR-2 · FEATURE-012 FR-17) — 만들면 도장 하나가 찍혀 있다. 숫자는 서버 규칙(1 + 적립)과 같은 "만든 날 하나" */}
      <span className={s.hint}>{M.firstStampPreview}</span>
      <StampBoard count={1} />

      {add.isError ? <span className={s.hint}>{M.submitFailed}</span> : null}
      <Button type="submit" disabled={!canSubmit} loading={add.isPending} fullWidth>
        {M.submit}
      </Button>
    </form>
  );
};
