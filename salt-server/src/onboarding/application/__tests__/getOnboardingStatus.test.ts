import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GetOnboardingStatus } from "../GetOnboardingStatus";

const always = (value: boolean) => async () => value;

describe("GetOnboardingStatus", () => {
  it("인증된 요청은 invite 단계를 이미 통과했다", async () => {
    const status = await new GetOnboardingStatus(always(false), always(false)).execute("u-1");

    assert.equal(status.steps[0].key, "invite");
    assert.equal(status.steps[0].done, true);
  });

  it("nextStep 은 **첫** 미완료 단계다", async () => {
    const status = await new GetOnboardingStatus(always(false), always(true)).execute("u-1");

    assert.equal(status.nextStep, "link_account");
    assert.equal(status.complete, false);
  });

  it("셋 다 끝나면 complete 이고 nextStep 이 null 이다", async () => {
    const status = await new GetOnboardingStatus(always(true), always(true)).execute("u-1");

    assert.equal(status.complete, true);
    assert.equal(status.nextStep, null);
  });

  /**
   * 프로브가 죽었을 때 **완료로 읽으면 안내가 사라진다.** 사용자는 왜 막혔는지 모르고
   * 화면은 다음 단계를 보여주지 않는다. 미완료로 읽으면 최악이 "이미 끝낸 안내를 한 번 더
   * 보는 것"이다.
   */
  it("프로브가 실패하면 그 단계를 **미완료로** 읽는다", async () => {
    const boom = async () => {
      throw new Error("ledger down");
    };

    const status = await new GetOnboardingStatus(boom, always(true)).execute("u-1");

    assert.equal(status.nextStep, "link_account");
    assert.equal(status.complete, false);
  });
});
