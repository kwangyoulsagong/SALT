import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Decimal } from "decimal.js";

import { GetCoachPanel, type GetCoachPanelDeps } from "../GetCoachPanel";

/**
 * 한 장 패널 한 번 응답(F017 v4 1d · `SRV-REQ-053` FR-13).
 * 불변식: 한 칸 실패가 패널을 비우지 않는다 — 그 칸만 defect · degraded, 칸 표는 늘 11줄.
 */

const horizon = (h: string, tier: string) => ({ horizon: h, horizonLabel: h, source: "base_rate", tier, fallbackFrom: null, model: null, baseRate: null });
const modeView = (sample: number, origin: "live" | "backtest") => ({
  judgment: { action: "watch", label: "관망", headline: "지켜봐요", score: 0, scoreNote: "", validity: { code: "" }, riskLevel: "low", reasons: [], risks: [] },
  caveats: [],
  trackRecord: { sample, sampleOrigin: origin, winRate: 0.5 },
  failureCases: [{ date: "2026-11-01" }],
  tier: "reference",
  tierBasis: null,
});
const explanation = (tier: string) => ({ symbol: "BTC", mode: "scalp", tier, aiGenerated: false, provider: null, generatedAt: "2026-11-13T00:00:00.000Z", sentences: [{ text: "x" }], disclaimer: "" });

const deps = (over: Partial<GetCoachPanelDeps> = {}, calls: string[] = []): GetCoachPanelDeps => ({
  scenario: {
    execute: async () =>
      ({ symbol: "BTC", market: "crypto", horizons: [horizon("1h", "longer"), horizon("4h", "longer"), horizon("1d", "now"), horizon("5d", "usual")], disclaimer: "d" }) as never,
  },
  check: { execute: async () => ({ status: "ok", summary: "한 줄" }) as never },
  judgment: { execute: async () => ({ modes: { scalp: modeView(30, "live"), longTerm: modeView(40, "backtest") } }) as never },
  explanation: { executeModes: async () => [explanation("latest"), explanation("previous")] as never },
  causes: {
    cause: async (asset, symbol) => {
      calls.push(`cause:${asset}:${symbol}`);
      return { causes: [{ kind: "news", strength: "likely", headline: "h", note: "n", factId: null, at: null, evidence: [] }], result: { changeRate: 1, text: "t", past: null } };
    },
  },
  profiles: { findByUser: async () => null },
  portfolio: {
    getHolding: async (_u, _s, asset) => {
      calls.push(`holding:${asset}`);
      return null;
    },
  },
  tradePlans: { listOwned: async () => [] },
  now: () => new Date("2026-11-13T06:00:00Z"),
  ...over,
});

const user = { userId: "u1", email: "a@example.invalid" };
const tierOf = (cells: Array<{ key: string; tier: string }>, key: string) => cells.find((c) => c.key === key)?.tier;

describe("GetCoachPanel", () => {
  it("모든 칸이 읽히면 칸마다 단 · 상태가 실린다", async () => {
    const view = await new GetCoachPanel(deps()).execute(user, "btc");
    assert.equal(view.symbol, "BTC");
    assert.equal(view.cells.length, 11);
    assert.equal(tierOf(view.cells, "scenario.1d"), "now");
    assert.equal(tierOf(view.cells, "scenario.1h"), "longer");
    assert.equal(tierOf(view.cells, "verdict"), "now");
    assert.equal(tierOf(view.cells, "cause"), "now");
    assert.equal(tierOf(view.cells, "company"), "defect");
    assert.equal(tierOf(view.cells, "track.scalp"), "now");
    assert.equal(tierOf(view.cells, "track.long_term"), "longer");
    assert.equal(tierOf(view.cells, "explanation.scalp"), "now");
    assert.equal(tierOf(view.cells, "explanation.long_term"), "usual");
    assert.equal(view.modes.longTerm.explanation.asOf, "2026-11-13T00:00:00.000Z");
    assert.equal(view.modes.scalp.explanation.asOf, null);
    assert.equal(view.scenario.horizons[2]!.status, "ok");
    assert.equal(view.company.reason, "source_not_collected");
    assert.equal(view.mine, null);
  });

  for (const broken of ["scenario", "check", "judgment", "explanation", "causes"] as const) {
    it(`${broken} 이 실패해도 200 — 그 칸만 결함`, async () => {
      const fail = async () => {
        throw new Error("down");
      };
      const over: Partial<GetCoachPanelDeps> =
        broken === "causes"
          ? { causes: { cause: fail } }
          : broken === "explanation"
            ? { explanation: { executeModes: fail } }
            : ({ [broken]: { execute: fail } } as Partial<GetCoachPanelDeps>);
      const view = await new GetCoachPanel(deps(over)).execute(user, "BTC");
      assert.equal(view.cells.length, 11);
      const defect = view.cells.filter((c) => c.tier === "defect").map((c) => c.key).sort();
      const expected = {
        scenario: ["company", "scenario.1d", "scenario.1h", "scenario.4h", "scenario.5d"],
        check: ["company", "verdict"],
        judgment: ["company", "track.long_term", "track.scalp"],
        explanation: ["company", "explanation.long_term", "explanation.scalp"],
        causes: ["cause", "company"],
      }[broken];
      assert.deepEqual(defect, expected);
      for (const c of view.cells) assert.equal(c.status, c.tier === "defect" ? "degraded" : c.tier === "now" ? "ok" : "fallback");
    });
  }

  it("시나리오가 실패하면 시장은 코드 모양으로 — 6자리는 국내", async () => {
    const calls: string[] = [];
    const fail = { execute: async () => Promise.reject(new Error("down")) };
    const view = await new GetCoachPanel(deps({ scenario: fail }, calls)).execute(user, "005930");
    assert.equal(view.market, "kr");
    assert.deepEqual(calls.sort(), ["cause:kr:005930", "holding:kr_stock"]);
  });

  it("원인 재료가 '확인된 소식 없음'이면 결함이 아니라 평소 단", async () => {
    const view = await new GetCoachPanel(
      deps({ causes: { cause: async () => ({ causes: [{ kind: "none", strength: "none", headline: "", note: "", factId: null, at: null, evidence: [] }], result: { changeRate: 0, text: "", past: null } }) } })
    ).execute(user, "BTC");
    assert.equal(view.cause.tier, "usual");
    assert.equal(view.cause.status, "fallback");
  });

  describe("내 기준", () => {
    const holding = { symbol: "BTC", totalQuantity: 1, averageBuyPrice: 100, totalInvested: 100, currentPrice: 110, currentValue: 110, unrealizedProfit: 10, unrealizedProfitRate: 10, realizedProfit: 0 };
    const plan = (p: Record<string, unknown>) => ({ side: "buy", stopPrice: null, targetPrice: null, ...p }) as never;

    it("보유가 있으면 최신 매수 계획의 선 · 빈 계획은 건너뛴다", async () => {
      const view = await new GetCoachPanel(
        deps({
          portfolio: { getHolding: async () => holding },
          tradePlans: { listOwned: async () => [plan({}), plan({ side: "sell", stopPrice: new Decimal(1) }), plan({ stopPrice: new Decimal(99) })] },
        })
      ).execute(user, "BTC");
      assert.equal(view.mine?.status, "ok");
      assert.deepEqual(view.mine?.view?.line, { kind: "stop", price: 99 });
      assert.equal(view.mine?.view?.averageBuyPrice, 100);
    });

    it("매입가 숨김이면 평단이 빠진다", async () => {
      const view = await new GetCoachPanel(
        deps({ portfolio: { getHolding: async () => holding }, profiles: { findByUser: async () => ({ hidePurchasePrice: true }) as never } })
      ).execute(user, "BTC");
      assert.equal(view.mine?.view?.averageBuyPrice, null);
    });

    it("보유를 못 읽으면 '보유 없음'이 아니라 degraded", async () => {
      const view = await new GetCoachPanel(deps({ portfolio: { getHolding: async () => Promise.reject(new Error("down")) } })).execute(user, "BTC");
      assert.deepEqual(view.mine, { status: "degraded", view: null });
    });
  });
});
