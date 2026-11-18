import { apiFetch, readApiError } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

import type { AlertsVM } from "../model/alerts";
import type { NotificationPrefs } from "../model/types";
import { NOTIFICATION_ENDPOINTS } from "./endpoints";

/** 도메인별 알림 설정 · 알림 목록 — 화면 모양 그대로 온다(BFF 가 모르는 도메인 · 종류를 거른다) */
export const notificationApi = {
  prefs: async (signal?: AbortSignal): Promise<NotificationPrefs> => {
    const response = await apiFetch(
      `${INVESTMENTS_BASE_URL}${NOTIFICATION_ENDPOINTS.prefs}`,
      { signal },
    );
    if (!response.ok) throw await readApiError(response, "notification prefs");
    return (await response.json()) as NotificationPrefs;
  },
  /** 알림 한 쪽(1부터) — 첫 쪽은 화면 서버 컴포넌트가 따로 부르고, 이것은 다음 쪽부터(`FE-REQ-032` FR-64) */
  alerts: async (page: number, signal?: AbortSignal): Promise<AlertsVM> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}${NOTIFICATION_ENDPOINTS.alerts(page)}`, { signal });
    if (!response.ok) throw await readApiError(response, "alerts");
    return (await response.json()) as AlertsVM;
  },
};
