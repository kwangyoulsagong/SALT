import { describe, expect, it } from "vitest";

import type { TipForMe } from "@/entities/tip";

import { pickForMe, type ForMeResult } from "./pickForMe";

const tip = (slug: string): NonNullable<TipForMe["tip"]> => ({
  slug,
  title: slug,
  summary: "",
  trigger: "month:11",
  sourceUrl: "https://example.org",
  sourceName: "출처",
  validUntil: "2026-12-31",
});
const ok = (slug: string | null, degraded = false): ForMeResult => ({ data: { tip: slug ? tip(slug) : null, degraded }, isError: false });
const fail: ForMeResult = { isError: true };
const C = ["savings", "household"] as const;

describe("pickForMe — 내게 맞춘 팁 사이드의 행 · 실패 판정", () => {
  it.each([
    ["둘 다 다른 글 → 두 행(맥락 순서)", [ok("a"), ok("b")], ["savings:a", "household:b"], false],
    ["같은 글이 두 맥락에 → 앞 맥락 한 행", [ok("a"), ok("a")], ["savings:a"], false],
    ["둘 다 없음 → 행 0 · 실패 아님(없어요)", [ok(null), ok(null)], [], false],
    ["한쪽 실패 · 다른 쪽 글 → 글은 그린다(부분 실패 격리)", [fail, ok("b")], ["household:b"], false],
    ["한쪽 실패 · 다른 쪽 없음 → 실패(없다고 말할 수 없다)", [ok(null), fail], [], true],
    ["둘 다 실패 → 실패", [fail, fail], [], true],
    ["없음이지만 서버 칸 degraded → 실패", [ok(null, true), ok(null)], [], true],
    ["degraded 여도 글이 있으면 그린다", [ok("a", true), ok(null)], ["savings:a"], false],
    ["아직 안 온 결과(data 없음 · 실패 아님) → 행 0 · 실패 아님", [{ isError: false }, { isError: false }], [], false],
  ] as const)("%s", (_name, results, rows, isError) => {
    const out = pickForMe(C, results as readonly ForMeResult[]);
    expect(out.picks.map((p) => `${p.context}:${p.tip.slug}`)).toEqual(rows);
    expect(out.isError).toBe(isError);
  });
});
