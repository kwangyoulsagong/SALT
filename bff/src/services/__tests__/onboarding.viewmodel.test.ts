import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toOnboardingStatusViewModel } from "../onboarding.viewmodel";

describe("toOnboardingStatusViewModel", () => {
  it("서버 응답을 그대로 옮긴다", () => {
    const vm = toOnboardingStatusViewModel({
      complete: false,
      nextStep: "link_account",
      steps: [
        { key: "invite", done: true },
        { key: "link_account", done: false },
        { key: "set_plan", done: false },
      ],
    });

    assert.equal(vm.complete, false);
    assert.equal(vm.nextStep, "link_account");
    assert.equal(vm.steps.length, 3);
  });

  /**
   * `ProgressStepper` 는 **항상 세 칸**이다. 서버가 한 칸을 빼먹었다고 스텝이 사라지면
   * 사용자는 진행률을 잘못 읽는다.
   */
  it("빠진 단계를 미완료로 채우고 순서를 고정한다", () => {
    const vm = toOnboardingStatusViewModel({
      steps: [{ key: "set_plan", done: true }],
    });

    assert.deepEqual(
      vm.steps.map((s) => s.key),
      ["invite", "link_account", "set_plan"]
    );
    assert.deepEqual(
      vm.steps.map((s) => s.done),
      [false, false, true]
    );
  });

  it("모르는 단계를 버린다", () => {
    const vm = toOnboardingStatusViewModel({
      steps: [
        { key: "invite", done: true },
        { key: "verify_identity", done: true },
      ],
    });

    assert.equal(vm.steps.length, 3);
    assert.equal(vm.steps.some((s) => (s.key as string) === "verify_identity"), false);
  });

  /**
   * **서버의 `nextStep` 을 믿지 않는다.** 둘이 어긋나면 화면이 "이미 끝낸 단계로 가라"고
   * 말하게 되고, 사용자는 같은 화면을 반복해서 본다.
   */
  it("nextStep 을 steps 에서 다시 찾는다 — 서버 값과 어긋나도", () => {
    const vm = toOnboardingStatusViewModel({
      complete: true,
      nextStep: "invite",
      steps: [
        { key: "invite", done: true },
        { key: "link_account", done: true },
        { key: "set_plan", done: false },
      ],
    });

    assert.equal(vm.nextStep, "set_plan");
    assert.equal(vm.complete, false);
  });

  it("응답이 비어도 세 칸을 준다", () => {
    const vm = toOnboardingStatusViewModel(undefined);

    assert.equal(vm.steps.length, 3);
    assert.equal(vm.nextStep, "invite");
    assert.equal(vm.complete, false);
  });
});
