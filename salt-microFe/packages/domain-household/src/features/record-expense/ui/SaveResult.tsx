"use client";

import { GoalClockLine, formatWon, formatWorkMinutes, useCategoryLabel, useGoalClockRetry, type RecordResult } from "@/entities/household";

import { RECORD_MESSAGES as M } from "../model";
import * as s from "./record.css";

/**
 * 저장 뒤 한 덩어리(FEATURE-013 UX Success) — 봉투 잔액 한 줄 + 목표 시계 한 줄. 목표 시계가 `pending` 이면 한 번 더 묻는다("계산 중" → 결과).
 * 넘친 봉투도 같은 문장 · 같은 색(음수 숫자만).
 */
export const SaveResult = ({ result }: { result: RecordResult }) => {
  const label = useCategoryLabel();
  const retry = useGoalClockRetry(result.goalClock.state === "pending" ? result.savedTotal : null);
  // 다시 물어도 못 받으면 "계산 중"에 멈추지 않고 줄을 지운다(리뷰 2026-11-04) — 저장은 이미 끝났다
  const clock = result.goalClock.state !== "pending" ? result.goalClock : retry.data ?? (retry.isError ? null : result.goalClock);
  return (
    <div className={s.result} role="status">
      <span className={s.value}>{M.saved}</span>
      {result.envelope ? <span className={s.hint}>{M.envelopeAfter(label.envelope(result.envelope.key), formatWon(result.envelope.remaining))}</span> : null}
      {result.savedWorkMinutes !== null ? <span className={s.hint}>{M.workAfter(formatWorkMinutes(result.savedWorkMinutes))}</span> : null}
      {clock ? <GoalClockLine clock={clock} /> : null}
    </div>
  );
};
