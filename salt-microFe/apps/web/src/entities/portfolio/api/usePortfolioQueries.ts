"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { useHasAccessToken } from "@/shared/api";

import { PortfolioSummary } from "../model/types";
import { portfolioApi } from "./portfolioApi";
import { portfolioQueryKeys } from "./queryKeys";

/**
 * 보유 요약.
 *
 * 관심 목록과 같은 이유로 **토큰이 있을 때만** 부른다 — 로그인하지 않은 것은 실패가
 * 아니라 상태다. 쿠키로 옮기면(`FE-REQ-013`) 이 블록이 서버 컴포넌트로 내려간다.
 */
const SUMMARY_STALE_TIME_MS = 30_000;

export const usePortfolioSummary = (): UseQueryResult<PortfolioSummary> & {
  isSignedOut: boolean;
} => {
  const signedIn = useHasAccessToken();

  const query = useQuery({
    queryKey: portfolioQueryKeys.summary,
    queryFn: ({ signal }) => portfolioApi.summary(signal),
    enabled: signedIn === true,
    staleTime: SUMMARY_STALE_TIME_MS,
  });

  return { ...query, isSignedOut: signedIn === false } as UseQueryResult<PortfolioSummary> & {
    isSignedOut: boolean;
  };
};
