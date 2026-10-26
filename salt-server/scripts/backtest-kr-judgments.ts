/**
 * 국내 주식 판단 백테스트 — 사전등록 `kr-judgment-backtest@1`(`preregistration/2026-10-26-kr-judgment-backtest.toml`,
 * F011 슬라이스 7b · `SRV-REQ-040` FR-43).
 *
 * ```bash
 * npm run judgments:kr-backtest            # dry-run — 표본 · 재검증 리포트만, DB 쓰기 없음
 * npm run judgments:kr-backtest -- --write # 국내 backtest 행을 지우고 새로 넣는다(한 트랜잭션)
 * ```
 *
 * 레이어: `scripts/**` 는 `composition.ts` 처럼 레이어 밖이다. `coach` 판단 규칙과 `market` 지표 계산을 **둘 다 운영 코드
 * 그대로** 부른다 — 규칙 · RSI 를 두 곳에 적으면 백테스트가 다른 규칙을 채점한다. 채점까지 끝난 행을 넣는 것이라
 * `SymbolJudgmentStore` Port(라이브 문은 `live` 만 쓴다)로는 표현하지 않는다 — 시드 스크립트와 같은 판단.
 *
 * 리포트: `requirements/reports/backtests/kr-judgment-backtest-<실행일>.md`(커밋한다 — 표시되는 성적의 근거).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { Prisma } from "@prisma/client";

import {
  backtestKrSymbol,
  judgmentSignalType,
  KR_JUDGMENT_BACKTEST_KEY,
  krBacktestAlwaysUp,
  krBacktestExcessInterval,
  krBacktestPlacebo,
  MIN_JUDGMENT_SAMPLE,
  MODE_DECISION_RULE_VERSION,
  seededRandom,
  summarizeKrBacktest,
  type KrBacktestBar,
  type KrBacktestSample,
} from "../src/coach/domain";
import { calculateIndicators, MIN_CANDLES_FOR_INDICATORS } from "../src/market/domain";
import { env } from "../src/shared/config/env";
import prisma from "../src/shared/infrastructure/prisma";

/** 라이브 국내 판단 첫 스냅샷(2026-10-08) — 등록 [schedule].window. 이 전에 만기가 끝나는 판단만 */
const LIVE_START = new Date("2026-10-08T00:00:00+09:00");
/** 등록 [display] — 판단 달 수 하한 */
const MIN_MONTHS = 12;
const SEED = 20261026;
const BOOTSTRAP = 2_000;
const PLACEBO = 1_000;
const CONCURRENCY = 8;
const INSERT_CHUNK = 5_000;

const write = process.argv.includes("--write");

/** 라이브 `RefreshTechnicalIndicators` 와 같은 계산 — 50 봉 미만이면 지표 없음 */
const rsiOf = (closes: number[]): number | null =>
  closes.length < MIN_CANDLES_FOR_INDICATORS ? null : calculateIndicators(closes, closes.map(() => 0)).rsi14;

const pct = (value: number | null, digits = 1): string =>
  value === null ? "—" : `${value >= 0 ? "+" : "−"}${Math.abs(value * 100).toFixed(digits)}%`;
const rate = (value: number): string => `${(value * 100).toFixed(1)}%`;

const loadBars = async (symbol: string): Promise<KrBacktestBar[]> => {
  const rows = await prisma.priceHistory.findMany({
    where: { symbol, assetType: "kr_stock", timeframe: "1d" },
    orderBy: { timestamp: "asc" },
    select: { timestamp: true, close: true, volume: true },
  });
  return rows.map((row) => ({
    at: row.timestamp,
    close: Number(row.close),
    volume: row.volume === null ? null : Number(row.volume),
  }));
};

const main = async () => {
  const started = Date.now();
  const cost = env.KR_STOCK_ROUND_TRIP_FEE_RATE;

  // DISTINCT 는 DB 가 한다 — Prisma `distinct` 는 286만 행을 가져와 메모리에서 거른다
  const [sessionRows, symbolRows] = await Promise.all([
    prisma.$queryRaw<Array<{ timestamp: Date }>>`
      SELECT DISTINCT timestamp FROM price_history WHERE asset_type = 'kr_stock' AND timeframe = '1d' ORDER BY timestamp`,
    prisma.$queryRaw<Array<{ symbol: string }>>`
      SELECT DISTINCT symbol FROM price_history WHERE asset_type = 'kr_stock' AND timeframe = '1d' ORDER BY symbol`,
  ]);
  const sessionIndex = new Map(sessionRows.map((row, index) => [row.timestamp.getTime(), index]));
  const symbols = symbolRows.map((row) => row.symbol);

  const samples: KrBacktestSample[] = [];
  let droppedBreaks = 0;
  let droppedNoExit = 0;
  let symbolsWithSamples = 0;
  for (let offset = 0; offset < symbols.length; offset += CONCURRENCY) {
    const batch = symbols.slice(offset, offset + CONCURRENCY);
    const loaded = await Promise.all(batch.map(async (symbol) => ({ symbol, bars: await loadBars(symbol) })));
    for (const { symbol, bars } of loaded) {
      const result = backtestKrSymbol({ symbol, bars, sessionIndex, liveStart: LIVE_START, cost, rsiOf });
      samples.push(...result.samples);
      droppedBreaks += result.droppedBreaks;
      droppedNoExit += result.droppedNoExit;
      if (result.samples.length > 0) symbolsWithSamples += 1;
    }
  }
  const computedMs = Date.now() - started;

  const groups = summarizeKrBacktest(samples, cost);
  const random = seededRandom(SEED);
  const rows = groups.map((group) => ({
    group,
    interval: krBacktestExcessInterval(samples, group.action, cost, BOOTSTRAP, random),
    placebo: krBacktestPlacebo(samples, group.action, cost, PLACEBO, random),
    displayable: group.sample >= MIN_JUDGMENT_SAMPLE && group.months >= MIN_MONTHS,
  }));

  const years = new Map<string, KrBacktestSample[]>();
  for (const sample of samples) {
    const year = new Date(sample.judgedAt.getTime() + 9 * 3600_000).getUTCFullYear().toString();
    const list = years.get(year);
    if (list) list.push(sample);
    else years.set(year, [sample]);
  }
  const first = samples.reduce((min, s) => (s.judgedAt < min ? s.judgedAt : min), samples[0]?.judgedAt ?? new Date());
  const last = samples.reduce((max, s) => (s.judgedAt > max ? s.judgedAt : max), samples[0]?.judgedAt ?? new Date());
  const runDate = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

  const report = `# 국내 주식 판단 백테스트 — \`${KR_JUDGMENT_BACKTEST_KEY}\` (${runDate})

사전등록 \`salt-server/preregistration/2026-10-26-kr-judgment-backtest.toml\` 그대로 돌린 결과다. 규칙 \`${MODE_DECISION_RULE_VERSION}\` 장기 ·
유니버스 \`kr-universe@1\` · 30일 간격 · 만기 라이브 시작(2026-10-08) 전 · 비용 ${(cost * 100).toFixed(2)}% 고정.
${write ? "DB 에 썼다(`sample_origin = 'backtest'`)." : "dry-run — DB 에 쓰지 않았다."}

## 표본

| 항목 | 값 |
|---|---|
| 일봉이 있는 종목 | ${symbols.length.toLocaleString("en-US")} |
| 표본이 생긴 종목 | ${symbolsWithSamples.toLocaleString("en-US")} |
| 표본 | ${samples.length.toLocaleString("en-US")} |
| 판단 기간 | ${first.toISOString().slice(0, 10)} ~ ${last.toISOString().slice(0, 10)} |
| 뺀 판단 — 원천 끊김 | ${droppedBreaks.toLocaleString("en-US")} |
| 뺀 판단 — 만기 종가 없음 | ${droppedNoExit.toLocaleString("en-US")} |
| 풀 "항상 오른다"(비용 넘겨 오름) | ${rate(krBacktestAlwaysUp(samples, cost))} |
| 계산 시간 | ${(computedMs / 1000).toFixed(1)}s |

상장폐지 종목은 서버 일봉에 없다(생존 편향 — \`SRV-REQ-040\` FR-41 보류). 끊김 기준에 정리매매 하락도 같이 빠진다.

## 판단 유형별 (재검증 — FR-43)

| 판단 | 표본 | 판단 달 | 적중률 | 기저율 | 초과 적중률 | 95% (달 블록 ${BOOTSTRAP.toLocaleString("en-US")}회) | 플라시보 귀무 평균 · p (${PLACEBO.toLocaleString("en-US")}회) | 평균 수익률 | 최악 | 화면(표본 ≥ ${MIN_JUDGMENT_SAMPLE} · 달 ≥ ${MIN_MONTHS}) |
|---|---|---|---|---|---|---|---|---|---|---|
${rows
  .map(
    ({ group, interval, placebo, displayable }) =>
      `| ${group.action} | ${group.sample.toLocaleString("en-US")} | ${group.months} | ${rate(group.hitRate)} | ${group.naiveHitRate === null ? "— (관망은 방향이 없다)" : rate(group.naiveHitRate)} | ${pct(group.excess)} | ${interval ? `${pct(interval.low)} ~ ${pct(interval.high)}` : "—"} | ${placebo ? `${pct(placebo.nullMean)} · ${placebo.p.toFixed(3)}` : "—"} | ${pct(group.avgReturn)} | ${pct(group.worstReturn)} | ${displayable ? "백테스트 라벨로 표시" : "표시 안 함"} |`
  )
  .join("\n")}

기저율은 **같은 풀(행동 무관) 전체**의 "항상 오른다" 비율로 만든다. 등록 문구 "같은 표본"은 등록 직후 · 실행 전에 찾은 결함
(그룹 표본으로 세면 후보 · 피하기 초과분이 늘 0 — \`186876f\`)에 따라 풀로 읽었다. 결과를 보기 전에 바꿨다.

## 연도별 (참고 — 판정 아님)

| 연도 | 표본 | ${groups.map((group) => `${group.action} 적중률`).join(" | ")} | 항상 오른다 |
|---|---|${groups.map(() => "---").join("|")}|---|
${[...years.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([year, list]) => {
    const byAction = summarizeKrBacktest(list, cost);
    return `| ${year} | ${list.length.toLocaleString("en-US")} | ${groups
      .map((group) => {
        const found = byAction.find((item) => item.action === group.action);
        return found ? `${rate(found.hitRate)} (${found.sample})` : "—";
      })
      .join(" | ")} | ${rate(krBacktestAlwaysUp(list, cost))} |`;
  })
  .join("\n")}

## 읽는 법

- 같은 달 판단은 같은 장세를 함께 겪는다 — 표본 수보다 판단 달 수가 독립 관측에 가깝다. 구간은 달 블록으로 냈다
- 플라시보는 같은 판단일 안에서 행동 라벨만 맞바꾼다. p 가 크면 "그날 어느 종목을 피하라 했나"에 실력이 없다는 뜻이다
- \`${MODE_DECISION_RULE_VERSION}\` 은 코인 데이터로 고른 규칙이다(rule-ic@1) — 국내 표본은 그 규칙의 표본 밖이다
- 이 표는 판정이 아니라 보고다. 표시 규칙은 등록 [display] 그대로(결과로 바꾸지 않는다)
`;

  const dir = join(__dirname, "..", "requirements", "reports", "backtests");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `kr-judgment-backtest-${runDate}.md`);
  writeFileSync(path, report);
  console.log(report);
  console.log(`리포트: ${path}`);

  if (!write) return;
  const kr = Prisma.sql`sample_origin = 'backtest' AND signal_type LIKE 'kr_stock.%'`;
  const data = samples.map((sample) => ({
    symbol: sample.symbol,
    mode: "long_term",
    action: sample.action,
    signalType: judgmentSignalType("long_term", sample.action, "kr_stock"),
    score: sample.score,
    reasons: sample.reasons,
    entryPrice: new Prisma.Decimal(sample.entryPrice),
    judgedAt: sample.judgedAt,
    sampleOrigin: "backtest",
    ruleVersion: MODE_DECISION_RULE_VERSION,
    exitPrice: new Prisma.Decimal(sample.exitPrice),
    returnRate: new Prisma.Decimal(sample.returnRate.toFixed(6)),
    outcome: sample.outcome,
    evaluatedAt: sample.evaluatedAt,
  }));
  const chunks: (typeof data)[] = [];
  for (let i = 0; i < data.length; i += INSERT_CHUNK) chunks.push(data.slice(i, i + INSERT_CHUNK));
  // 지우기 + 넣기를 한 트랜잭션으로 — 중간에 실패하면 이전 백테스트가 그대로 남는다. 라이브 · 코인 행은 조건 밖
  const [deleted, ...inserted] = await prisma.$transaction([
    prisma.$executeRaw`DELETE FROM symbol_judgment_snapshots WHERE ${kr}`,
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
