import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

/**
 * **추천 · 점수 재료를 읽는 조회는 피드백 행을 돌려주지 않는다.**
 *
 * 피드백은 같은 표 · 같은 `ai_coach` 타입에 쌓인다. 2026-11-19 전엔 `findLatestRecommendation` 이 "가장 최근 `ai_coach`" 를
 * 골라 피드백 한 건 뒤로 저장 추천 카드가 계속 `null` 이었고, 이력 · 점수 재료에도 피드백이 섞였다.
 * 경계: 여러 행을 고르는 조회는 전부 `EXCLUDE_FEEDBACK` 를 건다 · 접두사 없는 피드백 키는 저장하지 않는다.
 * 키 쪽 경계는 `application/__tests__/recordCoachFeedbackKey.test.ts`.
 */
const source = readFileSync(path.resolve(__dirname, "../PrismaCoachInsightStore.ts"), "utf8");

describe("피드백 행은 추천으로 읽히지 않는다", () => {
  it("여러 행을 고르는 조회(findMany · findFirst)는 전부 피드백을 뺀다", () => {
    const reads = [...source.matchAll(/investmentInsight\.(findMany|findFirst)\(\{([\s\S]*?)\n    \}\);/g)];

    assert.ok(reads.length >= 3, `조회를 못 찾았다: ${reads.length}`);
    for (const [, method, body] of reads) {
      assert.match(body, /EXCLUDE_FEEDBACK/, `${method} 에 EXCLUDE_FEEDBACK 이 없다:\n${body}`);
    }
  });

  it("저장소는 접두사 없는 피드백 키를 거절한다", () => {
    const save = source.slice(source.indexOf("async saveFeedback"));
    assert.match(save.slice(0, 400), /startsWith\(FEEDBACK_KEY_PREFIX\)/);
  });
});
