import { KstDate } from "../../../shared/domain";
import { scoreModeDecision, type ModeDecisionAction } from "./modeDecision";
import { krJudgmentExitWindow } from "./krStockJudgment";
import { JUDGMENT_HORIZON_MS, judgeOutcome, MIN_JUDGMENT_SAMPLE, type JudgmentOutcome } from "./symbolJudgment";

/**
 * 국내 주식 판단 백테스트 표본 — 사전등록 `kr-judgment-backtest@1`(`salt-server/preregistration/2026-10-26-kr-judgment-backtest.toml`,
 * F011 슬라이스 7b · `SRV-REQ-040` FR-43).
 *
 * 라이브 국내 판단은 종목마다 30일에 1표본이라 근거가 몇 달 비어 있다. 같은 규칙(`scoreModeDecision` — 규칙을 두 곳에
 * 적지 않는다)을 서버 5년 일봉으로 되돌려 채점한다. 결과는 `backtest` 출처로만 저장되고 라이브와 섞이지 않는다.
 *
 * 순수 계산이다 — 일봉 · 거래일 목록 · RSI 함수를 받는다. RSI 는 `market` 의 지표 계산을 조립 지점이 넣는다(컨텍스트 경계).
 */

/** 등록 키. 바꾸면 새 등록 파일이다 */
export const KR_JUDGMENT_BACKTEST_KEY = "kr-judgment-backtest@1";

/** `kr-universe@1` — salt-forecast 2026-10-09 등록과 같은 규칙 */
export const KR_BACKTEST_UNIVERSE = { windowSessions: 20, minTurnoverKrw: 1_000_000_000, minBars: 250 } as const;
/** 라이브 `RefreshTechnicalIndicators` 의 일봉 창 · 지표 최소 봉 */
export const KR_BACKTEST_INDICATOR_WINDOW = 100;
/** 원천 끊김 — 종가 ÷ 전 봉 종가가 이 밖이면 미수정 병합 · 분할(등록 [scoring].breaks) */
export const KR_BACKTEST_BREAK_BOUNDS = { min: 0.69, max: 1.31 } as const;
/** 판단일 창 시작(KST 2022-01-01) */
export const KR_BACKTEST_START = new Date("2022-01-01T00:00:00+09:00");
/** 백테스트 성적을 보이는 판단 달 하한(등록 [display]) — 표본 수만 보면 한두 달 장세가 성적이 된다 */
export const KR_BACKTEST_MIN_MONTHS = 12;

/**
 * 국내 판단 유형의 성적 출처(등록 [display]). 라이브 표본 ≥ 20 이면 라이브, 아니면 백테스트가 표본 ≥ 20 · 판단 달 ≥ 12 일 때만
 * 백테스트. 둘 다 아니면 라이브(→ `insufficient_sample` 로 막힌다). **합산하지 않는다**
 */
export const krTrackOrigin = (
  liveSample: number,
  backtest: { sample: number; judgedMonths?: number } | null
): "live" | "backtest" =>
  liveSample >= MIN_JUDGMENT_SAMPLE ||
  backtest === null ||
  backtest.sample < MIN_JUDGMENT_SAMPLE ||
  (backtest.judgedMonths ?? 0) < KR_BACKTEST_MIN_MONTHS
    ? "live"
    : "backtest";

/** 종가 확정 시각 — 판단 시각 = 그날 16:00 KST */
const CLOSE_CONFIRMED_MS = 16 * 3600_000;
const DAY_MS = 24 * 3600_000;
const SPACING_MS = JUDGMENT_HORIZON_MS.long_term;

/** 일봉 하나 — `at` 은 거래일 00:00 KST(`price_history.timestamp`) */
export interface KrBacktestBar {
  at: Date;
  close: number;
  volume: number | null;
}

export interface KrBacktestSample {
  symbol: string;
  judgedAt: Date;
  action: ModeDecisionAction;
  score: number;
  reasons: string[];
  entryPrice: number;
  exitPrice: number;
  returnRate: number;
  outcome: JudgmentOutcome;
  /** 만기일 종가 확정 시각 — 성적 기간이 실행 시각이 아니라 과거를 말하게(등록 [scoring].evaluated_at) */
  evaluatedAt: Date;
}

export interface KrBacktestSymbolResult {
  samples: KrBacktestSample[];
  /** 끊김이 창에 걸려 뺀 판단 수 */
  droppedBreaks: number;
  /** 만기 종가를 못 찾아 뺀 판단 수 */
  droppedNoExit: number;
}

/** 종목 코드 → 0~29 일 — 모든 종목이 같은 날 판단하지 않게(등록 [schedule].start). FNV-1a */
export const krBacktestOffsetDays = (symbol: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < symbol.length; i += 1) {
    hash ^= symbol.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % 30;
};

/**
 * `kr-universe@1` — `i` 번째 봉 날에 대상인가. 시장 최근 20 거래일(`sessions` 에서 이 날까지) 전부에 봉이 있고,
 * 20일 평균 거래대금(종가 × 거래량) ≥ 10억, 이 날까지 봉 ≥ 250
 */
export const isKrBacktestEligible = (
  bars: readonly KrBacktestBar[],
  i: number,
  sessionIndex: ReadonlyMap<number, number>
): boolean => {
  const { windowSessions, minTurnoverKrw, minBars } = KR_BACKTEST_UNIVERSE;
  if (i + 1 < minBars) return false;
  const position = sessionIndex.get(bars[i].at.getTime());
  if (position === undefined || position + 1 < windowSessions) return false;
  // 봉 20개가 시장 거래일 20개와 하나씩 맞아야 한다 — 끝 봉과 시작 봉의 거래일 위치 차가 19 면 사이도 빈칸이 없다
  const first = sessionIndex.get(bars[i - windowSessions + 1].at.getTime());
  if (first !== position - windowSessions + 1) return false;
  let turnover = 0;
  for (let k = i - windowSessions + 1; k <= i; k += 1) {
    const volume = bars[k].volume;
    if (volume === null) return false;
    turnover += bars[k].close * volume;
  }
  return turnover / windowSessions >= minTurnoverKrw;
};

const hasBreak = (bars: readonly KrBacktestBar[], from: number, to: number): boolean => {
  for (let k = Math.max(1, from); k <= to; k += 1) {
    const ratio = bars[k].close / bars[k - 1].close;
    if (!(ratio >= KR_BACKTEST_BREAK_BOUNDS.min && ratio <= KR_BACKTEST_BREAK_BOUNDS.max)) return true;
  }
  return false;
};

/** `at` 이하 마지막 봉 위치(이분 탐색). 없으면 −1 */
const lastAtOrBefore = (bars: readonly KrBacktestBar[], at: number): number => {
  let lo = 0;
  let hi = bars.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (bars[mid].at.getTime() <= at) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
};

/**
 * 한 종목의 백테스트 표본. `bars` 는 오래된 것이 앞. 판단 간격은 앞 판단 + 30일(라이브 B39) — 끊김 · 만기 없음으로
 * 뺀 판단도 간격은 소비한다(뺀 자리 근처로 판단이 몰리지 않게).
 *
 * `liveStart` 이전에 만기가 끝나는 판단만 — 라이브 표본과 기간이 겹치지 않는다.
 */
export const backtestKrSymbol = (input: {
  symbol: string;
  bars: readonly KrBacktestBar[];
  sessionIndex: ReadonlyMap<number, number>;
  liveStart: Date;
  cost: number;
  rsiOf: (closes: number[]) => number | null;
}): KrBacktestSymbolResult => {
  const { symbol, bars, sessionIndex, liveStart, cost, rsiOf } = input;
  const result: KrBacktestSymbolResult = { samples: [], droppedBreaks: 0, droppedNoExit: 0 };
  let cursor = KR_BACKTEST_START.getTime() + krBacktestOffsetDays(symbol) * DAY_MS;

  for (let i = 1; i < bars.length; i += 1) {
    const judgedAt = new Date(bars[i].at.getTime() + CLOSE_CONFIRMED_MS);
    if (judgedAt.getTime() + SPACING_MS >= liveStart.getTime()) break;
    if (bars[i].at.getTime() < cursor) continue;
    if (!isKrBacktestEligible(bars, i, sessionIndex)) continue;

    const window = bars.slice(Math.max(0, i - KR_BACKTEST_INDICATOR_WINDOW + 1), i + 1).map((bar) => bar.close);
    const rsi = rsiOf(window);
    if (rsi === null) continue;

    cursor = judgedAt.getTime() + SPACING_MS;

    const exitWindow = krJudgmentExitWindow(judgedAt);
    const exit = lastAtOrBefore(bars, exitWindow.exitBarAt.getTime());
    if (exit <= i || bars[exit].at.getTime() < exitWindow.notBefore.getTime()) {
      result.droppedNoExit += 1;
      continue;
    }
    if (hasBreak(bars, i - KR_BACKTEST_INDICATOR_WINDOW + 1, exit)) {
      result.droppedBreaks += 1;
      continue;
    }

    const { decision } = scoreModeDecision({
      mode: "long_term",
      symbol,
      change24h: (bars[i].close / bars[i - 1].close - 1) * 100,
      rsi,
      whaleBuy: 0,
      whaleSell: 0,
      hasHolding: false,
      missingData: [],
    });
    const returnRate = bars[exit].close / bars[i].close - 1;
    result.samples.push({
      symbol,
      judgedAt,
      action: decision.action,
      score: decision.score,
      reasons: decision.reasons,
      entryPrice: bars[i].close,
      exitPrice: bars[exit].close,
      returnRate,
      outcome: judgeOutcome("long_term", decision.action, returnRate, cost),
      evaluatedAt: exitWindow.readyAt,
    });
  }
  return result;
};

// ─── 재검증 통계 (등록 [revalidation] — 판정이 아니라 보고) ────────────────────────

export interface KrBacktestGroupStats {
  action: ModeDecisionAction;
  sample: number;
  hits: number;
  hitRate: number;
  /** 같은 풀(행동 무관) "항상 오른다" 적중률로 만든 기저율. 관망은 `null` */
  naiveHitRate: number | null;
  excess: number | null;
  avgReturn: number;
  worstReturn: number;
  months: number;
}

const pushTo = <K, V>(map: Map<K, V[]>, key: K, value: V): void => {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
};

const monthOf = (at: Date): string => KstDate.fromInstant(at).toString().slice(0, 7);

const naiveFor = (action: ModeDecisionAction, alwaysUp: number): number | null =>
  action === "wait" ? null : action === "avoid" ? 1 - alwaysUp : alwaysUp;

/** 풀 "항상 오른다" 비율 — 비용을 넘겨 오른 표본 몫 */
export const krBacktestAlwaysUp = (samples: readonly KrBacktestSample[], cost: number): number =>
  samples.length === 0 ? 0 : samples.filter((sample) => sample.returnRate > cost).length / samples.length;

export const summarizeKrBacktest = (
  samples: readonly KrBacktestSample[],
  cost: number
): KrBacktestGroupStats[] => {
  const alwaysUp = krBacktestAlwaysUp(samples, cost);
  const groups = new Map<ModeDecisionAction, KrBacktestSample[]>();
  for (const sample of samples) pushTo(groups, sample.action, sample);
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([action, group]) => {
      const hits = group.filter((sample) => sample.outcome === "hit").length;
      const naive = naiveFor(action, alwaysUp);
      return {
        action,
        sample: group.length,
        hits,
        hitRate: hits / group.length,
        naiveHitRate: naive,
        excess: naive === null ? null : hits / group.length - naive,
        avgReturn: group.reduce((sum, sample) => sum + sample.returnRate, 0) / group.length,
        worstReturn: Math.min(...group.map((sample) => sample.returnRate)),
        months: new Set(group.map((sample) => monthOf(sample.judgedAt))).size,
      };
    });
};

/** 시드 고정 난수(mulberry32) — 리포트가 다시 돌려도 같다 */
export const seededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const quantile = (sorted: readonly number[], q: number): number => {
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
};

/**
 * 초과 적중률 95% 구간 — 판단 달 단위 블록 부트스트랩. 같은 달 판단은 같은 장세를 함께 겪는다(종목 사이 상관) —
 * 표본 하나씩 다시 뽑으면 구간이 거짓으로 좁다. 기저율도 다시 뽑은 풀에서 센다
 */
export const krBacktestExcessInterval = (
  samples: readonly KrBacktestSample[],
  action: ModeDecisionAction,
  cost: number,
  iterations: number,
  random: () => number
): { low: number; high: number } | null => {
  if (action === "wait") return null;
  const byMonth = new Map<string, KrBacktestSample[]>();
  for (const sample of samples) pushTo(byMonth, monthOf(sample.judgedAt), sample);
  const months = [...byMonth.values()];
  const draws: number[] = [];
  for (let it = 0; it < iterations; it += 1) {
    let pool = 0;
    let poolUp = 0;
    let group = 0;
    let groupHits = 0;
    for (let m = 0; m < months.length; m += 1) {
      for (const sample of months[Math.floor(random() * months.length)]) {
        pool += 1;
        if (sample.returnRate > cost) poolUp += 1;
        if (sample.action === action) {
          group += 1;
          if (sample.outcome === "hit") groupHits += 1;
        }
      }
    }
    if (group === 0 || pool === 0) continue;
    draws.push(groupHits / group - (naiveFor(action, poolUp / pool) ?? 0));
  }
  if (draws.length === 0) return null;
  draws.sort((a, b) => a - b);
  return { low: quantile(draws, 0.025), high: quantile(draws, 0.975) };
};

/**
 * 플라시보 — 같은 판단일 안에서 종목끼리 행동 라벨을 맞바꾼다. 규칙이 그날 종목을 고르는 실력이 없다면 실제 초과
 * 적중률이 이 분포의 흔한 값이어야 한다. 단측 p = (귀무 ≥ 실제 수 + 1) ÷ (반복 + 1). 행동 비율 · 날짜 · 장세는 그대로다
 */
export const krBacktestPlacebo = (
  samples: readonly KrBacktestSample[],
  action: ModeDecisionAction,
  cost: number,
  iterations: number,
  random: () => number
): { observed: number; nullMean: number; p: number } | null => {
  if (action === "wait") return null;
  const alwaysUp = krBacktestAlwaysUp(samples, cost);
  const naive = naiveFor(action, alwaysUp) ?? 0;
  const excessOf = (labels: readonly ModeDecisionAction[]): number | null => {
    let group = 0;
    let hits = 0;
    samples.forEach((sample, index) => {
      if (labels[index] !== action) return;
      group += 1;
      if (judgeOutcome("long_term", action, sample.returnRate, cost) === "hit") hits += 1;
    });
    return group === 0 ? null : hits / group - naive;
  };
  const observed = excessOf(samples.map((sample) => sample.action));
  if (observed === null) return null;

  const byDay = new Map<string, number[]>();
  samples.forEach((sample, index) => {
    pushTo(byDay, KstDate.fromInstant(sample.judgedAt).toString(), index);
  });
  let atLeast = 0;
  let sum = 0;
  for (let it = 0; it < iterations; it += 1) {
    const labels = samples.map((sample) => sample.action);
    for (const indices of byDay.values()) {
      const shuffled = indices.map((index) => labels[index]);
      for (let k = shuffled.length - 1; k > 0; k -= 1) {
        const j = Math.floor(random() * (k + 1));
        [shuffled[k], shuffled[j]] = [shuffled[j], shuffled[k]];
      }
      indices.forEach((index, k) => {
        labels[index] = shuffled[k];
      });
    }
    const value = excessOf(labels) ?? 0;
    sum += value;
    if (value >= observed) atLeast += 1;
  }
  return { observed, nullMean: sum / iterations, p: (atLeast + 1) / (iterations + 1) };
};
