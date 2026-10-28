import type { NotificationStore, RecentNotificationQuery } from "../../domain";
import { HasRecentNotification, PublishNotification, type PublishNotificationCommand } from "../PublishNotification";
import {
  CountUnreadNotifications,
  ListNotifications,
  MarkAllNotificationsRead,
  MarkNotificationRead,
} from "../ReadNotifications";

/**
 * `notification` 의 **공개 API** — 다른 컨텍스트가 알림을 만드는 유일한 길이다.
 *
 * 전에는 `coach` 의 어댑터가 알림 테이블에 직접 썼다. 그래서 종류 · 문구 · 금액 규칙을 걸
 * 자리가 없었다(`SRV-REQ-008` FR-20~25). 이제 만드는 쪽은 이 API 만 부르고, 관문은 여기 하나다.
 */
export interface NotificationApi {
  publish(command: PublishNotificationCommand): Promise<void>;
  hasRecent(query: RecentNotificationQuery): Promise<boolean>;
}

export type { PublishNotificationCommand } from "../PublishNotification";
export type { RecentNotificationQuery } from "../../domain";

export interface NotificationDependencies {
  store: NotificationStore;
}

export interface NotificationUseCases {
  listNotifications: ListNotifications;
  countUnreadNotifications: CountUnreadNotifications;
  markNotificationRead: MarkNotificationRead;
  markAllNotificationsRead: MarkAllNotificationsRead;
}

export const createNotificationApplication = (deps: NotificationDependencies) => {
  const publish = new PublishNotification(deps.store);
  const hasRecent = new HasRecentNotification(deps.store);

  const useCases: NotificationUseCases = {
    listNotifications: new ListNotifications(deps.store),
    countUnreadNotifications: new CountUnreadNotifications(deps.store),
    markNotificationRead: new MarkNotificationRead(deps.store),
    markAllNotificationsRead: new MarkAllNotificationsRead(deps.store),
  };

  const api: NotificationApi = {
    publish: (command) => publish.execute(command),
    hasRecent: (query) => hasRecent.execute(query),
  };

  return { api, useCases };
};
