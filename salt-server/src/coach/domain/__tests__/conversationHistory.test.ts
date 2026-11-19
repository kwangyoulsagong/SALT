import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { coachHistoryCutoff } from "../policy/conversationHistory";

/** 보관 한도 경계(`SRV-REQ-028` FR-30) — 경계는 늘 남길 질문 하나의 시각이다(짝이 갈라지지 않게) */
const NOW = new Date("2026-11-19T07:00:00.000Z");
const min = (n: number) => new Date(NOW.getTime() - n * 60_000);
const day = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

describe("coachHistoryCutoff", () => {
  const cases: Array<[string, Date[], number, number, Date | null]> = [
    ["한도보다 적으면 가장 오래된 질문이 경계(지울 것 0)", [min(1), min(2), min(3)], 5, 90, min(3)],
    ["한도와 같으면 마지막 질문이 경계", [min(1), min(2), min(3)], 3, 90, min(3)],
    ["한도를 넘으면 N 번째 질문이 경계 — 그보다 앞은 지운다", [min(1), min(2), min(3), min(4)], 3, 90, min(3)],
    ["기간 밖 질문은 수가 적어도 경계 밖", [min(1), day(10), day(100)], 5, 90, day(10)],
    ["정확히 기간 끝(90일)은 남긴다", [min(1), day(90)], 5, 90, day(90)],
    ["남길 질문이 없으면 null — 지우지 않는다", [day(100), day(200)], 5, 90, null],
    ["질문이 없으면 null", [], 5, 90, null],
    ["한도 0 이면 null", [min(1)], 0, 90, null],
  ];
  for (const [name, times, keepQuestions, keepDays, expected] of cases) {
    it(name, () => {
      assert.deepEqual(coachHistoryCutoff(times, NOW, keepQuestions, keepDays), expected);
    });
  }
});
