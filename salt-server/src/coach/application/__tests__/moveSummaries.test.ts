import assert from "node:assert/strict";

import { reservedCallsBehind } from "../../domain";
import { describe, it } from "node:test";

import type {
  MoveCard,
  MoveCardReader,
  MoveSummaryPrompt,
  MoveSummaryRecord,
  MoveSummaryStore,
  MoveSummaryWriter,
  StoredMoveSummary,
} from "../../domain";
import { MOVE_SUMMARY_BATCH_MAX_PER_RUN, MOVE_SUMMARY_DAILY_ATTEMPTS } from "../../domain";
import { GenerateMoveSummaries } from "../GenerateMoveSummaries";
import { GetMoveSummary } from "../GetMoveSummary";
import { MoveSummaryDemand } from "../lib/moveSummaryDemand";

/** 오늘 등락 한 줄 배치 · 읽기 — F016 단계 D · `SRV-REQ-052` FR-1 · 4 · 5 · 6 · 7 */

const NOW = new Date("2026-11-12T14:00:00+09:00");

const cardOf = (symbol: string, over: Partial<MoveCard> = {}): MoveCard => ({
  asset: /^\d{6}$/.test(symbol) ? "kr" : "crypto",
  symbol,
  date: "2026-11-12",
  show: true,
  split: { total: 12, market: 1, sector: null, idio: 11, method: "regression" },
  facts: [{ id: `f:${symbol}:1`, kind: "disclosure", at: new Date("2026-11-12T09:30:00+09:00"), source: "KRX", title: "단일판매ㆍ공급계약체결", value: null }],
  ...over,
});

class MemoryStore implements MoveSummaryStore {
  rows: MoveSummaryRecord[] = [];
  async day(asset: string, symbol: string, date: string, fingerprint: string) {
    const day = this.rows.filter((r) => r.asset === asset && r.symbol === symbol && r.date === date).reverse();
    const pick = (r?: MoveSummaryRecord): StoredMoveSummary | null =>
      r ? { fingerprint: r.fingerprint, gate: r.gate, text: r.text, citations: r.citations, generatedAt: r.generatedAt } : null;
    return { current: pick(day.find((r) => r.fingerprint === fingerprint)), latestOk: pick(day.find((r) => r.gate === "ok")), attempts: day.length };
  }
  async save(r: MoveSummaryRecord) {
    if (this.rows.some((x) => x.asset === r.asset && x.symbol === r.symbol && x.date === r.date && x.fingerprint === r.fingerprint)) return false;
    this.rows.push(r);
    return true;
  }
}

const setup = (cards: Record<string, MoveCard | null>, reply: (p: MoveSummaryPrompt) => string = () => "같은 날 공급계약 공시가 있었어요[1].") => {
  const store = new MemoryStore();
  const prompts: MoveSummaryPrompt[] = [];
  const writer: MoveSummaryWriter = {
    write: async (p) => {
      prompts.push(p);
      return { text: reply(p), provider: "gemini", model: "test" };
    },
  };
  const reader: MoveCardReader = { card: async (_a, s) => cards[s] ?? null };
  const demand = new MoveSummaryDemand();
  const batch = (enabled = true, usedCalls?: number) =>
    new GenerateMoveSummaries({
      ...(usedCalls === undefined
        ? {}
        : { usage: { record: async () => {}, markDropped: async () => {}, usageSince: async () => ({ calls: usedCalls, tokens: 0 }) } }),
      cards: reader,
      store,
      writer,
      tracked: { listTrackedSymbols: async () => Object.keys(cards) },
      demand,
      names: async (s) => new Map(s.map((x) => [x, `이름-${x}`])),
      enabled,
      now: () => NOW,
    });
  const read = (enabled = true) => new GetMoveSummary({ cards: reader, store, demand, enabled, now: () => NOW });
  return { store, prompts, batch, read, demand };
};

describe("GenerateMoveSummaries", () => {
  it("카드가 서고 조용하지 않은 종목만 · 같은 지문은 LLM 1회", async () => {
    const t = setup({
      "123456": cardOf("123456"),
      "654321": cardOf("654321", { show: false }),
      BTC: cardOf("BTC", { facts: [] }),
    });
    const first = await t.batch().execute();
    assert.equal(first.generated, 1);
    assert.equal(t.prompts.length, 1);
    assert.equal(t.prompts[0]!.name, "이름-123456");
    assert.equal(t.prompts[0]!.dominant, "idio");
    const second = await t.batch().execute();
    assert.equal(second.generated, 0);
    assert.equal(t.prompts.length, 1, "같은 지문 두 번 → LLM 1회");
  });

  it("검사가 막은 시도도 남긴다 — 다시 부르지 않는다", async () => {
    const t = setup({ "123456": cardOf("123456") }, () => "공시 때문에 올랐어요[1].");
    const r = await t.batch().execute();
    assert.equal(r.blocked, 1);
    assert.equal(t.store.rows[0]!.gate, "guard_blocked");
    assert.equal(t.store.rows[0]!.text, null);
    assert.ok(t.store.rows[0]!.rejections.includes("causal"));
    await t.batch().execute();
    assert.equal(t.prompts.length, 1);
  });

  it("하루 시도 상한", async () => {
    const t = setup({ "123456": cardOf("123456") });
    for (let i = 0; i < MOVE_SUMMARY_DAILY_ATTEMPTS; i++) {
      t.store.rows.push({ ...(t.store.rows[0] ?? ({} as MoveSummaryRecord)), asset: "kr", symbol: "123456", date: "2026-11-12", fingerprint: `old-${i}`, gate: "no_citation", text: null, citations: [], generatedAt: NOW } as MoveSummaryRecord);
    }
    const r = await t.batch().execute();
    assert.equal(r.generated, 0);
    assert.equal(t.prompts.length, 0);
  });

  it("LLM 상한 — 뒤에 도는 사실 추출 몫을 남기고 멈춘다(F017 v4 2c)", async () => {
    const limit = 300 - reservedCallsBehind("moveSummary");
    const under = setup({ "123456": cardOf("123456") });
    assert.equal((await under.batch(true, limit - 1).execute()).generated, 1);
    const at = setup({ "123456": cardOf("123456") });
    assert.equal((await at.batch(true, limit).execute()).generated, 0);
    assert.equal(at.prompts.length, 0);
  });

  it("회차 상한 — 남은 종목은 다음 회차", async () => {
    const cards = Object.fromEntries(Array.from({ length: MOVE_SUMMARY_BATCH_MAX_PER_RUN + 2 }, (_, i) => [`C${i}`, cardOf(`C${i}`)]));
    const t = setup(cards);
    const r = await t.batch().execute();
    assert.equal(r.generated, MOVE_SUMMARY_BATCH_MAX_PER_RUN);
    assert.equal(r.deferred, 2);
  });

  it("꺼짐이면 아무것도 하지 않는다", async () => {
    const t = setup({ "123456": cardOf("123456") });
    const r = await t.batch(false).execute();
    assert.equal(r.candidates, 0);
    assert.equal(t.prompts.length, 0);
  });

  it("프롬프트에 분해 숫자가 없다", async () => {
    const t = setup({ "123456": cardOf("123456") });
    await t.batch().execute();
    const { facts, ...rest } = t.prompts[0]!;
    const noTimes = JSON.stringify({ ...rest, facts: facts.map(({ at: _at, ...f }) => f) });
    assert.equal(/\b(11|12)\b/.test(noTimes), false, noTimes);
  });
});

describe("GetMoveSummary", () => {
  it("배치 전 pending → 수요 기록 → 배치 뒤 ok(인용 id)", async () => {
    const t = setup({ "123456": cardOf("123456") });
    t.demand.recent(NOW);
    assert.deepEqual(await t.read().execute("kr", "123456"), { gate: "pending", summary: null, date: "2026-11-12" });
    assert.deepEqual(t.demand.recent(NOW), [{ asset: "kr", symbol: "123456" }]);
    await t.batch().execute();
    const v = await t.read().execute("kr", "123456");
    assert.equal(v?.gate, "ok");
    assert.deepEqual(v?.summary?.citations, ["f:123456:1"]);
    assert.equal(v?.summary?.label, "ai");
  });
  it("없는 종목 null · 꺼짐 disabled", async () => {
    const t = setup({});
    assert.equal(await t.read().execute("crypto", "NOPE"), null);
    assert.equal((await t.read(false).execute("crypto", "NOPE"))?.gate, "disabled");
  });
});
