import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HOME_RECENT_LIMIT, HOME_UPCOMING_LIMIT, kstDate, toRecentFeed, toUpcomingFeed } from "../home-feed.viewmodel";

/** 홈 둘째 줄 — 최근 기록 · 다가오는 일(`FE-REQ-048` FR-13 · `BFF-REQ-046` FR-13) */

const none = new Set<never>();
const expense = (spentOn: string, amount = 1000, merchant: string | null = null) => ({ amount, spentOn, category: "food", merchant });

describe("toRecentFeed", () => {
  it("세 원천을 날짜 내림차순으로 섞는다 — 같은 날이면 지출 → 저축 → 거래, 금액은 부호 글자 + 포맷만", () => {
    const feed = toRecentFeed(
      [expense("2026-11-19", 12000, "편의점")],
      [{ goalId: "g1", goalTitle: "여행", amount: 300000, depositedOn: "2026-11-20" }],
      [{ name: "삼성전자", side: "buy", totalAmount: 1200000, transactionDate: "2026-11-19T15:30:00Z" }],
    none);
    assert.deepEqual(
      feed.map((r) => [r.domain, r.date, r.title, r.detail, r.amount]),
      [
        ["savings", "2026-11-20", "여행", "저축에 넣음", "+300,000원"],
        // 2026-11-19T15:30Z = 한국 11-20 00:30 — 한국 날짜로 가른다
        ["invest", "2026-11-20", "삼성전자", "샀어요", "1,200,000원"],
        ["household", "2026-11-19", "편의점", "지출", "-12,000원"],
      ],
    );
    assert.equal(feed[0].href, "/goals/g1");
  });

  it("쓴 곳이 없는 지출은 title null + 분류 키(이름표는 화면) · 팔았으면 '팔았어요'", () => {
    const [e] = toRecentFeed([expense("2026-11-01")], null, null, none);
    assert.equal(e.title, null);
    assert.equal(e.category, "food");
    const [t] = toRecentFeed(null, null, [{ name: "BTC", side: "sell", totalAmount: 1, transactionDate: "2026-11-01T00:00:00Z" }], none);
    assert.equal(t.detail, "팔았어요");
  });

  it("상한 · 숨긴 도메인 · 못 받은 원천(null) · 모양이 틀린 행", () => {
    const many = Array.from({ length: 10 }, (_, i) => expense(`2026-11-${String(i + 1).padStart(2, "0")}`));
    assert.equal(toRecentFeed(many, null, null, none).length, HOME_RECENT_LIMIT);
    assert.deepEqual(toRecentFeed(many, null, null, new Set(["household"] as const)), []);
    assert.deepEqual(toRecentFeed(null, null, null, none), []);
    assert.deepEqual(toRecentFeed([{ amount: "x", spentOn: "2026-11-01", category: "food", merchant: null } as never], {} as never, null, none), []);
  });
});

describe("toUpcomingFeed", () => {
  const occ = (dueOn: string, stage = "upcoming") => ({ name: "통신비", amount: 55000, dueOn, stage });
  const goal = (targetDate: string | null, status = "active") => ({ id: "g", title: "여행", status, targetDate, remaining: 800000 });

  it("오늘 이후만, 날짜 오름차순 — 처리한 예정 · 지난 날 · 끝난 목표는 뺀다", () => {
    const feed = toUpcomingFeed(
      [occ("2026-11-25"), occ("2026-11-19"), occ("2026-11-21", "confirmed"), occ("2026-11-20", "ask")],
      [goal("2027-06-30"), goal("2026-12-01", "completed"), goal(null)],
      "2026-11-20",
      none,
    );
    assert.deepEqual(
      feed.map((r) => [r.date, r.detail, r.amount]),
      [
        ["2026-11-20", "매달 나가는 돈", "55,000원"],
        ["2026-11-25", "매달 나가는 돈", "55,000원"],
        ["2027-06-30", "목표 기한", "남은 800,000원"],
      ],
    );
  });

  it("상한 · 숨긴 도메인", () => {
    const many = Array.from({ length: 9 }, (_, i) => occ(`2026-11-2${i}`));
    assert.equal(toUpcomingFeed(many, null, "2026-11-20", none).length, HOME_UPCOMING_LIMIT);
    assert.deepEqual(toUpcomingFeed(many, [goal("2027-01-01")], "2026-11-20", new Set(["household", "savings"] as const)), []);
  });
});

describe("kstDate", () => {
  it("ISO 시각을 한국 날짜로, 못 읽으면 null", () => {
    assert.equal(kstDate("2026-11-30T15:00:00Z"), "2026-12-01");
    assert.equal(kstDate("nope"), null);
  });
});
