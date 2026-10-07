/**
 * 목표 비중 안내 규칙의 과거 성적 — 사전등록 `target-weight@1` 리포트(F010 슬라이스 5 · `FC-REQ-012`).
 *
 * 원천: `salt-forecast/reports/target-weight-target-weight-1-2026-09-29.md`(실행 코드 `84f69b2`).
 * 등록 [universes] 가 화면 고지에 **core(BTC · ETH) 1차 기록만** 쓰게 정했다 — 알트를 섞은 묶음 기록은 여기 없다.
 * 등록 [claims] 가 화면이 쓸 수 있는 문장을 정했고, 그 판정(CI 하한 > 0 등)을 리포트 값 그대로 옮겼다.
 *
 * 같은 8년 표본으로 다시 돌려 값을 바꾸지 않는다. 규칙이 바뀌면 새 키(`target-weight@2`)로 새 리포트 · 새 상수다.
 * 숫자는 비율(0.36 = 36%) · 월은 `YYYY-MM` 이다.
 */

import { claimBaseline, claimMisses, claimPeriod, type PerformanceClaim } from "./performanceClaim";

export const TARGET_WEIGHT_PREREG_KEY = "target-weight@1";
export const TARGET_WEIGHT_REPORT = "salt-forecast/reports/target-weight-target-weight-1-2026-09-29.md";

export interface CurveRecord {
  cagr: number;
  vol: number;
  /** 양수 크기(0.36 = −36%) */
  mdd: number;
  upside: number;
  downside: number;
  exposureMean: number;
}

export interface MonthRecord {
  month: string;
  strategy: number;
  btc: number;
  exposure: number;
}

export interface TargetWeightRecord {
  target: number;
  strategy: CurveRecord;
  /** 같은 평균 비중을 고정으로 둔 곡선 — 타이밍 몫을 가르는 기준. 리포트가 하락 포착을 적지 않았다 */
  constant: Omit<CurveRecord, "downside">;
  /** MDD_BTC보유 − MDD_전략 [점, 2.5%, 97.5%] */
  deltaMddVsBtc: [number, number, number];
  /** Calmar_전략 − Calmar_고정 */
  deltaCalmarVsConstant: [number, number, number];
  claims: { lessDrawdown: boolean; timing: boolean; targetHit: boolean };
  missedUpside: MonthRecord[];
  worstMonths: MonthRecord[];
}

export interface TargetWeightBacktest {
  preregKey: string;
  report: string;
  window: { from: string; to: string };
  cadence: "weekly";
  feeRatePerSide: number;
  holdBtc: CurveRecord;
  records: TargetWeightRecord[];
}

const HOLD_BTC: CurveRecord = { cagr: 0.186, vol: 0.576, mdd: 0.86, upside: 1, downside: 1, exposureMean: 1 };

export const TARGET_WEIGHT_BACKTEST: TargetWeightBacktest = {
  preregKey: TARGET_WEIGHT_PREREG_KEY,
  report: TARGET_WEIGHT_REPORT,
  window: { from: "2018-01-09", to: "2026-09-28" },
  cadence: "weekly",
  feeRatePerSide: 0.0005,
  holdBtc: HOLD_BTC,
  records: [
    {
      target: 0.1,
      strategy: { cagr: 0.079, vol: 0.109, mdd: 0.255, upside: 0.22, downside: 0.18, exposureMean: 0.2 },
      constant: { cagr: 0.071, vol: 0.122, mdd: 0.329, upside: 0.22, exposureMean: 0.2 },
      deltaMddVsBtc: [0.605, 0.382, 0.679],
      deltaCalmarVsConstant: [0.1, -0.23, 0.36],
      claims: { lessDrawdown: true, timing: false, targetHit: true },
      missedUpside: [
        { month: "2019-05", strategy: 0.106, btc: 0.697, exposure: 0.16 },
        { month: "2020-12", strategy: 0.052, btc: 0.503, exposure: 0.15 },
        { month: "2021-02", strategy: 0.032, btc: 0.423, exposure: 0.11 },
      ],
      worstMonths: [
        { month: "2018-11", strategy: -0.108, btc: -0.363, exposure: 0.27 },
        { month: "2025-02", strategy: -0.078, btc: -0.205, exposure: 0.27 },
        { month: "2022-06", strategy: -0.067, btc: -0.349, exposure: 0.13 },
      ],
    },
    {
      target: 0.15,
      strategy: { cagr: 0.115, vol: 0.163, mdd: 0.36, upside: 0.33, downside: 0.27, exposureMean: 0.3 },
      constant: { cagr: 0.1, vol: 0.182, mdd: 0.457, upside: 0.33, exposureMean: 0.3 },
      deltaMddVsBtc: [0.5, 0.278, 0.584],
      deltaCalmarVsConstant: [0.1, -0.25, 0.37],
      claims: { lessDrawdown: true, timing: false, targetHit: true },
      missedUpside: [
        { month: "2019-05", strategy: 0.162, btc: 0.697, exposure: 0.24 },
        { month: "2020-12", strategy: 0.079, btc: 0.503, exposure: 0.23 },
        { month: "2021-02", strategy: 0.048, btc: 0.423, exposure: 0.17 },
      ],
      worstMonths: [
        { month: "2018-11", strategy: -0.16, btc: -0.363, exposure: 0.41 },
        { month: "2025-02", strategy: -0.116, btc: -0.205, exposure: 0.4 },
        { month: "2022-06", strategy: -0.1, btc: -0.349, exposure: 0.2 },
      ],
    },
    {
      target: 0.2,
      strategy: { cagr: 0.147, vol: 0.218, mdd: 0.454, upside: 0.44, downside: 0.37, exposureMean: 0.4 },
      constant: { cagr: 0.126, vol: 0.244, mdd: 0.564, upside: 0.44, exposureMean: 0.4 },
      deltaMddVsBtc: [0.406, 0.178, 0.501],
      deltaCalmarVsConstant: [0.1, -0.25, 0.39],
      claims: { lessDrawdown: true, timing: false, targetHit: true },
      missedUpside: [
        { month: "2019-05", strategy: 0.219, btc: 0.697, exposure: 0.32 },
        { month: "2020-12", strategy: 0.106, btc: 0.503, exposure: 0.31 },
        { month: "2021-02", strategy: 0.063, btc: 0.423, exposure: 0.22 },
      ],
      worstMonths: [
        { month: "2018-11", strategy: -0.21, btc: -0.363, exposure: 0.56 },
        { month: "2025-02", strategy: -0.153, btc: -0.205, exposure: 0.54 },
        { month: "2022-06", strategy: -0.131, btc: -0.349, exposure: 0.27 },
      ],
    },
    {
      target: 0.3,
      strategy: { cagr: 0.195, vol: 0.32, mdd: 0.588, upside: 0.63, downside: 0.55, exposureMean: 0.59 },
      constant: { cagr: 0.162, vol: 0.36, mdd: 0.719, upside: 0.63, exposureMean: 0.59 },
      deltaMddVsBtc: [0.272, 0.049, 0.371],
      deltaCalmarVsConstant: [0.11, -0.25, 0.38],
      claims: { lessDrawdown: true, timing: false, targetHit: true },
      missedUpside: [
        { month: "2021-02", strategy: 0.093, btc: 0.423, exposure: 0.33 },
        { month: "2020-12", strategy: 0.162, btc: 0.503, exposure: 0.46 },
        { month: "2019-05", strategy: 0.34, btc: 0.697, exposure: 0.47 },
      ],
      worstMonths: [
        { month: "2018-11", strategy: -0.275, btc: -0.363, exposure: 0.7 },
        { month: "2025-02", strategy: -0.222, btc: -0.205, exposure: 0.81 },
        { month: "2022-06", strategy: -0.192, btc: -0.349, exposure: 0.4 },
      ],
    },
    {
      target: 0.5,
      strategy: { cagr: 0.214, vol: 0.467, mdd: 0.753, upside: 0.87, downside: 0.82, exposureMean: 0.83 },
      constant: { cagr: 0.182, vol: 0.516, mdd: 0.851, upside: 0.87, exposureMean: 0.83 },
      deltaMddVsBtc: [0.107, -0.072, 0.205],
      deltaCalmarVsConstant: [0.07, -0.2, 0.26],
      claims: { lessDrawdown: false, timing: false, targetHit: true },
      missedUpside: [
        { month: "2021-02", strategy: 0.149, btc: 0.423, exposure: 0.54 },
        { month: "2020-12", strategy: 0.277, btc: 0.503, exposure: 0.75 },
        { month: "2020-04", strategy: 0.176, btc: 0.343, exposure: 0.43 },
      ],
      worstMonths: [
        { month: "2018-11", strategy: -0.362, btc: -0.363, exposure: 0.82 },
        { month: "2022-06", strategy: -0.306, btc: -0.349, exposure: 0.68 },
        { month: "2018-03", strategy: -0.262, btc: -0.351, exposure: 0.48 },
      ],
    },
  ],
};

/** 사용자 목표 σ 에 가장 가까운 등록 목표의 기록. 같은 거리면 작은 쪽(등록 [claims] · Python `nearest_target`) */
export const nearestTargetRecord = (targetVolatility: number): TargetWeightRecord =>
  TARGET_WEIGHT_BACKTEST.records.reduce((best, record) => {
    const d = Math.abs(record.target - targetVolatility);
    const bestD = Math.abs(best.target - targetVolatility);
    return d < bestD - 1e-12 || (Math.abs(d - bestD) <= 1e-12 && record.target < best.target) ? record : best;
  });

/**
 * 알트 위험 몫 판정 — 사전등록 `target-weight@2` 리포트(`85dc938`). 후보 a 가 core 만(a = 0)보다 나은지를
 * ΔCalmar 98.75% CI(Bonferroni)로 쟀고 **둘 다 통과 못 했다** → `targetWeight.ts` `TARGET_WEIGHT_ALT_SHARE = null`.
 * 목표 0.15 행만 옮긴다(판정 기준 (1) 의 자리). 상장폐지 종목을 수집하지 않아 알트에 유리한 표본이었다.
 */
export const TARGET_WEIGHT_ALT_SHARE_RECORD = {
  preregKey: "target-weight@2",
  report: "salt-forecast/reports/target-weight-target-weight-2-2026-09-29.md",
  adopted: null as number | null,
  primaryTarget: 0.15,
  candidates: [
    { altShare: 0.1, deltaCalmar: [-0.032, -0.106, -0.005] as [number, number, number], cagr: 0.101, coreCagr: 0.115 },
    { altShare: 0.2, deltaCalmar: [-0.065, -0.215, -0.009] as [number, number, number], cagr: 0.087, coreCagr: 0.115 },
  ],
  survivorshipBias: true,
} as const;

/** 라이브 성적으로 과거 성적 자리를 바꾸는 주 수 — 등록 [live.display] min_weeks */
export const TARGET_WEIGHT_LIVE_MIN_WEEKS = 30;
export const TARGET_WEIGHT_LIVE_PREREG_KEY = "target-weight@2";

/** `forecast.v_target_weight_live` 한 행(core 모델 포트폴리오 · 목표 하나). 비율 · 주간 */
export interface TargetWeightLiveRecord {
  target: number;
  asOf: Date;
  firstRebalanceAt: Date;
  nWeeks: number;
  nExcluded: number;
  cumReturn: number | null;
  btcCumReturn: number | null;
  mdd: number | null;
  btcMdd: number | null;
  vol: number | null;
  upside: number | null;
  downside: number | null;
  worstWeeks: Array<{ rebalanceAt: string; strategy: number | null; btc: number | null; exposure: number | null }>;
}

const DAY_MS = 24 * 3600_000;

/** `from` ~ `to`(`YYYY-MM-DD`, 양끝 포함) 안의 월요일 수 — 등록 기간 · 주기(매주 월요일)에서 센 리밸런스 횟수 */
export const mondaysBetween = (from: string, to: string): number => {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!(end >= start)) return 0;
  const firstMonday = start + ((8 - new Date(start).getUTCDay()) % 7) * DAY_MS;
  return firstMonday > end ? 0 : Math.floor((end - firstMonday) / (7 * DAY_MS)) + 1;
};

/**
 * 목표 비중 과거 성적의 4요소(F009 FR-33). 백테스트 표본은 리포트에 적힌 수가 아니라 등록 기간 · 주기에서 센 월요일 수다.
 * **빗나간 수는 두 기록 모두 `not_recorded`** — 등록 [claims] 가 "빗나감"을 정의하지 않았고, 결과를 본 뒤 정의를 새로 만들지 않는다.
 * 대신 화면이 이미 싣는 놓친 상승 · 가장 나빴던 달(주)이 사례다.
 */
export const targetWeightClaim = (
  source: "backtest" | "live",
  live: TargetWeightLiveRecord | null,
  window: { from: string; to: string } = TARGET_WEIGHT_BACKTEST.window
): PerformanceClaim => {
  if (source === "live" && live) {
    return {
      period: claimPeriod(live.nWeeks, live.firstRebalanceAt, live.asOf),
      sample: live.nWeeks,
      baseline: claimBaseline(live.nWeeks, live.btcCumReturn === null ? null : "hold_btc", "not_recorded"),
      misses: claimMisses(live.nWeeks, null, "not_recorded"),
    };
  }
  const sample = mondaysBetween(window.from, window.to);
  return {
    period: claimPeriod(sample, window.from, window.to),
    sample,
    baseline: claimBaseline(sample, "hold_btc", "not_recorded"),
    misses: claimMisses(sample, null, "not_recorded"),
  };
};
