"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch, readApiError, type ApiError } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

import {
  NOTIFICATION_ENDPOINTS,
  notificationQueryKeys,
  type NotificationDomain,
  type NotificationPrefs,
} from "@/entities/notification";

interface ToggleAlertInput {
  domain: NotificationDomain;
  enabled: boolean;
}

/** 도메인 하나 켬/끔 — `PUT /api/app/me/notifications/{domain}`. 응답은 서버가 정한 전체 설정 */
const saveAlert = async ({
  domain,
  enabled,
}: ToggleAlertInput): Promise<NotificationPrefs> => {
  const response = await apiFetch(
    `${INVESTMENTS_BASE_URL}${NOTIFICATION_ENDPOINTS.pref(domain)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    },
  );
  if (!response.ok) throw await readApiError(response, "toggle alert");
  return (await response.json()) as NotificationPrefs;
};

/** 같은 묶음 쓰기 — 차례로 보낸다(`scope`). 2026-11-06 S3a 에서 고침: 저장 중 다른 도메인 토글을 버리고 있었다(같은 원인 — 홈 배치 패널) */
const TOGGLE_ALERT_KEY = ["toggle-alert"] as const;

/**
 * 알림 켬/끔. 금액이 아닌 설정이라 **낙관적 갱신**(`fsd-features.md`) — 실패하면 되돌린다. 연달아 바꾸면 차례로 저장하고,
 * **마지막 저장의 응답만** 캐시에 넣는다(서버가 정한 전체 설정 — 중간 응답을 넣으면 뒤 토글이 잠깐 되돌아 보인다). 재시도 0회.
 */
export const useToggleAlert = () => {
  const queryClient = useQueryClient();
  const key = notificationQueryKeys.prefs();

  return useMutation<
    NotificationPrefs,
    ApiError,
    ToggleAlertInput,
    { previous: NotificationPrefs | undefined }
  >({
    mutationKey: TOGGLE_ALERT_KEY,
    scope: { id: TOGGLE_ALERT_KEY[0] },
    mutationFn: saveAlert,
    retry: 0,
    onMutate: async ({ domain, enabled }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NotificationPrefs>(key);
      if (previous) {
        queryClient.setQueryData<NotificationPrefs>(key, {
          domains: previous.domains.map((row) =>
            row.domain === domain ? { ...row, enabled } : row,
          ),
        });
      }
      return { previous };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(key, context?.previous);
    },
    onSuccess: (result) => {
      if (queryClient.isMutating({ mutationKey: TOGGLE_ALERT_KEY }) <= 1) queryClient.setQueryData(key, result);
    },
  });
};
