"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@repo/ui/button";
import { TextField } from "@repo/ui/textField";

import { AMOUNT_INPUT_MESSAGES } from "@repo/web-shared/i18n";
import { isApiError } from "@repo/web-shared/api";
import { parseAmountInput, labelOr, useAmountInputGuard } from "@repo/web-shared/lib";

import { type SavingsItemUnit } from "@/entities/goal";

import { useAddItemUnit, useDeleteItemUnit } from "../api";
import { ITEM_UNIT_MESSAGES as M } from "../model";
import * as s from "./itemUnit.css";

/** 실물 단위(`FE-REQ-056` FR-9) — 만들기 · 지우기. 개수는 서버가 센 값(`count`)을 그대로 */
export const ItemUnitEditor = ({ goalId, units, limit }: { goalId: string; units: SavingsItemUnit[]; limit: number }) => {
  const add = useAddItemUnit(goalId);
  const remove = useDeleteItemUnit(goalId);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const guard = useAmountInputGuard();
  const unitPrice = parseAmountInput(price);
  // 상한은 서버 값(`unitLimit`) — 넘치면 서버가 409 로도 막는다
  const full = units.length >= limit;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (unitPrice === null || name.trim() === "") return;
    remove.reset();
    add.mutate({ name: name.trim(), unitPrice }, { onSuccess: () => { setName(""); setPrice(""); } });
  };

  // 마지막으로 누른 쪽 오류만 — 다른 쪽을 누르면 그 전 오류는 지운다(코드 리뷰 2026-11-03)
  const error = add.error ?? remove.error;
  const code = isApiError(error) ? error.code : null;

  return (
    <form className={s.form} onSubmit={onSubmit} aria-label={M.title}>
      <span className={s.label}>{M.description}</span>
      {units.length === 0 ? (
        <span className={s.label}>{M.empty}</span>
      ) : (
        <ul className={s.list}>
          {units.map((u) => (
            <li key={u.id} className={s.row}>
              <span className={s.value}>{M.line(u.name, u.count)}</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => { add.reset(); remove.mutate(u.id); }} disabled={remove.isPending} aria-label={M.remove(u.name)}>
                {M.removeMark}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {full ? null : (
        <>
          <TextField label={M.name} value={name} onChange={setName} maxLength={30} placeholder={M.namePlaceholder} />
          <TextField label={M.price} value={price} onChange={(v) => guard.take(v, setPrice)} inputMode="numeric" />
        </>
      )}
      <span className={s.label} role="status">
        {guard.rejected ? AMOUNT_INPUT_MESSAGES.numbersOnly : error ? labelOr(M.errorCode, code, M.failed) : ""}
      </span>
      {full ? null : (
        <Button type="submit" disabled={unitPrice === null || name.trim() === "" || add.isPending} loading={add.isPending}>
          {M.add}
        </Button>
      )}
    </form>
  );
};
