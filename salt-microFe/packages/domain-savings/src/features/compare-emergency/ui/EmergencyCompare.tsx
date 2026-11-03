"use client";

import { useMemo } from "react";

import { TextField } from "@repo/ui/textField";

import { isApiError } from "@repo/web-shared/api";
import { parseAmountInput, useDebouncedValue, labelOr, useNumberFields } from "@repo/web-shared/lib";

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
  // 금액 원 단위 · 금리 소수 하나 · 개월 숫자만 — 값과 안내를 한 덩어리로, 안내는 그 칸 아래(`useNumberFields` · `@repo/core/input`)
  const nums = useNumberFields({ amount: "won", rate: "decimal", months: "count" }, { months: DEFAULT_MONTHS });
  const amount = nums.value("amount");
  const rate = nums.value("rate");
  const months = nums.value("months");

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
        <TextField label={M.amount} value={amount} onChange={(v) => nums.change("amount", v)} inputMode="numeric" error={nums.message("amount")} />
        <TextField label={M.rate} value={rate} onChange={(v) => nums.change("rate", v)} inputMode="decimal" error={nums.message("rate")} />
        <TextField label={M.months} value={months} onChange={(v) => nums.change("months", v)} inputMode="numeric" error={nums.message("months")} />
      </div>
      {compare.isError && settled ? (
        <span className={s.label} role="status">
          {labelOr(M.errorCode, code, M.failed)}
        </span>
      ) : data ? (
        <div className={s.compare} aria-live="polite">
          <div className={s.side}>
            <span className={s.label}>{M.withdrawTitle}</span>
            {data.withdraw.delayMonths !== null ? (
              <span className={s.value}>{M.withdrawDelay(data.withdraw.delayMonths)}</span>
            ) : (
              <span className={s.value}>{labelOr(GOAL_MESSAGES.projectionReason, data.withdraw.reason, M.withdrawUnavailable)}</span>
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
              <span className={s.value}>{labelOr(M.loanReason, data.loanReason, M.loanUnavailable)}</span>
            )}
          </div>
        </div>
      ) : null}
      {data
        ? data.assumptions.map((key) => {
            const text = labelOr(M.assumption, key, "");
            return text ? (
              <span key={key} className={s.label}>
                {text}
              </span>
            ) : null;
          })
        : null}
    </div>
  );
};
