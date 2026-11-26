import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Decimal } from "decimal.js";

import type { ExplanationSnapshotRecord, ExplanationSnapshotStore } from "../../domain";
import { ListSymbolExplanationHistory } from "../ListSymbolExplanationHistory";

// 2026-11-26 13:35 KST
const NOW = new Date("2026-11-26T04:35:00Z");
const cite = [{ id: "quote", label: "시세", at: null, url: null }];
const record = (generatedAt: string, action = "wait"): ExplanationSnapshotRecord => ({
  symbol: "005930",
  mode: "long_term",
  fingerprint: generatedAt,
  action,
  source: "llm_checked",
  provider: "local_claude",
  sentences: [
    { section: "modeReasoning", text: "그날 문장", citations: cite },
    { section: "track", text: "지금 값 성적 문장", citations: cite },
    { section: "miss", text: "지금 값 빗나간 문장", citations: cite },
  ],
  verifier: { sentences: 3, dropped: 0, promptVersion: "p", verifierVersion: "v" },
  factsHash: "h",
  generatedAt: new Date(generatedAt),
});

const setup = (records: ExplanationSnapshotRecord[], opts: { closesFail?: boolean } = {}) => {
  const calls: Array<{ since: Date; before: Date; limit: number }> = [];
  const store: ExplanationSnapshotStore = {
    find: async () => null,
    save: async () => true,
    prune: async () => 0,
    listDaily: async (_s, _m, o) => {
      calls.push(o);
      return records;
    },
  };
  const bar = (day: string, close: number) => ({ openTime: new Date(`${day}T00:00:00Z`), close: new Decimal(close) });
  const useCase = new ListSymbolExplanationHistory({
    store,
    market: { quotes: async () => new Map([["005930", { currentPrice: 174500 } as never]]) },
    closes: {
      dailyCloses: async () => {
        if (opts.closesFail) throw new Error("view down");
        return new Map([["005930", [bar("2026-11-23", 177500), bar("2026-11-24", 189400), bar("2026-11-25", 170700)]]]);
      },
    },
    now: () => NOW,
  });
  return { useCase, calls };
};

describe("ListSymbolExplanationHistory — 지난 날 해설(SRV-REQ-063 FR-4)", () => {
  it("오늘(KST) 0시 전만 · 30일 안을 묻는다", async () => {
    const { useCase, calls } = setup([]);
    const view = await useCase.execute("005930", "long_term", 7);
    assert.deepEqual(view.days, []);
    assert.equal(calls[0]!.before.toISOString(), "2026-11-25T15:00:00.000Z");
    assert.equal(calls[0]!.limit, 7);
    assert.equal(NOW.getTime() - calls[0]!.since.getTime(), 30 * 86_400_000);
  });

  it("저장 원문 그대로 · 지금 값 문장(track · miss)은 뺀다 · 그날 · 그 뒤 등락은 서버가 나눈다", async () => {
    // 11-25 15:40 KST(폭락한 날) · 11-24 14:00 KST
    const { useCase } = setup([record("2026-11-25T06:40:00Z"), record("2026-11-24T05:00:00Z", "avoid")]);
    const view = await useCase.execute("005930", "long_term", 7);
    assert.deepEqual(
      view.days.map((d) => [d.tradeDay, d.action, d.dayChangeRate, d.changeSinceRate, d.sentences.map((s) => s.section)]),
      [
        ["2026-11-25", "wait", -9.87, 2.23, ["modeReasoning"]],
        ["2026-11-24", "avoid", 6.7, -7.87, ["modeReasoning"]],
      ]
    );
  });

  it("KST 자정 근처 — 11-25 00:30 KST 해설은 11-25 날이다(UTC 로는 11-24)", async () => {
    const { useCase } = setup([record("2026-11-24T15:30:00Z")]);
    const [day] = (await useCase.execute("005930", "long_term", 7)).days;
    assert.equal(day!.tradeDay, "2026-11-25");
  });

  it("일봉을 못 읽어도 문장은 그대로 — 숫자만 null", async () => {
    const { useCase } = setup([record("2026-11-25T06:40:00Z")], { closesFail: true });
    const [day] = (await useCase.execute("005930", "long_term", 7)).days;
    assert.equal(day!.sentences.length, 1);
    assert.equal(day!.dayChangeRate, null);
    assert.equal(day!.changeSinceRate, null);
  });

  it("그날 봉이 없으면(휴장일) 등락 null · 첫 봉은 전 봉이 없어 그날 등락 null", async () => {
    const { useCase } = setup([record("2026-11-22T05:00:00Z"), record("2026-11-23T05:00:00Z")]);
    const view = await useCase.execute("005930", "long_term", 7);
    assert.deepEqual(
      view.days.map((d) => [d.tradeDay, d.dayChangeRate, d.changeSinceRate]),
      [
        ["2026-11-22", null, null],
        ["2026-11-23", null, -1.69],
      ]
    );
  });
});
