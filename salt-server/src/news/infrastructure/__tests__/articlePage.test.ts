import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decodeHtml, extractParagraphs, isPrivateAddress } from "../ArticlePageFetcher";

describe("SSRF — 사설 · 루프백 · 링크 로컬 주소를 막는다", () => {
  it("허용 · 거절 경계", () => {
    const table: Array<[string, boolean]> = [
      ["127.0.0.1", true], ["10.1.2.3", true], ["172.16.0.1", true], ["172.31.255.255", true], ["172.32.0.1", false],
      ["192.168.0.10", true], ["169.254.169.254", true], ["100.64.0.1", true], ["0.0.0.0", true], ["224.0.0.1", true],
      ["::1", true], ["fd00::1", true], ["fe80::1", true], ["::ffff:127.0.0.1", true],
      ["223.130.195.200", false], ["2404:6800:4004::200e", false],
    ];
    for (const [ip, blocked] of table) assert.equal(isPrivateAddress(ip), blocked, ip);
  });
});

describe("문자셋 — 머리 · 메타", () => {
  it("EUC-KR 메타면 그 문자셋으로 읽는다", () => {
    const bytes = Buffer.concat([Buffer.from('<meta charset="euc-kr"><p>'), Buffer.from([0xb0, 0xa1]), Buffer.from("</p>")]);
    assert.match(decodeHtml(bytes, "text/html"), /<p>가<\/p>/);
  });
  it("모르는 이름이면 UTF-8", () => {
    assert.equal(decodeHtml(Buffer.from("본문"), "text/html; charset=x-unknown"), "본문");
  });
});

describe("본문 문단 뽑기", () => {
  it("포털 기사 — 본문 칸만 · 사진 설명 · 스크립트 빼고 줄 단위", () => {
    const html = `<html><body><div class="nav">메뉴</div>
      <article id="dic_area">첫 문단입니다.<br><br>둘째 문단입니다.<span class="end_photo_org"><em class="img_desc">사진 설명</em></span>
      <script>alert(1)</script></article><div>많이 본 기사</div></body></html>`;
    assert.deepEqual(extractParagraphs(html, true), ["첫 문단입니다.", "둘째 문단입니다."]);
  });

  it("포털 기사 — 본문 칸이 글자를 직접 품고 사진 표가 끼어 있어도 순서대로(2026-11-09 실측 모양)", () => {
    const html = `<article id="dic_area">첫 문단이다.<br>  &#160;<br>  둘째 문단이다.<br>
      <table class="nbd_table"><tbody><tr><td><span class="end_photo_org"><img src="x"></span></td></tr><tr><td>  사진 설명. 뉴시스  </td></tr></tbody></table>
      셋째 문단이다.<br><br></article>`;
    assert.deepEqual(extractParagraphs(html, true), ["첫 문단이다.", "둘째 문단이다.", "셋째 문단이다."]);
  });

  it("포털 기사인데 본문 칸이 없으면 빈 배열", () => {
    assert.deepEqual(extractParagraphs("<html><body><p>다른 페이지</p></body></html>", true), []);
  });

  it("언론사 원문 — 읽기 모드 추출(머리 · 메뉴 · 꼬리 목록 빼고 본문 문단)", () => {
    const body = Array.from({ length: 6 }, (_, i) => `<p>비트코인 시장에 대한 ${i + 1}번째 문단입니다. 거래량과 자금 흐름, 규제 논의가 이어졌고 투자자들은 다음 지표를 기다리고 있습니다.</p>`).join("");
    const html = `<html><head><title>t</title></head><body><header><nav><a href="/">홈</a><a href="/a">경제</a></nav></header>
      <main><article><h1>제목</h1>${body}</article></main><aside><ul><li><a href="/x">다른 기사 하나</a></li></ul></aside><footer>회사 소개</footer></body></html>`;
    const out = extractParagraphs(html, false);
    // 머리 제목(h1)은 남을 수 있다 — 제목 되풀이는 도메인 cleanParagraphs 가 버린다
    assert.equal(out.filter((p) => p.startsWith("비트코인 시장에 대한")).length, 6);
    assert.ok(!out.some((p) => /회사 소개|다른 기사 하나|경제/.test(p)));
  });
});
