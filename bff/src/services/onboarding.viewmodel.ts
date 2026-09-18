/**
 * 온보딩 뷰모델 (`BFF-REQ-008`).
 *
 * 서버 응답과 모양이 거의 같지만 **봉투를 벗기고 필드를 좁힌다.** 서버가 단계를 늘려도
 * 화면이 모르는 값이 흘러 들어가지 않게, 아는 세 값만 통과시킨다.
 */

export type OnboardingStepKey = "invite" | "link_account" | "set_plan";

export interface OnboardingStatusViewModel {
  complete: boolean;
  nextStep: OnboardingStepKey | null;
  steps: Array<{ key: OnboardingStepKey; done: boolean }>;
}

/** 화면이 그리는 순서. 서버 응답 순서를 믿지 않는다. */
const STEP_ORDER: OnboardingStepKey[] = ["invite", "link_account", "set_plan"];

interface ServerStep {
  key?: string;
  done?: boolean;
}

export interface ServerOnboardingStatus {
  complete?: boolean;
  nextStep?: string | null;
  steps?: ServerStep[];
}

const isStepKey = (value: unknown): value is OnboardingStepKey =>
  typeof value === "string" && (STEP_ORDER as string[]).includes(value);

/**
 * 서버 응답 → 뷰모델.
 *
 * **모르는 단계는 버리고 빠진 단계는 미완료로 채운다.** 화면의 `ProgressStepper` 는 항상
 * 세 칸이어야 하고, 서버가 한 칸을 빼먹었다고 스텝이 사라지면 사용자는 진행률을 잘못
 * 읽는다. `nextStep` 도 서버 값을 그대로 믿지 않고 **우리가 만든 `steps` 에서 다시
 * 찾는다** — 둘이 어긋나면 화면이 "완료된 단계로 가라"고 말하게 된다.
 */
export const toOnboardingStatusViewModel = (
  server: ServerOnboardingStatus | undefined
): OnboardingStatusViewModel => {
  const done = new Map<OnboardingStepKey, boolean>();
  for (const step of server?.steps ?? []) {
    if (isStepKey(step.key)) done.set(step.key, step.done === true);
  }

  const steps = STEP_ORDER.map((key) => ({ key, done: done.get(key) ?? false }));
  const nextStep = steps.find((step) => !step.done)?.key ?? null;

  return { complete: nextStep === null, nextStep, steps };
};
