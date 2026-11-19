import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type CoachInsightDraft, type CoachInsightStore, FEEDBACK_KEY_PREFIX } from "../../domain";
import { RecordCoachFeedback } from "../RecordCoachFeedback";

/**
 * 피드백 키는 늘 `FEEDBACK_KEY_PREFIX` 로 시작한다 — 추천 · 점수 재료 조회가 그 접두사로 피드백 행을 뺀다
 * (`infrastructure/__tests__/feedbackRowsExcluded.test.ts`). 2026-11-19 전엔 피드백 한 건 뒤로 저장 추천 카드가 `null` 이었다.
 */
describe("RecordCoachFeedback 키", () => {
  it("만드는 키마다 접두사로 시작하고 서로 다르다", async () => {
    const saved: CoachInsightDraft[] = [];
    const store = {
      saveFeedback: async (draft: CoachInsightDraft) => {
        saved.push(draft);
        return { ...draft, id: "x", type: "ai_coach", symbol: draft.symbol ?? null, createdAt: new Date() };
      },
    } as unknown as CoachInsightStore;
    const record = new RecordCoachFeedback(store);
    const command = { symbol: "btc", mode: "long_term", action: "followed", outcome: "unknown" } as const;

    await record.execute("u1", command);
    await record.execute("u1", command);

    assert.equal(saved.length, 2);
    for (const draft of saved) assert.ok(draft.dedupeKey.startsWith(FEEDBACK_KEY_PREFIX), draft.dedupeKey);
    assert.notEqual(saved[0].dedupeKey, saved[1].dedupeKey);
  });
});
