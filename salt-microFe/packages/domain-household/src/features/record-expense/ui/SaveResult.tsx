"use client";

import { GoalClockLine, envelopeLabel, formatWon, useGoalClockRetry, type RecordResult } from "@/entities/expense";

import { RECORD_MESSAGES as M } from "../model";
import * as s from "./record.css";

/**
 * 저장 뒤 한 덩어리(FEATURE-013 UX Success) — 봉투 잔액 한 줄 + 목표 시계 한 줄. 목표 시계가 `pending` 이면 한 번 더 묻는다("계산 중" → 결과).
 * 넘친 봉투도 같은 문장 · 같은 색(음수 숫자만).
 */
export const SaveResult = ({ result }: { result: RecordResult }) => {
  const retry = useGoalClockRetry(result.goalClock.state === "pending" ? result.savedTotal : null);
  const clock = result.goalClock.state === "pending" && retry.data ? retry.data : result.goalClock;
  return (
    <div className={s.result} role="status">
      <span className={s.value}>{M.saved}</span>
      {result.envelope ? <span className={s.hint}>{M.envelopeAfter(envelopeLabel(result.envelope.key), formatWon(result.envelope.remaining))}</span> : null}
      <GoalClockLine clock={clock} />
    </div>
  );
};
