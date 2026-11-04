"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/checkbox";
import { Chip } from "@repo/ui/chip";
import { SegmentedControl } from "@repo/ui/segmentedControl";
import { TextField } from "@repo/ui/textField";

import { isApiError } from "@repo/web-shared/api";
import { labelOr, parseAmountInput, todayInKorea, useNumberFields } from "@repo/web-shared/lib";

import { CategoryChips, formatWon, useHouseholdSuggestions, type CategoryKey, type PaymentMethodKey } from "@/entities/household";

import { useRecordExpense } from "../api";
import { RECORD_MESSAGES as M } from "../model";
import * as s from "./record.css";
import { SaveResult } from "./SaveResult";

const PAYMENTS: PaymentMethodKey[] = ["card", "cash", "transfer", "other"];

/**
 * 바로 적기(`FE-REQ-057` FR-2 · FR-4) — **금액 먼저**(첫 칸 · 숫자 키패드 · 자동 포커스), 최근 쓴 곳 칩 하나로 가맹점 · 분류가 같이 찬다.
 * 칩 → 금액 → 저장 = 3탭(FEATURE-013 FR-1). 저장에 실패하면 입력값을 그대로 둔다(FR-10).
 */
export const QuickEntryForm = () => {
  const record = useRecordExpense();
  const suggestions = useHouseholdSuggestions();
  const nums = useNumberFields({ amount: "won" });
  const amountText = nums.value("amount");
  const amount = parseAmountInput(amountText);
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState(() => todayInKorea());
  const [payment, setPayment] = useState<PaymentMethodKey>("card");
  const [approx, setApprox] = useState(false);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (amount === null || category === null) return;
    record.mutate(
      {
        amount,
        category,
        spentOn: date,
        paymentMethod: payment,
        ...(merchant.trim() ? { merchant: merchant.trim() } : {}),
        ...(approx ? { precision: "approx", inputKind: "approx" } : { precision: "exact", inputKind: "quick" }),
      },
      {
        onSuccess: () => {
          nums.reset(["amount"]);
          setMerchant("");
          setCategory(null);
          setApprox(false);
        },
      },
    );
  };

  const errorCode = isApiError(record.error) ? record.error.code : null;

  return (
    <form className={s.form} onSubmit={onSubmit} aria-label={M.modes.quick}>
      <TextField
        label={M.amount}
        value={amountText}
        onChange={(v) => nums.change("amount", v)}
        inputMode="numeric"
        autoFocus
        helperText={amount !== null ? formatWon(amount) : M.amountHint}
        error={nums.message("amount")}
      />
      {suggestions.data && suggestions.data.merchants.length > 0 ? (
        <div>
          <span className={s.label}>{M.recent}</span>
          <div className={s.chips}>
            {suggestions.data.merchants.map((m) => (
              <Chip
                key={m.merchant}
                size="sm"
                selected={merchant === m.merchant}
                onPress={() => {
                  setMerchant(m.merchant);
                  setCategory(m.category);
                }}
              >
                {m.merchant}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}
      <div>
        <span className={s.label}>{M.category}</span>
        <CategoryChips value={category} onChange={setCategory} />
      </div>
      <TextField label={M.merchant} value={merchant} onChange={setMerchant} maxLength={40} />
      <TextField label={M.date} type="date" value={date} onChange={setDate} />
      <SegmentedControl
        label={M.payment}
        value={payment}
        onChange={setPayment}
        options={PAYMENTS.map((p) => ({ value: p, label: M.payments[p] }))}
      />
      <Checkbox checked={approx} onChange={setApprox} label={M.approx} />
      {approx ? <span className={s.hint}>{M.approxHint}</span> : null}
      <span className={s.hint} role="status">
        {record.isError ? labelOr(M.errorCode, errorCode, M.failed) : category === null && amount !== null ? M.pickCategory : ""}
      </span>
      <Button type="submit" disabled={amount === null || category === null || record.isPending} loading={record.isPending}>
        {M.submit}
      </Button>
      {record.data && record.isSuccess ? <SaveResult result={record.data} /> : null}
    </form>
  );
};
