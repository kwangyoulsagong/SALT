import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ExplanationContractError, toExplanationHistoryViewModel } from "../explanation.viewmodel";

/** 지난 날 해설 뷰모델 — `BFF-REQ-057`. 그날 원문 그대로 · 등락률은 서버 값 · 모양이 깨지면 502 */
const day = (patch: Record<string, unknown> = {}) => ({
  tradeDay: "2026-11-25",
  generatedAt: "2026-11-25T06:40:00.000Z",
  action: "wait",
  provider: "local_claude",
  sentences: [
    {
      section: "keyDrivers",
      text: "삼성전자는 오늘 -9.87% 움직였어요.",
      citations: [{ id: "quote", label: "삼성전자 시세", at: "2026-11-25T06:40:00.000Z", url: null }],
    },
    {
      section: "track",
      text: "지금 성적 문장",
      citations: [{ id: "track", label: "판정 성적", at: null, url: null }],
    },
  ],
  dayChangeRate: -9.87,
  changeSinceRate: 2.23,
  ...patch,
});
const server = (patch: Record<string, unknown> = {}) => ({
  symbol: "005930",
  mode: "long_term",
  disclaimer: "참고용이에요",
  days: [day()],
  ...patch,
});

describe("toExplanationHistoryViewModel", () => {
  it("그날 문장 · 판정 · 등락률을 그대로 옮기고, 지금 값인 성적 칸(track · miss)은 뺀다", () => {
    const v = toExplanationHistoryViewModel(server());
    assert.equal(v.days.length, 1);
    const d = v.days[0]!;
    assert.equal(d.tradeDay, "2026-11-25");
    assert.equal(d.action, "wait");
    assert.equal(d.dayChangeRate, -9.87);
    assert.equal(d.changeSinceRate, 2.23);
    assert.deepEqual(
      d.sentences.map((s) => s.section),
      ["keyDrivers"],
    );
  });

  it("빈 목록은 정상이다 — 아직 쌓인 날이 없다", () => {
    assert.deepEqual(toExplanationHistoryViewModel(server({ days: [] })).days, []);
  });

  it("일봉이 없으면 등락률은 null 로 둔다(0 으로 접지 않는다)", () => {
    const d = toExplanationHistoryViewModel(server({ days: [day({ dayChangeRate: null, changeSinceRate: undefined })] })).days[0]!;
    assert.equal(d.dayChangeRate, null);
    assert.equal(d.changeSinceRate, null);
  });

  for (const [name, patch] of [
    ["날짜 형식", { tradeDay: "11/25" }],
    ["모르는 판정", { action: "buy" }],
    ["모르는 공급자", { provider: "x" }],
    ["빈 문장", { sentences: [] }],
    ["숫자가 아닌 등락률", { dayChangeRate: "-9.87" }],
  ] as const) {
    it(`모양이 깨지면 계약 오류 — ${name}`, () => {
      assert.throws(() => toExplanationHistoryViewModel(server({ days: [day(patch)] })), ExplanationContractError);
    });
  }

  it("days 가 배열이 아니면 계약 오류", () => {
    assert.throws(() => toExplanationHistoryViewModel(server({ days: null })), ExplanationContractError);
  });
});
