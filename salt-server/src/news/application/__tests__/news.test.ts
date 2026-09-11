import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  ArticleDraft,
  ArticleRepository,
  BookmarkRepository,
  NewsFeedPort,
} from "../../domain";
import { ArticleNotFoundError, isKoreanSource } from "../../domain";
import { createNewsApplication } from "../api";

/**
 * Port 가 생겨서 **DB 없이 유스케이스를 잰다.**
 *
 * 이관 전에는 이 판정들이 전부 `prisma` 호출 뒤에 있어서 확인하려면 DB 가 필요했고,
 * DB 가 비어 있어 스냅샷이 성립하지 않았다(`SRV-REQ-006` 체크리스트 §5). 여기서
 * 검증하는 것은 **유스케이스가 정한 규칙**이지 Prisma 쿼리가 아니다.
 */

const draft = (url: string): ArticleDraft => ({
  title: `t-${url}`,
  content: "c",
  url,
  source: "coindesk",
  symbols: [],
  publishedAt: new Date("2026-09-11T00:00:00Z"),
});

const fakeArticles = (overrides: Partial<ArticleRepository> = {}) => {
  const saved = new Set<string>();
  const base: ArticleRepository = {
    findMany: async () => ({
      articles: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    }),
    findByIdAndCountView: async () => null,
    exists: async () => false,
    findBySymbol: async () => [],
    findTrending: async () => [],
    countBySource: async () => [],
    saveIfNew: async (d) => {
      if (saved.has(d.url)) return false;
      saved.add(d.url);
      return true;
    },
  };
  return { ...base, ...overrides };
};

const fakeFeed = (english: ArticleDraft[], korean: ArticleDraft[]): NewsFeedPort => ({
  fetchEnglish: async () => english,
  fetchKorean: async () => korean,
});

const fakeBookmarks = (
  overrides: Partial<BookmarkRepository> = {}
): BookmarkRepository => ({
  exists: async () => false,
  add: async () => {},
  remove: async () => true,
  listArticles: async () => ({ articles: [], total: 0 }),
  ...overrides,
});

const build = (deps: {
  articles?: ArticleRepository;
  bookmarks?: BookmarkRepository;
  feed?: NewsFeedPort;
}) =>
  createNewsApplication({
    articles: deps.articles ?? fakeArticles(),
    bookmarks: deps.bookmarks ?? fakeBookmarks(),
    feed: deps.feed ?? fakeFeed([], []),
  });

describe("CrawlNews", () => {
  it("이미 있는 URL 은 skipped 로 센다", async () => {
    const { useCases } = build({
      feed: fakeFeed([draft("a"), draft("a")], [draft("b")]),
    });

    const result = await useCases.crawlNews.execute();

    assert.deepEqual(result, {
      savedCount: 2,
      skippedCount: 1,
      total: 3,
      english: 2,
      korean: 1,
    });
  });

  /**
   * 한 건의 저장 실패는 **저장도 스킵도 아니다.** 두 수의 합이 `total` 보다 작으면
   * 그 차이가 실패 건수라는 것이 원문의 계약이고, 이관하면서 유지했다.
   */
  it("한 건이 던져도 회차가 멈추지 않고, 그 건은 어느 쪽으로도 세지 않는다", async () => {
    const articles = fakeArticles({
      saveIfNew: async (d) => {
        if (d.url === "boom") throw new Error("db down");
        return true;
      },
    });

    const { useCases } = build({
      articles,
      feed: fakeFeed([draft("a"), draft("boom"), draft("c")], []),
    });

    const result = await useCases.crawlNews.execute();

    assert.equal(result.savedCount, 2);
    assert.equal(result.skippedCount, 0);
    assert.equal(result.total, 3);
  });
});

describe("GetArticle", () => {
  it("없으면 ArticleNotFoundError 를 던지고 메시지는 원문 그대로다", async () => {
    const { useCases } = build({});

    await assert.rejects(() => useCases.getArticle.execute("nope"), (error: unknown) => {
      assert.ok(error instanceof ArticleNotFoundError);
      assert.equal(error.message, "News article not found");
      assert.equal(error.kind, "NOT_FOUND");
      return true;
    });
  });
});

describe("BookmarkArticle", () => {
  it("이미 담은 기사는 실패가 아니라 아무 일도 일어나지 않는다", async () => {
    const { useCases } = build({
      articles: fakeArticles({ exists: async () => true }),
      bookmarks: fakeBookmarks({
        exists: async () => true,
        add: async () => assert.fail("중복 북마크에서 add 를 부르면 안 된다"),
      }),
    });

    assert.deepEqual(await useCases.bookmarkArticle.execute("u1", "n1"), {
      message: "Already bookmarked",
    });
  });

  it("기사가 없으면 북마크를 만들지 않는다", async () => {
    const { useCases } = build({
      articles: fakeArticles({ exists: async () => false }),
    });

    await assert.rejects(
      () => useCases.bookmarkArticle.execute("u1", "n1"),
      ArticleNotFoundError
    );
  });
});

describe("RemoveBookmark", () => {
  it("지워진 행이 없으면 BookmarkNotFoundError 다", async () => {
    const { useCases } = build({
      bookmarks: fakeBookmarks({ remove: async () => false }),
    });

    await assert.rejects(() => useCases.removeBookmark.execute("u1", "n1"), {
      message: "Bookmark not found",
    });
  });
});

describe("ListNewsSources", () => {
  /**
   * **이 분류는 지금 아무것도 한글로 잡지 못한다.** 수집기가 `GoogleNews(키워드)` 를
   * 저장하기 때문이다(`domain/NewsSource.ts` 주석). 그 사실을 테스트로 고정해 둔다 —
   * 누군가 목록을 고치면 이 테스트가 **의도된 변경인지 묻는다.**
   */
  it("실제 저장되는 소스 이름은 한글로 분류되지 않는다", async () => {
    const { useCases } = build({
      articles: fakeArticles({
        countBySource: async () => [
          { source: "GoogleNews(비트코인)", _count: { source: 12 } },
          { source: "coindesk", _count: { source: 5 } },
          { source: "토큰포스트", _count: { source: 1 } },
        ],
      }),
    });

    const result = await useCases.listNewsSources.execute();

    assert.deepEqual(
      result.korean.map((s) => s.source),
      ["토큰포스트"]
    );
    assert.equal(result.english.length, 2);
    assert.equal(isKoreanSource("GoogleNews(비트코인)"), false);
  });
});

describe("공개 API", () => {
  it("심볼을 대문자로 정규화해서 넘긴다", async () => {
    let received = "";
    const { api } = build({
      articles: fakeArticles({
        findBySymbol: async (symbol) => {
          received = symbol;
          return [];
        },
      }),
    });

    await api.findArticlesBySymbol("btc");

    assert.equal(received, "BTC");
  });
});
