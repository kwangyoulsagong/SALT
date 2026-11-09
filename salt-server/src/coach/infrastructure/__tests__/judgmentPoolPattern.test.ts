import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { memoizeFor, poolPatternOf } from "../PrismaSymbolJudgmentStore";

/**
 * 성적 기저율 풀 — 접두 `LIKE` 무늬(2026-11-09 판단 상세 504 고침). `_` 가 아무 글자로 읽히면 `kr-stock.` 같은 남의 풀이 섞인다
 */
describe("poolPatternOf — LIKE 무늬는 접두 글자 그대로", () => {
  it("허용 · 거절 경계", () => {
    assert.equal(poolPatternOf("kr_stock.long_term.wait"), "kr\\_stock.long\\_term.%");
    assert.equal(poolPatternOf("scalp.buy"), "scalp.%");
    assert.equal(poolPatternOf("a%b.c"), "a\\%b.%");
    assert.equal(poolPatternOf("a\\b.c"), "a\\\\b.%");
  });
});

describe("memoizeFor — 성적 집계 5분 들고 있기", () => {
  it("TTL 안 같은 키 1회 · 동시 1회 · 키가 다르면 따로 · TTL 지나면 다시 · 실패는 들고 있지 않는다", async () => {
    let t = 0;
    let loads = 0;
    const memo = memoizeFor<number>(1000, () => t);
    const load = async () => ++loads;
    await Promise.all([memo("a", load), memo("a", load)]);
    assert.equal(loads, 1, "동시 1회");
    t = 999;
    await memo("a", load);
    assert.equal(loads, 1, "TTL 안");
    await memo("b", load);
    assert.equal(loads, 2, "다른 키");
    t = 1000;
    await memo("a", load);
    assert.equal(loads, 3, "TTL 지남");
    await assert.rejects(memo("c", async () => { throw new Error("db"); }));
    assert.equal(await memo("c", async () => 7), 7, "실패 뒤 다시 부른다");
    memo.clear();
    await memo("b", load);
    assert.equal(loads, 4, "비운 뒤 다시");
  });
});
