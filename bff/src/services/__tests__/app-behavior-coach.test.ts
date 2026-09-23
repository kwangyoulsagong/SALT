import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appBehaviorCoachService } from "../app-behavior-coach.service";
import { backendApi } from "../backend-api.service";

/** 행동 기록 카드 (`BFF-REQ-023` FR-40 · 41). */

const ok = (data: unknown) => ({ data: { success: true, data } }) as never;

describe("AppBehaviorCoachService", () => {
  afterEach(() => mock.restoreAll());

  it("factCode · params 를 그대로 옮기고 기존 필드를 유지한다", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () =>
      ok({
        status: "active",
        tags: ["over_trading"],
        warnings: [
          {
            id: "w1",
            title: "과다 거래 경고",
            message: "m",
            severity: 85,
            confidence: 0.75,
            factCode: "over_trading",
            params: { windowHours: 24, trades: 15, threshold: 12 },
          },
          { id: "w2", title: "t", message: "m", severity: 40, confidence: null },
        ],
        recommendedRules: ["r"],
        evidence: { transactionCount: 20 },
      })
    );

    const view = await appBehaviorCoachService.get("tok");

    assert.deepEqual(view.cards[0], {
      id: "w1",
      title: "과다 거래 경고",
      message: "m",
      severity: "danger",
      confidence: 0.75,
      factCode: "over_trading",
      params: { windowHours: 24, trades: 15, threshold: 12 },
    });
    // 서버가 판정을 못 읽었으면 null · {} — 기본 코드를 지어내지 않는다
    assert.equal(view.cards[1].factCode, null);
    assert.deepEqual(view.cards[1].params, {});
  });
});
