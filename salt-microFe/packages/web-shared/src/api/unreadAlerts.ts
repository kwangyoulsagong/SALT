"use client";

import { useQuery } from "@tanstack/react-query";

import type { AlertUnreadVM } from "@repo/core/alerts";

import { INVESTMENTS_BASE_URL } from "../config";
import { apiFetch } from "./apiFetch";
import { readApiError } from "./apiError";
import { useHasSession } from "./useHasSession";

/**
 * 알림 쿼리 키 뿌리 — 머리 벨(모든 zone 공용 레이아웃)과 셸 알림 화면(`entities/notification`)이 같이 쓴다.
 * 읽음 · 모두 읽음 mutation 은 이 뿌리를 무효화해 목록과 배지를 함께 갱신한다(`FE-REQ-032` FR-65).
 * 벨이 shared(레이아웃)에 있어 키도 여기다 — 엔티티는 shared 를 볼 수 있지만 반대는 안 된다.
 */
export const ALERTS_QUERY_ROOT = ["notification", "alerts"] as const;
export const ALERTS_UNREAD_QUERY_KEY = [...ALERTS_QUERY_ROOT, "unread"] as const;

export const fetchUnreadAlerts = async (signal?: AbortSignal): Promise<AlertUnreadVM> => {
  const response = await apiFetch(`${INVESTMENTS_BASE_URL}/api/app/alerts/unread-count`, { signal });
  if (!response.ok) throw await readApiError(response, "alerts unread");
  return (await response.json()) as AlertUnreadVM;
};

/**
 * 벨 배지 안 읽은 수(`FE-REQ-032` FR-65 · `FE-REQ-031` FR-72) — `staleTime: 0` · **폴링 0**.
 * 다시 부르는 때: 화면(문서)이 바뀔 때 — zone 을 넘는 탭 이동은 문서 이동이라 새로 부른다 — 와 읽음 mutation 성공(무효화).
 * 창 포커스 재요청은 끈다(폴링과 같은 효과라서). 로그인하지 않았으면 부르지 않는다.
 */
export const useUnreadAlertCount = () =>
  useQuery({
    queryKey: ALERTS_UNREAD_QUERY_KEY,
    queryFn: ({ signal }) => fetchUnreadAlerts(signal),
    enabled: useHasSession() === true,
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
    select: (data) => data.unreadCount,
  });
