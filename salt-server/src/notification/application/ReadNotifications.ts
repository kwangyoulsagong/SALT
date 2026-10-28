import {
  NOTIFICATION_KINDS,
  type NotificationItem,
  type NotificationStore,
} from "../domain";

/**
 * 목록 · 안 읽은 수 · 읽음 · 모두 읽음. **전부 1종(`NOTIFICATION_KINDS`)만 본다** — 안 읽은 수가
 * 목록에 보이는 것과 같아야 한다(`DB-REQ-022` FR-83). 옛 종류 행은 남아 있어도 세지 않고
 * 바꾸지도 않는다.
 */
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export interface NotificationPage {
  page: number;
  size: number;
  total: number;
  items: NotificationItem[];
}

const toPositiveInt = (value: number | undefined, fallback: number): number =>
  value !== undefined && Number.isInteger(value) && value > 0 ? value : fallback;

export class ListNotifications {
  constructor(private readonly store: NotificationStore) {}

  async execute(
    userId: string,
    paging: { page?: number; size?: number } = {}
  ): Promise<NotificationPage> {
    const page = toPositiveInt(paging.page, 1);
    const size = Math.min(toPositiveInt(paging.size, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const { items, total } = await this.store.list(userId, NOTIFICATION_KINDS, {
      skip: (page - 1) * size,
      take: size,
    });
    return { page, size, total, items };
  }
}

export class CountUnreadNotifications {
  constructor(private readonly store: NotificationStore) {}

  execute(userId: string): Promise<number> {
    return this.store.countUnread(userId, NOTIFICATION_KINDS);
  }
}

export class MarkNotificationRead {
  constructor(private readonly store: NotificationStore) {}

  execute(userId: string, id: string): Promise<void> {
    return this.store.markRead(userId, id, NOTIFICATION_KINDS);
  }
}

export class MarkAllNotificationsRead {
  constructor(private readonly store: NotificationStore) {}

  execute(userId: string): Promise<void> {
    return this.store.markAllRead(userId, NOTIFICATION_KINDS);
  }
}
