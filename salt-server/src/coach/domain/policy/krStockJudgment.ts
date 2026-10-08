import { DomainError, ErrorKind, KstDate } from "../../../shared/domain";
import type { StaleInput } from "./inputFreshness";
import { JUDGMENT_HORIZON_MS } from "./symbolJudgment";

/**
 * 국내 주식 종목 판단 규칙(F011 슬라이스 4 · FR-62 · 64 · 66).
 *
 * 점수 규칙은 코인과 같다(`mode-decision@2` 장기 — 전일 대비 변동률 + 일봉 RSI). 다른 것은 **시장이 닫힌다**는 것 하나고,
 * 그 차이가 세 곳에 나온다: 판단을 여는 조건(이력), 재료가 오래됐다고 볼 기준(거래일), 채점 종가(휴장이면 직전 거래일).
 *
 * 휴장일 달력은 **미래를 모른다**(`SRV-REQ-040` FR-14 — 이 앱 키로 휴장일 조회가 거부된다). 그래서 여기 기준은 평일이고,
 * 평일 휴장 하루는 허용 폭 안에 들어간다.
 */

/**
 * 국내 주식 판단을 볼 수 없다 — 404. 시세 경로와 같은 규칙(재배포 약관 확인 전 소유자 전용, F011 §정책): 비소유자에겐
 * 국내 주식 종목이 있다는 사실 자체를 주지 않는다
 */
export class KrStockJudgmentNotAvailableError extends DomainError {
  constructor() {
    super("COACH_KR_STOCK_NOT_AVAILABLE", ErrorKind.NotFound, "Kr stock judgment not available");
  }
}

const HOUR_MS = 3600_000;
const DAY_MS = 24 * HOUR_MS;

/** 일봉이 이만큼 있어야 판단한다 — 장기 판단이 읽는 일봉 지표(MA50 · RSI14)와 120 거래일 분포가 성립하는 길이 */
export const KR_MIN_DAILY_BARS = 120;

/** 정규장 종가가 확정되는 시각(KST). 일봉 확정 작업이 15:45 에 돈다 — 그 뒤 15분 여유 */
const KR_CLOSE_CONFIRMED_HOUR_KST = 16;

/** 재료가 이 거래일 수보다 많이 밀렸으면 오래됐다(FR-66 "1 거래일 넘게") */
const KR_STALE_AFTER_TRADING_DAYS = 1;

/** 채점 종가를 찾는 창 — 만기일 앞으로 이 날수 안에 거래일 봉이 없으면 기다린다(추석 · 설 연휴 최장 5~6일) */
const KR_EXIT_LOOKBACK_DAYS = 10;

/** 만기일이 평일인데 그날 봉이 없을 때 휴장으로 받아들이기까지 기다리는 시간 — 일봉 동기화가 빈 날을 다시 받는다 */
const KR_EXIT_HOLIDAY_GRACE_MS = 3 * DAY_MS;

export interface KrJudgmentHistory {
  ready: boolean;
  dailyBars: number;
  requiredDailyBars: number;
  /** 장기 판단이 읽는 일봉 지표가 있는가 */
  dailyIndicator: boolean;
}

/** 이 종목을 판단할 이력이 있는가(FR-62 ① ②). ③ 표본 20 은 성적표 게이트(`insufficient_sample`)가 판단 유형별로 본다 */
export const krJudgmentHistory = (input: { dailyBars: number; dailyIndicator: boolean }): KrJudgmentHistory => ({
  ready: input.dailyBars >= KR_MIN_DAILY_BARS && input.dailyIndicator,
  dailyBars: input.dailyBars,
  requiredDailyBars: KR_MIN_DAILY_BARS,
  dailyIndicator: input.dailyIndicator,
});

const isWeekend = (date: KstDate): boolean => {
  const day = new Date(`${date.toString()}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
};

const addDays = (date: KstDate, days: number): KstDate =>
  KstDate.fromInstant(new Date(date.startOfDayUtc().getTime() + days * DAY_MS));

const kstHour = (now: Date): number => new Date(now.getTime() + 9 * HOUR_MS).getUTCHours();

/** 종가가 확정된 마지막 평일(KST). 평일 16시 전이면 전 평일 */
export const krLatestClosedSession = (now: Date): KstDate => {
  let date = KstDate.fromInstant(now);
  if (isWeekend(date) || kstHour(now) < KR_CLOSE_CONFIRMED_HOUR_KST) date = addDays(date, -1);
  while (isWeekend(date)) date = addDays(date, -1);
  return date;
};

/** `(from, to]` 의 평일 수. `from` 이 `to` 와 같거나 뒤면 0 */
export const weekdaysBetween = (from: KstDate, to: KstDate): number => {
  let count = 0;
  for (let date = addDays(from, 1); date.daysUntil(to) >= 0; date = addDays(date, 1)) {
    if (!isWeekend(date)) count += 1;
  }
  return count;
};

const behindSessions = (at: Date | null, latest: KstDate): boolean =>
  at !== null && weekdaysBetween(KstDate.fromInstant(at), latest) > KR_STALE_AFTER_TRADING_DAYS;

/**
 * 국내 주식 판단 재료 중 1 거래일 넘게 밀린 것(FR-66). 코인의 30분 · 사흘 기준(`staleJudgmentInputs`)을 쓰면
 * 장이 닫힌 저녁 · 주말마다 판단이 막힌다 — 시장이 쉬는 것과 수집이 멈춘 것을 구분하려면 거래일로 센다.
 * 지표 시각은 일봉 시각(거래일 00:00 KST)이다. 시각을 모르면 오래됐다고 하지 않는다(코인과 같다)
 */
export const staleKrJudgmentInputs = (input: {
  priceUpdatedAt: Date | null;
  dailyIndicatorAt: Date | null;
  now: Date;
}): StaleInput[] => {
  const latest = krLatestClosedSession(input.now);
  const stale: StaleInput[] = [];
  if (behindSessions(input.priceUpdatedAt, latest)) stale.push("price");
  if (behindSessions(input.dailyIndicatorAt, latest)) stale.push("technical_indicator");
  return stale;
};

export interface KrJudgmentExitWindow {
  /** 만기일(KST) 일봉 시각 — 이 시각 **이전 마지막** 일봉의 종가가 판정 가격이다 */
  exitBarAt: Date;
  /** 이 시각보다 오래된 봉은 판정 가격으로 쓰지 않는다(수집이 멈췄던 것) */
  notBefore: Date;
  /** 만기일 종가가 확정되는 시각. 그 전엔 채점하지 않는다 */
  readyAt: Date;
}

/**
 * 장기 판단의 채점 창(FR-64). 만기 = 판단 + 30일(코인과 같은 달력 30일)이고, 그날이 휴장이면 **직전 거래일 종가**다.
 * 코인처럼 "만기 이후 첫 종가"로 하면 금요일 만기가 월요일 종가가 돼 관찰 기간이 표본마다 다르게 늘어난다.
 */
export const krJudgmentExitWindow = (judgedAt: Date): KrJudgmentExitWindow => {
  const maturity = KstDate.fromInstant(new Date(judgedAt.getTime() + JUDGMENT_HORIZON_MS.long_term));
  const exitBarAt = maturity.startOfDayUtc();
  return {
    exitBarAt,
    notBefore: new Date(exitBarAt.getTime() - KR_EXIT_LOOKBACK_DAYS * DAY_MS),
    readyAt: new Date(exitBarAt.getTime() + KR_CLOSE_CONFIRMED_HOUR_KST * HOUR_MS),
  };
};

/**
 * 찾은 봉을 판정 가격으로 받아도 되나. 만기일 이전 마지막 평일의 봉이면 바로(주말 만기는 금요일 봉), 그보다 오래된
 * 봉이면 사흘 기다려도 그 평일 봉이 안 왔을 때만(평일 휴장 — 미래 휴장을 몰라 시간으로 가른다). 수집이 늦은 날을
 * 휴장으로 잘못 채점하면 한 번 매긴 결과는 다시 고치지 않는다 — 그래서 기다린다
 */
export const isKrExitSettled = (window: KrJudgmentExitWindow, barAt: Date, now: Date): boolean => {
  if (now < window.readyAt) return false;
  let expected = KstDate.fromInstant(window.exitBarAt);
  while (isWeekend(expected)) expected = addDays(expected, -1);
  if (barAt.getTime() >= expected.startOfDayUtc().getTime()) return true;
  return now.getTime() >= window.readyAt.getTime() + KR_EXIT_HOLIDAY_GRACE_MS;
};
