"use client";

import type { ScenarioHorizonKey } from "@repo/core/coach";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { PANEL_DEFAULT_HORIZON } from "@/entities/coach";

/** 한 장 패널 기간 탭의 URL 키 — 패널과 차트(틀리는 선)가 같은 기간을 읽는다 */
export const PANEL_HORIZON_PARAM = "horizon";

const HORIZON_KEYS: readonly ScenarioHorizonKey[] = ["1h", "4h", "1d", "5d"];
const isHorizon = (value: string | null | undefined): value is ScenarioHorizonKey =>
  value !== null && value !== undefined && (HORIZON_KEYS as readonly string[]).includes(value);

/**
 * 기간 탭 — **URL `?horizon=` 이 상태다**(F017 v4 순서 6 · `FE-REQ-064` FR-12 "단타/장기 스위치 → 기간 탭").
 *
 * 탭이 고른 기간이 판단 모드를 고른다(서버 `horizonMode`). 패널과 차트 위 틀리는 선이 다른 위젯이라 같은 상태를 URL 로 나눈다 —
 * 한쪽만 바뀌면 두 자리가 다른 가격을 말한다. `history.replaceState` 다 — `router.replace` 는 App Router 에서 소프트 내비게이션이라 페이지 RSC 를 다시 부른다(요청 0 · 히스토리 안 쌓임 — 옛 `?mode=` 스위치 `FE-REQ-028` FR-83 과 같은 이유).
 * 모르는 값 · 없음 = 기본 하루
 */
export const usePanelHorizonParam = (): readonly [ScenarioHorizonKey, (next: ScenarioHorizonKey) => void] => {
  const searchParams = useSearchParams();
  const fromUrl = searchParams?.get(PANEL_HORIZON_PARAM);
  const horizon = isHorizon(fromUrl) ? fromUrl : PANEL_DEFAULT_HORIZON;

  const setHorizon = useCallback((next: ScenarioHorizonKey) => {
    const url = new URL(window.location.href);
    url.searchParams.set(PANEL_HORIZON_PARAM, next);
    window.history.replaceState(null, "", url);
  }, []);

  return [horizon, setHorizon] as const;
};
