import type { NotificationDraft, NotificationItem } from "./Notification";
import type { NotificationKind } from "./NotificationKind";

/** 같은 원인의 최근 알림을 찾는 조건 — 반복 워커의 중복 억제. */
export interface RecentNotificationQuery {
  userId: string;
  source: string;
  symbol: string | null;
  messageCode: string;
  since: Date;
}

/**
 * 알림 영속화. **조회 · 갱신은 넘겨받은 종류로만 좁힌다** — 옛 종류 행을 건드리지 않는다.
 */
export interface NotificationStore {
  create(draft: NotificationDraft): Promise<void>;
  existsSince(query: RecentNotificationQuery): Promise<boolean>;
  list(
    userId: string,
    kinds: readonly NotificationKind[],
    page: { skip: number; take: number }
  ): Promise<{ items: NotificationItem[]; total: number }>;
  countUnread(userId: string, kinds: readonly NotificationKind[]): Promise<number>;
  markRead(userId: string, id: string, kinds: readonly NotificationKind[]): Promise<void>;
  markAllRead(userId: string, kinds: readonly NotificationKind[]): Promise<void>;
}
