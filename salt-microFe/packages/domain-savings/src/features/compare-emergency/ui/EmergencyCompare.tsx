"use client";

import { useMemo, useState } from "react";

import { TextField } from "@repo/ui/textField";

import { isApiError } from "@repo/web-shared/api";
import { formatAmountInput, parseAmountInput, useDebouncedValue } from "@repo/web-shared/lib";

import { GOAL_MESSAGES, formatMonth, formatWon, useEmergencyComparison, type EmergencyRequest } from "@/entities/goal";

import { EMERGENCY_MESSAGES as M } from "../model";
import * as s from "./emergency.css";

const COMPARE_DEBOUNCE_MS = 300;
const DEFAULT_MONTHS = "12";

/** 금리는 0 도 뜻이 있다(가족에게 빌림) — `parseAmountInput` 은 0 을 비움으로 읽어 따로 받는다 */
const parseRate = (text: string): number | null => (text.trim() === "0" ? 0 : parseAmountInput(text));

/**
 * 비상시 비교(`FE-REQ-056` FR-7) — 목표에서 꺼내기 vs 사용자가 넣은 금리로 빌리기. 숫자는 전부 서버 계산 · 저장 없음.
 * 금액 계산을 하지 않는 feature 다(`fsd-features.md`) — 입력을 보내고 두 줄을 같은 무게로 보여 줄 뿐
 */
export const EmergencyCompare = ({ goalId }: { goalId: string }) => {
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [months, setMonths] = useState(DEFAULT_MONTHS);

  const request = useMemo<EmergencyRequest | null>(() => {
    const value = parseAmountInput(amount);
    const loanRate = parseRate(rate);
    const loanMonths = parseAmountInput(months);
    return value !== null && loanRate !== null && loanMonths !== null ? { amount: value, loanRate, loanMonths } : null;
  }, [amount, rate, months]);
  const settled = useDebouncedValue(request, COMPARE_DEBOUNCE_MS);
  const compare = useEmergencyComparison(goalId, settled);
  const data = settled ? compare.data : undefined;
  const code = isApiError(compare.error) ? compare.error.code : null;

  return (
    <div className={s.form} aria-label={M.title} role="group">
      <span className={s.label}>{M.description}</span>
      <div className={s.inputs}>
        <TextField label={M.amount} value={amount} onChange={(v) => setAmount(formatAmountInput(v))} inputMode="numeric" />
        <TextField label={M.rate} value={rate} onChange={(v) => setRate(formatAmountInput(v))} inputMode="decimal" />
        <TextField label={M.months} value={months} onChange={(v) => setMonths(v.replace(/[^0-9]/g, ""))} inputMode="numeric" />
      </div>
      {compare.isError && settled ? (
        <span className={s.label} role="status">
          {(code ? M.errorCode[code] : undefined) || M.failed}
        </span>
      ) : data ? (
        <div className={s.compare} aria-live="polite">
          <div className={s.side}>
            <span className={s.label}>{M.withdrawTitle}</span>
            {data.withdraw.delayMonths !== null ? (
              <span className={s.value}>{M.withdrawDelay(data.withdraw.delayMonths)}</span>
            ) : (
              <span className={s.value}>{(data.withdraw.reason ? GOAL_MESSAGES.projectionReason[data.withdraw.reason] : undefined) || M.withdrawUnavailable}</span>
            )}
            {data.withdraw.planMonthBefore && data.withdraw.planMonthAfter ? (
              <span className={s.label}>{M.withdrawMonths(formatMonth(data.withdraw.planMonthBefore), formatMonth(data.withdraw.planMonthAfter))}</span>
            ) : null}
          </div>
          <div className={s.side}>
            <span className={s.label}>{M.loanTitle}</span>
            {data.loan ? (
              <>
                <span className={s.value}>
                  {data.loan.restMonths === 0
                    ? M.loanMonthly(formatWon(data.loan.firstPayment), data.loan.months)
                    : M.loanSplit(formatWon(data.loan.firstPayment), data.loan.firstMonths, formatWon(data.loan.restPayment), data.loan.restMonths)}
                </span>
                <span className={s.label}>{M.loanInterest(formatWon(data.loan.totalInterest))}</span>
              </>
            ) : (
              <span className={s.value}>{(data.loanReason ? M.loanReason[data.loanReason] : undefined) || M.loanUnavailable}</span>
            )}
          </div>
        </div>
      ) : null}
      {data
        ? data.assumptions.map((key) =>
            M.assumption[key] ? (
              <span key={key} className={s.label}>
                {M.assumption[key]}
              </span>
            ) : null,
          )
        : null}
    </div>
  );
};
