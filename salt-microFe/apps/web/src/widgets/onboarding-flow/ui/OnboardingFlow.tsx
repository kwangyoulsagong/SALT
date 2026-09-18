"use client";

import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Container } from "@repo/ui/container";
import { FlexBox } from "@repo/ui/flexBox";
import { Heading } from "@repo/ui/heading";
import { ProgressStepper } from "@repo/ui/progressStepper";
import { Text } from "@repo/ui/text";
import { useRouter } from "next/navigation";

import { useOnboardingStatus, type OnboardingStepKey } from "@/entities/auth";
import { InviteCodeForm } from "@/features/accept-invite";
import { ROUTES } from "@/shared/config";

import {
  ONBOARDING_MESSAGES,
  ONBOARDING_STEP_BODY,
  ONBOARDING_STEP_LABELS,
} from "../model/messages";

/**
 * 온보딩 3스텝 (`FE-REQ-010` FR-21·22·25 · `FE-REQ-010` FR-64).
 *
 * ## 진행 위치를 화면이 계산하지 않는다
 *
 * `nextStep` 은 BFF 가 준다. 화면이 `steps` 를 훑어 스스로 정하면 **판정이 두 곳**이
 * 되고, 서버가 단계를 늘릴 때 화면만 옛 규칙으로 남는다. 여기서 하는 계산은
 * `ProgressStepper` 가 요구하는 **인덱스로의 변환** 하나뿐이다.
 *
 * ## 아직 계정이 없는 사람도 이 화면에 온다
 *
 * 그때 상태 조회는 비활성이고(`useOnboardingStatus` 가 토큰 없이는 부르지 않는다)
 * 현재 단계는 `invite` 다. 초대 수락이 성공하면 쿼리가 무효화되어 다음 단계로 넘어간다 —
 * 화면이 단계를 직접 밀지 않는다.
 */
export const OnboardingFlow = () => {
  const router = useRouter();
  const { data, isLoading } = useOnboardingStatus();

  const steps = data?.steps ?? FALLBACK_STEPS;
  const currentStep: OnboardingStepKey | null = data ? data.nextStep : "invite";
  const currentIndex =
    currentStep === null
      ? steps.length
      : steps.findIndex((step) => step.key === currentStep);

  return (
    <Container size="full" padding="md">
      <FlexBox direction="column" gap="lg">
        <Heading level={2}>{ONBOARDING_MESSAGES.title}</Heading>

        <ProgressStepper
          label={ONBOARDING_MESSAGES.stepperLabel}
          steps={steps.map((step) => ({
            id: step.key,
            label: ONBOARDING_STEP_LABELS[step.key],
          }))}
          current={currentIndex}
        />

        {isLoading ? (
          <Text>{ONBOARDING_MESSAGES.loading}</Text>
        ) : currentStep === null ? (
          <Card>
            <FlexBox direction="column" gap="sm">
              <Heading level={3}>{ONBOARDING_MESSAGES.completeTitle}</Heading>
              <Text>{ONBOARDING_MESSAGES.completeDescription}</Text>
              <Button onClick={() => router.push(ROUTES.home)}>
                {ONBOARDING_MESSAGES.goHome}
              </Button>
            </FlexBox>
          </Card>
        ) : (
          <StepBody step={currentStep} />
        )}
      </FlexBox>
    </Container>
  );
};

/**
 * 현재 단계의 본문.
 *
 * `invite` 만 실제 폼을 갖는다. 나머지 둘은 **안내만** 한다 — 연결 화면(`ledger`, F001)과
 * 적립 설정(`plan`, F003)이 아직 없다. 누르면 아무 일도 일어나지 않는 버튼을 두는 것보다
 * 준비 중이라고 쓰는 것이 정직하다.
 */
const StepBody = ({ step }: { step: OnboardingStepKey }) => {
  const body = ONBOARDING_STEP_BODY[step];

  return (
    <Card>
      <FlexBox direction="column" gap="md">
        <Heading level={3}>{body.title}</Heading>
        <Text>{body.description}</Text>
        {step === "invite" ? <InviteCodeForm /> : null}
        {body.pending ? <Text color="muted">{body.pending}</Text> : null}
      </FlexBox>
    </Card>
  );
};

/**
 * 상태를 못 받았을 때의 단계 목록.
 *
 * 로그인 전에는 조회가 비활성이라 **정상 경로에서도 쓰인다.** 세 칸을 그려 두어야
 * 사용자가 전체 길이를 알고 시작한다.
 */
const FALLBACK_STEPS = [
  { key: "invite" as const, done: false },
  { key: "link_account" as const, done: false },
  { key: "set_plan" as const, done: false },
];

export default OnboardingFlow;
