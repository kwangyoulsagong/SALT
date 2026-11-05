import { apiFetch, readApiError } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

import type { NotificationPrefs } from "../model/types";
import { NOTIFICATION_ENDPOINTS } from "./endpoints";

/** 도메인별 알림 설정 — 화면 모양 그대로 온다(BFF 가 모르는 도메인을 거른다) */
export const notificationApi = {
  prefs: async (signal?: AbortSignal): Promise<NotificationPrefs> => {
    const response = await apiFetch(
      `${INVESTMENTS_BASE_URL}${NOTIFICATION_ENDPOINTS.prefs}`,
      { signal },
    );
    if (!response.ok) throw await readApiError(response, "notification prefs");
    return (await response.json()) as NotificationPrefs;
  },
};
