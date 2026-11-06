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

import { hasApiStatus, useHasSession } from "@repo/web-shared/api";
import { ROUTES } from "@repo/web-shared/config";
import { useZoneNavigate } from "@repo/web-shared/lib";

import { useOnboarding } from "@/entities/auth";
import { InviteCodeForm } from "@/features/accept-invite";
import { DomainChoiceForm, useFinishOnboarding } from "@/features/choose-domains";

import {
  FIRST_INPUT_ACTION,
  ONBOARDING_COMPLETE_HEADLINE,
  ONBOARDING_MESSAGES,
  ONBOARDING_SCREEN_BODY,
  ONBOARDING_SCREEN_LABELS,
  ONBOARDING_SCREEN_ORDER,
  ONBOARDING_SCREEN_SCENE,
  type OnboardingScreen,
} from "../model/messages";

import * as s from "./OnboardingFlow.css";

/**
 * 온보딩 — 도메인 선택(`FE-REQ-055` FR-4 · `FE-REQ-010` FR-21·22·25 · FR-64, 서버 S3a 2026-11-06).
 * 초대(계정이 없을 때) → 쓸 것 고르기(모으기 · 쓰는 돈 · 투자) → 고른 것 중 하나에 첫 기록 → 끝. 투자를 안 고르면 투자 질문 0.
 *
 * ## 진행 위치를 화면이 계산하지 않는다
 *
 * 다음 단계 · 첫 기록 도메인 · 그 화면 경로는 서버(identity) → BFF 가 준다. 화면이 고른 것을 훑어 스스로 정하면 판정이
 * 두 곳이 된다. 화면이 하는 일은 "세션이 없으면 초대"와 "단계 없음 = 끝"을 화면 단계로 옮기는 것뿐이다.
 *
 * ## 첫 기록은 다른 zone 화면에서 한다
 *
 * 저축 · 가계부 · 투자 입력 화면은 각 zone 에 있다(`ADR-005`). 버튼을 누르면 **먼저 끝내고**(서버에 기록) 그 화면으로 문서 이동 —
 * 돌아오는 길은 그 화면의 뒤로 · 하단 탭이다. 끝내기가 실패하면 이동하지 않는다(다음에 다시 이 단계가 나온다).
 *
 * ## 그래픽 (`FE-REQ-044` P-3 · P-4 · P-20 · P-40)
 *
 * 단계마다 머리 장면 하나, 단계가 넘어가면 본문이 옆으로 밀린다. 초대를 수락하면 다음 단계 위에 "초대를 수락했어요" 한 줄.
 * 배치는 모바일 한 열(2026-09-30 QA) — 가운데 한 열 · 두 줄 큰 제목 · 장면 · 점 진행 · 아래 버튼.
 */
export const OnboardingFlow = () => {
  const router = useRouter();
  // 첫 기록 화면은 다른 zone 이다 — 문서 이동은 이 훅이 고른다(`FE-REQ-053`)
  const navigate = useZoneNavigate();
  const signedIn = useHasSession();
  const onboarding = useOnboarding();
  const finish = useFinishOnboarding();
  const [inviteAccepted, setInviteAccepted] = useState(false);
  // 세션이 끝났다(리프레시도 죽음) — `/onboarding` 은 공개 경로라 로그인으로 보내지 않고 세션만 비운다(`refreshSession`).
  // 표지 쿠키는 다음 포커스에야 다시 읽히니 401 을 "로그인 안 함"으로 읽어 초대 단계로 — "불러오지 못했어요"가 아니다
  const sessionEnded = hasApiStatus(onboarding.error, 401);

  // 세션을 아직 모르면(서버 · 하이드레이션) 단계를 정하지 않는다 — 초대 단계가 번쩍였다가 바뀌지 않게.
  // 초대 수락 직후의 첫 조회는 초대 단계를 그대로 둔다 — 로딩으로 바꾸면 다음 단계가 밀려 들어오지 않는다(P-40, 2026-10-30)
  const screen: OnboardingScreen | null =
    signedIn === null
      ? null
      : signedIn === false || sessionEnded || (inviteAccepted && !onboarding.data)
        ? "invite"
        : onboarding.data
          ? (onboarding.data.nextStep ?? "complete")
          : null;

  if (signedIn === true && onboarding.isError && !onboarding.data && !sessionEnded) {
    return (
      <div className={s.page}>
        <div className={s.loading}>
          <StatusLine kind="error">{ONBOARDING_MESSAGES.loadFailed}</StatusLine>
        </div>
      </div>
    );
  }

  if (screen === null) {
    return (
      <div className={s.page}>
        <div className={s.loading}>
          <StatusGraphic kind="progress" size="md" />
          <p className={s.sub}>{ONBOARDING_MESSAGES.loading}</p>
        </div>
      </div>
    );
  }

  const body = screen === "complete" ? null : ONBOARDING_SCREEN_BODY[screen];
  const headline = body ? body.headline : ONBOARDING_COMPLETE_HEADLINE;
  const currentIndex = screen === "complete" ? ONBOARDING_SCREEN_ORDER.length : ONBOARDING_SCREEN_ORDER.indexOf(screen);
  const firstInput = onboarding.data?.firstInput ?? null;

  const finishThen = (go: () => void) => {
    if (finish.isPending) return;
    finish.mutate(undefined, { onSuccess: go });
  };

  return (
    <div className={s.page}>
      <ol className={s.dots} aria-label={ONBOARDING_MESSAGES.stepperLabel}>
        {ONBOARDING_SCREEN_ORDER.map((key, index) => (
          <li
            key={key}
            className={index === Math.min(currentIndex, ONBOARDING_SCREEN_ORDER.length - 1) ? s.dotActive : s.dot}
            aria-current={index === currentIndex ? "step" : undefined}
          >
            <span className={s.srOnly}>
              {ONBOARDING_SCREEN_LABELS[key]}
              {index < currentIndex ? " ✓" : ""}
            </span>
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait" initial={false}>
        <m.section
          key={screen}
          className={s.step}
          initial={{ opacity: 0, x: SLIDE_DISTANCE }}
          animate={{ opacity: 1, x: 0, transition: { duration: durations.slow, ease: ease.enter } }}
          exit={{ opacity: 0, x: -SLIDE_DISTANCE, transition: { duration: durations.base, ease: ease.exit } }}
        >
          {inviteAccepted && screen !== "invite" ? (
            <StatusLine kind="success" live className={s.accepted}>
              {ONBOARDING_MESSAGES.inviteAccepted}
            </StatusLine>
          ) : null}

          <h1 className={s.headline}>
            <span>{headline[0]}</span>
            <span className={s.accent}>{headline[1]}</span>
          </h1>
          <p className={s.sub}>{screen === "complete" ? ONBOARDING_MESSAGES.completeDescription : body?.description}</p>

          {screen === "choose_domains" ? null : (
            <div className={s.scene}>
              {screen === "complete" ? (
                <StatusGraphic kind="success" size="lg" />
              ) : (
                <Illustration scene={ONBOARDING_SCREEN_SCENE[screen]} size="lg" />
              )}
            </div>
          )}

          {screen === "invite" ? (
            <div className={s.form}>
              <InviteCodeForm onAccepted={() => setInviteAccepted(true)} />
            </div>
          ) : null}

          {screen === "choose_domains" && onboarding.data ? <DomainChoiceForm choices={onboarding.data.choices} /> : null}

          {finish.isError ? <StatusLine kind="error">{ONBOARDING_MESSAGES.finishFailed}</StatusLine> : null}
        </m.section>
      </AnimatePresence>

      {/* 초대 · 고르기는 폼 안에 제출 버튼이 있다. 첫 기록은 그 화면으로(먼저 끝내고), 아래에 "나중에 할게요" */}
      {screen === "first_input" || screen === "complete" ? (
        <BottomCTA fixed className={s.ctaBar}>
          <div className={s.ctaInner}>
            {screen === "complete" ? (
              <Button variant="primary" size="lg" fullWidth onClick={() => router.push(ROUTES.home)}>
                {ONBOARDING_MESSAGES.goHome}
              </Button>
            ) : (
              <>
                {firstInput ? (
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    aria-busy={finish.isPending}
                    onClick={() => finishThen(() => navigate(firstInput.href))}
                  >
                    {FIRST_INPUT_ACTION[firstInput.domain]}
                  </Button>
                ) : null}
                <Button variant="ghost" size="md" fullWidth aria-busy={finish.isPending} onClick={() => finishThen(() => router.push(ROUTES.home))}>
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

/** 단계 본문이 밀리는 거리(px) — 모션 원칙 4 "이동 거리는 작게" */
const SLIDE_DISTANCE = 24;

export default OnboardingFlow;
