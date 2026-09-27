/**
 * 시간대 · 요일 기대값 — FEATURE-009 FR-22 (`SRV-REQ-038` FR-12b).
 *
 * 청산 성과를 **진입 시각**(결과의 `openedAt` — 가장 이른 매수 조각)으로 묶는다. 매매 결정을 한 때가 진입이다.
 *
 * ## 시각을 모르는 거래
 *
 * 거래 폼은 지난 날을 **한국 0시 정각**으로 보낸다(날짜만 안다). 오늘 거래는 서버가 지금 시각을 쓴다.
 * 그래서 KST 00:00:00.000 정각인 진입은 "시각 없음"으로 보고 **시간대 묶음에서 뺀다**. 요일은 날짜만으로 알 수 있어
 * 모든 청산을 센다. 시각이 있는 청산이 하나도 없으면 시간대 묶음은 `null`(섹션 없음)이다.
 */

import Decimal from "decimal.js";

import type { DecisionOutcome } from "./decisionOutcome";
import { MIRROR_MIN_SAMPLE, type MirrorStatus } from "./mirror";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const ZERO = new Decimal(0);

/** KST 시각 구간 — [시작, 끝) 시 */
export const TIME_BANDS = [
  { key: "dawn", from: 0, to: 6 },
  { key: "morning", from: 6, to: 12 },
  { key: "afternoon", from: 12, to: 18 },
  { key: "evening", from: 18, to: 24 },
] as const;
export type TimeBand = (typeof TIME_BANDS)[number]["key"];

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface TimingBucket<K extends string> {
  key: K;
  count: number;
  /** 이익 청산 비율 */
  winRate: Decimal | null;
  /** 평균 순수익률(수수료 후) */
  avgReturn: Decimal | null;
  netPnlKrw: Decimal;
  status: MirrorStatus;
}

export interface TradeTimingMirror {
  /** 시각이 있는 청산으로 묶은 시간대. 하나도 없으면 `null` */
  bands: Array<TimingBucket<TimeBand>> | null;
  weekdays: Array<TimingBucket<Weekday>>;
  timedCount: number;
  /** 날짜만 아는 청산(시간대에서 뺐다) */
  untimedCount: number;
}

type TimingOutcome = Pick<DecisionOutcome, "openedAt" | "netPnlKrw" | "netReturn">;

const kstMs = (at: Date): number => at.getTime() + KST_OFFSET_MS;

/** KST 0시 정각이면 사용자가 날짜만 적었다 */
export const hasEnteredTime = (at: Date): boolean => ((kstMs(at) % DAY_MS) + DAY_MS) % DAY_MS !== 0;

export const kstHour = (at: Date): number => new Date(kstMs(at)).getUTCHours();

/** 월 = 0 … 일 = 6 */
export const kstWeekday = (at: Date): Weekday => WEEKDAYS[(new Date(kstMs(at)).getUTCDay() + 6) % 7];

const bandOf = (at: Date): TimeBand => {
  const hour = kstHour(at);
  return TIME_BANDS.find((band) => hour >= band.from && hour < band.to)!.key;
};

const bucket = <K extends string>(key: K, group: TimingOutcome[]): TimingBucket<K> => {
  const count = group.length;
  return {
    key,
    count,
    winRate: count ? new Decimal(group.filter((outcome) => outcome.netPnlKrw.gt(0)).length).div(count) : null,
    avgReturn: count
      ? group.reduce((sum, outcome) => sum.plus(outcome.netReturn), ZERO).div(count)
      : null,
    netPnlKrw: group.reduce((sum, outcome) => sum.plus(outcome.netPnlKrw), ZERO),
    status: count === 0 ? "insufficient_data" : count < MIRROR_MIN_SAMPLE ? "insufficient_sample" : "ok",
  };
};

export const tradeTimingMirror = (outcomes: TimingOutcome[]): TradeTimingMirror => {
  const timed = outcomes.filter((outcome) => hasEnteredTime(outcome.openedAt));
  return {
    bands: timed.length
      ? TIME_BANDS.map((band) =>
          bucket(band.key, timed.filter((outcome) => bandOf(outcome.openedAt) === band.key))
        )
      : null,
    weekdays: WEEKDAYS.map((day) =>
      bucket(day, outcomes.filter((outcome) => kstWeekday(outcome.openedAt) === day))
    ),
    timedCount: timed.length,
    untimedCount: outcomes.length - timed.length,
  };
};
