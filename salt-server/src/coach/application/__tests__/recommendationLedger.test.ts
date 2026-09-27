import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  CoachAction,
  JudgmentEvaluation,
  JudgmentOutcome,
  MarketProbe,
  PendingRecommendation,
  RecommendationCase,
  RecommendationFilter,
  RecommendationSnapshotDraft,
  RecommendationSnapshotStore,
} from "../../domain";
import { judgeRecommendationOutcome, isRecommendationSnapshotDue } from "../../domain";
import { GetSignalPerformance } from "../GetSignalPerformance";
import { EvaluateCoachRecommendations } from "../RecordCoachRecommendations";

/** 저장 추천 스냅샷 → 30일 뒤 채점 → 성적표 (F010 슬라이스 0). 저장소는 메모리다. */

const T0 = new Date("2026-09-01T00:00:00Z");
const daysAfter = (d: number) => new Date(T0.getTime() + d * 86_400_000);

type Row = RecommendationSnapshotDraft & { id: string; exitPrice?: number; returnRate?: number; outcome?: JudgmentOutcome };

class MemoryLedger implements RecommendationSnapshotStore {
  rows: Row[] = [];
  async lastJudgedAt(userId: string) {
    const m = new Map<string, Date>();
    for (const r of this.rows) {
      if (r.userId !== userId) continue;
      const k = `${r.symbol}:${r.action}`;
      const prev = m.get(k);
      if (!prev || prev < r.judgedAt) m.set(k, r.judgedAt);
    }
    return m;
  }
  async saveSnapshot(d: RecommendationSnapshotDraft) {
    this.rows.push({ ...d, id: String(this.rows.length + 1) });
    return true;
  }
  async listPending(judgedBefore: Date, limit: number) {
    return this.rows
      .filter((r) => !r.outcome && r.judgedAt <= judgedBefore)
      .slice(0, limit)
      .map((r): PendingRecommendation => ({ id: r.id, symbol: r.symbol, action: r.action, entryPrice: r.entryPrice, judgedAt: r.judgedAt }));
  }
  async saveEvaluations(evals: JudgmentEvaluation[]) {
    for (const e of evals) Object.assign(this.rows.find((r) => r.id === e.id)!, e);
  }
  private scoped(userId: string, f: RecommendationFilter) {
    return this.rows.filter(
      (r) => r.userId === userId && r.outcome && (!f.signalType || r.signalType === f.signalType) && (!f.symbol || r.symbol === f.symbol)
    );
  }
  async summarize(userId: string, f: RecommendationFilter) {
    const done = this.scoped(userId, f);
    const returns = done.map((r) => r.returnRate!);
    return {
      sample: done.length,
      hits: done.filter((r) => r.outcome === "hit").length,
      aboveCost: returns.filter((r) => r > 0.001).length,
      avgReturn: returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : null,
      worstReturn: returns.length ? Math.min(...returns) : null,
    };
  }
  async recentCases(userId: string, f: RecommendationFilter, outcome: JudgmentOutcome | null, limit: number) {
    return this.scoped(userId, f)
      .filter((r) => !outcome || r.outcome === outcome)
      .sort((a, b) => b.judgedAt.getTime() - a.judgedAt.getTime())
      .slice(0, limit)
      .map(
        (r): RecommendationCase => ({
          symbol: r.symbol,
          action: r.action,
          judgedAt: r.judgedAt,
          entryPrice: r.entryPrice,
          exitPrice: r.exitPrice!,
          returnRate: r.returnRate!,
          outcome: r.outcome!,
        })
      );
  }
}

const draft = (over: Partial<RecommendationSnapshotDraft> = {}): RecommendationSnapshotDraft => ({
  userId: "u1",
  symbol: "BTC",
  action: "buy",
  signalType: "coach.buy",
  score: 70,
  reasons: ["RSI 과매도"],
  entryPrice: 100,
  judgedAt: T0,
  ...over,
});

describe("judgeRecommendationOutcome — 수수료 포함", () => {
  it("사라: > 0.1% · 팔라: < −0.1% · 보유 · 리밸런싱: ±10% 안", () => {
    assert.equal(judgeRecommendationOutcome("buy", 0.0011), "hit");
    assert.equal(judgeRecommendationOutcome("buy", 0.001), "miss");
    assert.equal(judgeRecommendationOutcome("sell", -0.0011), "hit");
    assert.equal(judgeRecommendationOutcome("sell", 0), "miss");
    assert.equal(judgeRecommendationOutcome("hold", 0.1), "hit");
    assert.equal(judgeRecommendationOutcome("rebalance", -0.11), "miss");
  });
  it("같은 종목 · 행동은 30일에 한 번만 쓴다", () => {
    assert.equal(isRecommendationSnapshotDue(null, T0), true);
    assert.equal(isRecommendationSnapshotDue(T0, daysAfter(29)), false);
    assert.equal(isRecommendationSnapshotDue(T0, daysAfter(30)), true);
  });
});

describe("EvaluateCoachRecommendations", () => {
  it("30일이 지난 것만 일봉 종가로 판정하고, 종가가 없으면 미룬다", async () => {
    const ledger = new MemoryLedger();
    await ledger.saveSnapshot(draft());
    await ledger.saveSnapshot(draft({ symbol: "ETH", action: "sell" }));
    await ledger.saveSnapshot(draft({ symbol: "SOL", judgedAt: daysAfter(5) }));

    const asked: string[] = [];
    const market = {
      closeAtOrAfter: async (symbol: string, _at: Date, timeframe: string) => {
        asked.push(timeframe);
        return symbol === "BTC" ? 103 : null;
      },
    } as unknown as MarketProbe;

    const result = await new EvaluateCoachRecommendations(market, ledger, () => daysAfter(31)).execute();
    assert.deepEqual(result, { evaluated: 1, waitingForPrice: 1 });
    assert.deepEqual([...new Set(asked)], ["d1"]);
    assert.equal(ledger.rows[0].outcome, "hit"); // buy +3%
    assert.equal(ledger.rows[2].outcome, undefined); // SOL 은 아직 26일째
  });
});

describe("GetSignalPerformance — 원장 기반", () => {
  const seeded = async (n: number, miss: number) => {
    const ledger = new MemoryLedger();
    for (let i = 0; i < n; i++) {
      await ledger.saveSnapshot(draft({ judgedAt: daysAfter(-i * 31), symbol: i % 2 ? "BTC" : "ETH" }));
    }
    await ledger.saveEvaluations(
      ledger.rows.map((r, i) => ({
        id: r.id,
        exitPrice: i < miss ? 95 : 105,
        returnRate: i < miss ? -0.05 : 0.05,
        outcome: (i < miss ? "miss" : "hit") as JudgmentOutcome,
        evaluatedAt: daysAfter(40),
      }))
    );
    return ledger;
  };

  it("표본 20 미만이면 insufficient_data 이고 숫자는 그대로 싣는다", async () => {
    const view = await new GetSignalPerformance(await seeded(5, 2)).execute("u1");
    assert.equal(view.status, "insufficient_data");
    assert.equal(view.sampleCount, 5);
    assert.equal(view.winRate, 0.6);
    assert.equal(view.signalType, "coach");
    assert.equal(view.excessWinRate, null); // 행동 무관 그룹엔 기저율이 없다
  });

  it("행동을 주면 coach.<action> 그룹 · 기저율 대비 초과 · 표본은 채점 결과다", async () => {
    const view = await new GetSignalPerformance(await seeded(24, 6)).execute("u1", { signalKey: "buy" });
    assert.equal(view.status, "active");
    assert.equal(view.signalType, "coach.buy");
    assert.equal(view.winRate, 0.75);
    assert.equal(view.alwaysUpRate, 0.75); // 오른 것 = 적중한 것
    assert.equal(view.excessWinRate, 0);
    assert.equal(view.samples.length, 20);
    assert.ok("exitPrice" in view.samples[0] && !("latestPrice" in view.samples[0]));
  });

  it("종목 필터는 그 종목만 센다", async () => {
    const view = await new GetSignalPerformance(await seeded(10, 0)).execute("u1", { symbol: "btc" });
    assert.equal(view.sampleCount, 5);
  });

  it("다른 사용자의 표본은 보이지 않는다", async () => {
    const ledger = await seeded(4, 0);
    const view = await new GetSignalPerformance(ledger).execute("u2");
    assert.equal(view.sampleCount, 0);
    assert.equal(view.winRate, null);
  });
});

const _actions: CoachAction[] = ["buy", "sell", "hold", "rebalance"];
void _actions;
