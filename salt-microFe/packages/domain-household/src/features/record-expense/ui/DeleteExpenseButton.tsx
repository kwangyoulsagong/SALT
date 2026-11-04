"use client";

import { CATEGORY_LABEL, type HouseholdExpense } from "@/entities/expense";

import { useDeleteExpense } from "../api";
import { RECORD_MESSAGES as M } from "../model";
import * as s from "./record.css";

/** 쓴 내역 줄 끝의 지우기 — 확인 팝업 없이(되돌리기는 다시 적기). 실패하면 줄이 그대로 남는다 */
export const DeleteExpenseButton = ({ expense }: { expense: HouseholdExpense }) => {
  const remove = useDeleteExpense();
  return (
    <button
      type="button"
      className={s.deleteButton}
      onClick={() => remove.mutate(expense.id)}
      disabled={remove.isPending}
      aria-label={M.deleteLabel(expense.merchant ?? CATEGORY_LABEL[expense.category])}
    >
      ×
    </button>
  );
};
