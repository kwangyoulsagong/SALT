import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  AI_LINK_WINDOW_MS,
  OUTLETS,
  type AiTitle,
  type OutletDef,
  type RssItem,
  isAiReadable,
  linkTitle,
  needsLink,
  nextFetchAt,
  outletByAlias,
  robotsVerdictFor,
  titleOutletSuffix,
} from "..";

/** SRV-REQ-058 — robots 판정 · 매체 목록 · 같은 기사 잇기 · 포털 0 */

describe("robots 판정 — AI 토큰 전부가 허락할 때만 (경계 표)", () => {
  const cases: Array<[string, { status: number; body: string }, string, string]> = [
    ["규칙 없음", { status: 200, body: "" }, "https://a.example/news/1", "allowed"],
    ["robots 없음(404) = 규칙 없음", { status: 404, body: "" }, "https://a.example/news/1", "allowed"],
    ["5xx = 전부 막힘", { status: 503, body: "" }, "https://a.example/news/1", "unreachable"],
    ["연결 실패 = 전부 막힘", { status: 0, body: "" }, "https://a.example/news/1", "unreachable"],
    ["* 가 막음", { status: 200, body: "User-agent: *\nDisallow: /" }, "https://a.example/news/1", "blocked_all"],
    ["ClaudeBot 만 막음", { status: 200, body: "User-agent: *\nAllow: /\n\nUser-agent: ClaudeBot\nDisallow: /" }, "https://a.example/news/1", "blocked_ai"],
    ["GPTBot 만 막아도 AI 막힘", { status: 200, body: "User-agent: GPTBot\nDisallow: /" }, "https://a.example/news/1", "blocked_ai"],
    [
      "AI 그룹이 경로 일부만 막음 — 다른 경로는 허락",
      { status: 200, body: "User-agent: Google-Extended\nDisallow: /\nAllow: /view/AKR*" },
      "https://a.example/view/AKR123",
      "allowed",
    ],
    ["같은 그룹 여러 이름", { status: 200, body: "User-agent: gptbot\nUser-agent: claudebot\nDisallow: /" }, "https://a.example/x", "blocked_ai"],
    ["긴 Allow 가 짧은 Disallow 를 이김", { status: 200, body: "User-agent: *\nDisallow: /news\nAllow: /news/view" }, "https://a.example/news/view/1", "allowed"],
    ["$ 끝 고정", { status: 200, body: "User-agent: *\nAllow: /$\nDisallow: /" }, "https://a.example/news", "blocked_all"],
    ["길이가 같으면 Allow", { status: 200, body: "User-agent: *\nDisallow: /news\nAllow: /news" }, "https://a.example/news/1", "allowed"],
    ["빈 Disallow = 규칙 없음", { status: 200, body: "User-agent: *\nDisallow:" }, "https://a.example/news", "allowed"],
    ["질의 문자열도 경로", { status: 200, body: "User-agent: *\nDisallow: /*?s=" }, "https://a.example/?s=btc", "blocked_all"],
    ["주석 무시", { status: 200, body: "# 전부 허락\nUser-agent: * # 모두\nDisallow: /admin/" }, "https://a.example/news", "allowed"],
    ["AI 봇 명시 허락", { status: 200, body: "User-agent: *\nAllow: /\nUser-agent: claudebot\nAllow: /" }, "https://a.example/news", "allowed"],
  ];
  for (const [name, snapshot, url, want] of cases) {
    it(name, () => assert.equal(robotsVerdictFor(snapshot, url), want));
  }
});

describe("매체 목록", () => {
  it("이름이 두 매체에 겹치지 않는다", () => {
    const seen = new Map<string, string>();
    for (const o of OUTLETS) {
      for (const a of [...o.aliases, ...(o.directSources ?? [])]) {
        const k = a.toLowerCase();
        assert.ok(!seen.has(k) || seen.get(k) === o.id, `${a}: ${seen.get(k)} · ${o.id}`);
        seen.set(k, o.id);
      }
    }
  });
  it("켤 수 있는 매체는 약관 원문을 읽은 날짜 · 메모가 있다", () => {
    for (const o of OUTLETS.filter((x) => x.terms.verdict === "ok")) {
      assert.ok(o.terms.checkedOn && o.terms.note.length > 10, o.id);
      assert.ok(o.feeds.length > 0 || (o.directSources?.length ?? 0) > 0, `${o.id} 받을 곳이 없다`);
    }
  });
  it("약관이 막은 매체(2026-11-14 확인)는 켜질 수 없다", () => {
    for (const id of ["hankyung", "etoday", "newspim", "mt", "edaily", "dealsite", "cointelegraph", "cryptoslate"]) {
      assert.equal(OUTLETS.find((o) => o.id === id)?.terms.verdict, "blocks", id);
    }
  });
  it("구글 뉴스 제목 꼬리 = 매체 이름", () => {
    assert.equal(titleOutletSuffix("비트코인 9만 달러 회복 - 토큰포스트"), "토큰포스트");
    assert.equal(titleOutletSuffix("꼬리 없는 제목"), null);
  });
});

describe("AI 경로 표식 — 포털 행은 읽지 않는다", () => {
  for (const [via, want] of [["rss_direct", true], ["dart", true], ["coin_rss", true], ["outlet_list", true], ["portal", false], ["", false], ["naver", false]] as const) {
    it(`${via || "(빈 값)"} → ${want}`, () => assert.equal(isAiReadable(via), want));
  }
});

const outlet = (over: Partial<OutletDef> = {}): OutletDef => ({
  id: "infostock", name: "인포스탁데일리", market: "kr", aliases: ["인포스탁"], feeds: ["https://f.example/rss"], via: "rss_direct",
  terms: { verdict: "ok", note: "테스트 매체 메모", checkedOn: "2026-11-14" }, ...over,
});
const T0 = new Date("2026-11-13T00:30:00Z");
const title = (over: Partial<AiTitle> = {}): AiTitle => ({
  key: "kr:1", market: "kr", title: "씨티씨바이오 3분기 누적 영업익 182% 증가…수익성 개선", publishedAt: T0, outletName: "인포스탁", directUrl: null, ...over,
});
const item = (over: Partial<RssItem> = {}): RssItem => ({
  url: "https://f.example/news/1", outletId: "infostock", title: "씨티씨바이오 3분기 누적 영업익 182% 증가…수익성 개선", publishedAt: new Date(T0.getTime() + 60_000), ...over,
});

describe("같은 기사 잇기 (경계 표)", () => {
  it("같은 제목 · 같은 매체 → 원문 주소", () => {
    const l = linkTitle(title(), outlet(), true, [item()]);
    assert.deepEqual([l.status, l.itemUrl, l.via], ["pending", "https://f.example/news/1", "rss_direct"]);
  });
  it("다른 매체 항목은 붙이지 않는다", () => {
    assert.equal(linkTitle(title(), outlet(), true, [item({ outletId: "fnnews" })]).status, "unmatched");
  });
  it("비슷하지만 다른 기사(겹침 < 0.8)는 붙이지 않는다", () => {
    assert.equal(linkTitle(title(), outlet(), true, [item({ title: "씨티씨바이오 대표 교체…신약 임상 속도" })]).status, "unmatched");
  });
  it("2일 넘게 떨어진 같은 제목은 붙이지 않는다", () => {
    assert.equal(linkTitle(title(), outlet(), true, [item({ publishedAt: new Date(T0.getTime() + 3 * 86_400_000) })]).status, "unmatched");
  });
  it("매체가 꺼져 있으면 blocked — 주소를 찾지 않는다", () => {
    const l = linkTitle(title(), outlet(), false, [item()]);
    assert.deepEqual([l.status, l.itemUrl], ["blocked", null]);
  });
  it("목록에 없는 매체 → no_outlet", () => assert.equal(linkTitle(title({ outletName: "모름" }), undefined, false, []).status, "no_outlet"));
  it("원장 주소가 곧 원문이면 잇기 없이", () => {
    const l = linkTitle(title({ directUrl: "https://c.example/a" }), outlet({ via: "coin_rss" }), true, []);
    assert.deepEqual([l.status, l.itemUrl, l.via], ["pending", "https://c.example/a", "coin_rss"]);
  });
  it("매체 이름은 대소문자 무시", () => assert.equal(outletByAlias(OUTLETS).get("cointelegraph")?.id, "cointelegraph"));
});

describe("다시 볼 때 · 재시도", () => {
  const now = new Date(T0.getTime() + 60_000);
  it("처음 보는 제목은 잇는다", () => assert.equal(needsLink(null, T0, now), true));
  it("못 이은 것 · 꺼졌던 매체는 창 안에서 다시", () => {
    assert.equal(needsLink("unmatched", T0, now), true);
    assert.equal(needsLink("blocked", T0, now), true);
    assert.equal(needsLink("unmatched", T0, new Date(T0.getTime() + AI_LINK_WINDOW_MS + 1)), false);
  });
  it("받기 시작한 · 끝난 행은 건드리지 않는다", () => {
    for (const s of ["pending", "ok", "empty", "failed", "no_outlet", "robots_blocked"] as const) assert.equal(needsLink(s, T0, now), false, s);
  });
  it("실패 1 · 2 → 5분 · 10분 뒤, 3회면 끝", () => {
    assert.equal(nextFetchAt(1, T0)?.getTime(), T0.getTime() + 5 * 60_000);
    assert.equal(nextFetchAt(2, T0)?.getTime(), T0.getTime() + 10 * 60_000);
    assert.equal(nextFetchAt(3, T0), null);
  });
});

describe("AI 경로에 포털 검색 코드 0 (SRV-REQ-058 수용 기준)", () => {
  const root = join(__dirname, "..", "..");
  const files = [
    join(root, "application", "CollectAiBodies.ts"),
    join(root, "infrastructure", "OutletFeedClient.ts"),
    join(root, "infrastructure", "AiTitleAdapter.ts"),
    join(root, "infrastructure", "PrismaAiBodyStore.ts"),
    ...readdirSync(join(root, "domain")).filter((f) => /^(AiBody|Outlets|Robots)\.ts$/.test(f)).map((f) => join(root, "domain", f)),
  ];
  for (const f of files) {
    it(f.split("/news/")[1]!, () => {
      const src = readFileSync(f, "utf8");
      assert.doesNotMatch(src, /NaverNewsSearch|ArticleSearchPort|openapi\.naver|news\.google\.com\/rss\/search|news_article_body/);
    });
  }
});

describe("본문 꼬리 — 매체가 가린 기자 메일 줄", () => {
  it("[email protected] 기자 줄은 버리고 본문은 남긴다", async () => {
    const { cleanParagraphs } = await import("..");
    const body = "연결 매출 9016억원으로 국내 주요 사업 성장에 힘입어 9000억원대를 유지했다.";
    assert.deepEqual(cleanParagraphs([body, "[email protected] 김경아 기자"]), [body]);
  });
});
