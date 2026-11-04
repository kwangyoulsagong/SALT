"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@repo/ui/button";
import { SegmentedControl } from "@repo/ui/segmentedControl";
import { TextField } from "@repo/ui/textField";
import { Toggle } from "@repo/ui/toggle";

import { parseAmountInput, useNumberFields } from "@repo/web-shared/lib";

import { CategoryChips, type CategoryKey, type PaymentMethodKey, type RecurringTemplate } from "@/entities/household";

import { useCreateTemplate, useEditTemplate } from "../api";
import { RECURRING_MESSAGES as M } from "../model";
import * as s from "./recurring.css";

const PAYMENTS: PaymentMethodKey[] = ["card", "transfer", "cash", "other"];

/**
 * 반복 템플릿 만들기 · 고치기(`FE-REQ-057` FR-4). 검사는 서버가 한다(이름 길이 · 금액 · 날 1~31) — 화면은 빈칸만 막는다.
 * 저장 실패 시 입력값을 둔다(FR-10). 확인 필요가 기본(켜짐) — 끄면 그날 서버가 알아서 적는다.
 */
export const TemplateEditor = ({ template, onDone }: { template: RecurringTemplate | null; onDone: () => void }) => {
  const create = useCreateTemplate();
  const edit = useEditTemplate();
  const save = template ? edit : create;
  const [name, setName] = useState(template?.name ?? "");
  const [category, setCategory] = useState<CategoryKey | null>(template?.category ?? null);
  const [payment, setPayment] = useState<PaymentMethodKey>(template?.paymentMethod ?? "card");
  const [confirmRequired, setConfirmRequired] = useState(template?.confirmRequired ?? true);
  const nums = useNumberFields(
    { amount: "won", day: "count" },
    template ? { amount: String(template.amount), day: String(template.dayOfMonth) } : {},
  );
  const amount = parseAmountInput(nums.value("amount"));
  const day = parseAmountInput(nums.value("day"));
  const ready = name.trim() !== "" && amount !== null && day !== null && category !== null;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready || category === null || amount === null || day === null) return;
    const body = { name: name.trim(), amount, category, paymentMethod: payment, dayOfMonth: day, confirmRequired };
    if (template) edit.mutate({ id: template.id, body }, { onSuccess: onDone });
    else create.mutate(body, { onSuccess: onDone });
  };

  return (
    <form className={s.form} onSubmit={onSubmit} aria-label={template ? M.edit : M.add}>
      <TextField label={M.name} value={name} onChange={setName} placeholder={M.namePlaceholder} maxLength={40} />
      <TextField label={M.amount} value={nums.value("amount")} onChange={(v) => nums.change("amount", v)} inputMode="numeric" error={nums.message("amount")} />
      <TextField
        label={M.day}
        value={nums.value("day")}
        onChange={(v) => nums.change("day", v)}
        inputMode="numeric"
        error={nums.message("day")}
        helperText={M.dayHint}
      />
      <CategoryChips value={category} onChange={setCategory} />
      <SegmentedControl label={M.payment} value={payment} onChange={setPayment} options={PAYMENTS.map((p) => ({ value: p, label: M.payments[p] }))} />
      <Toggle checked={confirmRequired} onChange={setConfirmRequired} label={M.confirmRequired} />
      <p className={s.note}>{confirmRequired ? "" : M.confirmRequiredHint}</p>
      <span className={s.note} role="status">
        {save.isError ? M.failed : ""}
      </span>
      <div className={s.actions}>
        <Button type="submit" size="sm" disabled={!ready || save.isPending} loading={save.isPending}>
          {template ? M.submitEdit : M.submitCreate}
        </Button>
        <Button type="button" size="sm" variant="weak" onClick={onDone}>
          {M.cancel}
        </Button>
      </div>
    </form>
  );
};
