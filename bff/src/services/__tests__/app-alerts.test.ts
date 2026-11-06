import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appAlertsService, toNotificationPrefs } from "../app-alerts.service";
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
    assert.deepEqual(await appAlertsService.getAlerts("t"), { alerts: [], unreadCount: 2 });
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
});
