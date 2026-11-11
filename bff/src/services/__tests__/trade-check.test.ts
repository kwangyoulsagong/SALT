import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appAICoachService } from "../app-ai-coach.service";
import { backendApi } from "../backend-api.service";
import { toTradeCheckViewModel } from "../trade-check.viewmodel";

/** 점검(F017 v2 단계 2 · `BFF-REQ-052` FR-3) — 서버 문장 그대로 · 모양이 깨지면 502 · 표본 미달 숫자는 막는다 */

const ok = (data: unknown) => ({ data: { success: true, data } }) as never;

const server = (over: Record<string, unknown> = {}) => ({
  symbol: "000810",
  market: "kr",
  side: "buy",
  status: "ok",
  summary: "평소보다 크게 내린 날, 사서 다음 거래일 종가까지 수수료 · 세금을 빼고도 오른 경우가 100번 중 47번이었어요 — 평소(40번)보다 많아요.",
  conditionReason: null,
  condition: { id: "K1", phrase: "평소보다 크게 내린 날", describeOnly: false },
  alsoMatched: [],
  horizon: 1,
  horizonLabel: "다음 거래일 종가까지",
  sample: 26228,
  sampleDays: 987,
  sampleEffective: 492,
  upRate: 0.467,
  upRange: { low: 0.424, high: 0.512 },
  differsFromUsual: "higher",
  recentDiffers: true,
  usual: { upRate: 0.396, holdUpRate: 0.43, sample: 1000675 },
  distributions: [
    {
      horizon: 1,
      horizonLabel: "다음 거래일 종가까지",
      status: "ok",
      sample: 26228,
      sampleDays: 987,
      upRate: 0.467,
      mean: -0.001,
      q10: -0.054,
      q50: -0.002,
      q90: 0.059,
      rangeText: "나쁜 10% -5.4% · 가운데 -0.2% · 좋은 10% +5.9%",
      hold: { upRate: 0.51, q10: -0.051, q50: 0.001, q90: 0.063, rangeText: "x" },
    },
  ],
  holding: null,
  reference: { close: 599000, at: "2026-11-10T07:00:00.000Z", computedAt: "2026-11-11T03:14:19.283Z" },
  disclaimer: "과거 비슷한 상황 뒤 가격이 움직인 분포입니다.",
  ...over,
});

describe("toTradeCheckViewModel", () => {
  it("서버 문장을 글자 그대로 · 100칸 점 = 비율 반올림", () => {
    const v = toTradeCheckViewModel(server());
    assert.equal(v.summary, server().summary);
    assert.equal(v.dots, 47);
    assert.equal(v.horizons[0].range?.q10, -0.054);
    assert.equal(v.horizons[0].hold.upRate, 0.51);
  });

  it("below_min 인데 비율이 실려 오면 막는다(숫자를 그리지 않게)", () => {
    assert.throws(() => toTradeCheckViewModel(server({ status: "below_min" })), /below_min/);
    const v = toTradeCheckViewModel(server({ status: "below_min", upRate: null, upRange: null }));
    assert.equal(v.dots, null);
  });

  it("빈 문장 · 모르는 상태 · 분위 역순 · 0~1 밖 비율은 계약 위반", () => {
    assert.throws(() => toTradeCheckViewModel(server({ summary: " " })));
    assert.throws(() => toTradeCheckViewModel(server({ status: "maybe" })));
    assert.throws(() => toTradeCheckViewModel(server({ upRate: 47 })));
    const bad = server();
    (bad.distributions[0] as Record<string, unknown>).q90 = -0.9;
    assert.throws(() => toTradeCheckViewModel(bad), /분위 순서/);
  });

  it("조건 없음 — condition null · 이유 그대로", () => {
    const v = toTradeCheckViewModel(server({ status: "no_condition", condition: null, conditionReason: "none_matched", differsFromUsual: null }));
    assert.equal(v.condition, null);
    assert.equal(v.conditionReason, "none_matched");
  });
});

describe("appAICoachService.getTradeCheck", () => {
  afterEach(() => mock.restoreAll());

  it("서버 경로 · 방향 · 예산 200ms 로 부른다", async () => {
    const call = mock.method(backendApi, "proxyAuthRequest", async () => ok(server()));
    const v = await appAICoachService.getTradeCheck("t", { symbol: " 000810 ", side: "sell" });
    assert.equal(v.symbol, "000810");
    const args = call.mock.calls[0].arguments as unknown[];
    assert.equal(args[1], "/coach/check?symbol=000810&side=sell");
    assert.equal((args[4] as { timeout: number }).timeout, 200);
  });

  it("모르는 방향은 buy · 형식 틀린 심볼은 서버를 부르지 않고 400", async () => {
    const call = mock.method(backendApi, "proxyAuthRequest", async () => ok(server()));
    await appAICoachService.getTradeCheck("t", { symbol: "BTC", side: "hold" });
    assert.match(String((call.mock.calls[0].arguments as unknown[])[1]), /side=buy$/);
    await assert.rejects(appAICoachService.getTradeCheck("t", { symbol: "../x" }), (e: { statusCode?: number }) => e.statusCode === 400);
    assert.equal(call.mock.callCount(), 1);
  });

  it("서버 모양이 깨지면 502 — 지어낸 문장을 주지 않는다", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () => ok({ status: "ok" }));
    await assert.rejects(appAICoachService.getTradeCheck("t", { symbol: "BTC" }), (e: { statusCode?: number }) => e.statusCode === 502);
  });
});
