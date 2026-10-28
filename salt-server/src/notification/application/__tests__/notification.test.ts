import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  NotificationAmountError,
  NotificationMessageCodeError,
  UnsupportedNotificationKindError,
  type NotificationDraft,
  type NotificationKind,
  type NotificationStore,
} from "../../domain";
import { createNotificationApplication, type PublishNotificationCommand } from "../api";

/**
 * 알림 1종 · 코드만 · 금액 없음 (`SRV-REQ-008` FR-20~25). DB 없이 관문과 범위를 잰다.
 */

const fakeStore = () => {
  const created: NotificationDraft[] = [];
  const kindsSeen: (readonly NotificationKind[])[] = [];
  const store: NotificationStore = {
    create: async (draft) => {
      created.push(draft);
    },
    existsSince: async () => false,
    list: async (_userId, kinds) => {
      kindsSeen.push(kinds);
      return { items: [], total: 0 };
    },
    countUnread: async (_userId, kinds) => {
      kindsSeen.push(kinds);
      return 0;
    },
    markRead: async (_userId, _id, kinds) => {
      kindsSeen.push(kinds);
    },
    markAllRead: async (_userId, kinds) => {
      kindsSeen.push(kinds);
    },
  };
  return { store, created, kindsSeen };
};

const command = (overrides: Partial<PublishNotificationCommand> = {}): PublishNotificationCommand => ({
  userId: "u1",
  kind: "signal_update",
  source: "ai_coach",
  symbol: "BTC",
  messageCode: "coach.decision_changed",
  params: { symbol: "BTC", mode: "swing", previousAction: "HOLD", nextAction: "WATCH" },
  expiresAt: null,
  ...overrides,
});

describe("notification — 생성 관문", () => {
  it("signal_update 는 저장된다", async () => {
    const { store, created } = fakeStore();
    await createNotificationApplication({ store }).api.publish(command());
    assert.equal(created.length, 1);
    assert.equal(created[0].kind, "signal_update");
  });

  for (const kind of ["decision_change", "tax_deadline", "sentiment", "smart_money"]) {
    it(`${kind} 는 거부되고 행이 생기지 않는다`, async () => {
      const { store, created } = fakeStore();
      await assert.rejects(
        createNotificationApplication({ store }).api.publish(command({ kind })),
        UnsupportedNotificationKindError
      );
      assert.equal(created.length, 0);
    });
  }

  it("완성 문장은 messageCode 가 될 수 없다", async () => {
    const { store, created } = fakeStore();
    for (const messageCode of ["BTC 판단이 바뀌었습니다", "", "coach", "Coach.Changed"]) {
      await assert.rejects(
        createNotificationApplication({ store }).api.publish(command({ messageCode })),
        NotificationMessageCodeError
      );
    }
    assert.equal(created.length, 0);
  });

  it("금액 이름의 키 · 숫자 값은 거부된다", async () => {
    const { store, created } = fakeStore();
    const cases = [
      { symbol: "BTC", currentPrice: "x" },
      { symbol: "BTC", totalKrw: "x" },
      { symbol: "BTC", note: "158000000" },
      { symbol: "BTC", note: "1,234.5" },
      { symbol: "BTC", note: "-3.2%" },
    ];
    for (const params of cases) {
      await assert.rejects(
        createNotificationApplication({ store }).api.publish(command({ params })),
        NotificationAmountError
      );
    }
    assert.equal(created.length, 0);
  });
});

describe("notification — 읽기는 1종만", () => {
  it("목록 · 안 읽은 수 · 읽음 · 모두 읽음이 전부 signal_update 로 좁힌다", async () => {
    const { store, kindsSeen } = fakeStore();
    const { useCases } = createNotificationApplication({ store });
    await useCases.listNotifications.execute("u1");
    await useCases.countUnreadNotifications.execute("u1");
    await useCases.markNotificationRead.execute("u1", "n1");
    await useCases.markAllNotificationsRead.execute("u1");
    assert.equal(kindsSeen.length, 4);
    for (const kinds of kindsSeen) assert.deepEqual([...kinds], ["signal_update"]);
  });

  it("페이지 기본 20 · 상한 50 · 잘못된 값은 기본값", async () => {
    const { store } = fakeStore();
    const { useCases } = createNotificationApplication({ store });
    assert.deepEqual(
      { ...(await useCases.listNotifications.execute("u1")), items: undefined },
      { page: 1, size: 20, total: 0, items: undefined }
    );
    assert.equal((await useCases.listNotifications.execute("u1", { size: 500 })).size, 50);
    assert.equal((await useCases.listNotifications.execute("u1", { page: 0 })).page, 1);
  });
});
