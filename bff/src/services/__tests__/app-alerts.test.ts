import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appAlertsService, toNotificationPrefs, toPushConfig, toPushSubscriptionBody } from "../app-alerts.service";
import { backendApi } from "../backend-api.service";

/** 알림 · 알림 설정 계약 (`BFF-REQ-046` FR-8 · `SRV-REQ-048` FR-5) — 경로는 Kotlin notification, 설정 순서 · 목록은 서버 것 */
describe("AppAlertsService", () => {
  afterEach(() => mock.restoreAll());

  it("알림 — /notifications 두 곳만 부른다 · 옛 /investment-notifications 0", async () => {
    const seen: string[] = [];
    mock.method(backendApi, "proxyAuthRequest", async (m: string, url: string) => {
      seen.push(`${m} ${url}`);
      return (url.endsWith("unread-count") ? { data: { data: { unreadCount: 2 } } } : { data: { data: { items: [] } } }) as never;
    });
    assert.deepEqual(await appAlertsService.getAlerts("t"), { alerts: [], unreadCount: 2, nextPage: null });
    assert.deepEqual(seen.sort(), ["GET /notifications/unread-count", "GET /notifications?page=1&size=20"]);
  });

  it("설정 — 서버 순서 그대로 · 모르는 도메인 · 틀린 값은 버리거나 꺼짐으로", () => {
    assert.deepEqual(
      toNotificationPrefs({ domains: [{ domain: "invest", enabled: false }, { domain: "savings", enabled: true }, { domain: "tips", enabled: true }, { domain: "household", enabled: "yes" }] }),
      { domains: [{ domain: "invest", enabled: false }, { domain: "savings", enabled: true }, { domain: "household", enabled: false }] },
    );
    assert.deepEqual(toNotificationPrefs(null), { domains: [] });
  });

  it("켬/끔 — 도메인을 인코딩해 PUT · 값은 거르지 않고 서버에 맡긴다(400 은 서버가)", async () => {
    let call: unknown[] = [];
    mock.method(backendApi, "proxyAuthRequest", async (...args: unknown[]) => {
      call = args;
      return { data: { data: { domains: [{ domain: "savings", enabled: true }] } } } as never;
    });
    const vm = await appAlertsService.setPref("t", "sa/vings", true);
    assert.deepEqual(call.slice(0, 4), ["PUT", "/notifications/prefs/sa%2Fvings", "t", { enabled: true }]);
    assert.deepEqual(vm, { domains: [{ domain: "savings", enabled: true }] });
  });

  it("쪽 번호를 서버에 그대로 · 다음 쪽은 서버 total 로", async () => {
    const seen: string[] = [];
    mock.method(backendApi, "proxyAuthRequest", async (m: string, url: string) => {
      seen.push(`${m} ${url}`);
      return (url.endsWith("unread-count") ? { data: { data: { unreadCount: 0 } } } : { data: { data: { page: 2, size: 20, total: 45, items: [] } } }) as never;
    });
    assert.equal((await appAlertsService.getAlerts("t", 2)).nextPage, 3);
    assert.ok(seen.includes("GET /notifications?page=2&size=20"));
  });

  it("안 읽은 수 · 읽음 · 모두 읽음 — 서버 경로 1:1 · id 인코딩 · 숫자가 아니면 0", async () => {
    const seen: string[] = [];
    mock.method(backendApi, "proxyAuthRequest", async (m: string, url: string) => {
      seen.push(`${m} ${url}`);
      return { data: { data: { unreadCount: "3" } } } as never;
    });
    assert.deepEqual(await appAlertsService.getUnreadCount("t"), { unreadCount: 0 });
    await appAlertsService.markRead("t", "a/b");
    await appAlertsService.markAllRead("t");
    assert.deepEqual(seen, ["GET /notifications/unread-count", "PATCH /notifications/a%2Fb/read", "PATCH /notifications/read-all"]);
  });

  it("웹 푸시 설정(BFF-REQ-056) — 켜짐은 공개키 문자열이 있을 때만 · 꺼지면 키 null", () => {
    assert.deepEqual(toPushConfig({ enabled: true, publicKey: "BPk" }), { enabled: true, publicKey: "BPk" });
    assert.deepEqual(toPushConfig({ enabled: true, publicKey: "" }), { enabled: false, publicKey: null });
    assert.deepEqual(toPushConfig({ enabled: true, publicKey: 3 }), { enabled: false, publicKey: null });
    assert.deepEqual(toPushConfig({ enabled: false, publicKey: "BPk" }), { enabled: false, publicKey: null });
    assert.deepEqual(toPushConfig({ enabled: "true", publicKey: "BPk" }), { enabled: false, publicKey: null });
    assert.deepEqual(toPushConfig(null), { enabled: false, publicKey: null });
  });

  it("구독 본문 — 서버가 쓰는 세 칸만 · 나머지 버림 · 값 판정은 서버", () => {
    assert.deepEqual(
      toPushSubscriptionBody({ endpoint: "https://fcm.googleapis.com/x", expirationTime: null, keys: { p256dh: "k", auth: "a", extra: 1 }, userId: "other" }),
      { endpoint: "https://fcm.googleapis.com/x", keys: { p256dh: "k", auth: "a" } },
    );
    assert.deepEqual(toPushSubscriptionBody(null), { endpoint: undefined, keys: { p256dh: undefined, auth: undefined } });
  });

  it("구독 넣기 · 빼기 · 설정 — 서버 경로 1:1", async () => {
    const seen: unknown[][] = [];
    mock.method(backendApi, "proxyAuthRequest", async (...args: unknown[]) => {
      seen.push(args.slice(0, 4));
      return { data: { data: { enabled: true, publicKey: "BPk" } } } as never;
    });
    assert.deepEqual(await appAlertsService.getPushConfig("t"), { enabled: true, publicKey: "BPk" });
    await appAlertsService.savePushSubscription("t", { endpoint: "e", keys: { p256dh: "k", auth: "a" } });
    await appAlertsService.removePushSubscription("t", "e");
    assert.deepEqual(seen, [
      ["GET", "/notifications/push/config", "t"],
      ["PUT", "/notifications/push/subscription", "t", { endpoint: "e", keys: { p256dh: "k", auth: "a" } }],
      ["DELETE", "/notifications/push/subscription", "t", { endpoint: "e" }],
    ]);
  });
});
