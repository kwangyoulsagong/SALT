import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appOnboardingService } from "../app-onboarding.service";
import { backendApi } from "../backend-api.service";
import { FIRST_INPUT_HREF, toOnboardingViewModel } from "../onboarding.viewmodel";

/** 도메인 선택 온보딩 뷰모델(`BFF-REQ-046` FR-6 · 서버 S3a) — 단계 · 첫 입력은 서버 값, BFF 는 키 → 경로만 */
describe("toOnboardingViewModel", () => {
  it("고르기 전 — 고를 것 셋(서버 순서) · 첫 입력 없음 · 끝 아님", () => {
    const vm = toOnboardingViewModel({
      chosenDomains: null,
      choosableDomains: ["savings", "household", "invest"],
      onboarding: { nextStep: "choose_domains", complete: false, firstInputDomain: null },
    });
    assert.equal(vm.nextStep, "choose_domains");
    assert.equal(vm.complete, false);
    assert.deepEqual(vm.choices, [
      { domain: "savings", selected: false },
      { domain: "household", selected: false },
      { domain: "invest", selected: false },
    ]);
    assert.equal(vm.firstInput, null);
  });

  it("투자를 안 고르면 첫 입력은 고른 도메인 화면 — 투자 경로 0", () => {
    const vm = toOnboardingViewModel({
      chosenDomains: ["household"],
      choosableDomains: ["savings", "household", "invest"],
      onboarding: { nextStep: "first_input", complete: false, firstInputDomain: "household" },
    });
    assert.deepEqual(vm.firstInput, { domain: "household", href: "/household/new" });
    assert.equal(vm.choices.find((c) => c.domain === "household")?.selected, true);
    assert.equal(vm.choices.find((c) => c.domain === "invest")?.selected, false);
  });

  it("첫 입력 경로 = 각 zone 의 입력 화면", () => {
    assert.deepEqual(FIRST_INPUT_HREF, { savings: "/goals/new", household: "/household/new", invest: "/investments" });
  });

  it("모르는 값은 버린다 — 모르는 단계를 끝으로 접지 않는다 · 모르는 도메인 · 첫 입력 버림", () => {
    const vm = toOnboardingViewModel({
      chosenDomains: ["coach", "savings"],
      choosableDomains: ["savings", "coach"],
      onboarding: { nextStep: "pick_avatar", complete: false, firstInputDomain: "coach" },
    });
    assert.equal(vm.nextStep, null);
    assert.equal(vm.complete, false);
    assert.deepEqual(vm.choices, [{ domain: "savings", selected: true }]);
    assert.equal(vm.firstInput, null);
  });

  it("끝 — 서버가 complete 이고 단계가 없을 때만", () => {
    assert.equal(toOnboardingViewModel({ onboarding: { nextStep: null, complete: true } }).complete, true);
    assert.equal(toOnboardingViewModel({ onboarding: { nextStep: "first_input", complete: true } }).complete, false);
    assert.equal(toOnboardingViewModel(undefined).complete, false);
  });
});

describe("AppOnboardingService", () => {
  afterEach(() => mock.restoreAll());

  it("고르기 · 끝을 identity 로 보내고 값 검사는 서버에 맡긴다(BFF 가 거르지 않음)", async () => {
    const calls: Array<{ method: string; url: string; body: unknown }> = [];
    mock.method(backendApi, "proxyAuthRequest", async (method: string, url: string, _t: string, body: unknown) => {
      calls.push({ method, url, body });
      return { data: { success: true, data: { onboarding: { nextStep: null, complete: true } } } } as never;
    });
    await appOnboardingService.chooseDomains("t", ["tips"]);
    await appOnboardingService.finish("t");
    await appOnboardingService.get("t");
    assert.deepEqual(calls, [
      { method: "PUT", url: "/identity/shell/domains", body: { domains: ["tips"] } },
      { method: "POST", url: "/identity/shell/onboarding/finish", body: undefined },
      { method: "GET", url: "/identity/shell", body: undefined },
    ]);
  });
});
