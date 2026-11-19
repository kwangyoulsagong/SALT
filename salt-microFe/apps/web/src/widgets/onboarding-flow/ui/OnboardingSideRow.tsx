"use client";

import { ServiceIcon } from "@repo/ui/serviceicon";

import { ROUTES } from "@repo/web-shared/config";
import { SideBlock, SideRow } from "@repo/web-shared/ui";

import { useOnboarding } from "@/entities/auth";

import { ONBOARDING_CARD_MESSAGES, ONBOARDING_SCREEN_LABELS } from "../model/messages";

/**
 * 데스크톱 홈 오른쪽 칸의 시작하기 — 목록 행 하나(`FE-REQ-048` FR-8). 큰 카드로 본문 맨 위를 차지하던 것을 옆으로 옮겼다
 * (리서치: 시작 안내는 홈 안의 한 칸, 화면을 막지 않는다). 다 끝냈으면 아무것도 그리지 않는다.
 * 아이콘은 사용자 3D 아이콘 "미션"(번개). 앱 웹뷰는 사이드가 없어 본문의 `OnboardingCard` 가 대신한다
 */
export const OnboardingSideRow = () => {
  const { data } = useOnboarding();
  if (!data || data.complete || data.nextStep === null) return null;

  return (
    <SideBlock title={ONBOARDING_CARD_MESSAGES.title} titleId="home-onboarding-title">
      <SideRow
        href={ROUTES.onboarding}
        icon={<ServiceIcon variant="mission" />}
        label={ONBOARDING_SCREEN_LABELS[data.nextStep]}
        hint={ONBOARDING_CARD_MESSAGES.cta}
      />
    </SideBlock>
  );
};
