import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CauseSnapshotRecord } from "../../domain";
import { RecordMoveCauses } from "../RecordMoveCauses";

/** 원인 스냅샷 기록(F017 v4 5a) — 창이 열린 시장 종목만 · 한 종목 실패는 그 종목만 · 같은 지문은 안 늘어남 */
const kst = (s: string) => new Date(`${s}+09:00`);
const cause = (kind = "sector") => ({
  split: { market: 0.5, sector: 1.0, idio: 0.2, method: "regression" },
  cause: {
    causes: [{ kind, strength: "likely" as const, headline: "h", note: "n", factId: null, at: null, evidence: [] }],
    result: { changeRate: 1.7, text: "t", past: null },
  },
});

const setup = (now: Date, opts: { fail?: string[]; none?: string[] } = {}) => {
  const saved: CauseSnapshotRecord[][] = [];
  const asked: string[] = [];
  const seen = new Set<string>();
  const uc = new RecordMoveCauses({
    universe: { symbols: async () => ["BTC", "ETH", "005930", "055550"] },
    causes: {
      snapshot: async (_m, symbol) => {
        asked.push(symbol);
        if (opts.fail?.includes(symbol)) throw new Error("down");
        if (opts.none?.includes(symbol)) return null;
        return cause();
      },
    },
    store: {
      saveMany: async (rows) => {
        saved.push([...rows]);
        let n = 0;
        for (const r of rows) {
          const k = `${r.market}|${r.symbol}|${r.tradeDate}|${r.fingerprint}`;
          if (!seen.has(k)) n += 1;
          seen.add(k);
        }
        return n;
      },
    },
    now: () => now,
  });
  return { uc, saved, asked };
};

describe("RecordMoveCauses", () => {
  it("16:40 KST — 국내만 그날 거래일로, 코인은 묻지도 않는다", async () => {
    const { uc, saved, asked } = setup(kst("2026-11-16T16:40:00"));
    const r = await uc.execute();
    assert.deepEqual(r.markets, { kr: "2026-11-16" });
    assert.deepEqual(asked.sort(), ["005930", "055550"]);
    assert.equal(r.recorded, 2);
    assert.ok(saved[0]!.every((x) => x.market === "kr" && x.tradeDate === "2026-11-16"));
  });
  it("08:40 KST — 코인만 전날 거래일로(국내는 장 전이라 어제 등락)", async () => {
    const { uc, saved } = setup(kst("2026-11-17T08:40:00"));
    const r = await uc.execute();
    assert.deepEqual(r.markets, { crypto: "2026-11-16" });
    assert.deepEqual(saved[0]!.map((x) => x.symbol).sort(), ["BTC", "ETH"]);
  });
  it("창 밖(깨어난 10:00) — 아무것도 묻지 않고 0행", async () => {
    const { uc, saved, asked } = setup(kst("2026-11-17T10:00:00"));
    const r = await uc.execute();
    assert.deepEqual(r.markets, {});
    assert.equal(asked.length, 0);
    assert.equal(saved.length, 0);
  });
  it("한 종목 실패 · 카드 없음은 그 종목만 빠진다", async () => {
    const { uc } = setup(kst("2026-11-16T16:40:00"), { fail: ["005930"], none: ["055550"] });
    const r = await uc.execute();
    assert.equal(r.failed, 1);
    assert.equal(r.skipped, 1);
    assert.equal(r.recorded, 0);
  });
  it("같은 원인으로 두 번 돌면 두 번째는 새 행 0", async () => {
    const { uc } = setup(kst("2026-11-16T17:00:00"));
    await uc.execute();
    const r = await uc.execute();
    assert.equal(r.recorded, 0);
    assert.equal(r.unchanged, 2);
  });
});
