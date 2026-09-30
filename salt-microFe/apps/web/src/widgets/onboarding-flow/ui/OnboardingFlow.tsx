"use client";

import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Container } from "@repo/ui/container";
import { EmptyState } from "@repo/ui/emptyState";
import { FlexBox } from "@repo/ui/flexBox";
import { Heading } from "@repo/ui/heading";
import { Illustration } from "@repo/ui/illustration";
import { durations, ease } from "@repo/ui/motion";
import { ProgressStepper } from "@repo/ui/progressStepper";
import { StatusGraphic } from "@repo/ui/statusGraphic";
import { Text } from "@repo/ui/text";
import { AnimatePresence, m } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useOnboardingStatus, type OnboardingStepKey } from "@/entities/auth";
import { InviteCodeForm } from "@/features/accept-invite";
import { ROUTES } from "@/shared/config";

import {
  ONBOARDING_MESSAGES,
  ONBOARDING_STEP_BODY,
  ONBOARDING_STEP_LABELS,
  ONBOARDING_STEP_SCENE,
} from "../model/messages";

import { acceptedLine, stepHead, stepSlide } from "./OnboardingFlow.css";

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
 *
 * ## 그래픽 (`FE-REQ-044` P-3 · P-4 · P-20 · P-40)
 *
 * 단계마다 머리 장면 하나, 단계가 넘어가면 본문이 옆으로 밀린다. 초대를 수락하면 다음 단계 위에
 * "초대를 수락했어요" 한 줄을 체크와 함께 한 번 보인다 — 말없이 넘어가면 무엇이 됐는지 모른다.
 */
export const OnboardingFlow = () => {
  const router = useRouter();
  const { data, isLoading } = useOnboardingStatus();
  const [inviteAccepted, setInviteAccepted] = useState(false);

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
          <FlexBox align="center" gap="sm">
            <StatusGraphic kind="progress" size="sm" />
            <Text>{ONBOARDING_MESSAGES.loading}</Text>
          </FlexBox>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={currentStep ?? "complete"}
              className={stepSlide}
              initial={{ opacity: 0, x: SLIDE_DISTANCE }}
              animate={{ opacity: 1, x: 0, transition: { duration: durations.slow, ease: ease.enter } }}
              exit={{ opacity: 0, x: -SLIDE_DISTANCE, transition: { duration: durations.base, ease: ease.exit } }}
            >
              {currentStep === null ? (
                <Card>
                  <EmptyState
                    tone="success"
                    iconFrame="none"
                    icon={<StatusGraphic kind="success" size="lg" />}
                    title={ONBOARDING_MESSAGES.completeTitle}
                    description={ONBOARDING_MESSAGES.completeDescription}
                    action={<Button onClick={() => router.push(ROUTES.home)}>{ONBOARDING_MESSAGES.goHome}</Button>}
                  />
                </Card>
              ) : (
                <StepBody
                  step={currentStep}
                  showAccepted={inviteAccepted && currentStep !== "invite"}
                  onInviteAccepted={() => setInviteAccepted(true)}
                />
              )}
            </m.div>
          </AnimatePresence>
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
const StepBody = ({
  step,
  showAccepted,
  onInviteAccepted,
}: {
  step: OnboardingStepKey;
  showAccepted: boolean;
  onInviteAccepted: () => void;
}) => {
  const body = ONBOARDING_STEP_BODY[step];

  return (
    <Card>
      <FlexBox direction="column" gap="md">
        {showAccepted ? (
          <p className={acceptedLine} aria-live="polite">
            <StatusGraphic kind="success" size="sm" />
            {ONBOARDING_MESSAGES.inviteAccepted}
          </p>
        ) : null}
        <div className={stepHead}>
          <Illustration scene={ONBOARDING_STEP_SCENE[step]} size="md" />
        </div>
        <Heading level={3}>{body.title}</Heading>
        <Text>{body.description}</Text>
        {step === "invite" ? <InviteCodeForm onAccepted={onInviteAccepted} /> : null}
        {body.pending ? <Text color="muted">{body.pending}</Text> : null}
      </FlexBox>
    </Card>
  );
};

/** 단계 본문이 밀리는 거리(px) — 모션 원칙 4 "이동 거리는 작게" */
const SLIDE_DISTANCE = 24;

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
