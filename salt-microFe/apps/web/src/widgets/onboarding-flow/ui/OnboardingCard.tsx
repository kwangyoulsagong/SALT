"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ROUTES } from "@repo/web-shared/config";
import { NavChevron } from "@repo/web-shared/ui";

import { useOnboarding } from "@/entities/auth";

import { ONBOARDING_CARD_MESSAGES, ONBOARDING_SCREEN_LABELS } from "../model/messages";

import { banner, bannerLink, bannerText, closeButton } from "./OnboardingCard.css";

/** 닫은 표시 — 이번 방문(탭) 동안만. 다시 열면 다시 보인다(닫았다고 시작하기를 건너뛴 것은 아니다) */
const DISMISS_KEY = "salt:onboarding-banner-dismissed";

/**
 * 홈의 온보딩 안내 (`FE-REQ-010` FR-25 · `FE-REQ-055` FR-4) — **앱 웹뷰 홈 맨 위 한 줄 배너 + 닫기**(`FE-REQ-060` FR-M3).
 * 데스크톱 · 태블릿 웹은 오른쪽 칸 `OnboardingSideRow` 가 같은 안내를 한다(홈 페이지가 웹뷰에서만 이것을 보인다).
 *
 * 다음 단계(쓸 것 고르기 · 첫 기록)는 서버 값 그대로. 온보딩이 끝났거나 불러오는 중이면 **아무것도 그리지 않는다** —
 * 잠깐 나타났다 사라지는 줄이 홈의 첫 레이아웃을 흔든다. 닫기 기록은 렌더 중에 읽지 않는다(`ssr.md`) — 마운트 뒤 effect 에서
 */
export const OnboardingCard = () => {
  const { data } = useOnboarding();
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {
      // 저장소를 못 쓰는 웹뷰 — 닫기는 이 화면에서만 먹는다
    }
  }, []);

  if (dismissed || !data || data.complete || data.nextStep === null) return null;

  const close = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // 위와 같다
    }
  };

  return (
    <div className={banner}>
      <Link href={ROUTES.onboarding} className={bannerLink}>
        <span className={bannerText}>
          {ONBOARDING_CARD_MESSAGES.title} · {ONBOARDING_SCREEN_LABELS[data.nextStep]}
        </span>
        <NavChevron />
      </Link>
      <button type="button" className={closeButton} onClick={close} aria-label={ONBOARDING_CARD_MESSAGES.close}>
        <span aria-hidden>×</span>
      </button>
    </div>
  );
};

export default OnboardingCard;
