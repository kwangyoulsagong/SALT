import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PANEL_CELL_KEYS_ALL, type PanelCellCheckRow } from "../../domain";
import { MeasurePanelCells, PANEL_CHECK_KEEP_DAYS } from "../MeasurePanelCells";

/**
 * 패널 칸 채움 실측(OPS-004 FR-1 · 3 · 4). 불변식: 추적 종목마다 칸 표 11줄이 늘 남는다(패널이 실패해도 결함으로) · 단 판정은 패널 것 그대로.
 */

const NOW = new Date("2026-11-13T07:30:00Z");
const cells = (tier: "now" | "defect" = "now") => PANEL_CELL_KEYS_ALL.map((key) => ({ key, tier: key === "company" ? "defect" : tier, status: "ok" }));

const setup = (opts: { symbols: string[]; previous?: string[]; fail?: string[]; stale?: string[]; lowered?: Record<string, string> }) => {
  const saved: { runAt: Date; rows: PanelCellCheckRow[] }[] = [];
  const pruned: Date[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const panel = {
    execute: async (_u: unknown, symbol: string) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((ok) => setTimeout(ok, 5));
      inFlight -= 1;
      if (opts.fail?.includes(symbol)) throw new Error("down");
      const c = cells();
      const low = opts.lowered?.[symbol];
      return {
        market: /^\d{6}$/.test(symbol) ? "kr" : "crypto",
        cells: low ? c.map((x) => (x.key === low ? { ...x, tier: "defect" } : x)) : c,
        verdict: { check: opts.stale?.includes(symbol) ? { conditionReason: "stale_reference" } : { conditionReason: null } },
      } as never;
    },
  };
  const m = new MeasurePanelCells({
    panel,
    universe: { symbols: async () => opts.symbols },
    store: {
      latestRunSymbols: async () => new Set(opts.previous ?? []),
      saveRun: async (runAt, rows) => {
        saved.push({ runAt, rows: [...rows] });
        return rows.length;
      },
      pruneBefore: async (before) => {
        pruned.push(before);
        return 0;
      },
    },
    now: () => NOW,
  });
  return { m, saved, pruned, maxInFlight: () => maxInFlight };
};

describe("MeasurePanelCells", () => {
  it("종목마다 칸 11줄 · 단은 패널 그대로 · 결함 수는 회사 사정 포함(F017 v4 2d — 재료가 생겼다)", async () => {
    const { m, saved } = setup({ symbols: ["BTC", "005930"], lowered: { BTC: "cause" } });
    const r = await m.execute();
    assert.equal(saved[0]!.rows.length, 22);
    // BTC 원인 1 + 두 종목 회사 사정 2(이 시험 패널은 회사 사정을 늘 defect 로 준다)
    assert.equal(r.defects, 3);
    assert.equal(saved[0]!.rows.find((x) => x.symbol === "BTC" && x.cellKey === "cause")!.tier, "defect");
    assert.equal(saved[0]!.rows.find((x) => x.symbol === "005930")!.market, "kr");
  });

  it("패널이 실패한 종목도 칸 11줄(전부 결함) — 빈 줄 0", async () => {
    const { m, saved } = setup({ symbols: ["BTC", "ETH"], fail: ["ETH"] });
    const r = await m.execute();
    assert.equal(r.failed, 1);
    const eth = saved[0]!.rows.filter((x) => x.symbol === "ETH");
    assert.equal(eth.length, PANEL_CELL_KEYS_ALL.length);
    assert.ok(eth.every((x) => x.tier === "defect"));
  });

  it("멈춘 종목 = 서버 점검이 기준 종가가 묵었다고 본 종목", async () => {
    const { m, saved } = setup({ symbols: ["BTC", "ETH"], stale: ["ETH"] });
    const r = await m.execute();
    assert.equal(r.stale, 1);
    assert.ok(saved[0]!.rows.filter((x) => x.symbol === "ETH").every((x) => x.stale));
    assert.ok(saved[0]!.rows.filter((x) => x.symbol === "BTC").every((x) => !x.stale));
  });

  it("새 종목 = 지난 회차에 없던 종목 · 첫 회차는 아무도 새 종목이 아니다", async () => {
    const a = setup({ symbols: ["BTC", "SOL"], previous: ["BTC"] });
    assert.equal((await a.m.execute()).newSymbols, 1);
    assert.ok(a.saved[0]!.rows.filter((x) => x.symbol === "SOL").every((x) => x.newSymbol));
    const first = setup({ symbols: ["BTC", "SOL"], previous: [] });
    assert.equal((await first.m.execute()).newSymbols, 0);
  });

  it("보관 30일 밖 회차를 지우고 · 동시 2 이하로 부른다", async () => {
    const { m, pruned, maxInFlight } = setup({ symbols: ["A", "B", "C", "D", "E", "F"] });
    await m.execute();
    assert.equal(pruned[0]!.getTime(), NOW.getTime() - PANEL_CHECK_KEEP_DAYS * 86_400_000);
    assert.ok(maxInFlight() <= 2, String(maxInFlight()));
  });
});
