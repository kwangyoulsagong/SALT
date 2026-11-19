"use client";

import { Button } from "@repo/ui/button";

import { isApiError } from "@repo/web-shared/api";

import type { CalendarDay } from "@/entities/household";

import { useMarkNoSpend } from "../api";
import { MARK_MESSAGES as M } from "../model";
import * as s from "./mark.css";

/**
 * 고른 날 "안 쓴 날" 표시 · 지우기(`FE-REQ-057` FR-9 → `FE-REQ-060` FR-4 — 달력 칸 누름이 "그날 고르기"가 되며 표시는 고른 날 칸으로 옮겼다).
 * 누를 수 있나는 서버(`markable` · 이미 붙은 no_spend 는 지우기). 연속 일수 · 칭찬 0, 실패는 한 줄(팝업 0)
 */
export const MarkNoSpendButton = ({ ym, day }: { ym: string; day: CalendarDay }) => {
  const mark = useMarkNoSpend(ym);
  const on = day.state !== "no_spend";
  if (!day.markable && on) return null;
  const code = isApiError(mark.error) ? mark.error.code : null;
  return (
    <div className={s.wrap}>
      <Button type="button" variant="secondary" size="sm" disabled={mark.isPending} onClick={() => mark.mutate({ date: day.date, on })}>
        {on ? M.mark : M.unmark}
      </Button>
      <p className={s.note} role="status">
        {mark.isError ? (code === "STICKER_DAY_HAS_EXPENSE" ? M.hasExpense : M.failed) : ""}
      </p>
    </div>
  );
};
