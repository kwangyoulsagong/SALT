import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PLAIN_MISS_MAX, plainMisses, plainTrack, plainTrustSentences } from "../policy/explanationPlain";

/**
 * "얼마나 믿을까" 문장 — 판단 블록과 같은 값 · 같은 반올림(F017 v4 순서 1c · `SRV-REQ-053` FR-16 · `ADR-010` v4).
 * 판단 블록(`JudgmentSummary` `trackVsBaseline`): `이 판단 n% · 늘 같은 행동이었다면 m%` — n = round(winRate), m = round(winRate − excess)
 */

describe("plainTrack — 경계 표", () => {
  const t = (over: Partial<Parameters<typeof plainTrack>[0]> = {}) =>
    plainTrack({ mode: "scalp", winRate: 0.57, excessWinRate: 0.08, sample: 89, origin: "live", ...over });

  const cases: Array<[string, Parameters<typeof t>[0], string]> = [
    ["라이브 · 기준보다 높음", {}, "이 판단은 지금까지 89번 중 51번 맞았어요(57%, 판단 뒤 24시간 기준). 판단 없이 늘 같은 쪽을 골랐다면 49% — 그보다 8%p 높아요."],
    ["기준보다 낮음 — 참고로만", { excessWinRate: -0.04 }, "이 판단은 지금까지 89번 중 51번 맞았어요(57%, 판단 뒤 24시간 기준). 판단 없이 늘 같은 쪽을 골랐다면 61% — 오히려 4%p 낮아서 참고로만 보는 게 맞아요."],
    ["반올림하면 같음 — 더 낫다고 말하지 않음", { excessWinRate: 0.004 }, "이 판단은 지금까지 89번 중 51번 맞았어요(57%, 판단 뒤 24시간 기준). 판단 없이 늘 같은 쪽을 골랐어도 57%라 아직 더 낫다고 말하기 어려워요."],
    ["관망 · 기준 없음 — 적중만", { excessWinRate: null }, "이 판단은 지금까지 89번 중 51번 맞았어요(57%, 판단 뒤 24시간 기준)."],
    ["과거 검산 — 머리말이 다르다 · 장기는 30일", { origin: "backtest", mode: "long_term", excessWinRate: null }, "과거 시세로 되돌려 채점해 보면 89번 중 51번 맞았어요(57%, 판단 뒤 30일 기준)."],
    ["표본 0 — 없다고 말한다(빈 칸 0)", { sample: 0, winRate: null, excessWinRate: null }, "이 판단은 아직 채점된 기록이 없어요 — 과거 시세로 되돌려 채점한 기록도 아직 없어서 얼마나 맞는지 말할 수 없어요."],
    ["표본 0 이면 적중률 값이 있어도 없다고(지어낸 비율 0)", { sample: 0, winRate: 0.5, excessWinRate: null }, "이 판단은 아직 채점된 기록이 없어요 — 과거 시세로 되돌려 채점한 기록도 아직 없어서 얼마나 맞는지 말할 수 없어요."],
    ["적중률 null 이면 표본이 있어도 없다고", { winRate: null }, "이 판단은 아직 채점된 기록이 없어요 — 과거 시세로 되돌려 채점한 기록도 아직 없어서 얼마나 맞는지 말할 수 없어요."],
    ["천 단위 쉼표", { sample: 12_345, winRate: 0.5, excessWinRate: null }, "이 판단은 지금까지 12,345번 중 6,173번 맞았어요(50%, 판단 뒤 24시간 기준)."],
  ];
  for (const [name, input, want] of cases) it(name, () => assert.equal(t(input), want));

  it("판단 블록과 같은 숫자 — n = round(winRate × 100) · m = round((winRate − excess) × 100)", () => {
    for (const [w, e] of [[0.575, 0.08], [0.333, -0.111], [0.5, 0.005], [0.999, 0.4]] as const) {
      const text = t({ winRate: w, excessWinRate: e });
      assert.ok(text.includes(`(${Math.round(w * 100)}%,`), text);
      assert.ok(text.includes(`${Math.round((w - e) * 100)}%`), text);
    }
  });
});

describe("plainMisses — 틀렸던 때", () => {
  const miss = (date: string, returnRate: number, name: string | null = "이더리움") => ({ date, name, symbol: "ETH", returnRate });

  it("가장 최근 둘까지 · 이름이 없으면 심볼 · 오름 · 내림 · 그대로", () => {
    const lines = plainMisses("scalp", [miss("2026-11-11", -0.035), miss("2026-11-10", 0.012, null), miss("2026-11-09", 0.02)], 89);
    assert.equal(lines.length, PLAIN_MISS_MAX);
    assert.deepEqual(lines, [
      "2026-11-11 이더리움도 같은 판단이었는데 24시간 뒤 −3.5% 내렸어요.",
      "2026-11-10 ETH도 같은 판단이었는데 24시간 뒤 +1.2% 올랐어요.",
    ]);
    assert.equal(plainMisses("long_term", [miss("2026-11-01", 0)], 5)[0], "2026-11-01 이더리움도 같은 판단이었는데 30일 뒤 그대로였어요.");
  });

  it("빗나간 사례가 없으면 없다고 — 채점은 있음 · 없음 둘", () => {
    assert.deepEqual(plainMisses("scalp", [], 12), ["채점한 12번 중 아직 빗나간 사례를 찾지 못했어요 — 표본이 적으면 그럴 수 있어요."]);
    assert.deepEqual(plainMisses("scalp", [], 0), ["빗나간 사례도 아직 없어요 — 채점된 판단이 없어서예요."]);
  });
});

describe("plainTrustSentences — 칸 · 인용", () => {
  it("성적 한 줄(인용 track) + 틀렸던 때마다 그 사례 인용 · 사례가 없으면 성적 인용", () => {
    const withMiss = plainTrustSentences({
      mode: "scalp",
      track: { mode: "scalp", winRate: 0.5, excessWinRate: null, sample: 2, origin: "live" },
      misses: [{ date: "2026-11-11", name: null, symbol: "ETH", returnRate: -0.01 }],
    });
    assert.deepEqual(withMiss.map((s) => [s.section, s.citations.map((c) => [c.id, c.label])]), [
      ["track", [["track", "이 판단의 성적"]]],
      ["miss", [["miss-1", "틀렸던 때 · 2026-11-11"]]],
    ]);
    const none = plainTrustSentences({ mode: "scalp", track: { mode: "scalp", winRate: null, excessWinRate: null, sample: 0, origin: "live" }, misses: [] });
    assert.deepEqual(none.map((s) => [s.section, s.citations[0]!.id]), [["track", "track"], ["miss", "track"]]);
  });

  it("단정 · 명령 낱말 0", () => {
    const all = [
      plainTrack({ mode: "scalp", winRate: 0.9, excessWinRate: 0.3, sample: 10, origin: "live" }),
      ...plainMisses("scalp", [{ date: "2026-11-11", name: "x", symbol: "X", returnRate: 0.5 }], 10),
    ].join("\n");
    assert.doesNotMatch(all, /반드시|확실|오를 것|내릴 것|사세요|파세요/);
  });
});
