import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  RETURN_BUCKETS,
  returnBucketCode,
  toScoreboardGroup,
  type JudgmentGroupStats,
} from "../policy/judgmentScoreboard";

/**
 * 수익률 분포 구간과 그룹 매핑 (F004 · B17).
 *
 * **경계값이 어디로 가는지**가 이 테스트의 요점이다. SQL 이 같은 배열을 읽어 세므로
 * 여기서 확정한 경계가 곧 DB 집계의 경계다 — 한쪽만 바뀌면 화면 숫자가 조용히 틀어진다.
 */

describe("returnBucketCode", () => {
  it("경계값은 위 구간에 들어간다", () => {
    assert.equal(returnBucketCode(-0.2), "lte_m20");
    assert.equal(returnBucketCode(-0.1), "m20_m10");
    assert.equal(returnBucketCode(0), "m10_0");
    assert.equal(returnBucketCode(0.1), "0_p10");
    assert.equal(returnBucketCode(0.2), "p10_p20");
  });

  it("양 끝은 열려 있다", () => {
    assert.equal(returnBucketCode(-5), "lte_m20");
    assert.equal(returnBucketCode(12), "gte_p20");
  });

  it("구간 6개가 실수선을 빈틈 없이 덮는다", () => {
    assert.equal(RETURN_BUCKETS.length, 6);
    for (let value = -0.5; value <= 0.5; value += 0.01) {
      assert.doesNotThrow(() => returnBucketCode(Number(value.toFixed(4))));
    }
  });
});

const stats = (over: Partial<JudgmentGroupStats> = {}): JudgmentGroupStats => ({
  signalType: "scalp.review_short_opportunity",
  sample: 24,
  hits: 12,
  avgReturn: 0.01,
  worstReturn: -0.3,
  bucketCounts: { lte_m20: 2, m10_0: 10 },
  p25: -0.05,
  median: 0.01,
  p75: 0.07,
  ...over,
});

describe("toScoreboardGroup", () => {
  it("기간은 모드가 정한다 — 단타 1일 · 장기 30일", () => {
    assert.equal(
      toScoreboardGroup("scalp", stats()).returnDistribution.horizonDays,
      1
    );
    assert.equal(
      toScoreboardGroup("long_term", stats({ signalType: "long_term.wait" }))
        .returnDistribution.horizonDays,
      30
    );
  });

  it("표본 0 인 구간도 0 으로 싣는다 — 빈 막대가 정보다", () => {
    const group = toScoreboardGroup("scalp", stats());

    assert.deepEqual(
      group.returnDistribution.buckets.map((bucket) => bucket.code),
      RETURN_BUCKETS.map((bucket) => bucket.code)
    );
    assert.equal(
      group.returnDistribution.buckets.find((b) => b.code === "m20_m10")?.count,
      0
    );
  });

  it("승률 · 표본 부족은 판단 블록과 같은 계산이다", () => {
    assert.deepEqual(
      {
        winRate: toScoreboardGroup("scalp", stats()).winRate,
        lowSample: toScoreboardGroup("scalp", stats()).lowSample,
      },
      { winRate: 0.5, lowSample: false }
    );

    const thin = toScoreboardGroup("scalp", stats({ sample: 19, hits: 0 }));
    assert.equal(thin.lowSample, true);
    assert.equal(thin.winRate, 0);
  });

  it("표본이 없으면 승률은 null 이다 — 0% 가 아니다", () => {
    const empty = toScoreboardGroup(
      "scalp",
      stats({ sample: 0, hits: 0, avgReturn: null, worstReturn: null })
    );

    assert.equal(empty.winRate, null);
    assert.equal(empty.avgReturn, null);
  });
});
