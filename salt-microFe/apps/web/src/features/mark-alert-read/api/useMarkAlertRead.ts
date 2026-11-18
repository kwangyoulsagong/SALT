"use client";

import { useMutation, useQueryClient, type InfiniteData, type QueryClient } from "@tanstack/react-query";

import { ALERTS_UNREAD_QUERY_KEY, apiFetch, readApiError, type ApiError } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

import { NOTIFICATION_ENDPOINTS, notificationQueryKeys, type AlertsVM, type AlertUnreadVM } from "@/entities/notification";

type ListCache = InfiniteData<AlertsVM, number>;

interface Snapshot {
  list: ListCache | undefined;
  unread: AlertUnreadVM | undefined;
}

/**
 * `keepalive` — 행을 누르면 곧바로 다른 zone 으로 문서 이동한다(갈 곳이 전부 도메인 화면). 문서가 바뀌어도 요청이 끝까지 가게 한다.
 * 응답은 204 — 본문을 읽지 않는다.
 */
const send = async (url: string, label: string): Promise<void> => {
  const response = await apiFetch(`${INVESTMENTS_BASE_URL}${url}`, { method: "PATCH", keepalive: true });
  if (!response.ok) throw await readApiError(response, label);
};

/** 목록 캐시 · 배지 캐시를 한 번에 바꾸고 되돌릴 사본을 준다 — 두 mutation 이 같은 순서로 쓴다 */
const applyOptimistic = async (
  queryClient: QueryClient,
  markRow: (alert: AlertsVM["alerts"][number]) => boolean,
): Promise<Snapshot> => {
  const listKey = notificationQueryKeys.alertList();
  await Promise.all([queryClient.cancelQueries({ queryKey: listKey }), queryClient.cancelQueries({ queryKey: ALERTS_UNREAD_QUERY_KEY })]);
  const snapshot: Snapshot = {
    list: queryClient.getQueryData<ListCache>(listKey),
    unread: queryClient.getQueryData<AlertUnreadVM>(ALERTS_UNREAD_QUERY_KEY),
  };
  let newlyRead = 0;
  if (snapshot.list) {
    queryClient.setQueryData<ListCache>(listKey, {
      ...snapshot.list,
      pages: snapshot.list.pages.map((page) => ({
        ...page,
        alerts: page.alerts.map((alert) => {
          if (alert.isRead || !markRow(alert)) return alert;
          newlyRead += 1;
          return { ...alert, isRead: true };
        }),
      })),
    });
  }
  // 배지는 서버 값에서 읽은 만큼만 뺀다(표시 상태 — 금액 아님). 0 아래로 내리지 않는다. 확정 값은 무효화 뒤 서버가 다시 준다
  if (snapshot.unread) {
    queryClient.setQueryData<AlertUnreadVM>(ALERTS_UNREAD_QUERY_KEY, {
      unreadCount: Math.max(0, snapshot.unread.unreadCount - newlyRead),
    });
  }
  return snapshot;
};

const restore = (queryClient: QueryClient, snapshot: Snapshot | undefined) => {
  if (!snapshot) return;
  queryClient.setQueryData(notificationQueryKeys.alertList(), snapshot.list);
  queryClient.setQueryData(ALERTS_UNREAD_QUERY_KEY, snapshot.unread);
};

/**
 * 한 건 읽음(`FE-REQ-031` FR-100) — **낙관적**(금액이 아닌 표시 상태라 예외로 허용) · 실패하면 되돌린다 · 재시도 0.
 * 끝나면 목록 · 배지 뿌리를 무효화해 서버 값으로 맞춘다(`FE-REQ-032` FR-65).
 */
export const useMarkAlertRead = () => {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string, Snapshot>({
    mutationFn: (id) => send(NOTIFICATION_ENDPOINTS.read(id), "alert read"),
    retry: 0,
    onMutate: (id) => applyOptimistic(queryClient, (alert) => alert.id === id),
    onError: (_error, _id, snapshot) => restore(queryClient, snapshot),
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationQueryKeys.alerts() }),
  });
};

/** 모두 읽음(`FE-REQ-031` FR-101) — 낙관적 + 실패 시 되돌림. 성공하면 배지 0(서버 값으로 다시 확인) */
export const useMarkAllAlertsRead = () => {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, void, Snapshot>({
    mutationFn: () => send(NOTIFICATION_ENDPOINTS.readAll, "alerts read all"),
    retry: 0,
    onMutate: () => applyOptimistic(queryClient, () => true),
    onError: (_error, _input, snapshot) => restore(queryClient, snapshot),
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationQueryKeys.alerts() }),
  });
};
