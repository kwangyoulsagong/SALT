import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { KoreanNewsFeed, googleNewsDayUrl } from "../KoreanNewsFeed";

/** 빈 날 다시 검색(`SRV-REQ-057` FR-8) — 날짜 주소 · 같은 source · 같은 변환 · 차례로 · 실패 세기 */

describe("googleNewsDayUrl", () => {
  it("키워드 after:그날 before:다음날 — 한국 설정 그대로", () => {
    const url = new URL(googleNewsDayUrl("비트코인", "2026-11-10"));
    assert.equal(url.origin + url.pathname, "https://news.google.com/rss/search");
    assert.equal(url.searchParams.get("q"), "비트코인 after:2026-11-10 before:2026-11-11");
    assert.equal(url.searchParams.get("hl"), "ko");
    assert.equal(url.searchParams.get("ceid"), "KR:ko");
  });
  it("달 · 해 경계", () => {
    assert.match(decodeURIComponent(googleNewsDayUrl("코인", "2026-12-31")), /after:2026-12-31 before:2027-01-01/);
    assert.match(decodeURIComponent(googleNewsDayUrl("코인", "2026-11-30")), /before:2026-12-01/);
  });
});

describe("fetchKoreanDay", () => {
  it("키워드 10개를 차례로(사이 1초) · source = GoogleNews(키워드) · 종목 · 감성 같은 규칙 · 하루 100건까지 · 실패는 세고 건너뜀", async () => {
    const urls: string[] = [];
    const sleeps: number[] = [];
    let inFlight = 0;
    const many = Array.from({ length: 120 }, (_, i) => ({
      title: `비트코인 급등 ${i}`,
      link: `https://news.example/${i}`,
      isoDate: "2026-11-10T20:00:00.000Z",
      contentSnippet: "요약",
    }));
    const feed = new KoreanNewsFeed(
      async (url) => {
        inFlight++;
        assert.equal(inFlight, 1, "동시에 두 요청을 보내지 않는다");
        urls.push(url);
        await Promise.resolve();
        inFlight--;
        if (url.includes(encodeURIComponent("빗썸"))) throw new Error("timeout");
        return { items: url.includes(encodeURIComponent("비트코인 ")) ? many : [] };
      },
      async (ms) => {
        sleeps.push(ms);
      }
    );
    const got = await feed.fetchKoreanDay("2026-11-10");
    assert.equal(urls.length, 10);
    assert.deepEqual(sleeps, Array(9).fill(1000));
    assert.ok(urls.every((u) => decodeURIComponent(u).includes("after:2026-11-10 before:2026-11-11")));
    assert.equal(got.failed, 1);
    assert.equal(got.items.length, 100);
    assert.equal(got.items[0].source, "GoogleNews(비트코인)");
    assert.deepEqual(got.items[0].symbols, ["BTC"]);
    assert.equal(got.items[0].sentiment, "positive");
    assert.equal(got.items[0].publishedAt.toISOString(), "2026-11-10T20:00:00.000Z");
  });
});
