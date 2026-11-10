/**
 * 종목 판단 과거 검산 — 사전등록 `signal-skill@1`(`preregistration/2026-11-10-signal-skill.toml`, F017 v2 단계 1b ·
 * `FC-REQ-028` FR-5 · `ADR-010` v2). 칸 셋: 업비트 장기(`backtest_full`) · 업비트 단타 · 국내 단타(`backtest_price_only`).
 * 국내 장기는 `scripts/backtest-kr-judgments.ts`(`kr-judgment-backtest@2`) 그대로다.
 *
 * ```bash
 * npm run judgments:signal-skill            # dry-run — 리포트만, DB 쓰기 없음
 * npm run judgments:signal-skill -- --write # 세 칸의 과거 검산 행을 지우고 새로 넣는다(한 트랜잭션)
 * ```
 *
 * 레이어: `scripts/**` 는 `composition.ts` 처럼 레이어 밖이다 — 판단 규칙 · RSI 를 운영 코드 그대로 부른다(국내 장기 스크립트와 같은 판단).
 * 본 기간(`backtest_seen`) 표본은 리포트 표 하나로만 — 저장 · 화면 0(등록 [seen]).
 *
 * 리포트: `requirements/reports/backtests/signal-skill-v1-<실행일>.md`(커밋한다 — 3종을 채운 성적의 근거).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { Prisma } from "@prisma/client";

import {
  BACKTEST_MIN_JUDGED_DAYS,
  backtestKrScalpSymbol,
  backtestSpread,
  backtestUpbitSymbol,
  judgedDayOf,
  judgmentSignalType,
  krBacktestAlwaysUp,
  krBacktestExcessInterval,
  krBacktestPlacebo,
  MIN_JUDGMENT_SAMPLE,
  MODE_DECISION_RULE_VERSION,
  roundTripCostAt,
  seededRandom,
  SIGNAL_SKILL_KEY,
  summarizeKrBacktest,
  UPBIT_SEEN_BEFORE,
  type CoachMode,
  type JudgmentBacktestResult,
  type JudgmentBacktestSample,
  type KrBacktestBar,
} from "../src/coach/domain";
import { calculateIndicators, MIN_CANDLES_FOR_INDICATORS } from "../src/market/domain";
import { env } from "../src/shared/config/env";
import prisma from "../src/shared/infrastructure/prisma";

const SEED = 20261110;
const BOOTSTRAP = 2_000;
const PLACEBO = 1_000;
const CONCURRENCY = 4;
const INSERT_CHUNK = 5_000;

const write = process.argv.includes("--write");

/** 라이브 `RefreshTechnicalIndicators` 와 같은 계산 — 50 봉 미만이면 지표 없음 */
const rsiOf = (closes: number[]): number | null =>
  closes.length < MIN_CANDLES_FOR_INDICATORS ? null : calculateIndicators(closes, closes.map(() => 0)).rsi14;

const pct = (value: number | null, digits = 1): string =>
  value === null ? "—" : `${value >= 0 ? "+" : "−"}${Math.abs(value * 100).toFixed(digits)}%`;
const rate = (value: number, digits = 1): string => `${(value * 100).toFixed(digits)}%`;
const n = (value: number): string => value.toLocaleString("en-US");

const loadBars = async (symbol: string, assetType: "crypto" | "kr_stock"): Promise<KrBacktestBar[]> => {
  const rows = await prisma.priceHistory.findMany({
    where: { symbol, assetType, timeframe: "1d" },
    orderBy: { timestamp: "asc" },
    select: { timestamp: true, close: true, volume: true },
  });
  return rows.map((row) => ({
    at: row.timestamp,
    close: Number(row.close),
    volume: row.volume === null ? null : Number(row.volume),
  }));
};

interface Cell {
  name: string;
  market: "upbit_krw" | "kr_stock";
  mode: CoachMode;
  samples: JudgmentBacktestSample[];
  seen: JudgmentBacktestSample[];
  symbols: number;
  symbolsWithSamples: number;
  droppedBreaks: number;
  droppedNoExit: number;
}

const newCell = (name: string, market: Cell["market"], mode: CoachMode): Cell => ({
  name,
  market,
  mode,
  samples: [],
  seen: [],
  symbols: 0,
  symbolsWithSamples: 0,
  droppedBreaks: 0,
  droppedNoExit: 0,
});

const absorb = (cell: Cell, result: JudgmentBacktestResult): void => {
  cell.symbols += 1;
  const shown = result.samples.filter((sample) => sample.label !== "backtest_seen");
  cell.samples.push(...shown);
  cell.seen.push(...result.samples.filter((sample) => sample.label === "backtest_seen"));
  cell.droppedBreaks += result.droppedBreaks;
  cell.droppedNoExit += result.droppedNoExit;
  if (shown.length > 0) cell.symbolsWithSamples += 1;
};

const range = (samples: readonly JudgmentBacktestSample[]): string => {
  if (samples.length === 0) return "—";
  let first = samples[0].judgedAt;
  let last = samples[0].judgedAt;
  for (const sample of samples) {
    if (sample.judgedAt < first) first = sample.judgedAt;
    if (sample.judgedAt > last) last = sample.judgedAt;
  }
  return `${judgedDayOf(first)} ~ ${judgedDayOf(last)}`;
};

const groupTable = (cell: Cell, samples: readonly JudgmentBacktestSample[], random: () => number): string => {
  const groups = summarizeKrBacktest(samples);
  if (groups.length === 0) return "표본 없음\n";
  const rows = groups.map((group) => {
    const own = samples.filter((sample) => sample.action === group.action);
    const days = new Set(own.map((sample) => judgedDayOf(sample.judgedAt))).size;
    const misses = group.sample - group.hits;
    const interval = krBacktestExcessInterval(samples, group.action, BOOTSTRAP, random, judgedDayOf);
    const placebo = krBacktestPlacebo(samples, group.action, PLACEBO, random, cell.mode);
    const fills = group.sample >= MIN_JUDGMENT_SAMPLE && misses >= 1 && days >= BACKTEST_MIN_JUDGED_DAYS;
    return `| ${group.action} | ${n(group.sample)} | ${days} | ${n(misses)} | ${rate(group.hitRate)} | ${group.naiveHitRate === null ? "— (관망)" : rate(group.naiveHitRate)} | ${pct(group.excess)} | ${interval ? `${pct(interval.low)} ~ ${pct(interval.high)}` : "—"} | ${placebo ? `${pct(placebo.nullMean)} · ${placebo.p.toFixed(3)}` : "—"} | ${pct(group.avgReturn)} | ${pct(group.worstReturn)} | ${fills ? "채울 수 있음" : "못 채움(결함)"} |`;
  });
  return `| 판단 | 표본 | 판단 날 | 빗나감 | 적중률 | 기저율 | 초과 | 95% (판단 날 블록 ${n(BOOTSTRAP)}회) | 플라시보 귀무 평균 · p (${n(PLACEBO)}회) | 평균 | 최악 | 3종 채움(표본 ≥ ${MIN_JUDGMENT_SAMPLE} · 빗나감 ≥ 1 · 날 ≥ ${BACKTEST_MIN_JUDGED_DAYS}) |
|---|---|---|---|---|---|---|---|---|---|---|---|
${rows.join("\n")}

풀 "항상 오른다"(비용 넘겨 오름) ${rate(krBacktestAlwaysUp(samples))} · spread(후보 순수익 − 피하기) ${pct(backtestSpread(samples), 2)}
`;
};

const main = async () => {
  const started = Date.now();
  const until = new Date();
  const costs = { crypto: 0.001, krStockCommissionPerSide: env.KR_STOCK_COMMISSION_RATE_PER_SIDE };
  const costAt = (soldAt: Date): number => roundTripCostAt("kr_stock", soldAt, costs);

  const [cryptoRows, krRows, sessionRows] = await Promise.all([
    prisma.$queryRaw<Array<{ symbol: string }>>`
      SELECT DISTINCT symbol FROM price_history WHERE asset_type = 'crypto' AND timeframe = '1d' ORDER BY symbol`,
    prisma.$queryRaw<Array<{ symbol: string }>>`
      SELECT DISTINCT symbol FROM price_history WHERE asset_type = 'kr_stock' AND timeframe = '1d' ORDER BY symbol`,
    prisma.$queryRaw<Array<{ timestamp: Date }>>`
      SELECT DISTINCT timestamp FROM price_history WHERE asset_type = 'kr_stock' AND timeframe = '1d' ORDER BY timestamp`,
  ]);
  const sessions = sessionRows.map((row) => row.timestamp);
  const sessionIndex = new Map(sessions.map((at, index) => [at.getTime(), index]));

  const upbitLong = newCell("업비트 장기 30일 — backtest_full", "upbit_krw", "long_term");
  const upbitScalp = newCell("업비트 단타 24시간 — backtest_price_only", "upbit_krw", "scalp");
  const krScalp = newCell("국내 단타 다음 거래일 — backtest_price_only", "kr_stock", "scalp");

  for (let offset = 0; offset < cryptoRows.length; offset += CONCURRENCY) {
    const batch = cryptoRows.slice(offset, offset + CONCURRENCY);
    const loaded = await Promise.all(batch.map(async ({ symbol }) => ({ symbol, bars: await loadBars(symbol, "crypto") })));
    for (const { symbol, bars } of loaded) {
      absorb(upbitLong, backtestUpbitSymbol({ symbol, mode: "long_term", bars, until, rsiOf }));
      absorb(upbitScalp, backtestUpbitSymbol({ symbol, mode: "scalp", bars, until, rsiOf }));
    }
  }
  for (let offset = 0; offset < krRows.length; offset += CONCURRENCY) {
    const batch = krRows.slice(offset, offset + CONCURRENCY);
    const loaded = await Promise.all(batch.map(async ({ symbol }) => ({ symbol, bars: await loadBars(symbol, "kr_stock") })));
    for (const { symbol, bars } of loaded) {
      absorb(krScalp, backtestKrScalpSymbol({ symbol, bars, sessions, sessionIndex, costAt }));
    }
  }
  const computedMs = Date.now() - started;
  const cells = [upbitLong, upbitScalp, krScalp];
  const random = seededRandom(SEED);
  const runDate = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

  const report = `# 종목 판단 과거 검산 — \`${SIGNAL_SKILL_KEY}\` (${runDate})

사전등록 \`salt-server/preregistration/2026-11-10-signal-skill.toml\`(커밋 \`03771c6f\`) 그대로 돌린 결과다. 규칙 \`${MODE_DECISION_RULE_VERSION}\` ·
비용 코인 0.10% · 국내 수수료 한쪽 ${(costs.krStockCommissionPerSide * 100).toFixed(4)}% × 2 + 매도일 거래세. 스프레드 · 슬리피지 0(근거 수치 없음 — 넣으면 후보 · 관망 적중이 그만큼 불리하다).
${write ? "DB 에 썼다(`backtest_full` · `backtest_price_only`). 본 기간 표본은 쓰지 않았다." : "dry-run — DB 에 쓰지 않았다."} 실행 기준 시각 ${until.toISOString()}.

## 칸별 표본

| 칸 | 종목 | 표본이 생긴 종목 | 표본 | 판단 기간 | 뺀 판단 — 만기 없음 | 뺀 판단 — 원천 끊김 | 본 기간 표본(화면 0) |
|---|---|---|---|---|---|---|---|
${cells
  .map(
    (cell) =>
      `| ${cell.name} | ${n(cell.symbols)} | ${n(cell.symbolsWithSamples)} | ${n(cell.samples.length)} | ${range(cell.samples)} | ${n(cell.droppedNoExit)} | ${n(cell.droppedBreaks)} | ${n(cell.seen.length)} |`
  )
  .join("\n")}

계산 ${(computedMs / 1000).toFixed(1)}s. 종목은 서버가 지금 모으는 것뿐이다(폐지 종목 없음 — 생존 편향, 등록 [universe].survivorship).
업비트 일봉은 서버에 2025-04 부터다 — 본 기간 표 · 장기 RSI 창이 그 뒤만 덮는다.
"만기 없음"에는 아직 만기 종가가 안 온 판단(실행 시각 직전)과 다음 봉이 빈 판단이 같이 들어 있다.

${cells
  .map(
    (cell) => `## ${cell.name}

${groupTable(cell, cell.samples, random)}`
  )
  .join("\n")}
## 본 기간(업비트 ${judgedDayOf(UPBIT_SEEN_BEFORE)} 전) — 참고, 화면 0

규칙(\`${MODE_DECISION_RULE_VERSION}\`)을 이 기간 데이터로 골랐다(rule-ic@1). 아래 숫자는 표본 밖 성적이 아니다.

${[upbitLong, upbitScalp]
  .map(
    (cell) => `### ${cell.name}

${groupTable(cell, cell.seen, random)}`
  )
  .join("\n")}
## 읽는 법

- 이 표는 판정이 아니라 보고다. 3종 채움 조건은 등록 [display] 그대로(결과로 바꾸지 않는다). 등급(검증됨)은 라이브만 — 이 표로 만들지 않는다
- 같은 날 판단은 같은 장세를 함께 겪는다 — 독립 관측은 표본 수보다 판단 날 수에 가깝다. 구간은 판단 날 블록으로 냈다
- \`backtest_price_only\` 칸은 라이브 점수의 일부 항목(단타 심리 · 1시간 RSI)이 빠진 점수다 — 같은 행동이라도 라이브와 다른 날에 나올 수 있다
- 후보(점수 ≥ 70)는 세 칸 모두 0 건일 수 있다 — 이 규칙의 가점 합이 70 에 닿지 않는다(등록 [report].spread 에 미리 적음)
`;

  const dir = join(__dirname, "..", "requirements", "reports", "backtests");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `signal-skill-v1-${runDate}.md`);
  writeFileSync(path, report);
  console.log(report);
  console.log(`리포트: ${path}`);

  if (!write) return;
  const data = cells.flatMap((cell) =>
    cell.samples.map((sample) => ({
      symbol: sample.symbol,
      mode: sample.mode,
      action: sample.action,
      signalType: judgmentSignalType(sample.mode, sample.action, sample.market === "kr_stock" ? "kr_stock" : "crypto"),
      score: sample.score,
      reasons: sample.reasons,
      entryPrice: new Prisma.Decimal(sample.entryPrice),
      judgedAt: sample.judgedAt,
      sampleOrigin: sample.label,
      ruleVersion: MODE_DECISION_RULE_VERSION,
      exitPrice: new Prisma.Decimal(sample.exitPrice),
      returnRate: new Prisma.Decimal(sample.returnRate.toFixed(6)),
      outcome: sample.outcome,
      evaluatedAt: sample.evaluatedAt,
    }))
  );
  const chunks: (typeof data)[] = [];
  for (let i = 0; i < data.length; i += INSERT_CHUNK) chunks.push(data.slice(i, i + INSERT_CHUNK));
  // 세 칸만 지운다 — 국내 장기 과거 검산 · 라이브 · 합성 행은 조건 밖. 지우기 + 넣기를 한 트랜잭션으로(중간 실패면 이전 그대로)
  const scope = Prisma.sql`sample_origin IN ('backtest_full', 'backtest_price_only')
    AND (signal_type NOT LIKE 'kr\\_stock.%' OR signal_type LIKE 'kr\\_stock.scalp.%')`;
  const [deleted, ...inserted] = await prisma.$transaction([
    prisma.$executeRaw`DELETE FROM symbol_judgment_snapshots WHERE ${scope}`,
    ...chunks.map((chunk) => prisma.symbolJudgmentSnapshot.createMany({ data: chunk, skipDuplicates: true })),
  ]);
  console.log(`지움 ${deleted} · 넣음 ${inserted.reduce((sum, r) => sum + r.count, 0)}`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
