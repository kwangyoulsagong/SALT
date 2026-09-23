"use client";

import { useQuery } from "@tanstack/react-query";

import { readAccessToken } from "@/shared/api";

import { goalApi } from "./goalApi";
import { goalQueryKeys } from "./queryKeys";

/** 목표는 사용자가 추가할 때만 바뀐다 — 추가 뒤에는 키를 무효화한다(`useAddGoal`) */
const GOAL_STALE_TIME_MS = 60_000;

/** 토큰이 없으면 부르지 않는다 — 로그인하지 않은 것은 실패가 아니라 상태다 */
export const useGoalSummary = () =>
  useQuery({
    queryKey: [goalQueryKeys.mySummary],
    queryFn: goalApi.mySummary,
    enabled: Boolean(readAccessToken()),
    staleTime: GOAL_STALE_TIME_MS,
  });

export const useGoalProgressList = () =>
  useQuery({
    queryKey: [goalQueryKeys.progressList],
    queryFn: goalApi.progressList,
    enabled: Boolean(readAccessToken()),
    staleTime: GOAL_STALE_TIME_MS,
  });
