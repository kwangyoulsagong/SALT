import type { CoachMode } from "../model";
import {
  isKrBacktestEligible,
  krBacktestOffsetDays,
  KR_BACKTEST_BREAK_BOUNDS,
  KR_BACKTEST_INDICATOR_WINDOW,
  KR_BACKTEST_MIN_MONTHS,
  KR_BACKTEST_START,
  type KrBacktestBar,
  type KrBacktestSample,
} from "./krJudgmentBacktest";
import { scoreModeDecision } from "./modeDecision";
import { judgeOutcome, MIN_JUDGMENT_SAMPLE, type JudgmentTrackStats, type SampleOrigin } from "./symbolJudgment";

/**
 * 종목 판단 과거 검산 — 사전등록 `signal-skill@1`(`salt-server/preregistration/2026-11-10-signal-skill.toml`, F017 v2 단계 1b ·
 * `FC-REQ-028` FR-5 · `ADR-010` v2). 3종(근거 · 성적 · 빗나간 사례)이 늘 다 있어야 해서, 라이브 표본이 모자란 판단 유형을
 * 같은 규칙(`scoreModeDecision`)으로 과거에 되돌려 채점한다. 국내 장기는 `kr-judgment-backtest@2` 그대로(라벨만 `backtest_full`).
 *
 * 순수 계산이다 — 일봉 · RSI 함수를 받는다(RSI 는 `market` 지표 계산을 조립 지점이 넣는다).
 */

export const SIGNAL_SKILL_KEY = "signal-skill@1";

/** 3종 채움에 세는 과거 검산 라벨(등록 [display].labels) — `backtest_seen` · 옛 `backtest` 는 세지 않는다 */
export const BACKTEST_DISPLAY_ORIGINS: readonly SampleOrigin[] = ["backtest_full", "backtest_price_only"];

/** 업비트 본 기간 끝 — `mode-decision@2` 를 rule-ic@1(~2026-09-27) 결과로 골랐다(등록 [seen]). 이 전 판단은 `backtest_seen` */
export const UPBIT_SEEN_BEFORE = new Date("2026-09-29T00:00:00Z");
/** 업비트 대상 — 그 날까지 일봉 수(rule-ic@1 의 '상장 60일') */
export const UPBIT_MIN_BARS = 60;
/** 국내 단타 라이브 시작(`SRV-REQ-040` FR-63) — 과거 검산은 만기가 이 전인 판단만 */
export const KR_SCALP_LIVE_START = new Date("2026-11-11T00:00:00+09:00");
/** 국내 단타 판단 간격(거래일, 등록 [schedule].kr_scalp — 행 수 예산) */
export const KR_SCALP_SPACING_SESSIONS = 10;
/** 3종 채움 — 판단 날(KST) 하한(등록 [display].min) */
export const BACKTEST_MIN_JUDGED_DAYS = 10;

const DAY_MS = 24 * 3600_000;
const LONG_SPACING_DAYS = 30;
const KR_CLOSE_CONFIRMED_MS = 16 * 3600_000;
const CRYPTO_COST = 0.001;

export type BacktestMarket = "upbit_krw" | "kr_stock";
export type BacktestLabel = "backtest_full" | "backtest_price_only" | "backtest_seen";

export interface JudgmentBacktestSample extends KrBacktestSample {
  mode: CoachMode;
  market: BacktestMarket;
  label: BacktestLabel;
}

export interface JudgmentBacktestResult {
  samples: JudgmentBacktestSample[];
  droppedBreaks: number;
  droppedNoExit: number;
}

/** 칸마다 라벨(등록 [[cell]]) — 본 기간이면 `backtest_seen` */
export const backtestLabelOf = (market: BacktestMarket, mode: CoachMode): Exclude<BacktestLabel, "backtest_seen"> =>
  mode === "long_term" ? "backtest_full" : "backtest_price_only";

/**
 * 과거 검산 성적을 3종 채움에 쓸 수 있나(`judgmentTriadSource` 의 `backtestUsable`). 국내 장기는 `kr-judgment-backtest@2`
 * [display](판단 달 ≥ 12), 나머지는 `signal-skill@1` [display](판단 날 ≥ 10). 표본 ≥ 20 · 빗나간 사례 ≥ 1 은 `triadComplete` 가 본다
 */
export const backtestUsable = (
  signalType: string,
  stats: Pick<JudgmentTrackStats, "judgedMonths" | "judgedDays"> | null
): boolean => {
  if (stats === null) return false;
  if (signalType.startsWith("kr_stock.long_term.")) return (stats.judgedMonths ?? 0) >= KR_BACKTEST_MIN_MONTHS;
  return (stats.judgedDays ?? 0) >= BACKTEST_MIN_JUDGED_DAYS;
};

/** 표본 수 하한 — `triadComplete` 와 같은 값(리포트 화면 열) */
export const BACKTEST_MIN_SAMPLE = MIN_JUDGMENT_SAMPLE;

const dayIndex = (at: Date): number => Math.floor(at.getTime() / DAY_MS);

/**
 * 업비트 한 종목. `bars` 는 오래된 것이 앞, `at` = 봉 시작(00:00 UTC) · 마감 = `at + 24h`(판단 시각).
 * 단타 = 마감마다 · 다음 봉 종가로 채점. 장기 = `UPBIT_SEEN_BEFORE + 해시 % 30` 일을 기준으로 30일 격자 · 30일 뒤 첫 종가.
 * 만기 종가가 `until` 이후면 표본이 아니다(아직 모름). 본 기간 판단은 `backtest_seen` 으로 내준다 — 저장 · 화면은 부르는 쪽이 거른다
 */
export const backtestUpbitSymbol = (input: {
  symbol: string;
  mode: CoachMode;
  bars: readonly KrBacktestBar[];
  until: Date;
  rsiOf: (closes: number[]) => number | null;
}): JudgmentBacktestResult => {
  const { symbol, mode, bars, until, rsiOf } = input;
  const result: JudgmentBacktestResult = { samples: [], droppedBreaks: 0, droppedNoExit: 0 };
  const closeAt = (i: number): number => bars[i].at.getTime() + DAY_MS;
  const anchor = dayIndex(UPBIT_SEEN_BEFORE) + krBacktestOffsetDays(symbol);
  let exitCursor = 1;

  for (let i = 1; i < bars.length; i += 1) {
    const judgedAt = new Date(closeAt(i));
    if (judgedAt.getTime() > until.getTime()) break;
    if (i + 1 < UPBIT_MIN_BARS) continue;
    if (mode === "long_term") {
      const offset = (((dayIndex(judgedAt) - anchor) % LONG_SPACING_DAYS) + LONG_SPACING_DAYS) % LONG_SPACING_DAYS;
      if (offset !== 0) continue;
    }

    let rsi: number | undefined;
    if (mode === "long_term") {
      const window = bars.slice(Math.max(0, i - KR_BACKTEST_INDICATOR_WINDOW + 1), i + 1).map((bar) => bar.close);
      const value = rsiOf(window);
      if (value === null) continue;
      rsi = value;
    }

    // 만기 봉 — 단타는 바로 다음 봉(24시간 뒤 마감), 장기는 30일 뒤 이후 첫 마감
    let exit = -1;
    if (mode === "scalp") {
      if (i + 1 < bars.length && bars[i + 1].at.getTime() === bars[i].at.getTime() + DAY_MS) exit = i + 1;
    } else {
      const target = judgedAt.getTime() + LONG_SPACING_DAYS * DAY_MS;
      exitCursor = Math.max(exitCursor, i + 1);
      while (exitCursor < bars.length && closeAt(exitCursor) < target) exitCursor += 1;
      if (exitCursor < bars.length) exit = exitCursor;
    }
    if (exit < 0 || closeAt(exit) > until.getTime()) {
      result.droppedNoExit += 1;
      continue;
    }

    const { decision } = scoreModeDecision({
      mode,
      symbol,
      change24h: (bars[i].close / bars[i - 1].close - 1) * 100,
      // 단타 심리 · 1시간 RSI 는 과거가 없다 — 기여 0(등록 [[cell]] omitted)
      rsi,
      whaleBuy: 0,
      whaleSell: 0,
      hasHolding: false,
      missingData: [],
    });
    const returnRate = bars[exit].close / bars[i].close - 1;
    result.samples.push({
      symbol,
      mode,
      market: "upbit_krw",
      label: judgedAt < UPBIT_SEEN_BEFORE ? "backtest_seen" : backtestLabelOf("upbit_krw", mode),
      judgedAt,
      action: decision.action,
      score: decision.score,
      reasons: decision.reasons,
      entryPrice: bars[i].close,
      exitPrice: bars[exit].close,
      returnRate,
      outcome: judgeOutcome(mode, decision.action, returnRate, CRYPTO_COST),
      cost: CRYPTO_COST,
      evaluatedAt: new Date(closeAt(exit)),
    });
  }
  return result;
};

const breaksWithin = (bars: readonly KrBacktestBar[], from: number, to: number): boolean => {
  for (let k = Math.max(1, from); k <= to; k += 1) {
    const ratio = bars[k].close / bars[k - 1].close;
    if (!(ratio >= KR_BACKTEST_BREAK_BOUNDS.min && ratio <= KR_BACKTEST_BREAK_BOUNDS.max)) return true;
  }
  return false;
};

/**
 * 국내 단타 한 종목. 판단 = 2022-01-01 뒤 첫 거래일부터 해시 % 10 번째 거래일, 10 거래일 격자 · 그날 16:00 KST · 그날 종가.
 * 만기 = 시장 다음 거래일 종가(그 종목 봉이 그날 없으면 제외). 만기 확정이 `KR_SCALP_LIVE_START` 이후면 표본이 아니다
 */
export const backtestKrScalpSymbol = (input: {
  symbol: string;
  bars: readonly KrBacktestBar[];
  /** 시장 거래일(`price_history` kr_stock 1d 의 서로 다른 시각, 오래된 것이 앞) */
  sessions: readonly Date[];
  sessionIndex: ReadonlyMap<number, number>;
  costAt: (soldAt: Date) => number;
}): JudgmentBacktestResult => {
  const { symbol, bars, sessions, sessionIndex, costAt } = input;
  const result: JudgmentBacktestResult = { samples: [], droppedBreaks: 0, droppedNoExit: 0 };
  const first = sessions.findIndex((at) => at.getTime() + KR_CLOSE_CONFIRMED_MS >= KR_BACKTEST_START.getTime());
  if (first < 0) return result;
  const offset = krBacktestOffsetDays(symbol) % KR_SCALP_SPACING_SESSIONS;

  for (let i = 1; i < bars.length; i += 1) {
    const position = sessionIndex.get(bars[i].at.getTime());
    if (position === undefined || position < first) continue;
    if ((position - first) % KR_SCALP_SPACING_SESSIONS !== offset) continue;
    const next = sessions[position + 1];
    if (next === undefined || next.getTime() + KR_CLOSE_CONFIRMED_MS >= KR_SCALP_LIVE_START.getTime()) break;
    if (!isKrBacktestEligible(bars, i, sessionIndex)) continue;

    if (i + 1 >= bars.length || bars[i + 1].at.getTime() !== next.getTime()) {
      result.droppedNoExit += 1;
      continue;
    }
    if (breaksWithin(bars, i, i + 1)) {
      result.droppedBreaks += 1;
      continue;
    }

    const judgedAt = new Date(bars[i].at.getTime() + KR_CLOSE_CONFIRMED_MS);
    const evaluatedAt = new Date(next.getTime() + KR_CLOSE_CONFIRMED_MS);
    const { decision } = scoreModeDecision({
      mode: "scalp",
      symbol,
      change24h: (bars[i].close / bars[i - 1].close - 1) * 100,
      whaleBuy: 0,
      whaleSell: 0,
      hasHolding: false,
      missingData: [],
    });
    const returnRate = bars[i + 1].close / bars[i].close - 1;
    const cost = costAt(evaluatedAt);
    result.samples.push({
      symbol,
      mode: "scalp",
      market: "kr_stock",
      label: backtestLabelOf("kr_stock", "scalp"),
      judgedAt,
      action: decision.action,
      score: decision.score,
      reasons: decision.reasons,
      entryPrice: bars[i].close,
      exitPrice: bars[i + 1].close,
      returnRate,
      outcome: judgeOutcome("scalp", decision.action, returnRate, cost),
      cost,
      evaluatedAt,
    });
  }
  return result;
};

/**
 * spread = 후보 평균 (r − 비용) − 피하기 평균 r(등록 [report].spread). 한쪽 행동이 없으면 `null`
 */
export const backtestSpread = (samples: readonly KrBacktestSample[]): number | null => {
  const candidates = samples.filter((s) => s.action === "review_accumulation" || s.action === "review_short_opportunity");
  const avoids = samples.filter((s) => s.action === "avoid");
  if (candidates.length === 0 || avoids.length === 0) return null;
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return mean(candidates.map((s) => s.returnRate - s.cost)) - mean(avoids.map((s) => s.returnRate));
};
