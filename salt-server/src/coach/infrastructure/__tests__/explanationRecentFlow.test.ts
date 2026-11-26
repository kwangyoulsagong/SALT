import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  allowedFacts,
  assembleExplanationFacts,
  explanationFactCatalog,
  isSupported,
  numericTokens,
  type CoachExplanationInput,
} from "../../domain";
import { buildLineExplanationPrompt, factsBlock } from "../explanationPrompt";

const FLOW = "직전 거래일 -9.87% · 5거래일 전 종가 대비 -11.38% · 최근 20거래일 최고 종가 대비 -11.38%";

const input = (recentFlow: string | null): CoachExplanationInput =>
  assembleExplanationFacts({
    symbol: "005930",
    mode: "long_term",
    quote: { currentPrice: 174500, change24h: 2.28, tradeValue24h: 3e12, koreanName: "삼성전자" } as never,
    judgment: { action: "wait", label: "관망", headline: "장기 관점은 관망", reasons: ["근거 하나"], risks: ["주의 하나"] },
    indicator: undefined,
    sentiment: undefined,
    whale: { buyAmountKRW: 0, sellAmountKRW: 0, count: 0 },
    news: [],
    recentFlow,
  })!;

/** 문장 속 숫자가 전부 판단 · 근거 칸 허용 사실인가(검증기와 같은 대조) */
const supported = (text: string, i: CoachExplanationInput) =>
  numericTokens(text).every((t) => isSupported(t, allowedFacts(i, { news: false })));

describe("최근 흐름 재료 — 오늘 등락을 흐름과 함께(SRV-REQ-063 FR-2)", () => {
  it("판단 바로 뒤 근거 한 줄 · 사실표 id recent-flow", () => {
    const i = input(FLOW);
    assert.deepEqual(i.evidence[1], { label: "최근 흐름", value: FLOW });
    assert.ok(explanationFactCatalog(i, new Date()).some((f) => f.id === "recent-flow"));
  });

  it("프롬프트가 흐름을 같은 문장에 밝히라고 한다 · 흐름이 없으면 그 지시도 없다", () => {
    assert.ok(factsBlock(input(FLOW)).some((l) => l.includes("'최근 흐름'을 같은 문장에")));
    assert.ok(buildLineExplanationPrompt(input(FLOW)).includes(`- 최근 흐름: ${FLOW}`));
    assert.ok(!factsBlock(input(null)).some((l) => l.includes("최근 흐름")));
  });

  it("검증기 — '9.87% 내린 뒤 2.28% 올랐어요'는 통과 · 방향을 뒤집으면 걸린다 · 흐름이 없으면 그 숫자는 막힌다", () => {
    const ok = "직전 거래일 9.87% 내린 뒤 오늘 2.28% 올랐어요.";
    assert.equal(supported(ok, input(FLOW)), true);
    assert.equal(supported("직전 거래일 9.87% 오른 뒤 오늘 2.28% 올랐어요.", input(FLOW)), false);
    assert.equal(supported(ok, input(null)), false);
  });
});
