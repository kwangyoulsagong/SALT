"use client";

import { Card } from "@repo/ui/card";
import { Container } from "@repo/ui/container";
import { FlexBox } from "@repo/ui/flexBox";
import { Heading } from "@repo/ui/heading";
import { Illustration } from "@repo/ui/illustration";
import { Text } from "@repo/ui/text";
import Link from "next/link";

import { ROUTES } from "@repo/web-shared/config";
import { NavChevron } from "@repo/web-shared/ui";

import { useOnboarding } from "@/entities/auth";

import { ONBOARDING_CARD_MESSAGES, ONBOARDING_SCREEN_LABELS, ONBOARDING_SCREEN_SCENE } from "../model/messages";

import { cardRow, ctaLink, spacing } from "./OnboardingCard.css";

/**
 * 홈의 온보딩 안내 (`FE-REQ-010` FR-25 · `FE-REQ-055` FR-4).
 *
 * **카드 하나만 나온다.** 블록마다 안내하면 미완료 사용자의 홈이 안내로 덮인다 — 필요한 것은 이어서 할 자리 하나다.
 * 다음 단계(쓸 것 고르기 · 첫 기록)는 서버 값 그대로.
 *
 * 온보딩이 끝났으면 **아무것도 렌더하지 않는다.** 불러오는 중에도 렌더하지 않는다 — 잠깐 나타났다 사라지는 카드가
 * 홈의 첫 레이아웃을 흔든다.
 */
export const OnboardingCard = () => {
  const { data } = useOnboarding();

  if (!data || data.complete || data.nextStep === null) return null;

  return (
    // 다른 홈 카드와 같은 좌우 16px 안쪽 · 아래 간격 — 전에는 화면 끝에 붙고 아래 카드와 간격이 0 이었다(2026-09-30 QA)
    <Container size="full" className={spacing}>
      <Card padding="lg">
        {/* 다음 단계의 장면을 오른쪽에 작게 (FE-REQ-044 P-22) */}
        <div className={cardRow}>
          <FlexBox direction="column" gap="sm">
            <Heading level={3}>{ONBOARDING_CARD_MESSAGES.title}</Heading>
            <Text>{ONBOARDING_SCREEN_LABELS[data.nextStep]}</Text>
            <Link href={ROUTES.onboarding} className={ctaLink}>
              {ONBOARDING_CARD_MESSAGES.cta}
              <NavChevron />
            </Link>
          </FlexBox>
          <Illustration scene={ONBOARDING_SCREEN_SCENE[data.nextStep]} size="sm" />
        </div>
      </Card>
    </Container>
  );
};

export default OnboardingCard;
