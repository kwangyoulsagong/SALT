import {
  assertCreatableKind,
  assertMessageCode,
  assertNoAmounts,
  type NotificationParams,
  type NotificationStore,
  type RecentNotificationQuery,
} from "../domain";

export interface PublishNotificationCommand {
  userId: string;
  kind: string;
  source: string;
  symbol: string | null;
  messageCode: string;
  params: NotificationParams;
  expiresAt: Date | null;
}

/**
 * 알림 한 건을 만든다. **세 관문을 모두 지나야 저장된다** — 종류 1종(FR-21) · 코드 형식(FR-25) ·
 * 금액 없음(FR-24). 어느 하나라도 걸리면 422 이고 행이 생기지 않는다.
 */
export class PublishNotification {
  constructor(private readonly store: NotificationStore) {}

  async execute(command: PublishNotificationCommand): Promise<void> {
    const kind = assertCreatableKind(command.kind);
    assertMessageCode(command.messageCode);
    assertNoAmounts(command.params);

    await this.store.create({ ...command, kind });
  }
}

/** 같은 원인의 알림이 `since` 뒤에 있었나. 반복 워커가 같은 알림을 쌓지 않게 한다. */
export class HasRecentNotification {
  constructor(private readonly store: NotificationStore) {}

  execute(query: RecentNotificationQuery): Promise<boolean> {
    return this.store.existsSince(query);
  }
}
