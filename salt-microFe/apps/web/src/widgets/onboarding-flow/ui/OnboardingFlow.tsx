"use client";

import { BottomCTA } from "@repo/ui/bottomCTA";
import { Button } from "@repo/ui/button";
import { Illustration } from "@repo/ui/illustration";
import { durations, ease } from "@repo/ui/motion";
import { StatusGraphic } from "@repo/ui/statusGraphic";
import { StatusLine } from "@repo/ui/statusLine";
import { AnimatePresence, m } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useOnboardingStatus, type OnboardingStepKey } from "@/entities/auth";
import { InviteCodeForm } from "@/features/accept-invite";
import { useHasAccessToken } from "@/shared/api";
import { ROUTES } from "@/shared/config";

import {
  ONBOARDING_COMPLETE_HEADLINE,
  ONBOARDING_MESSAGES,
  ONBOARDING_STEP_BODY,
  ONBOARDING_STEP_LABELS,
  ONBOARDING_STEP_SCENE,
} from "../model/messages";

import * as s from "./OnboardingFlow.css";

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
 *
 * ## 배치 — 모바일 한 열 (2026-09-30 QA 사용자 지적 "디자인 구리다")
 *
 * 카드 · 좌측 정렬 · 전폭 진행 막대를 버리고 참고 화면 구성으로: 가운데 한 열 · 위에서 옅어지는 배경 ·
 * 두 줄 큰 제목(둘째 줄 강조) · 설명 · 큰 장면 · 점 진행 표시 · 아래 버튼. 이 화면은 앱 웹뷰(모바일)용이다.
 */
export const OnboardingFlow = () => {
  const router = useRouter();
  const { data, isLoading: isQuerying } = useOnboardingStatus();
  // 토큰이 있는지 아직 모르면(서버 · 하이드레이션) 단계를 정하지 않는다 — 초대 단계가 번쩍였다가 바뀌지 않게
  const tokenKnown = useHasAccessToken() !== null;
  const isLoading = !tokenKnown || isQuerying;
  const [inviteAccepted, setInviteAccepted] = useState(false);

  const steps = data?.steps ?? FALLBACK_STEPS;
  const currentStep: OnboardingStepKey | null = data ? data.nextStep : "invite";
  const currentIndex =
    currentStep === null
      ? steps.length
      : steps.findIndex((step) => step.key === currentStep);

  if (isLoading) {
    return (
      <div className={s.page}>
        <div className={s.loading}>
          <StatusGraphic kind="progress" size="md" />
          <p className={s.sub}>{ONBOARDING_MESSAGES.loading}</p>
        </div>
      </div>
    );
  }

  const body = currentStep ? ONBOARDING_STEP_BODY[currentStep] : null;
  const headline = body ? body.headline : ONBOARDING_COMPLETE_HEADLINE;

  return (
    <div className={s.page}>
      <ol className={s.dots} aria-label={ONBOARDING_MESSAGES.stepperLabel}>
        {steps.map((step, index) => (
          <li
            key={step.key}
            className={
              index === Math.min(currentIndex, steps.length - 1)
                ? s.dotActive
                : s.dot
            }
            aria-current={index === currentIndex ? "step" : undefined}
          >
            <span className={s.srOnly}>
              {ONBOARDING_STEP_LABELS[step.key]}
              {step.done ? " ✓" : ""}
            </span>
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait" initial={false}>
        <m.section
          key={currentStep ?? "complete"}
          className={s.step}
          initial={{ opacity: 0, x: SLIDE_DISTANCE }}
          animate={{
            opacity: 1,
            x: 0,
            transition: { duration: durations.slow, ease: ease.enter },
          }}
          exit={{
            opacity: 0,
            x: -SLIDE_DISTANCE,
            transition: { duration: durations.base, ease: ease.exit },
          }}
        >
          {inviteAccepted && currentStep !== "invite" ? (
            <StatusLine kind="success" live className={s.accepted}>
              {ONBOARDING_MESSAGES.inviteAccepted}
            </StatusLine>
          ) : null}

          <h1 className={s.headline}>
            <span>{headline[0]}</span>
            <span className={s.accent}>{headline[1]}</span>
          </h1>
          <p className={s.sub}>
            {currentStep === null
              ? ONBOARDING_MESSAGES.completeDescription
              : body?.description}
          </p>

          <div className={s.scene}>
            {currentStep === null ? (
              <StatusGraphic kind="success" size="lg" />
            ) : (
              <Illustration
                scene={ONBOARDING_STEP_SCENE[currentStep]}
                size="lg"
              />
            )}
          </div>

          {currentStep === "invite" ? (
            <div className={s.form}>
              <InviteCodeForm onAccepted={() => setInviteAccepted(true)} />
            </div>
          ) : null}
        </m.section>
      </AnimatePresence>

      {/* 초대 단계는 폼 안에 제출 버튼이 있다. 나머지는 그 단계를 끝내는 화면으로 보내고, 아래에 "나중에 할게요" */}
      {currentStep !== "invite" ? (
        <BottomCTA fixed className={s.ctaBar}>
          <div className={s.ctaInner}>
            {currentStep === null ? (
              <Button variant="primary" size="lg" fullWidth onClick={() => router.push(ROUTES.home)}>
                {ONBOARDING_MESSAGES.goHome}
              </Button>
            ) : (
              <>
                <Button variant="primary" size="lg" fullWidth onClick={() => router.push(STEP_ROUTE[currentStep])}>
                  {body?.action}
                </Button>
                <Button variant="ghost" size="md" fullWidth onClick={() => router.push(ROUTES.home)}>
                  {ONBOARDING_MESSAGES.laterToHome}
                </Button>
              </>
            )}
          </div>
        </BottomCTA>
      ) : null}
    </div>
  );
};

/** 단계를 끝내는 화면 — 거래를 한 건 기록하면(종목 상세의 거래 기록) · 목표를 추가하면 서버가 완료로 바꾼다 */
const STEP_ROUTE: Record<Exclude<OnboardingStepKey, "invite">, string> = {
  link_account: ROUTES.investments,
  set_plan: ROUTES.addGoal,
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
