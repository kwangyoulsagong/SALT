"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  AddWatchlistRequest,
  marketQueryKeys,
  WatchlistItem,
} from "@/entities/market";

import { toggleWatchlistApi } from "./toggleWatchlistApi";

export interface ToggleWatchlistTarget {
  /** 이미 담겨 있으면 그 항목. 제거에 `id` 가 필요하다 */
  entry: WatchlistItem | undefined;
  request: AddWatchlistRequest;
}

/**
 * 별 토글.
 *
 * ## 낙관적 갱신을 하지 않는다
 *
 * `fsd-features.md` 가 낙관적 갱신을 **비금액 상태에만** 허용하는데, 관심 목록 행에는
 * 현재가가 들어 있다. 미리 그려 넣으려면 가격을 지어내야 하고(추가 시점에는 모른다)
 * 그건 금액을 프론트가 만드는 것이다. 대신 서버 응답 뒤 목록을 무효화한다.
 *
 * 무효화 대상이 **관심 목록 키 하나**인 것이 실시간 탭의 별과 관심 종목 탭이 같이
 * 갱신되는 이유다 (`FE-REQ-010` FR-34). 두 화면이 같은 쿼리를 본다.
 */
export const useToggleWatchlist = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ToggleWatchlistTarget>({
    mutationFn: async ({ entry, request }) => {
      if (entry) return toggleWatchlistApi.remove(entry.id);
      return toggleWatchlistApi.add(request);
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: marketQueryKeys.watchlist }),
  });
};
