import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { explanationFixtures } from "../../domain/__tests__/fixtures/explanationFixtures";
import { buildAgentPlanPrompt } from "../LlmAgentPlanner";
import { buildLineExplanationPrompt, REASON_LINE } from "../explanationPrompt";

/**
 * 에이전트가 해설 프롬프트에 남기는 것(O3 · `SRV-REQ-059`) — 운영 해설(도구 칸 없음)의 프롬프트는 바이트까지 그대로여야 한다.
 * 도구 줄은 칸이 있을 때만(사실 0 이어도 — 원인 분리 실험의 대조군), 도구 사실 블록은 사실이 있을 때만
 */
const base = explanationFixtures(1)[0]!;
const RULE = "도구로 찾은 사실은 이 판단이 왜 나왔는지를 직접 받칠 때만";

describe("에이전트 프롬프트 경계", () => {
  it("도구 칸이 없으면 도구 줄 · 블록 0 — 운영 해설 프롬프트 그대로", () => {
    const p = buildLineExplanationPrompt(base);
    assert.ok(!p.includes(RULE));
    assert.ok(!p.includes("도구로 찾은 사실 ("));
  });

  it("칸만 있고 사실 0 이면 줄만(대조군) · 사실이 있으면 블록 + 출처 이름", () => {
    const empty = buildLineExplanationPrompt({ ...base, tools: { facts: [] } });
    assert.ok(empty.includes(RULE));
    assert.ok(!empty.includes("도구로 찾은 사실 ("));
    const full = buildLineExplanationPrompt({
      ...base,
      tools: {
        facts: [{ id: "tool-1", tool: "get_documents", news: true, text: "11월 18일 소식: 제목", source: { name: "DART 공시", url: null, at: null } }],
      },
    });
    assert.ok(full.includes(RULE));
    assert.ok(full.includes("- 11월 18일 소식: 제목 (DART 공시)"));
  });

  it("고르기 프롬프트 — 대상 · 사건 종류 목록 · 남은 호출, 숫자를 쓰라는 말 0", () => {
    const p = buildAgentPlanPrompt({
      koreanName: "삼성전자",
      entity: "asset:kr:005930",
      mode: "scalp",
      evidence: [{ label: "판단", value: "관망" }],
      entities: [{ id: "asset:kr:005930", name: "삼성전자" }],
      eventKinds: [],
      found: [],
      remainingCalls: 4,
    });
    assert.match(p, /- asset:kr:005930 \(삼성전자\)/);
    assert.match(p, /- \(없음\)/);
    assert.match(p, /최대 4개/);
  });
});

describe("근거 줄 지시(SRV-REQ-060)", () => {
  it("켜면 그 한 줄만 더해진다 — 나머지 프롬프트는 같다", () => {
    const off = buildLineExplanationPrompt(base);
    const on = buildLineExplanationPrompt(base, { reasonLine: true });
    assert.ok(!off.includes(REASON_LINE));
    assert.ok(on.includes(REASON_LINE));
    assert.equal(on.replace(`${REASON_LINE}\n`, ""), off);
  });
});
