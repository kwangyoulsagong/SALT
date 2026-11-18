import { ALERTS_QUERY_ROOT } from "@repo/web-shared/api";

export const notificationQueryKeys = {
  all: ["notification"] as const,
  prefs: () => [...notificationQueryKeys.all, "prefs"] as const,
  /** 알림 목록 · 안 읽은 수는 뿌리가 shared(머리 벨이 shared 라서) — 무효화는 `ALERTS_QUERY_ROOT` 하나로 둘 다 */
  alerts: () => ALERTS_QUERY_ROOT,
  alertList: () => [...ALERTS_QUERY_ROOT, "list"] as const,
} as const;
