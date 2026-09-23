"use client";

import type { CoachMode } from "@repo/core/coach";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { isCoachMode } from "@/entities/coach";
import { COACH_MODE_PARAM } from "@/shared/config";

/** 패널과 상세 분석 페이지가 공유하는 URL 키 — 원본은 `shared/config` (서버 컴포넌트도 쓴다) */
export { COACH_MODE_PARAM };

/**
 * 판단 모드 — **URL `?mode=` 가 상태다** (`FE-REQ-026` FR-111 · FR-112).
 *
 * URL 에 없으면 `fallback`(서버가 준 `mode`, B16)이다. 모르는 값도 없는 것으로 본다.
 *
 * ## `router.replace` 가 아니라 `history.replaceState` 다
 *
 * REQ 는 `router.replace` 를 적었다. App Router 에서 그것은 **소프트 내비게이션**이라
 * 페이지 RSC 를 서버에 다시 요청한다 — "모드 전환은 요청 0건"(`FE-REQ-028` FR-83)과
 * 정면으로 부딪힌다. Next 14.1+ 는 네이티브 `history.replaceState` 를 `useSearchParams`
 * 와 동기화하므로, 이것으로 URL 만 바꾸고 히스토리도 쌓지 않는다. 다시 렌더되는 것은
 * `useSearchParams` 를 읽는 컴포넌트뿐이다 — 시세 표는 그대로다(`FE-REQ-029` FR-71).
 */
export const useCoachModeParam = (
  fallback: CoachMode | undefined,
): readonly [CoachMode | undefined, (next: CoachMode) => void] => {
  const searchParams = useSearchParams();
  const fromUrl = searchParams?.get(COACH_MODE_PARAM);
  const mode = isCoachMode(fromUrl) ? fromUrl : fallback;

  const setMode = useCallback((next: CoachMode) => {
    const url = new URL(window.location.href);
    url.searchParams.set(COACH_MODE_PARAM, next);
    window.history.replaceState(null, "", url);
  }, []);

  return [mode, setMode] as const;
};
