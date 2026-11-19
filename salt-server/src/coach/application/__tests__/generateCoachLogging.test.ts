import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  CoachGenerationLogStore,
  CoachInsightStore,
  CoachNotifier,
  CoachProfileStore,
  MarketProbe,
  PortfolioProbe,
} from "../../domain";
import type { AnalyzeNewsSentiment } from "../AnalyzeNewsSentiment";
import { COACH_GENERATION_LOG_KEEP_DAYS, GenerateCoachRecommendation } from "../GenerateCoachRecommendation";
import type { GetSymbolCoach } from "../GetSymbolCoach";

/**
 * 생성 기록 (`DB-REQ-017` FR-13 · 14 · `SRV-REQ-024` FR-84).
 *
 * 보유가 없으면 생성은 종목 판단으로 넘어간다 — 가장 짧은 성공 경로라 그걸로 기록만 본다.
 */

const T0 = new Date("2026-09-23T00:00:00Z");

const logs = () => {
  const events: Array<[string, ...unknown[]]> = [];
  const store = {
    start: async (...args: unknown[]) => (events.push(["start", ...args]), "log-1"),
    finish: async (...args: unknown[]) => void events.push(["finish", ...args]),
    pruneBefore: async (before: Date) => (events.push(["prune", before]), 0),
  } as unknown as CoachGenerationLogStore;
  return { events, store };
};

const build = (
  store: CoachGenerationLogStore,
  news: () => Promise<Map<string, never>>
) => {
  let tick = 0;
  return new GenerateCoachRecommendation(
    { findByUser: async () => null } as unknown as CoachProfileStore,
    { findActiveForScoring: async () => [] } as unknown as CoachInsightStore,
    {
      dailyBarCounts: async (symbols: string[]) => new Map(symbols.map((s) => [s, 365])),
      latestIndicators: async () => new Map(),
      latestSentiments: async () => new Map(),
    } as unknown as MarketProbe,
    { listHoldings: async () => [] } as unknown as PortfolioProbe,
    {} as CoachNotifier,
    { execute: news } as unknown as AnalyzeNewsSentiment,
    { execute: async () => ({ symbol: "BTC" }) } as unknown as GetSymbolCoach,
    store,
    () => new Date(T0.getTime() + 250 * tick++)
  );
};

describe("GenerateCoachRecommendation — 생성 기록", () => {
  it("워커 호출은 스스로 기록을 열고 성공으로 닫는다", async () => {
    const { events, store } = logs();
    await build(store, async () => new Map()).execute("u1");

    assert.deepEqual(events[0], ["start", "u1", "worker", T0]);
    assert.deepEqual(events[1], [
      "finish",
      "log-1",
      { status: "succeeded", llmSource: "rule", durationMs: 250, errorCode: null },
    ]);
  });

  it("넘겨받은 기록이 있으면 새로 열지 않는다", async () => {
    const { events, store } = logs();
    await build(store, async () => new Map()).execute("u1", {}, {
      source: "manual",
      logId: "req-9",
    });

    assert.equal(events.filter(([kind]) => kind === "start").length, 0);
    assert.equal(events[0][1], "req-9");
  });

  it("실패를 기록하고 다시 던진다 — 오류 메시지는 남기지 않는다", async () => {
    const { events, store } = logs();

    await assert.rejects(
      build(store, async () => {
        throw new TypeError("secret upstream body");
      }).execute("u1"),
      TypeError
    );

    const finish = events.find(([kind]) => kind === "finish")!;
    assert.deepEqual(finish[2], {
      status: "failed",
      llmSource: null,
      durationMs: 250,
      errorCode: "TypeError",
    });
  });

  it("생성마다 보존 기한(90일) 앞 기록을 지운다 — 성공 · 실패 모두", async () => {
    const ok = logs();
    await build(ok.store, async () => new Map()).execute("u1");
    const failed = logs();
    await assert.rejects(
      build(failed.store, async () => {
        throw new Error("x");
      }).execute("u1")
    );

    const cutoff = new Date(T0.getTime() - COACH_GENERATION_LOG_KEEP_DAYS * 86_400_000);
    for (const { events } of [ok, failed]) {
      assert.deepEqual(events.filter(([kind]) => kind === "prune"), [["prune", cutoff]]);
    }
    assert.equal(cutoff.toISOString(), "2026-06-25T00:00:00.000Z");
  });

  it("지우기가 실패해도 생성은 그대로 끝난다", async () => {
    const store = {
      start: async () => "log-1",
      finish: async () => undefined,
      pruneBefore: async () => {
        throw new Error("db down");
      },
    } as unknown as CoachGenerationLogStore;

    assert.deepEqual(await build(store, async () => new Map()).execute("u1"), { symbol: "BTC" });
  });

  it("기록이 실패해도 생성은 계속한다", async () => {
    const broken = {
      start: async () => {
        throw new Error("db down");
      },
      finish: async () => undefined,
    } as unknown as CoachGenerationLogStore;

    const result = await build(broken, async () => new Map()).execute("u1");
    assert.deepEqual(result, { symbol: "BTC" });
  });
});
