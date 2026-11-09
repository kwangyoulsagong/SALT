import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ArticleBodyUnavailableError,
  BODY_EXTRACTOR_VERSION,
  ArticleNotFoundError,
  type ArticleBodyStore,
  type ArticleCandidate,
  type ArticleRepository,
  type StoredArticleBody,
} from "../../domain";
import { GetArticleBody, ReadArticleBody } from "../ReadArticleBody";

const NOW = new Date("2026-11-09T02:00:00Z");
const query = { key: "coin:a", title: "두나무, 가상자산 상속 보호 제도 개선 제안 - 예시", publishedAt: new Date("2026-11-09T01:00:00Z") };
const same: ArticleCandidate = {
  title: "두나무, 가상자산 상속 보호 제도 개선 제안",
  originalUrl: "https://press.example/1",
  portalUrl: "https://n.news.naver.com/article/001/1",
  publishedAt: new Date("2026-11-09T00:50:00Z"),
};

const memoryStore = (initial: StoredArticleBody[] = []) => {
  const rows = new Map(initial.map((r) => [r.key, r]));
  const store: ArticleBodyStore = { find: async (k) => rows.get(k) ?? null, save: async (r) => void rows.set(r.key, r) };
  return { store, rows };
};

const build = (opts: { enabled?: boolean; candidates?: ArticleCandidate[] | Error; paragraphs?: string[]; rows?: StoredArticleBody[] } = {}) => {
  const calls = { search: 0, page: [] as Array<[string, boolean]> };
  const { store, rows } = memoryStore(opts.rows);
  const read = new ReadArticleBody(
    {
      search: {
        enabled: opts.enabled ?? true,
        search: async () => {
          calls.search += 1;
          if (opts.candidates instanceof Error) throw opts.candidates;
          return opts.candidates ?? [same];
        },
      },
      pages: { paragraphs: async (url, portal) => (calls.page.push([url, portal]), opts.paragraphs ?? ["첫 문단.", "둘째 문단."]) },
      bodies: store,
    },
    () => NOW,
  );
  return { read, calls, rows };
};

describe("ReadArticleBody — 캐시 → 검색 → 같은 기사 → 문단", () => {
  it("찾으면 포털 주소로 문단을 읽고 캐시한다 · 두 번째는 검색 0", async () => {
    const { read, calls, rows } = build();
    const v = await read.execute(query);
    assert.deepEqual(v, { status: "ok", paragraphs: ["첫 문단.", "둘째 문단."], originalUrl: "https://press.example/1", fetchedAt: NOW.toISOString() });
    assert.deepEqual(calls.page, [["https://n.news.naver.com/article/001/1", true]]);
    assert.equal(rows.get("coin:a")?.status, "ok");
    await read.execute(query);
    assert.equal(calls.search, 1);
  });

  it("같은 기사가 없으면 not_found · 페이지를 부르지 않는다", async () => {
    const { read, calls } = build({ candidates: [{ ...same, title: "업비트, 신규 상장 공지" }] });
    assert.equal((await read.execute(query)).status, "not_found");
    assert.equal(calls.page.length, 0);
  });

  it("본문이 비면 not_found · 검색이 터지면 failed(캐시에 남아 30분 뒤 다시)", async () => {
    assert.equal((await build({ paragraphs: ["저작권자 © 예시 무단전재 금지"] }).read.execute(query)).status, "not_found");
    const { read, rows } = build({ candidates: new Error("timeout") });
    assert.equal((await read.execute(query)).status, "failed");
    assert.equal(rows.get("coin:a")?.status, "failed");
  });

  it("동시에 두 번 불러도 검색 1회", async () => {
    const { read, calls } = build();
    await Promise.all([read.execute(query), read.execute(query)]);
    assert.equal(calls.search, 1);
  });

  it("키가 없으면 503 · 단 캐시가 있으면 그대로 준다", async () => {
    await assert.rejects(build({ enabled: false }).read.execute(query), ArticleBodyUnavailableError);
    const cached: StoredArticleBody = { key: "coin:a", status: "not_found", paragraphs: [], url: null, originalUrl: null, fetchedAt: new Date("2026-11-01T00:00:00Z"), version: BODY_EXTRACTOR_VERSION };
    assert.equal((await build({ enabled: false, rows: [cached] }).read.execute(query)).status, "not_found");
  });

  it("못 찾음 캐시는 3시간 뒤 다시 찾는다", async () => {
    const old: StoredArticleBody = { key: "coin:a", status: "not_found", paragraphs: [], url: null, originalUrl: null, fetchedAt: new Date("2026-11-08T22:00:00Z"), version: BODY_EXTRACTOR_VERSION };
    const { read, calls } = build({ rows: [old] });
    assert.equal((await read.execute(query)).status, "ok");
    assert.equal(calls.search, 1);
  });
});

describe("뽑기 판", () => {
  it("옛 판으로 찾은 '찾음' 행은 다시 찾는다", async () => {
    const old: StoredArticleBody = { key: "coin:a", status: "ok", paragraphs: ["사진 설명뿐"], url: null, originalUrl: null, fetchedAt: new Date("2026-11-09T01:00:00Z"), version: 0 };
    const { read, calls } = build({ rows: [old] });
    assert.deepEqual((await read.execute(query)).paragraphs, ["첫 문단.", "둘째 문단."]);
    assert.equal(calls.search, 1);
  });
});

describe("GetArticleBody — 코인 원장 머리로", () => {
  it("없는 기사 404 · 있으면 coin:<id> 키", async () => {
    const { read } = build();
    const articles = { findHead: async (id: string) => (id === "a" ? { title: query.title, publishedAt: query.publishedAt } : null) } as unknown as ArticleRepository;
    await assert.rejects(new GetArticleBody(articles, read).execute("b"), ArticleNotFoundError);
    assert.equal((await new GetArticleBody(articles, read).execute("a")).status, "ok");
  });
});
