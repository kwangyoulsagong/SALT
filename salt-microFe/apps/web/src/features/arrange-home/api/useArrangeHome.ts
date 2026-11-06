"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch, readApiError, type ApiError } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

import { homeQueryKeys, type AppHomeVM, type HomeDomain } from "@/entities/home";

export interface HomeLayout {
  order: HomeDomain[];
  hidden: HomeDomain[];
}

/** `PUT /api/app/home/layout`(`BFF-REQ-046` FR-5). 응답은 서버(identity)가 저장한 배치 */
const saveLayout = async (layout: HomeLayout): Promise<HomeLayout> => {
  const response = await apiFetch(`${INVESTMENTS_BASE_URL}/api/app/home/layout`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(layout),
  });
  if (!response.ok) throw await readApiError(response, "arrange home");
  return (await response.json()) as HomeLayout;
};

/** 같은 묶음 쓰기 — 차례로 보낸다(`scope`). 저장 중 누른 것을 버리지 않는다(2026-11-06 실화면: 토글 직후 "위로"가 사라졌다) */
const ARRANGE_HOME_KEY = ["arrange-home"] as const;

/**
 * 홈 카드 순서 · 숨김 저장(`FE-REQ-055` FR-2). 금액이 아닌 설정이라 **낙관적 갱신**(`fsd-features.md`) — 실패하면 되돌린다.
 * 연달아 바꾸면 차례로 저장하고, **마지막 저장이 끝날 때만** 홈을 다시 받는다(배치의 진실은 서버) — 중간에 받으면 뒤 변경이 잠깐 되돌아 보인다.
 * 재시도 0회. 값 검사(전부 숨김 등)는 서버 — 화면은 막지 않고 실패만 알린다
 */
export const useArrangeHome = () => {
  const queryClient = useQueryClient();
  const key = homeQueryKeys.cards();

  return useMutation<HomeLayout, ApiError, HomeLayout, { previous: AppHomeVM | undefined }>({
    mutationKey: ARRANGE_HOME_KEY,
    scope: { id: ARRANGE_HOME_KEY[0] },
    mutationFn: saveLayout,
    retry: 0,
    onMutate: async (layout) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<AppHomeVM>(key);
      if (previous) queryClient.setQueryData<AppHomeVM>(key, { ...previous, ...layout });
      return { previous };
    },
    onError: (_error, _layout, context) => {
      queryClient.setQueryData(key, context?.previous);
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: ARRANGE_HOME_KEY }) <= 1) return queryClient.invalidateQueries({ queryKey: key });
    },
  });
};
