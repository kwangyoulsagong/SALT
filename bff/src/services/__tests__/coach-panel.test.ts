import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appAICoachService } from "../app-ai-coach.service";
import { backendApi } from "../backend-api.service";
import { CoachPanelContractError, PANEL_CELL_KEYS, toCoachPanelViewModel } from "../coach-panel.viewmodel";

/**
 * 한 장 패널 뷰모델(F017 v4 1d · `BFF-REQ-052` FR-6 · FR-8).
 * 불변식: 칸 안이 깨지면 그 칸만 결함(502 아님) · 칸 표는 늘 11줄이고 화면이 받는 칸의 단과 같다 · 계산 0.
 */

const ok = (data: unknown) => ({ data: { success: true, data } }) as never;

const baseRate = (over: Record<string, unknown> = {}) => ({
  condition: null,
  status: "ok",
  sample: 1000,
  sampleEffective: 400,
  sampleDays: 400,
  upCount100: 45,
  upRange: { low100: 41, high100: 48 },
  range: { lowPct: -6.9, midPct: -0.4, highPct: 7 },
  usualUp100: 44,
  differsFromUsual: null,
  refPrice: 206000,
  invalidation: 191802,
  asOf: "2026-11-13T01:15:44.714Z",
  ...over,
});
const horizon = (h: string, tier: string, over: Record<string, unknown> = {}) => ({
  horizon: h,
  horizonLabel: h,
  source: "base_rate",
  tier,
  fallbackFrom: tier === "longer" ? "1d" : null,
  model: null,
  baseRate: baseRate(),
  status: tier === "now" ? "ok" : "fallback",
  ...over,
});
const check = {
  symbol: "005930",
  market: "kr",
  side: "buy",
  status: "ok",
  summary: "시가가 어제 종가보다 3% 넘게 높게 시작한 날, 사서 다음 거래일 종가까지 수수료 · 세금을 빼고도 오른 경우가 100번 중 42번이었어요.",
  conditionReason: null,
  condition: { id: "K3", phrase: "시가가 어제 종가보다 3% 넘게 높게 시작한 날", describeOnly: false },
  alsoMatched: [],
  horizon: 1,
  horizonLabel: "다음 거래일 종가까지",
  sample: 29822,
  sampleDays: 414,
  sampleEffective: 791,
  upRate: 0.42,
  upRange: { low: 0.386, high: 0.454 },
  differsFromUsual: null,
  recentDiffers: false,
  usual: { upRate: 0.395, holdUpRate: 0.444, sample: 1001659 },
  distributions: [],
  holding: null,
  reference: { close: 207500, at: "2026-11-12T07:00:00.000Z", computedAt: "2026-11-13T01:15:44.714Z" },
  disclaimer: "d",
};
const cause = {
  causes: [
    {
      kind: "news",
      strength: "likely",
      headline: "공시",
      note: "공시 뒤부터 움직였어요",
      factId: "f1",
      at: "2026-11-13T00:42:00.000Z",
      evidence: [
        { kind: "post_move", value: "공시 뒤 30분 +2.1%", compare: null, gloss: null, source: "시세", at: null, supports: true },
        { kind: "investor_flow", value: "외국인 순매수", compare: "평소의 3배", gloss: null, source: "수급", at: null, supports: true },
      ],
    },
  ],
  result: { changeRate: 3.2, text: "오늘 +3.2%", past: null },
};
const explanation = (tier: string) => ({
  symbol: "005930",
  mode: "scalp",
  tier,
  aiGenerated: tier === "latest" || tier === "previous",
  provider: tier === "latest" || tier === "previous" ? "local_claude" : null,
  generatedAt: "2026-11-13T03:34:50.066Z",
  sentences: [{ text: "관망이에요.", section: "modeReasoning", citations: [{ id: "judgment", label: "규칙 판단", at: "2026-11-13T03:34:50.066Z", url: null }] }],
  disclaimer: "d",
});
const mode = (over: Record<string, unknown> = {}) => ({
  mode: "scalp",
  judgment: { action: "wait", label: "관망", headline: "지켜봐요", caveats: [], grade: "reference", gradeBasis: { source: null, reason: "no_candidate", liveEffectiveN: 0, minEffectiveN: 620, spreadCi: null } },
  track: {
    tier: "now",
    status: "ok",
    trackRecord: { signalType: "kr_stock.scalp.buy", sampleOrigin: "live", sample: 40, winRate: 0.6, avgReturn: 0, worstObservedReturn: -0.1, lowSample: false, horizonHours: 24, alwaysUpRate: 0.43, excessWinRate: 0.15, claim: null },
    failureCases: [
      { date: "2026-11-11", symbol: "000810", name: "삼성화재", logoUrl: null, event: "kr_stock.scalp.buy", outcome: "miss", returnRate: -0.07 },
      { date: "2026-11-11", symbol: "005380", name: "현대차", logoUrl: null, event: "kr_stock.scalp.buy", outcome: "hit", returnRate: 0.02 },
    ],
  },
  explanation: { tier: "now", status: "ok", asOf: null, view: explanation("latest") },
  ...over,
});
const emptyBrief = { headline: null, earnings: [], today: [], recent: [], sector: [], concern: [], windowDays: null, factCount: 0 };
const fact = (over: Record<string, unknown> = {}) => ({
  text: "차바이오텍 3분기 누적 연결 매출액 9,016억원 (전년 동기 대비 2% 감소)", who: "차바이오텍", what: "3분기 누적 연결 매출액",
  amount: "9016", unit: "억원", comparedTo: "전년 동기 대비 2% 감소", whenText: "3분기 누적", kind: "earnings",
  source: { kind: "article", name: "파이낸셜뉴스", url: "https://www.fnnews.com/news/1", at: "2026-11-14T06:00:00.000Z" }, ...over,
});
const panel = (over: Record<string, unknown> = {}) => ({
  symbol: "005930",
  market: "kr",
  generatedAt: "2026-11-13T06:00:00.000Z",
  horizonMode: { "1h": "scalp", "4h": "scalp", "1d": "long_term", "5d": "long_term" },
  scenario: { horizons: [horizon("1h", "longer"), horizon("4h", "longer"), horizon("1d", "now"), horizon("5d", "usual")], disclaimer: "d" },
  verdict: { tier: "now", status: "ok", check },
  cause: { tier: "now", status: "ok", cause },
  company: { tier: "defect", status: "degraded", brief: emptyBrief },
  modes: { scalp: mode(), longTerm: mode({ mode: "long_term" }) },
  mine: null,
  cells: [],
  ...over,
});
const tierOf = (vm: ReturnType<typeof toCoachPanelViewModel>, key: string) => vm.cells.find((c) => c.key === key)?.tier;

describe("toCoachPanelViewModel", () => {
  it("칸이 다 맞으면 서버 단 그대로 · 칸 표 11줄 · 성적은 100번 중 숫자", () => {
    const vm = toCoachPanelViewModel(panel());
    assert.deepEqual(vm.cells.map((c) => c.key), [...PANEL_CELL_KEYS]);
    assert.equal(tierOf(vm, "scenario.1d"), "now");
    assert.equal(tierOf(vm, "scenario.1h"), "longer");
    assert.equal(tierOf(vm, "verdict"), "now");
    assert.equal(tierOf(vm, "cause"), "now");
    assert.equal(tierOf(vm, "company"), "defect");
    assert.equal(vm.scenario.horizons[2]!.upOutOf100, 45);
    assert.equal(vm.modes.scalp.track.hitOutOf100, 60);
    assert.equal(vm.modes.scalp.track.baselineOutOf100, 45);
    assert.deepEqual(vm.modes.scalp.track.misses.map((m) => m.symbol), ["000810"]);
    assert.equal(vm.verdict.check?.summary, check.summary);
    assert.deepEqual(vm.degradedBlocks, []);
    for (const c of vm.cells) assert.equal(c.status, c.tier === "now" ? "ok" : c.tier === "defect" ? "degraded" : "fallback");
  });

  it("관망(기준 없음) · 표본 0 이면 비율을 지어내지 않는다", () => {
    const wait = mode();
    (wait.track.trackRecord as Record<string, unknown>).excessWinRate = null;
    const zero = mode();
    Object.assign(zero.track.trackRecord, { sample: 0, winRate: null });
    Object.assign(zero.track, { tier: "defect", status: "degraded" });
    const vm = toCoachPanelViewModel(panel({ modes: { scalp: wait, longTerm: zero } }));
    assert.equal(vm.modes.scalp.track.hitOutOf100, 60);
    assert.equal(vm.modes.scalp.track.baselineOutOf100, null);
    assert.equal(vm.modes.longTerm.track.hitOutOf100, null);
    assert.equal(tierOf(vm, "track.long_term"), "defect");
  });

  describe("칸 안이 깨지면 그 칸만 결함 · 내린 칸은 degradedBlocks", () => {
    it("시나리오 칸 숫자가 빠지면(서버는 usual) 그 지평만", () => {
      const vm = toCoachPanelViewModel(
        panel({ scenario: { horizons: [horizon("1h", "longer"), horizon("4h", "longer"), horizon("1d", "now"), horizon("5d", "usual", { baseRate: baseRate({ upCount100: null }) })], disclaimer: "d" } }),
      );
      assert.equal(tierOf(vm, "scenario.5d"), "defect");
      assert.equal(tierOf(vm, "scenario.1d"), "now");
      assert.deepEqual(vm.degradedBlocks, ["scenario.5d"]);
    });

    it("모델 칸은 열 수 없다 — 성적 · 빗나간 사례가 없으면 결함", () => {
      const vm = toCoachPanelViewModel(
        panel({ scenario: { horizons: [horizon("1h", "now", { source: "model", model: { renderable: true, pUp: 0.6 } }), horizon("4h", "longer"), horizon("1d", "now"), horizon("5d", "usual")], disclaimer: "d" } }),
      );
      assert.equal(vm.scenario.horizons[0]!.source, "base_rate");
      assert.equal(tierOf(vm, "scenario.1h"), "defect");
    });

    it("점검 모양이 깨지면 점검 칸만", () => {
      const vm = toCoachPanelViewModel(panel({ verdict: { tier: "now", status: "ok", check: { ...check, summary: 3 } } }));
      assert.equal(vm.verdict.check, null);
      assert.equal(tierOf(vm, "verdict"), "defect");
      assert.deepEqual(vm.degradedBlocks, ["verdict"]);
      assert.equal(tierOf(vm, "cause"), "now");
    });

    it("원인 단계가 근거와 안 맞으면(가장 유력인데 받침 1) 원인 칸만", () => {
      const weak = structuredClone(cause);
      weak.causes[0]!.evidence[1]!.supports = false;
      const vm = toCoachPanelViewModel(panel({ cause: { tier: "now", status: "ok", cause: weak } }));
      assert.equal(vm.cause.cause, null);
      assert.equal(tierOf(vm, "cause"), "defect");
      assert.deepEqual(vm.degradedBlocks, ["cause"]);
    });

    it("해설 모양이 깨지면 그 모드 해설만", () => {
      const vm = toCoachPanelViewModel(
        panel({ modes: { scalp: mode({ explanation: { tier: "now", status: "ok", asOf: null, view: { ...explanation("latest"), sentences: "x" } } }), longTerm: mode({ mode: "long_term" }) } }),
      );
      assert.equal(vm.modes.scalp.explanation.view, null);
      assert.equal(tierOf(vm, "explanation.scalp"), "defect");
      assert.equal(tierOf(vm, "explanation.long_term"), "now");
      assert.deepEqual(vm.degradedBlocks, ["explanation.scalp"]);
    });

    it("서버가 결함으로 준 칸은 내린 칸으로 세지 않는다", () => {
      const vm = toCoachPanelViewModel(
        panel({
          verdict: { tier: "defect", status: "degraded", check: null },
          cause: { tier: "defect", status: "degraded", cause: null },
          modes: {
            scalp: mode({ track: { tier: "defect", status: "degraded", trackRecord: null, failureCases: [] }, explanation: { tier: "defect", status: "degraded", asOf: null, view: null } }),
            longTerm: mode({ mode: "long_term" }),
          },
        }),
      );
      assert.deepEqual(vm.degradedBlocks, []);
      assert.equal(tierOf(vm, "track.scalp"), "defect");
      assert.equal(tierOf(vm, "explanation.scalp"), "defect");
    });
  });

  it("머리가 틀리면 계약 깨짐", () => {
    assert.throws(() => toCoachPanelViewModel(null), CoachPanelContractError);
    assert.throws(() => toCoachPanelViewModel(panel({ market: "us" })), CoachPanelContractError);
    assert.throws(() => toCoachPanelViewModel(panel({ modes: null })), CoachPanelContractError);
  });

  describe("내 기준(FR-8)", () => {
    it("보유 없음 null · 못 읽음 degraded · 있으면 서버 값 그대로", () => {
      assert.equal(toCoachPanelViewModel(panel({ mine: null })).mine, null);
      assert.deepEqual(toCoachPanelViewModel(panel({ mine: { status: "degraded", view: null } })).mine, { status: "degraded", view: null });
      const vm = toCoachPanelViewModel(
        panel({ mine: { status: "ok", view: { line: { kind: "stop", price: 190000 }, gapToLinePct: -7.7, averageBuyPrice: 180000, unrealizedProfit: 26000, unrealizedProfitRate: 14.4 } } }),
      );
      assert.deepEqual(vm.mine?.view?.line, { kind: "stop", price: 190000 });
      assert.equal(vm.mine?.view?.averageBuyPrice, 180000);
    });

    it("선이 없으면 거리도 없다", () => {
      const vm = toCoachPanelViewModel(panel({ mine: { status: "ok", view: { line: null, gapToLinePct: 3, averageBuyPrice: null, unrealizedProfit: null, unrealizedProfitRate: null } } }));
      assert.equal(vm.mine?.view?.gapToLinePct, null);
    });
  });
});

describe("appAICoachService.getPanel", () => {
  afterEach(() => mock.restoreAll());

  it("서버 한 콜 · 심볼 대문자 · 400ms 예산", async () => {
    const calls: unknown[][] = [];
    mock.method(backendApi, "proxyAuthRequest", async (...args: unknown[]) => {
      calls.push(args);
      return ok(panel());
    });
    const vm = await appAICoachService.getPanel("t", { symbol: "005930" });
    assert.equal(vm.symbol, "005930");
    assert.equal(calls.length, 1);
    assert.equal(calls[0]![1], "/coach/panel?symbol=005930");
    assert.equal((calls[0]![4] as { timeout: number }).timeout, 400);
  });

  it("심볼 형식이 틀리면 서버를 부르지 않고 400", async () => {
    const spy = mock.method(backendApi, "proxyAuthRequest", async () => ok(panel()));
    await assert.rejects(appAICoachService.getPanel("t", { symbol: "../x" }), (e: { statusCode?: number }) => e.statusCode === 400);
    assert.equal(spy.mock.callCount(), 0);
  });

  it("머리가 깨지면 502 · 401 은 그대로 올린다", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () => ok({ symbol: "X" }));
    await assert.rejects(appAICoachService.getPanel("t", { symbol: "BTC" }), (e: { statusCode?: number }) => e.statusCode === 502);
    mock.restoreAll();
    const unauthorized = Object.assign(new Error("401"), { response: { status: 401, data: { message: "x" }, headers: {} } });
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw unauthorized;
    });
    await assert.rejects(appAICoachService.getPanel("t", { symbol: "BTC" }), (e) => e === unauthorized);
  });
});

describe("회사 사정 칸(F017 v4 2d)", () => {
  const brief = { headline: fact(), earnings: [fact({ text: "영업손실 831억원" })], today: [], sector: [{ text: "제약 지수 +1.2%", source: "업종 지수", at: null }], concern: [fact({ text: "매출 2% 감소" })], windowDays: 7, factCount: 3 };
  it("서버 단 · 문구 그대로", () => {
    const vm = toCoachPanelViewModel(panel({ company: { tier: "now", status: "ok", brief } }));
    assert.equal(tierOf(vm, "company"), "now");
    assert.equal(vm.company.brief?.headline?.text, fact().text);
    assert.deepEqual(vm.company.brief?.concern.map((c) => c.text), ["매출 2% 감소"]);
    assert.deepEqual(vm.company.brief?.recent, []);
    assert.deepEqual([vm.company.brief?.windowDays, vm.company.brief?.factCount, vm.company.brief?.sector[0]?.text], [7, 3, "제약 지수 +1.2%"]);
  });
  it("http(s) 가 아닌 출처 주소의 사실은 버린다(그 사실만)", () => {
    const bad = fact({ text: "나쁜 링크", source: { kind: "article", name: "x", url: "javascript:alert(1)", at: "2026-11-14T06:00:00.000Z" } });
    const vm = toCoachPanelViewModel(panel({ company: { tier: "now", status: "ok", brief: { ...brief, concern: [bad, fact({ text: "남는 사실" })] } } }));
    assert.deepEqual(vm.company.brief?.concern.map((c) => c.text), ["남는 사실"]);
  });
  it("칸 모양이 틀리면 결함으로 내리고 내린 칸으로 센다", () => {
    const vm = toCoachPanelViewModel(panel({ company: { tier: "now", status: "ok", brief: { headline: null } } }));
    assert.deepEqual([vm.company.brief, tierOf(vm, "company"), vm.degradedBlocks.includes("company")], [null, "defect", true]);
  });
  it("서버가 읽기 실패(brief null · defect) — 내린 칸이 아니다", () => {
    const vm = toCoachPanelViewModel(panel({ company: { tier: "defect", status: "degraded", brief: null } }));
    assert.deepEqual([vm.company.brief, vm.degradedBlocks.includes("company")], [null, false]);
  });
  it("사실 0 은 빈 칸들(null 아님)", () => {
    const vm = toCoachPanelViewModel(panel());
    assert.deepEqual([vm.company.brief?.factCount, vm.company.brief?.headline, tierOf(vm, "company")], [0, null, "defect"]);
  });
});

