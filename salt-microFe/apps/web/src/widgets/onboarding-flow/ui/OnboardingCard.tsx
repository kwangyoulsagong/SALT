"use client";

import { Card } from "@repo/ui/card";
import { FlexBox } from "@repo/ui/flexBox";
import { Heading } from "@repo/ui/heading";
import { Text } from "@repo/ui/text";
import Link from "next/link";

import { useOnboardingStatus } from "@/entities/auth";
import { ROUTES } from "@/shared/config";

import {
  ONBOARDING_CARD_MESSAGES,
  ONBOARDING_STEP_LABELS,
} from "../model/messages";

/**
 * 홈의 온보딩 안내 (`FE-REQ-010` FR-25).
 *
 * **카드 하나만 나온다.** 블록마다 "먼저 계좌를 연결하세요"를 띄우면 미완료 사용자의
 * 홈이 안내로 덮인다 — 그 사용자에게 필요한 것은 같은 말을 다섯 번 듣는 것이 아니라
 * 이어서 할 자리 하나다.
 *
 * 온보딩이 끝났으면 **아무것도 렌더하지 않는다.** 불러오는 중에도 렌더하지 않는다 —
 * 잠깐 나타났다 사라지는 카드가 홈의 첫 레이아웃을 흔든다.
 */
export const OnboardingCard = () => {
  const { data } = useOnboardingStatus();

  if (!data || data.complete || data.nextStep === null) return null;

  const remaining = data.steps.filter((step) => !step.done).length;

  return (
    <Card>
      <FlexBox direction="column" gap="sm">
        <Heading level={3}>{ONBOARDING_CARD_MESSAGES.title}</Heading>
        <Text>
          {ONBOARDING_STEP_LABELS[data.nextStep]} ·{" "}
          {ONBOARDING_CARD_MESSAGES.remaining(remaining)}
        </Text>
        <Link href={ROUTES.onboarding}>{ONBOARDING_CARD_MESSAGES.cta}</Link>
      </FlexBox>
    </Card>
  );
};

export default OnboardingCard;
