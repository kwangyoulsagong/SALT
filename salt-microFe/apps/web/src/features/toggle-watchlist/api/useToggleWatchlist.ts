"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  AddWatchlistRequest,
  marketQueryKeys,
  WatchlistItem,
} from "@/entities/market";

import { isApiError } from "@/shared/api";

import { toggleWatchlistApi } from "./toggleWatchlistApi";

/** 서버 추적 상한 거부 코드(`SRV-REQ-008` FR-82) — 화면은 이 코드로 문구를 고른다 */
export const TRACKED_ASSET_LIMIT_CODE = "TRACKED_ASSET_LIMIT";

/** 상한 409 인가 — 이때는 토스트 대신 인라인 안내다(`FE-REQ-011` FR-5 · `FE-REQ-010` FR-75) */
export const isTrackedLimitError = (error: unknown): boolean =>
  isApiError(error) && error.status === 409 && error.code === TRACKED_ASSET_LIMIT_CODE;

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
 *
 * 검색 결과도 같이 무효화한다 — 결과 행의 `isTracked` · 카운터가 서버 값이라 다시 받아야 맞는다(`FE-REQ-011` FR-6).
 * 카운터는 응답 · 무효화 뒤에만 바뀐다. 프론트가 세지 않는다(FR-5)
 */
export const useToggleWatchlist = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ToggleWatchlistTarget>({
    mutationFn: async ({ entry, request }) => {
      if (entry) return toggleWatchlistApi.remove(entry.id);
      return toggleWatchlistApi.add(request);
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: marketQueryKeys.watchlist }),
        queryClient.invalidateQueries({ queryKey: marketQueryKeys.search }),
      ]),
  });
};
