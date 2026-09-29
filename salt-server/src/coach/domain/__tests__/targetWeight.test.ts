import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import Decimal from "decimal.js";

import { Money } from "../../../shared/domain";
import {
  buildTargetWeightGuide,
  nearestTargetRecord,
  nextWeeklyRebalance,
  TARGET_WEIGHT_ALT_SHARE,
  TARGET_WEIGHT_ALT_SHARE_RECORD,
  TARGET_WEIGHT_BACKTEST,
  targetWeights,
  type TargetWeightInput,
} from "../policy";

/**
 * 목표 비중 안내 (F010 슬라이스 5 · `SRV-REQ-024` FR-182~186 · 사전등록 `target-weight@1`).
 *
 * 고정 벡터는 `salt-forecast/tests/domain/test_target_weight.py` `GOLDEN` 과 같다 — 규칙이 두 벌로 갈라지면
 * 화면 비중과 과거 성적이 다른 규칙의 것이 된다.
 */

const d = (values: Array<number | null>) => values.map((v) => (v === null ? null : new Decimal(v)));
const close = (actual: Decimal, expected: number) =>
  assert.ok(actual.minus(expected).abs().lt(1e-12), `${actual.toString()} ≠ ${expected}`);

describe("targetWeights — Python 과 같은 고정 벡터", () => {
  const golden: Array<[Array<number | null>, number, number, number[]]> = [
    [[0.5, 0.7], 0.15, 0.6, [0.15, 0.15 / 1.4]],
    [[0.5, 0.7, 1.4], 0.3, 0.6, [0.2, 0.1 / 0.7, 0.1 / 1.4]],
    [[0.4], 0.5, 0.6, [0.6]],
    [[0.4, null], 0.2, 0.6, [0.5, 0]],
  ];
  for (const [sigma, target, cap, expected] of golden) {
    it(`σ ${JSON.stringify(sigma)} · 목표 ${target}`, () => {
      const got = targetWeights(d(sigma), new Decimal(target), new Decimal(cap));
      got.forEach((w, i) => close(w, expected[i]));
    });
  }

  it("σ 가 하나도 없으면 전부 현금", () => {
    assert.deepEqual(
      targetWeights(d([null, 0]), new Decimal(0.15), new Decimal(0.6)).map((w) => w.toNumber()),
      [0, 0]
    );
  });
});

describe("nextWeeklyRebalance — 다음 월요일 00:00 UTC", () => {
  it("수요일 → 다음 월요일", () => {
    assert.equal(nextWeeklyRebalance(new Date("2026-09-30T05:00:00Z")).toISOString(), "2026-10-05T00:00:00.000Z");
  });
  it("월요일 00:00 정각 → 한 주 뒤", () => {
    assert.equal(nextWeeklyRebalance(new Date("2026-09-28T00:00:00Z")).toISOString(), "2026-10-05T00:00:00.000Z");
  });
  it("일요일 → 다음 날", () => {
    assert.equal(nextWeeklyRebalance(new Date("2026-10-04T23:59:00Z")).toISOString(), "2026-10-05T00:00:00.000Z");
  });
});

/**
 * 기준 입력: 투자금 10,000,000원 · BTC σ 0.5 · ETH σ 0.7 · SOL σ 1.0 보유 1,000,000원 · 목표 σ 0.15 · 상한 0.6.
 * `target-weight@2` 채택 없음 → 규칙은 BTC · ETH 둘 → w = 0.15 / (2σ) = BTC 0.15 · ETH 0.107…, SOL 은 `no_record`
 */
const asOf = new Date("2026-09-29T00:00:00Z");
const base = (overrides: Partial<TargetWeightInput> = {}): TargetWeightInput => ({
  investableCapital: Money.krw(10_000_000),
  holdings: [{ symbol: "SOL", quantity: new Decimal(4), value: Money.krw(1_000_000) }],
  prices: new Map([
    ["BTC", Money.krw(100_000_000)],
    ["ETH", Money.krw(5_000_000)],
    ["SOL", Money.krw(250_000)],
  ]),
  risk: new Map([
    ["BTC", { sigma: new Decimal(0.5), btcBeta: 1, asOf }],
    ["ETH", { sigma: new Decimal(0.7), btcBeta: 1.2, asOf }],
    ["SOL", { sigma: new Decimal(1.0), btcBeta: null, asOf }],
  ]),
  targetVolatility: new Decimal(0.15),
  maxSingleAssetWeight: new Decimal(0.6),
  monthlyBudgetRemaining: Money.krw(500_000),
  now: new Date("2026-09-30T05:00:00Z"),
  ...overrides,
});

describe("buildTargetWeightGuide", () => {
  it("알트 몫 채택 없음 — 규칙은 BTC · ETH 만, 보유 알트는 no_record 로 빠지고 부족 · 초과가 없다", () => {
    assert.equal(TARGET_WEIGHT_ALT_SHARE, null);
    const guide = buildTargetWeightGuide(base());
    assert.equal(guide.status, "ok");
    assert.equal(guide.basis, "investable_capital");
    assert.deepEqual(guide.rows.map((row) => row.symbol), ["BTC", "ETH"]);
    const [btc, eth] = guide.rows;
    close(btc.targetWeight, 0.15);
    close(eth.targetWeight, 0.15 / 1.4);
    assert.equal(btc.status, "under");
    assert.equal(btc.gapValue.toKrwInteger(), 1_500_000);
    close(btc.gapQuantity, 0.015);
    assert.equal(btc.gapCapped, false);
    assert.deepEqual(guide.excluded, [
      { symbol: "SOL", held: true, reason: "no_record", currentValue: Money.krw(1_000_000) },
    ]);
    // 규칙 밖 보유도 지금 노출에는 들어간다
    close(guide.totals.currentExposure, 0.1);
    close(guide.totals.outsideRuleWeight, 0.1);
    assert.equal(guide.expiresAt.toISOString(), "2026-10-05T00:00:00.000Z");
  });

  it("같은 σ 면 core 비중은 보유 알트와 무관하다 — 라이브 원장 모델 포트폴리오와 같은 비중", () => {
    const withAlt = buildTargetWeightGuide(base()).rows.map((row) => row.targetWeight.toNumber());
    const without = buildTargetWeightGuide(base({ holdings: [] })).rows.map((row) => row.targetWeight.toNumber());
    assert.deepEqual(withAlt, without);
  });

  it("부족분은 쓸 수 있는 돈 안으로 비례해서 줄인다 — 알트를 팔아 채우는 계산을 만들지 않는다", () => {
    // 투자금 없음 → 전체 = SOL 평가금 1,000,000 · 현금 0 · core 초과 없음 → 쓸 수 있는 돈 0
    const guide = buildTargetWeightGuide(base({ investableCapital: null }));
    assert.equal(guide.basis, "crypto_value");
    assert.equal(guide.totals.fundable.toKrwInteger(), 0);
    for (const row of guide.rows) {
      assert.equal(row.status, "no_room");
      assert.equal(row.gapCapped, true);
      assert.equal(row.gapValue.toKrwInteger(), 0);
      assert.ok(row.targetWeight.gt(0)); // 비중은 줄이지 않는다
    }
  });

  it("쓸 수 있는 돈이 모자라면 두 부족분을 같은 비율로 줄인다", () => {
    // 투자금 2,000,000 · SOL 1,000,000 → 현금 1,000,000. 부족 BTC 300,000 + ETH 214,285 = 514,285 < 1,000,000 → 그대로
    const loose = buildTargetWeightGuide(base({ investableCapital: Money.krw(2_000_000) }));
    assert.ok(loose.rows.every((row) => !row.gapCapped));
    // 투자금 1,200,000 → 현금 200,000 < 부족 합 → 200,000 을 비례로
    const tight = buildTargetWeightGuide(base({ investableCapital: Money.krw(1_200_000) }));
    const sum = tight.rows.reduce((acc, row) => acc + row.gapValue.toDecimal().toNumber(), 0);
    assert.ok(Math.abs(sum - 200_000) < 1e-6);
    assert.ok(tight.rows.every((row) => row.gapCapped && row.status === "under"));
  });

  it("손절선은 기준가 × exp(−σ√(20/365)), 손절 손실엔 양쪽 수수료가 들어간다", () => {
    const [btc] = buildTargetWeightGuide(base()).rows;
    const sigmaH = 0.5 * Math.sqrt(20 / 365);
    const stop = 100_000_000 * Math.exp(-sigmaH);
    assert.equal(btc.stopPrice.toKrwInteger(), Math.round(stop));
    const loss = (100_000_000 - stop + (100_000_000 + stop) * 0.0005) * 0.015;
    assert.ok(Math.abs(btc.lossAtStop.toDecimal().toNumber() - loss) < 1e-6);
    close(btc.sigmaBand.low, 0.375);
    close(btc.sigmaBand.high, 0.625);
  });

  it("베타 합은 베타 있는 종목만 세고 얼마를 셌는지 알린다", () => {
    const risk = new Map(base().risk);
    risk.set("ETH", { sigma: new Decimal(0.7), btcBeta: null, asOf });
    const guide = buildTargetWeightGuide(base({ risk }));
    close(guide.totals.targetBetaSum!, 0.15);
    close(guide.totals.betaCoveredWeight!, 0.15 / (0.15 + 0.15 / 1.4));
  });

  it("σ 가 없는 core 는 비중에서 빠지고 사유가 붙는다 — 0 으로 채우지 않는다", () => {
    const risk = new Map(base().risk);
    risk.set("ETH", { sigma: null, btcBeta: null, asOf });
    const guide = buildTargetWeightGuide(base({ risk }));
    assert.deepEqual(guide.rows.map((row) => row.symbol), ["BTC"]);
    assert.deepEqual(
      guide.excluded.map((row) => [row.symbol, row.reason]),
      [["SOL", "no_record"], ["ETH", "volatility_unavailable"]]
    );
  });

  it("투자금이 보유보다 작으면 보유 합을 쓰고 표시한다", () => {
    const guide = buildTargetWeightGuide(base({ investableCapital: Money.krw(500_000) }));
    assert.equal(guide.capitalBelowHoldings, true);
    assert.equal(guide.capital.toKrwInteger(), 1_000_000);
  });

  it("투자금도 보유도 없으면 no_capital", () => {
    const guide = buildTargetWeightGuide(base({ investableCapital: null, holdings: [] }));
    assert.equal(guide.status, "no_capital");
    assert.equal(guide.rows.length, 2);
  });

  it("최소 주문 금액보다 작은 차는 맞음", () => {
    const holdings = [
      ...base().holdings,
      { symbol: "BTC", quantity: new Decimal("0.01497"), value: Money.krw(1_497_000) },
    ];
    const guide = buildTargetWeightGuide(base({ holdings }));
    assert.equal(guide.rows.find((row) => row.symbol === "BTC")!.status, "at");
  });

  it("core 초과분은 다른 core 부족분에 쓸 수 있는 돈으로 센다", () => {
    const holdings = [{ symbol: "BTC", quantity: new Decimal("0.05"), value: Money.krw(5_000_000) }];
    const guide = buildTargetWeightGuide(base({ investableCapital: null, holdings }));
    // 전체 5,000,000 · BTC 목표 750,000 → 초과 4,250,000, ETH 부족 535,714 는 그 안에 들어간다
    const eth = guide.rows.find((row) => row.symbol === "ETH")!;
    assert.equal(eth.status, "under");
    assert.equal(eth.gapCapped, false);
    assert.equal(guide.rows.find((row) => row.symbol === "BTC")!.status, "over");
  });

  it("모두 손절선에 닿으면 남은 월 예산의 몇 % 인지", () => {
    const guide = buildTargetWeightGuide(base());
    const total = guide.rows.reduce((sum, row) => sum + row.lossAtStop.toDecimal().toNumber(), 0);
    close(guide.totals.lossAtStopMonthlyBudgetRatio!, total / 500_000);
    assert.equal(buildTargetWeightGuide(base({ monthlyBudgetRemaining: null })).totals.lossAtStopMonthlyBudgetRatio, null);
  });
});

describe("TARGET_WEIGHT_BACKTEST — 리포트와 같은 값", () => {
  const report = readFileSync(
    resolve(__dirname, "../../../../../", TARGET_WEIGHT_BACKTEST.report),
    "utf8"
  );
  // 리포트는 소수 1자리 % — 나눗셈 부동소수 찌꺼기를 지운다
  const pct = (cell: string) => Number((Number(cell.replace("%", "")) / 100).toFixed(4));

  it("core 1차 표의 값 · 판정을 그대로 옮겼다", () => {
    const primary = report.split("## 기준 곡선")[0];
    const lines = primary.split("\n").filter((line) => line.startsWith("| core |"));
    assert.equal(lines.length, TARGET_WEIGHT_BACKTEST.records.length);
    for (const line of lines) {
      const cells = line.split("|").map((cell) => cell.trim()).slice(1, -1);
      const record = TARGET_WEIGHT_BACKTEST.records.find((r) => r.target === Number(cells[1]))!;
      assert.ok(record, `목표 ${cells[1]} 기록 없음`);
      assert.equal(record.strategy.cagr, pct(cells[2]));
      assert.equal(record.strategy.vol, pct(cells[3]));
      assert.equal(record.strategy.mdd, -pct(cells[4]));
      assert.equal(record.strategy.upside, Number(cells[6]));
      assert.equal(record.strategy.downside, Number(cells[7]));
      assert.equal(record.strategy.exposureMean, Number(cells[8]));
      assert.equal(record.claims.lessDrawdown, cells[11] === "✓");
      assert.equal(record.claims.timing, cells[12] === "✓");
      assert.equal(record.claims.targetHit, cells[13] === "✓");
    }
  });

  it("실패 사례 달이 리포트 순서와 같다", () => {
    for (const record of TARGET_WEIGHT_BACKTEST.records) {
      const section = report.split(`### core · 목표 σ ${record.target.toFixed(2)}`)[1].split("###")[0];
      const months = [...section.matchAll(/\| (놓친 상승|가장 크게 잃은 달) \| (\d{4}-\d{2}) \|/g)];
      assert.deepEqual(
        months.filter((m) => m[1] === "놓친 상승").map((m) => m[2]),
        record.missedUpside.map((m) => m.month)
      );
      assert.deepEqual(
        months.filter((m) => m[1] !== "놓친 상승").map((m) => m[2]),
        record.worstMonths.map((m) => m.month)
      );
    }
  });

  it("가장 가까운 목표, 같은 거리면 작은 쪽", () => {
    assert.equal(nearestTargetRecord(0.15).target, 0.15);
    assert.equal(nearestTargetRecord(0.25).target, 0.2);
    assert.equal(nearestTargetRecord(0.9).target, 0.5);
  });
});

describe("TARGET_WEIGHT_ALT_SHARE_RECORD — target-weight@2 리포트와 같은 값", () => {
  const report = readFileSync(resolve(__dirname, "../../../../..", TARGET_WEIGHT_ALT_SHARE_RECORD.report), "utf8");
  it("판정 없음 · 0.15 행 ΔCalmar CI 를 그대로 옮겼다", () => {
    assert.match(report, /판정: \*\*채택 없음/);
    for (const candidate of TARGET_WEIGHT_ALT_SHARE_RECORD.candidates) {
      const line = report.split("\n").find((l) => l.startsWith(`| ${candidate.altShare.toFixed(2)} | 0.15 |`))!;
      // 리포트는 소수 2자리 — "−0.03 [−0.11, −0.00]"
      const cell = line.split("|").map((c) => c.trim())[13];
      const got = cell.match(/-?\d+\.\d+/g)!.map(Number);
      candidate.deltaCalmar.forEach((x, i) => assert.ok(Math.abs(x - got[i]) <= 0.005 + 1e-9, `${cell} vs ${x}`));
      assert.ok(candidate.deltaCalmar[1] < 0); // 판정 기준 (1) 실패
    }
  });
});
