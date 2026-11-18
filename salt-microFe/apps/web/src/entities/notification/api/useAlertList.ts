"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { useHasSession } from "@repo/web-shared/api";

import type { AlertsVM } from "../model/alerts";
import { notificationApi } from "./notificationApi";
import { notificationQueryKeys } from "./queryKeys";

/** 목록은 들어올 때 서버가 준 첫 쪽이 최신이다 — 그 뒤 다시 받지 않는다(읽음 mutation 이 무효화할 때만) */
const ALERT_LIST_STALE_MS = 60_000;

/**
 * 알림 목록(`FE-REQ-032` FR-64) — 첫 쪽은 서버 컴포넌트가 준 `initial`, 다음 쪽부터 브라우저. 쪽 번호는 BFF `nextPage`(서버 total 기준).
 * 첫 쪽을 서버가 못 받았으면(`initial` null) 브라우저가 1쪽부터 부른다.
 */
export const useAlertList = (initial: AlertsVM | null) =>
  useInfiniteQuery({
    queryKey: notificationQueryKeys.alertList(),
    queryFn: ({ pageParam, signal }) => notificationApi.alerts(pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage ?? undefined,
    initialData: initial ? { pages: [initial], pageParams: [1] } : undefined,
    // 로그인하지 않았으면 부르지 않는다 — 실패가 아니라 상태다
    enabled: useHasSession() === true,
    staleTime: ALERT_LIST_STALE_MS,
    refetchOnWindowFocus: false,
  });
