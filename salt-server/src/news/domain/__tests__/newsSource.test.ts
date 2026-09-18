import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isKoreanSource, KOREAN_SOURCES } from "../NewsSource";

/**
 * 언어 분류 테스트.
 *
 * **이 테스트가 없어서 `language: "ko"` 가 항상 0건인 것을 아무도 몰랐다.**
 * 목록에 있는 이름만 검사하면 통과하므로, 실제로 저장되는 값
 * (`GoogleNews(키워드)`)을 함께 넣는 것이 이 테스트의 전부다.
 */

describe("isKoreanSource", () => {
  it("고정 이름 넷을 분류한다", () => {
    for (const source of KOREAN_SOURCES) {
      assert.equal(isKoreanSource(source), true, source);
    }
  });

  it("**한글 수집기가 실제로 저장하는 이름**을 분류한다", () => {
    assert.equal(isKoreanSource("GoogleNews(비트코인)"), true);
    assert.equal(isKoreanSource("GoogleNews(이더리움 규제)"), true);
  });

  it("영문 소스는 아니다", () => {
    for (const source of ["coindesk", "cointelegraph", "cryptopanic", "cryptoslate"]) {
      assert.equal(isKoreanSource(source), false, source);
    }
  });

  it("이름이 비슷하기만 한 것은 걸리지 않는다", () => {
    assert.equal(isKoreanSource("GoogleNews"), false);
    assert.equal(isKoreanSource("MyGoogleNews(비트코인)"), false);
  });
});
