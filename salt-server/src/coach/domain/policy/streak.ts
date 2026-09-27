/**
 * 연승 · 연패 상태 — FEATURE-009 FR-20 (`SRV-REQ-038` FR-14a).
 *
 * 최근 청산이 몇 건 연속 이익(또는 손실)인지 **정보로만** 낸다. 순손익 0 인 청산은 어느 쪽도 아니라 연속을 끊는다.
 *
 * ## "연승 뒤 사이즈가 커지는 패턴"은 관찰될 때만
 *
 * 매수 한 건마다 그 시점의 연속 상태(그 매수 **전에** 닫힌 청산만)를 보고, 연승 `STREAK_MIN_LENGTH` 건 이상 뒤의 매수
 * 금액 평균 ÷ 그 밖의 매수 금액 평균을 잰다(연패도 같다). 비율이 `STREAK_SIZE_UP_RATIO` 이상이고 연속 뒤 매수가
 * 표본 기준(20) 이상일 때만 `observed: true` 다 — 화면은 이때만 문장을 보인다. 표본이 모자라도 값은 준다(미러 규칙).
 *
 * 매수 금액은 수수료 제외 원(`totalAmount`)이다. 자본이 커져 금액이 는 것과 가르지 않는다 — 한계는 응답 `basis` 로 밝힌다.
 */

import Decimal from "decimal.js";

import type { DecisionOutcome } from "./decisionOutcome";
import { mirrorMetric, type MirrorMetric } from "./mirror";
import type { CoachLedgerEntry } from "../model";

/** 연속으로 치는 최소 건수 */
export const STREAK_MIN_LENGTH = 3;
/** 연속 뒤 매수 금액이 평소의 이 배 이상이면 "커진다"로 본다 */
export const STREAK_SIZE_UP_RATIO = new Decimal("1.2");

export type StreakKind = "win" | "loss";

export interface StreakRun {
  kind: StreakKind;
  length: number;
}

export interface StreakSizing {
  /** 연속 뒤 매수 평균 ÷ 그 밖의 매수 평균. 표본 = 연속 뒤 매수 수 */
  ratio: MirrorMetric;
  /** 비율 ≥ 1.2 이고 표본 ≥ 20 */
  observed: boolean;
}

export interface StreakMirror {
  /** 지금 이어지는 연속. 마지막 청산이 0 이거나 청산이 없으면 `null` */
  current: StreakRun | null;
  longestWin: number;
  longestLoss: number;
  /** 청산 수(0 포함) */
  sampleSize: number;
  /** 거래 원장이 잘려(5,000건 초과) 매수 금액을 못 가르면 `null` */
  afterWins: StreakSizing | null;
  afterLosses: StreakSizing | null;
  minLength: number;
}

type StreakOutcome = Pick<DecisionOutcome, "closedAt" | "closingTransactionId" | "netPnlKrw">;

const kindOf = (outcome: StreakOutcome): StreakKind | null =>
  outcome.netPnlKrw.gt(0) ? "win" : outcome.netPnlKrw.lt(0) ? "loss" : null;

const byClose = (a: StreakOutcome, b: StreakOutcome): number =>
  a.closedAt.getTime() - b.closedAt.getTime() || a.closingTransactionId.localeCompare(b.closingTransactionId);

const extend = (run: StreakRun | null, kind: StreakKind | null): StreakRun | null =>
  kind === null ? null : run?.kind === kind ? { kind, length: run.length + 1 } : { kind, length: 1 };

const average = (values: Decimal[]): Decimal | null =>
  values.length ? values.reduce((sum, value) => sum.plus(value), new Decimal(0)).div(values.length) : null;

const sizing = (after: Decimal[], others: Decimal[]): StreakSizing => {
  const afterAvg = average(after);
  const othersAvg = average(others);
  const ratio = afterAvg && othersAvg?.gt(0) ? afterAvg.div(othersAvg) : null;
  const metric = mirrorMetric(ratio, after.length);
  return {
    ratio: metric,
    observed: metric.status === "ok" && ratio !== null && ratio.gte(STREAK_SIZE_UP_RATIO),
  };
};

/**
 * @param outcomes 실현된 청산(live)
 * @param buys 매수 기록. `null` 이면 사이즈 비교를 하지 않는다(원장이 잘렸다)
 */
export const streakMirror = (
  outcomes: StreakOutcome[],
  buys: Array<Pick<CoachLedgerEntry, "side" | "totalAmount" | "transactionDate">> | null
): StreakMirror => {
  const sorted = [...outcomes].sort(byClose);

  let run: StreakRun | null = null;
  let longestWin = 0;
  let longestLoss = 0;
  for (const outcome of sorted) {
    run = extend(run, kindOf(outcome));
    if (run?.kind === "win") longestWin = Math.max(longestWin, run.length);
    if (run?.kind === "loss") longestLoss = Math.max(longestLoss, run.length);
  }

  let afterWins: StreakSizing | null = null;
  let afterLosses: StreakSizing | null = null;
  if (buys) {
    const groups = { win: [] as Decimal[], loss: [] as Decimal[], none: [] as Decimal[] };
    const sortedBuys = buys
      .filter((entry) => entry.side === "buy")
      .sort((a, b) => a.transactionDate.getTime() - b.transactionDate.getTime());
    let index = 0;
    let state: StreakRun | null = null;
    for (const buy of sortedBuys) {
      // 이 매수 **전에** 닫힌 청산까지만 상태에 넣는다
      while (index < sorted.length && sorted[index].closedAt < buy.transactionDate) {
        state = extend(state, kindOf(sorted[index]));
        index += 1;
      }
      const key = state && state.length >= STREAK_MIN_LENGTH ? state.kind : "none";
      groups[key].push(new Decimal(buy.totalAmount));
    }
    afterWins = sizing(groups.win, [...groups.none, ...groups.loss]);
    afterLosses = sizing(groups.loss, [...groups.none, ...groups.win]);
  }

  return {
    current: run,
    longestWin,
    longestLoss,
    sampleSize: sorted.length,
    afterWins,
    afterLosses,
    minLength: STREAK_MIN_LENGTH,
  };
};
