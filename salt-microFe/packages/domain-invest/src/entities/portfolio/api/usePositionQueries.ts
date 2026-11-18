"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useHasSession } from "@repo/web-shared/api";

import type { FlowRange } from "../model/position";
import { portfolioApi } from "./portfolioApi";
import { portfolioQueryKeys } from "./queryKeys";

/** 보유 요약과 같은 신선도 — 평가금은 시세가 밀어 넣는 값이라 30초면 충분하다 */
const POSITION_STALE_TIME_MS = 30_000;

/** 포지션 개요 — 토큰이 있을 때만(로그인 안 한 것은 실패가 아니라 상태). 재시도는 기본값 */
export const usePositionOverview = () => {
  const signedIn = useHasSession();
  const query = useQuery({
    queryKey: portfolioQueryKeys.positionOverview,
    queryFn: ({ signal }) => portfolioApi.position(signal),
    enabled: signedIn === true,
    staleTime: POSITION_STALE_TIME_MS,
  });
  return { ...query, isSignedOut: signedIn === false };
};

/** 평가금 흐름 — 기간을 바꾸는 동안 앞 기간 그림을 남긴다(빈 칸으로 깜빡이지 않게) */
export const usePositionFlow = (range: FlowRange, enabled: boolean) =>
  useQuery({
    queryKey: portfolioQueryKeys.positionFlow(range),
    queryFn: ({ signal }) => portfolioApi.positionFlow(range, signal),
    enabled,
    staleTime: POSITION_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
