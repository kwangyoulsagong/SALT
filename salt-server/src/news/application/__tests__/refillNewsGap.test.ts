import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ArticleDraft, ArticleRepository, NewsDayResult } from "../../domain";
import { NEWS_GAP_CAP_DAYS, newsGapDays } from "../../domain";
import { RefillNewsGap } from "../RefillNewsGap";

/**
 * 잠든 동안 빈 날 메우기(`SRV-REQ-057` FR-8).
 *
 * 불변식: 마지막 성공이 2시간 넘게 지났으면 (마지막 성공 − 하루)의 UTC 날짜부터 오늘까지 매일을 다시 찾는다 · 최대 14일 전까지.
 * 기록이 없으면(첫 수집) 메우지 않는다. 예측 수집 `gap_days` 와 같은 경계 표.
 */

const H = 3_600_000;

describe("newsGapDays — 허용 · 거절 경계", () => {
  const now = new Date("2026-11-17T01:00:00Z");
  const table: Array<[string, Date | null, Date, string[] | number]> = [
    ["첫 수집(기록 없음) — 과거 백필은 이 일의 몫이 아니다", null, now, []],
    ["70분 — 매시 한 번 빠짐은 30건 안", new Date(now.getTime() - 70 * 60_000), now, []],
    ["1시간 59분 — 아직 안 메움", new Date(now.getTime() - 2 * H + 60_000), now, []],
    ["정확히 2시간 — 메움(앞뒤 하루 겹침)", new Date(now.getTime() - 2 * H), now, ["2026-11-15", "2026-11-16", "2026-11-17"]],
    ["15시간 — 3일", new Date(now.getTime() - 15 * H), now, ["2026-11-15", "2026-11-16", "2026-11-17"]],
    [
      "주말 — 금 18시 KST 잠 → 월 09:30 KST 깸: 목(겹침) · 금 … 월",
      new Date("2026-11-13T09:00:00Z"),
      new Date("2026-11-16T00:30:00Z"),
      ["2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15", "2026-11-16"],
    ],
    ["40일 — 상한 14일 전부터 오늘까지 15일", new Date(now.getTime() - 40 * 24 * H), now, NEWS_GAP_CAP_DAYS + 1],
  ];
  for (const [name, lastOk, at, want] of table) {
    it(name, () => {
      const got = newsGapDays(lastOk, at);
      if (typeof want === "number") {
        assert.equal(got.length, want);
        assert.equal(got[0], "2026-11-03");
        assert.equal(got.at(-1), "2026-11-17");
      } else {
        assert.deepEqual(got, want);
      }
    });
  }
});

const draft = (url: string): ArticleDraft => ({
  title: `t-${url}`,
  content: "c",
  url,
  source: "GoogleNews(비트코인)",
  symbols: ["BTC"],
  publishedAt: new Date("2026-11-15T20:00:00Z"),
});

const memoryArticles = () => {
  const saved: ArticleDraft[] = [];
  const repo = {
    saveIfNew: async (d: ArticleDraft) => {
      if (saved.some((s) => s.url === d.url)) return false;
      saved.push(d);
      return true;
    },
  } as unknown as ArticleRepository;
  return { repo, saved };
};

describe("RefillNewsGap — 정기 저장 경로로 흐른다 · 마지막 성공은 다 받았을 때만 옮긴다", () => {
  it("빈 날을 하루씩 받아 같은 saveIfNew 로 저장(주소로 한 번) · 실패 0 이면 다음 회차는 메울 날 없음", async () => {
    const { repo, saved } = memoryArticles();
    const asked: string[] = [];
    const feed = {
      fetchKoreanDay: async (day: string): Promise<NewsDayResult> => {
        asked.push(day);
        return { items: [draft(`https://a/${day}`), draft("https://a/same")], failed: 0 };
      },
    };
    const lastOk = new Date("2026-11-16T09:00:00Z");
    const refill = new RefillNewsGap(repo, { lastKoreanFetchedAt: async () => lastOk }, feed);
    const now = new Date("2026-11-17T00:30:00Z");

    const days = await refill.due(now);
    assert.deepEqual(days, ["2026-11-15", "2026-11-16", "2026-11-17"]);
    const result = await refill.fill(days, now);
    assert.deepEqual(asked, days);
    assert.equal(result?.savedCount, 4); // 하루 1 × 3 + 같은 주소 1
    assert.equal(result?.skippedCount, 2);
    assert.equal(saved.find((d) => d.url === "https://a/same")?.source, "GoogleNews(비트코인)");
    assert.deepEqual(await refill.due(new Date(now.getTime() + H)), []);
  });

  it("실패가 있으면 옮기지 않는다 — 다음 회차가 같은 구간을 다시", async () => {
    const { repo } = memoryArticles();
    const feed = { fetchKoreanDay: async (): Promise<NewsDayResult> => ({ items: [], failed: 1 }) };
    const refill = new RefillNewsGap(repo, { lastKoreanFetchedAt: async () => new Date("2026-11-16T09:00:00Z") }, feed);
    const now = new Date("2026-11-17T00:30:00Z");
    const days = await refill.due(now);
    await refill.fill(days, now);
    assert.deepEqual(await refill.due(new Date(now.getTime() + H)), days);
  });

  it("메우는 동안 정기 회차가 마지막 성공을 덮지 않고, 겹쳐 돌지 않는다", async () => {
    const { repo } = memoryArticles();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const feed = {
      fetchKoreanDay: async (): Promise<NewsDayResult> => {
        await gate;
        return { items: [], failed: 1 };
      },
    };
    const refill = new RefillNewsGap(repo, { lastKoreanFetchedAt: async () => new Date("2026-11-16T09:00:00Z") }, feed);
    const now = new Date("2026-11-17T00:30:00Z");
    const days = await refill.due(now);
    const running = refill.fill(days, now);
    assert.deepEqual(await refill.due(now), []); // 겹쳐 돌지 않음
    assert.equal(await refill.fill(days, now), null);
    refill.markLive(new Date(now.getTime() + 60_000)); // 무시돼야 한다
    release();
    await running;
    assert.deepEqual(await refill.due(new Date(now.getTime() + H)), days); // 실패라 그대로
  });

  it("첫 수집(기록 없음) → 메우지 않고 · 정기 회차 성공이 기준점이 된다", async () => {
    const { repo } = memoryArticles();
    const refill = new RefillNewsGap(repo, { lastKoreanFetchedAt: async () => null }, { fetchKoreanDay: async () => ({ items: [], failed: 0 }) });
    const t0 = new Date("2026-11-17T00:00:00Z");
    assert.deepEqual(await refill.due(t0), []);
    refill.markLive(t0);
    assert.deepEqual(await refill.due(new Date(t0.getTime() + 70 * 60_000)), []);
    assert.equal((await refill.due(new Date(t0.getTime() + 15 * H))).length, 2); // 11-16 · 11-17
  });

  it("원장은 프로세스가 뜰 때 한 번만 읽는다 — 정기 회차가 넣은 기사가 신호를 덮지 않게", async () => {
    const { repo } = memoryArticles();
    let reads = 0;
    const refill = new RefillNewsGap(
      repo,
      { lastKoreanFetchedAt: async () => (reads++, new Date("2026-11-17T00:00:00Z")) },
      { fetchKoreanDay: async () => ({ items: [], failed: 0 }) }
    );
    await refill.due(new Date("2026-11-17T00:10:00Z"));
    await refill.due(new Date("2026-11-17T01:10:00Z"));
    assert.equal(reads, 1);
  });
});
