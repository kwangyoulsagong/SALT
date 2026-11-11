"use client";

import type { CoachMode, SymbolExplanation } from "@repo/core/coach";
import { useQuery } from "@tanstack/react-query";

import { useHasSession, retryWhileRetriable } from "@repo/web-shared/api";

import { coachApi } from "./coachApi";
import { coachQueryKeys } from "./queryKeys";

/** 해설은 배치가 10분마다 바뀐 종목만 다시 만든다 — 1분 안에 다시 부를 이유가 없다 */
const EXPLANATION_STALE_TIME_MS = 60_000;
/**
 * AI 해설이 아직 아니면(이전 · 사실표 · 없음) 2분마다 다시 본다 — 이 종목을 본 순간 서버가 배치에 알리고 다음 회차(≤10분)에 만든다.
 * 최신이 되면 멈춘다(`performance-frontend.md` §6 — 폴링엔 중단 조건)
 */
const EXPLANATION_UPGRADE_POLL_MS = 120_000;

/**
 * 종목 해설(F017 v2 단계 3 · `FE-REQ-064` FR-2) — 저장값 읽기, 4단 중 하나. 종목 · 모드마다 한 번.
 * 수화에 안전하게 — 서버 · 첫 렌더는 "모름"(null): 부르지도, 로그아웃이라 하지도 않는다
 */
export const useSymbolExplanation = (symbol: string | undefined, mode: CoachMode | undefined) => {
  const signedIn = useHasSession();
  const target = symbol ?? "";
  const query = useQuery<SymbolExplanation, Error>({
    queryKey: coachQueryKeys.explanation(target, mode ?? "scalp"),
    queryFn: ({ signal }) => coachApi.explanation(target, mode!, signal),
    enabled: signedIn === true && target !== "" && mode !== undefined,
    staleTime: EXPLANATION_STALE_TIME_MS,
    refetchInterval: (q) => (q.state.data && q.state.data.tier !== "latest" ? EXPLANATION_UPGRADE_POLL_MS : false),
    retry: retryWhileRetriable(1),
  });
  return { ...query, isSignedOut: signedIn === false };
};
