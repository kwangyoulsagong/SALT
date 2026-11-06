import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { decisionChangedPayload } from "../OutboxDecisionChangeNotifier";

/**
 * `coach.DecisionChanged` 본문이 루트 계약 파일과 같은 모양인가(`SRV-REQ-048` FR-5 · `SRV-REQ-044` FR-3).
 * Kotlin 은 발행 시점에 스키마로 검증하지만 이 이벤트는 Express 가 쓴다 — 어긋나면 플랫폼 쪽 구독이 데드레터로 보낸다.
 */
const schema = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../../../../contracts/events/coach.DecisionChanged.json"), "utf8"),
) as { required: string[]; properties: Record<string, { pattern?: string; minLength?: number }> };

describe("coach.DecisionChanged 본문", () => {
  const body = decisionChangedPayload(
    { userId: "u1", symbol: "BTC", mode: "scalp", previousAction: "wait", nextAction: "review_accumulation" },
    new Date("2026-11-06T01:02:03.004Z"),
  );

  it("칸이 계약과 같다 — 더도 덜도 없음", () => {
    assert.deepEqual(Object.keys(body).sort(), [...schema.required].sort());
    assert.deepEqual(Object.keys(schema.properties).sort(), [...schema.required].sort());
  });

  it("값이 계약 패턴을 지난다 · 금액 0", () => {
    for (const [key, rule] of Object.entries(schema.properties)) {
      const value = (body as Record<string, string>)[key];
      assert.equal(typeof value, "string", key);
      if (rule.pattern) assert.match(value, new RegExp(rule.pattern), key);
      if (rule.minLength) assert.ok(value.length >= rule.minLength, key);
    }
    assert.ok(!/price|score|amount/i.test(JSON.stringify(body)));
  });
});
