"use client";

import { INSTALLMENT_MESSAGES as I, formatMonth, formatWon } from "../model/messages";
import type { HouseholdInstallments } from "../model/types";
import { useCategoryLabel } from "./CategoryNames";
import * as s from "./expense.css";

/**
 * 할부 띠(`FE-REQ-057` FR-7 · `SRV-REQ-046` FR-10) — 이 달 청구 줄 + 앞으로 6개월 청구 합. 숫자는 전부 서버 값(회차 · 나눈 금액 · 남은 청구).
 * 경고 색 없이 같은 회색 — 할부는 사실만 보여 준다.
 */
export const InstallmentBand = ({ installments }: { installments: HouseholdInstallments }) => {
  const label = useCategoryLabel();
  return (
    <section className={s.box} aria-label={I.title}>
      <div className={s.row}>
        <h2 className={s.title}>{I.title}</h2>
        {installments.lines.length > 0 ? <span className={s.value}>{I.monthCharge(formatWon(installments.monthCharge))}</span> : null}
      </div>
      {installments.lines.length === 0 ? (
        <p className={s.note}>{I.empty}</p>
      ) : (
        <ul className={s.list}>
          {installments.lines.map((l) => (
            <li key={l.expenseId} className={s.item}>
              <span className={s.itemMain}>
                <span className={s.itemTitle}>{l.merchant ?? label.category(l.category)}</span>
                <span className={s.label}>
                  {I.line(l.index, l.months)} · {I.original(formatWon(l.amount))}
                </span>
              </span>
              <span className={s.itemMain}>
                <span className={s.value}>{formatWon(l.charge)}</span>
                <span className={s.label}>{I.remaining(formatWon(l.remainingAfter), formatMonth(l.lastMonth))}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {installments.upcoming.some((u) => u.amount > 0) ? (
        <>
          <span className={s.label}>{I.upcoming}</span>
          <ul className={s.list}>
            {installments.upcoming.map((u) => (
              <li key={u.month} className={s.row}>
                <span className={s.label}>{formatMonth(u.month)}</span>
                <span className={s.value}>{formatWon(u.amount)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <p className={s.note}>{I.note}</p>
    </section>
  );
};
