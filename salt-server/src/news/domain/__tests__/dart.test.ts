import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DART_BODY_MAX_CHARS, dartKey, dartParagraphs, dartPublishedAt, dartTitle, dartViewerUrl, kstYmd } from "..";

/** F017 v4 2b — DART 공시 규칙(순수) */

describe("공시 원문 → 문단", () => {
  it("표 행은 칸을 | 로 이은 한 줄 · 스타일 0 · 엔티티 풀기", () => {
    const html = `<html><head><style>.x{font:1}</style></head><body><p>1. 불성실공시 &amp; 유형</p>
      <table><tr><td>매출액</td><td>9,016억원</td><td></td></tr><tr><th>영업이익</th><td>-831</td></tr></table><br/>끝&nbsp;줄</body></html>`;
    assert.deepEqual(dartParagraphs(html), ["1. 불성실공시 & 유형", "매출액 | 9,016억원", "영업이익 | -831", "끝 줄"]);
  });
  it("같은 줄 되풀이 · 빈 줄은 버린다", () => assert.deepEqual(dartParagraphs("<p>가</p><p>가</p><p> </p><p>나</p>"), ["가", "나"]));
  it("상한에서 자른다", () => {
    const html = Array.from({ length: 500 }, (_, i) => `<p>${"가".repeat(100)}${i}</p>`).join("");
    const out = dartParagraphs(html);
    assert.ok(out.join("").length < DART_BODY_MAX_CHARS + 200 && out.length < 500);
  });
});

describe("키 · 제목 · 시각", () => {
  it("키 · 뷰어 주소", () => {
    assert.equal(dartKey("20261113902073"), "dart:20261113902073");
    assert.equal(dartViewerUrl("20261113902073"), "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20261113902073");
  });
  it("제목 = 회사 + 보고서(공백 하나)", () => assert.equal(dartTitle({ corpName: "에코글로우", reportName: "불성실공시법인지정예고   (공시불이행 3건)" }), "에코글로우 불성실공시법인지정예고 (공시불이행 3건)"));
  it("접수일 → 그날 0시 KST · 틀린 꼴은 null", () => {
    assert.equal(dartPublishedAt("20261113")?.toISOString(), "2026-11-12T15:00:00.000Z");
    assert.equal(dartPublishedAt("2026-11-13"), null);
  });
  it("KST 날짜 — 자정 넘김", () => {
    assert.equal(kstYmd(new Date("2026-11-13T15:30:00Z")), "20261114");
    assert.equal(kstYmd(new Date("2026-11-13T15:30:00Z"), 1), "20261113");
    assert.equal(kstYmd(new Date("2026-11-13T14:30:00Z")), "20261113");
  });
});
