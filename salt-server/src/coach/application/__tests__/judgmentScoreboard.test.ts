import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  JudgmentCase,
  JudgmentGroupStats,
  JudgmentOutcome,
  SymbolJudgmentStore,
} from "../../domain";
import { GetJudgmentScoreboard } from "../GetJudgmentScoreboard";

/**
 * 성적표 조립 (`SRV-REQ-025` FR-15 · FR-53 · `SRV-REQ-024` FR-160 · FR-161).
 *
 * 저장소는 **집계까지 끝낸 값**을 준다(SQL 이 센다). 그래서 이 테스트의 가짜는 배열을
 * 계산하지 않고 집계 결과를 그대로 돌려준다 — 유스케이스가 하는 일이 조립뿐임을 드러낸다.
 */

const T0 = new Date("2026-09-01T00:00:00Z");

const judgmentCase = (returnRate: number): JudgmentCase => ({
  symbol: "BTC",
  judgedAt: T0,
  action: "review_short_opportunity",
  returnRate,
});

const fakeStore = (
  groups: JudgmentGroupStats[],
  cases: Record<string, Record<JudgmentOutcome, JudgmentCase[]>> = {}
): SymbolJudgmentStore =>
  ({
    scoreboard: async () => groups,
    recentCasesByGroup: async () => new Map(Object.entries(cases)),
  }) as unknown as SymbolJudgmentStore;

const group = (over: Partial<JudgmentGroupStats> = {}): JudgmentGroupStats => ({
  signalType: "scalp.review_short_opportunity",
  sample: 22,
  hits: 11,
  avgReturn: 0.004,
  worstReturn: -0.22,
  bucketCounts: { lte_m20: 1, "0_p10": 12 },
  p25: -0.03,
  median: 0.002,
  p75: 0.05,
  ...over,
});

describe("GetJudgmentScoreboard", () => {
  it("판정된 표본이 없으면 insufficient_data 다", async () => {
    const view = await new GetJudgmentScoreboard(fakeStore([])).execute();

    assert.equal(view.status, "insufficient_data");
    assert.deepEqual(view.groups, []);
    assert.ok(view.disclaimer.length > 0);
  });

  it("맞았던 때와 틀렸던 때를 같은 모양으로 싣는다", async () => {
    const store = fakeStore([group()], {
      "scalp.review_short_opportunity": {
        hit: [judgmentCase(0.06)],
        miss: [judgmentCase(-0.22)],
      },
    });

    const [only] = (await new GetJudgmentScoreboard(store).execute()).groups;

    assert.deepEqual(Object.keys(only.hits[0]), Object.keys(only.misses[0]));
    assert.deepEqual(only.hits[0], {
      date: "2026-09-01",
      symbol: "BTC",
      event: "scalp.review_short_opportunity",
      outcome: "hit",
      returnRate: 0.06,
    });
    assert.equal(only.misses[0].outcome, "miss");
  });

  it("사례가 없는 그룹도 표에 남는다 — 성적은 있다", async () => {
    const [only] = (
      await new GetJudgmentScoreboard(fakeStore([group()])).execute()
    ).groups;

    assert.deepEqual(only.hits, []);
    assert.deepEqual(only.misses, []);
    assert.equal(only.sample, 22);
    assert.equal(only.returnDistribution.horizonDays, 1);
  });

  it("`<mode>.<action>` 이 아닌 그룹은 뺀다 — 기간을 말할 수 없다", async () => {
    const view = await new GetJudgmentScoreboard(
      fakeStore([group(), group({ signalType: "coach.buy" })])
    ).execute();

    assert.deepEqual(
      view.groups.map((item) => item.signalType),
      ["scalp.review_short_opportunity"]
    );
  });

  it("그룹마다 자기 기간을 말한다", async () => {
    const view = await new GetJudgmentScoreboard(
      fakeStore([group(), group({ signalType: "long_term.review_accumulation" })])
    ).execute();

    assert.deepEqual(
      view.groups.map((item) => item.returnDistribution.horizonDays),
      [1, 30]
    );
  });
});
