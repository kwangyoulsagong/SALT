"use client";

import { useQueries } from "@tanstack/react-query";

import { apiFetch, readApiError, useHasSession } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";
import { TimelyTipContext } from "@repo/web-shared/ui";

import { tipQueryKeys, type TipForMe } from "@/entities/tip";

import { pickForMe } from "../lib/pickForMe";

/** 사이드에 거는 맥락 — 내 저축 목표 · 내 가계부(`FE-REQ-060` FR-10). 홈 맥락은 홈 화면 몫 */
export const FOR_ME_CONTEXTS = [TimelyTipContext.Savings, TimelyTipContext.Household] as const;
export type ForMeContext = (typeof FOR_ME_CONTEXTS)[number];

/** 하루 안에 바뀔 일이 드물다(트리거는 목표 만들기 · 달) — 저축 · 가계부 칸(`TimelyTip`)과 같은 값 */
const STALE_MS = 10 * 60_000;

const fetchForMe = async (context: ForMeContext, signal: AbortSignal): Promise<TipForMe> => {
  const response = await apiFetch(`${INVESTMENTS_BASE_URL}/api/app/tips/for-me?context=${context}`, { signal });
  if (!response.ok) throw await readApiError(response, "tips-for-me");
  return (await response.json()) as TipForMe;
};

/**
 * 내게 맞춘 팁 — 맥락 둘을 서버에 묻는다(무엇을 고를지는 서버, 읽기 전용 — 닫기 · 기록 0). **로그인했을 때만** 부른다:
 * 공개 글 독자에게 401 을 만들지 않는다. 행 · 실패 판정은 `pickForMe`(경계 표 시험)
 */
export const useTipsForMe = () => {
  const signedIn = useHasSession();
  const results = useQueries({
    queries: FOR_ME_CONTEXTS.map((context) => ({
      queryKey: tipQueryKeys.forMe(context),
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchForMe(context, signal),
      enabled: signedIn === true,
      staleTime: STALE_MS,
      retry: false,
    })),
  });

  const { picks, isError } = pickForMe(FOR_ME_CONTEXTS, results);

  return {
    picks,
    /** 세션을 아직 모른다(첫 렌더) · 로그인했고 아직 받는 중 */
    isPending: signedIn === null || (signedIn === true && results.some((r) => r.isPending)),
    isSignedOut: signedIn === false,
    /** 고른 것이 없고, 한 맥락이라도 실패 · 서버 칸 실패(`degraded`) — "없어요"라고 말할 수 없다(`pickForMe`) */
    isError,
    refetch: () => results.forEach((r) => void r.refetch()),
  };
};
