import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appJudgmentScoreboardService } from "../app-judgment-scoreboard.service";
import { backendApi } from "../backend-api.service";
import { ScoreboardContractError, toJudgmentScoreboardViewModel } from "../judgment-scoreboard.viewmodel";

/** F010 슬라이스 3 — 판정 성적표 중계 (`BFF-REQ-039` FR-5). */

const ok = (data: unknown) => ({ data: { success: true, data } }) as never;
const httpError = (status: number) =>
  Object.assign(new Error(`status ${status}`), { response: { status, data: { message: "x" }, headers: {} } });

const miss = { date: "2026-09-12", symbol: "SOL", event: "long_term.avoid", outcome: "miss", returnRate: 0.041 };
const hit = { date: "2026-09-10", symbol: "BTC", event: "long_term.avoid", outcome: "hit", returnRate: -0.052 };

const group = (over: Record<string, unknown> = {}) => ({
  signalType: "long_term.avoid",
  sample: 31,
  winRate: 0.58,
  avgReturn: -0.012,
  worstObservedReturn: -0.21,
  lowSample: false,
  horizonHours: 720,
  alwaysUpRate: 0.45,
  excessWinRate: 0.03,
  returnDistribution: { horizonDays: 30, buckets: [], p25: -0.05, median: 0, p75: 0.04 },
  hits: [hit],
  misses: [miss],
  ...over,
});

const board = (over: Record<string, unknown> = {}) => ({
  status: "ok",
  groups: [group()],
  disclaimer: "과거 판단의 결과이며 예측이 아닙니다",
  generatedAt: "2026-09-29T01:00:00.000Z",
  ...over,
});

describe("toJudgmentScoreboardViewModel", () => {
  it("그룹 성적과 맞았던 때 · 틀렸던 때를 같은 모양으로 옮기고 분포는 옮기지 않는다", () => {
    const view = toJudgmentScoreboardViewModel(board());
    assert.equal(view.status, "ok");
    assert.equal(view.groups[0]?.mode, "long_term");
    assert.equal(view.groups[0]?.excessWinRate, 0.03);
    assert.deepEqual(view.groups[0]?.misses, [miss]);
    assert.deepEqual(view.groups[0]?.hits, [hit]);
    assert.equal("returnDistribution" in (view.groups[0] ?? {}), false);
  });

  it("표본 부족은 서버 값만 — 모르면 부족이다. 표본 0 이면 적중률 null", () => {
    const view = toJudgmentScoreboardViewModel(
      board({ groups: [group({ lowSample: undefined }), group({ signalType: "scalp.wait", sample: 0, winRate: 0 })] }),
    );
    assert.equal(view.groups[0]?.lowSample, true);
    assert.equal(view.groups[1]?.winRate, null);
  });

  it("깨진 그룹 · 칸이 틀린 사례는 뺀다 — 남은 그룹이 없으면 insufficient_data", () => {
    const view = toJudgmentScoreboardViewModel(
      board({
        groups: [
          group({ misses: [miss, hit, { ...miss, returnRate: "x" }] }),
          group({ signalType: "coach.rebalance" }),
          group({ sample: "31" }),
        ],
      }),
    );
    assert.equal(view.groups.length, 1);
    assert.deepEqual(view.groups[0]?.misses, [miss]);
    assert.equal(toJudgmentScoreboardViewModel(board({ groups: [group({ signalType: 3 })] })).status, "insufficient_data");
  });

  it("국내 주식 그룹은 자산군 라벨로 남는다 — 접두 뒤 모드를 읽는다 (F011 FR-61 · 65)", () => {
    const view = toJudgmentScoreboardViewModel(
      board({
        groups: [
          group(),
          group({ signalType: "kr_stock.long_term.wait" }),
          group({ signalType: "kr_stock.scalp.wait" }),
          group({ signalType: "us_stock.long_term.wait" }),
        ],
      }),
    );
    assert.deepEqual(
      view.groups.map((g) => `${g.assetClass}:${g.mode}:${g.signalType}`),
      ["crypto:long_term:long_term.avoid", "kr_stock:long_term:kr_stock.long_term.wait", "kr_stock:scalp:kr_stock.scalp.wait"]
    );
  });

  it("고지 · 그룹 배열이 없으면 던진다(서비스가 unavailable 로 바꾼다)", () => {
    assert.throws(() => toJudgmentScoreboardViewModel(board({ disclaimer: "" })), ScoreboardContractError);
    assert.throws(() => toJudgmentScoreboardViewModel(board({ groups: null })), ScoreboardContractError);
  });
});

describe("AppJudgmentScoreboardService", () => {
  afterEach(() => mock.restoreAll());

  it("서버 /coach/scoreboard 를 부르고 뷰모델로 옮긴다", async () => {
    const calls: string[] = [];
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, path: string) => {
      calls.push(path);
      return ok(board());
    });
    const result = await appJudgmentScoreboardService.get("t");
    assert.deepEqual(calls, ["/coach/scoreboard"]);
    assert.equal(result.status, "ok");
  });

  it("5xx · 계약 깨짐은 200 unavailable, 4xx 는 그대로", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(503);
    });
    assert.deepEqual(await appJudgmentScoreboardService.get("t"), { status: "unavailable" });
    mock.restoreAll();
    mock.method(backendApi, "proxyAuthRequest", async () => ok(board({ groups: "x" })));
    assert.deepEqual(await appJudgmentScoreboardService.get("t"), { status: "unavailable" });
    mock.restoreAll();
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(401);
    });
    await assert.rejects(() => appJudgmentScoreboardService.get("t"));
  });
});
