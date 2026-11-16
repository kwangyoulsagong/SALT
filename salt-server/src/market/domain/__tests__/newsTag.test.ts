import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  classifyNewsKind,
  newsTagLabel,
  toNewsTag,
  type NewsKindDict,
  type NewsOrigin,
  type NewsReactionStat,
  type NewsTagMarket,
} from "../NewsTag";

/** F017 단계 6 — 소식 측정 태그(SRV-REQ-053 FR-6). 사전 · 사례는 예측과 같은 계약 파일(contracts/news-kind) */

const CONTRACTS = join(__dirname, "../../../../../contracts/news-kind");
const raw = JSON.parse(readFileSync(join(CONTRACTS, "dict-news-reaction-2.json"), "utf8"));
const DICT: NewsKindDict = {
  preregKey: raw.prereg_key,
  rules: raw.rules,
  exclude: raw.exclude,
  newsMaxCodes: raw.news_max_codes,
};
const CASES: Array<{ market: NewsTagMarket; origin: NewsOrigin; codes: number; title: string; kind: string }> = JSON.parse(
  readFileSync(join(CONTRACTS, "cases.json"), "utf8")
).cases;

describe("classifyNewsKind — 예측(파이썬)과 같은 공용 사례 표", () => {
  it(`사례 ${CASES.length}건 전부 같은 답`, () => {
    for (const c of CASES) assert.equal(classifyNewsKind(DICT, c.market, c.origin, c.codes, c.title), c.kind, c.title);
  });
});

const stat = (over: Partial<NewsReactionStat>): NewsReactionStat => ({
  market: "kr",
  origin: "disclosure",
  kind: "contract",
  horizon: 1,
  asOf: new Date("2026-11-12T07:00:00Z"),
  status: "ok",
  sample: 120,
  upRate: 0.55,
  mean: 0.004,
  baseUpRate: 0.447,
  differs: null,
  ...over,
});

describe("newsTagLabel — 사전등록 [decision] label 경계", () => {
  it("below_min → few · ok + higher → up_usually · ok + lower → down_usually · ok + 엇갈림 → mixed", () => {
    const table: Array<[Pick<NewsReactionStat, "status" | "differs">, string]> = [
      [{ status: "below_min", differs: null }, "few"],
      [{ status: "below_min", differs: "higher" }, "few"],
      [{ status: "ok", differs: "higher" }, "up_usually"],
      [{ status: "ok", differs: "lower" }, "down_usually"],
      [{ status: "ok", differs: null }, "mixed"],
    ];
    for (const [s, label] of table) assert.equal(newsTagLabel(s), label, JSON.stringify(s));
  });
});

describe("toNewsTag — 종류 · 1봉 라벨 · 5봉 펼침 · 선반영", () => {
  const item = { market: "kr" as const, origin: "disclosure" as const, codes: 1, title: "(주)가 단일판매ㆍ공급계약체결" };

  it("종류를 못 맞히면 태그 없음(행만)", () => {
    assert.equal(toNewsTag(DICT, [], { ...item, title: "대표이사변경" }, null), null);
  });

  it("1봉 서술로 라벨 · 5봉은 숫자만 · 다른 출처 서술은 안 섞는다", () => {
    const tag = toNewsTag(
      DICT,
      [stat({ differs: "higher" }), stat({ horizon: 5, upRate: 0.4 }), stat({ origin: "news", differs: "lower" })],
      item,
      0.031
    );
    assert.equal(tag?.eventKind, "contract");
    assert.equal(tag?.eventKindText, "수주 · 공급계약");
    assert.equal(tag?.label, "up_usually");
    assert.deepEqual(tag?.reaction, { days: 1, sample: 120, upRate: 0.55, mean: Math.expm1(0.004), baseUpRate: 0.447 });
    assert.equal(tag?.reaction5d?.upRate, 0.4);
    // 로그 → 단순 비율(화면은 퍼센트만) — ln 2 는 +100%
    assert.equal(tag?.preMove5d, Math.expm1(0.031));
    assert.equal(toNewsTag(DICT, [], item, Math.log(2))?.preMove5d, 1);
  });

  it("종류는 맞았는데 서술이 아직 없으면(첫 배치 전) few · 표본 0 — 막지 않는다", () => {
    const tag = toNewsTag(DICT, [], item, null);
    assert.equal(tag?.label, "few");
    assert.equal(tag?.reaction?.sample, 0);
    assert.equal(tag?.reaction5d, null);
  });

  it("문구에 호재 · 악재 단어 0 — 종류 이름까지", () => {
    for (const r of DICT.rules) assert.doesNotMatch(r.text, /호재|악재/);
  });

  it("선반영 삼분위 — 경계로 고르고 5봉 서술을 싣는다 · 표본이 모자라면 null (event-window@2)", () => {
    const w = (tercile: "low" | "mid" | "high" | "all", status: "ok" | "below_min", upRate: number | null) => ({
      market: "kr" as const, origin: "disclosure", kind: "contract", tercile, horizon: 5, status, sample: 200,
      upRate, baseUpRate: tercile === "all" ? null : 0.47, differs: null, preLowMax: -0.02, preHighMin: 0.03,
    });
    const windows = [w("all", "ok", 0.47), w("low", "ok", 0.52), w("mid", "ok", 0.48), w("high", "below_min", null)];
    assert.deepEqual(toNewsTag(DICT, [], item, -0.05, windows)?.preMoveReaction, {
      tercile: "low", days: 5, sample: 200, upRate: 0.52, kindUpRate: 0.47, differs: null,
    });
    assert.equal(toNewsTag(DICT, [], item, 0.03, windows)?.preMoveReaction?.tercile, "mid"); // 경계 이하 = mid
    assert.equal(toNewsTag(DICT, [], item, 0.031, windows)?.preMoveReaction, null); // high 는 below_min — 숫자 0
    assert.equal(toNewsTag(DICT, [], item, null, windows)?.preMoveReaction, null);
    assert.equal(toNewsTag(DICT, [], item, -0.05)?.preMoveReaction, null); // 뷰 없음
    // 공시 제목 행이 모자라면 같은 공시의 DART 행 — DART 경계로 삼분위
    const dart = windows.map((x) => ({ ...x, origin: "dart", preLowMax: -0.1, preHighMin: 0.1, upRate: x.upRate === null ? null : x.upRate + 0.01 }));
    const few = windows.map((x) => ({ ...x, status: "below_min" as const, upRate: null }));
    assert.deepEqual(toNewsTag(DICT, [], item, -0.05, [...few, ...dart])?.preMoveReaction?.tercile, "mid");
    assert.equal(toNewsTag(DICT, [], { ...item, origin: "news" }, -0.05, [...few, ...dart])?.preMoveReaction, null); // 뉴스는 대신 안 씀
  });
});
