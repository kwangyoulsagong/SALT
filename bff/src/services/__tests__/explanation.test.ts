import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appAICoachService } from "../app-ai-coach.service";
import { backendApi } from "../backend-api.service";
import { toExplanationViewModel } from "../explanation.viewmodel";

/** 해설 4단 뷰모델 — F017 v2 단계 3 · `BFF-REQ-052` FR-2. 서버 그대로 · 캐시 0 · 모양이 깨지면 502 */
const server = (patch: Record<string, unknown> = {}) => ({
  symbol: "BTC",
  mode: "scalp",
  tier: "latest",
  aiGenerated: true,
  provider: "local_claude",
  generatedAt: "2026-11-11T06:05:00.000Z",
  disclaimer: "참고용이에요",
  sentences: [
    {
      section: "modeReasoning",
      text: "지금은 지켜보는 구간이에요.",
      citations: [{ id: "judgment", label: "규칙 판단", at: "2026-11-11T06:05:00.000Z", url: null }],
    },
    {
      section: "newsSummary",
      text: "현물 ETF 순유입 소식이 있어요.",
      citations: [{ id: "news-1", label: "코인뉴스", at: null, url: "javascript:alert(1)" }],
    },
  ],
  ...patch,
});
const ok = (data: unknown) => ({ data: { success: true, data } }) as never;

afterEach(() => mock.restoreAll());

describe("toExplanationViewModel", () => {
  it("서버 문장 · 인용 · 단 그대로, 링크는 http(s) 만", () => {
    const v = toExplanationViewModel(server());
    assert.equal(v.tier, "latest");
    assert.equal(v.sentences.length, 2);
    assert.equal(v.sentences[0]!.text, "지금은 지켜보는 구간이에요.");
    assert.equal(v.sentences[1]!.citations[0]!.url, null);
  });

  it("서버가 쓴 성적 · 틀렸던 때 칸(track · miss)도 그대로 옮긴다 — F017 v4 순서 1c", () => {
    const vm = toExplanationViewModel(
      server({
        sentences: [
          { section: "track", text: "이 판단은 지금까지 30번 중 15번 맞았어요(50%, 판단 뒤 24시간 기준).", citations: [{ id: "track", label: "이 판단의 성적", at: null, url: null }] },
          { section: "miss", text: "2026-08-31 ETH도 같은 판단이었는데 24시간 뒤 −5.0% 내렸어요.", citations: [{ id: "miss-1", label: "틀렸던 때 · 2026-08-31", at: null, url: null }] },
        ],
      })
    );
    assert.deepEqual(vm.sentences.map((x) => x.section), ["track", "miss"]);
  });

  it("템플릿 단 — AI 아님 · 공급자 없음", () => {
    const v = toExplanationViewModel(server({ tier: "template", aiGenerated: false, provider: null }));
    assert.equal(v.aiGenerated, false);
    assert.equal(v.provider, null);
  });

  const broken: Array<[string, Record<string, unknown>]> = [
    ["모르는 단", { tier: "cached" }],
    ["빈 문장 목록(빈 칸)", { sentences: [] }],
    ["인용 없는 문장", { sentences: [{ section: "risks", text: "x", citations: [] }] }],
    ["모르는 칸", { sentences: [{ section: "advice", text: "x", citations: [{ id: "a", label: "b" }] }] }],
    ["모르는 공급자", { provider: "gpt" }],
  ];
  for (const [name, patch] of broken) {
    it(`깨진 모양 — ${name}`, () => assert.throws(() => toExplanationViewModel(server(patch))));
  }
});

describe("getExplanation", () => {
  it("서버 경로 · 모드 · 예산 300ms 로 부른다", async () => {
    const call = mock.method(backendApi, "proxyAuthRequest", async () => ok(server()));
    await appAICoachService.getExplanation("t", { symbol: " btc ", mode: "long_term" });
    const args = call.mock.calls[0]!.arguments as unknown[];
    assert.equal(args[0], "GET");
    assert.equal(args[1], "/ai-coach/explanation?symbol=BTC&mode=long_term");
    assert.equal((args[4] as { timeout: number }).timeout, 300);
  });

  it("형식 틀린 심볼 · 모드는 서버를 부르지 않고 400", async () => {
    const call = mock.method(backendApi, "proxyAuthRequest", async () => ok(server()));
    await assert.rejects(appAICoachService.getExplanation("t", { symbol: "../x", mode: "scalp" }), (e: { statusCode?: number }) => e.statusCode === 400);
    await assert.rejects(appAICoachService.getExplanation("t", { symbol: "BTC", mode: "day" }), (e: { statusCode?: number }) => e.statusCode === 400);
    assert.equal(call.mock.callCount(), 0);
  });

  it("서버 모양이 깨지면 502 — 문장을 지어내지 않는다", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () => ok({ tier: "latest" }));
    await assert.rejects(appAICoachService.getExplanation("t", { symbol: "BTC", mode: "scalp" }), (e: { statusCode?: number }) => e.statusCode === 502);
  });
});
