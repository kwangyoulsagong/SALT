"use client";

import { useQuery } from "@tanstack/react-query";

import { useHasSession } from "@repo/web-shared/api";

import { homeApi } from "./homeApi";
import { homeQueryKeys } from "./queryKeys";

/**
 * 홈 대시보드 블록(2026-11-26 — 사용자 "대시보드가 비어 있다 · 정보가 적다"). 블록마다 따로 받아 하나가 늦거나 실패해도 나머지는 그린다
 * (웹 = 블록별 엔드포인트, `bff-architecture.md` §4). 투자를 숨긴 사람은 부르지 않는다(`enabled`).
 */
const MARKET_STALE_MS = 60_000;
const BRIEFING_STALE_MS = 5 * 60_000;
const PLAN_STALE_MS = 60_000;

export const useHomeMarket = (enabled: boolean) =>
  useQuery({
    queryKey: homeQueryKeys.market(),
    queryFn: ({ signal }) => homeApi.market(signal),
    enabled: useHasSession() === true && enabled,
    staleTime: MARKET_STALE_MS,
  });

export const useHomeBriefing = (enabled: boolean) =>
  useQuery({
    queryKey: homeQueryKeys.briefing(),
    queryFn: ({ signal }) => homeApi.briefing(signal),
    enabled: useHasSession() === true && enabled,
    staleTime: BRIEFING_STALE_MS,
    retry: 1,
  });

export const useHomeWeeklyPlan = (enabled: boolean) =>
  useQuery({
    queryKey: homeQueryKeys.weeklyPlan(),
    queryFn: ({ signal }) => homeApi.weeklyPlan(signal),
    enabled: useHasSession() === true && enabled,
    staleTime: PLAN_STALE_MS,
    retry: 1,
  });
