import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readingTail, withJosa } from "../josa";

// FEATURE-008 FR-48 · SRV-REQ-037 FR-14 — 영문 · 숫자 뒤 조사는 읽는 소리로 고른다
describe("withJosa", () => {
  it("한글 끝 글자는 es-hangul 그대로", () => {
    assert.equal(withJosa("비트코인", "은/는"), "비트코인은");
    assert.equal(withJosa("이더리움", "이/가"), "이더리움이");
    assert.equal(withJosa("리플", "을/를"), "리플을");
    assert.equal(withJosa("서울", "으로/로"), "서울로");
    assert.equal(withJosa("카카오", "와/과"), "카카오와");
  });

  it("티커는 알파벳을 한 글자씩 읽는다 — L · M · N · R 만 받침", () => {
    assert.equal(withJosa("SOL", "은/는"), "SOL은"); // 에스오엘
    assert.equal(withJosa("BTC", "은/는"), "BTC는"); // 비티씨
    assert.equal(withJosa("ETH", "이/가"), "ETH가"); // 이티에이치
    assert.equal(withJosa("XRP", "을/를"), "XRP를"); // 엑스알피
    assert.equal(withJosa("TRUMP", "은/는"), "TRUMP는"); // …피
    assert.equal(withJosa("ATOM", "이/가"), "ATOM이"); // …엠
    assert.equal(withJosa("TON", "와/과"), "TON과"); // …엔
    assert.equal(withJosa("STR", "으로/로"), "STR로"); // …알 — ㄹ 받침은 '로'
    assert.equal(withJosa("btc", "은/는"), "btc는");
  });

  it("숫자는 끝자리로 읽는다", () => {
    assert.equal(withJosa("3", "은/는"), "3은"); // 삼
    assert.equal(withJosa("10", "이/가"), "10이"); // 영(십)
    assert.equal(withJosa("2", "을/를"), "2를"); // 이
    assert.equal(withJosa("7", "으로/로"), "7로"); // 칠 — ㄹ 받침
    assert.equal(withJosa("6", "으로/로"), "6으로"); // 육
    assert.equal(withJosa("005930", "은/는"), "005930은");
  });

  it("% · 괄호 · 따옴표", () => {
    assert.equal(withJosa("12%", "이/가"), "12%가"); // 퍼센트
    assert.equal(withJosa("솔라나(SOL)", "은/는"), "솔라나(SOL)은");
    assert.equal(withJosa("'관망'", "이/가"), "'관망'이");
  });

  it("읽을 수 없는 끝 글자는 es-hangul 기본값", () => {
    assert.equal(readingTail("★"), null);
    assert.equal(withJosa("★", "은/는"), "★는");
  });

  it("결정적이다 — 같은 입력이면 같은 출력", () => {
    const run = () => ["SOL", "BTC", "3", "비트코인"].map((w) => withJosa(w, "은/는")).join(",");
    assert.equal(run(), run());
  });
});
