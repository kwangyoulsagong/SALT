import vm from "node:vm";

import { describe, expect, it } from "vitest";

import { pushNavigateTarget } from "@repo/core/mobile";

import { serviceWorkerSource } from "./routes";

/**
 * 서비스 워커 웹 푸시(`FE-REQ-078` FR-3) — 문자열 코드라 빌드가 못 잡는다. 가짜 `self` 위에서 실제로 돌려 본다.
 * 누르면 열 주소 규칙은 `@repo/core/mobile` `pushNavigateTarget` 과 같아야 한다(같은 표로 대조).
 */
const ORIGIN = "https://salt.example";

const boot = () => {
  const listeners: Record<string, (event: unknown) => void> = {};
  const shown: { title: string; options: { body: string; data: { navigate: string } } }[] = [];
  const opened: string[] = [];
  const navigated: string[] = [];
  const windows: { url: string; navigate: (u: string) => Promise<unknown>; focus: () => Promise<void> }[] = [];
  const self = {
    location: new URL(`${ORIGIN}/m/sw.js`),
    addEventListener: (type: string, fn: (event: unknown) => void) => {
      listeners[type] = fn;
    },
    registration: {
      showNotification: async (title: string, options: { body: string; data: { navigate: string } }) => {
        shown.push({ title, options });
      },
    },
    clients: {
      matchAll: async () => windows,
      openWindow: async (url: string) => {
        opened.push(url);
      },
      claim: async () => undefined,
    },
    skipWaiting: async () => undefined,
  };
  vm.runInNewContext(serviceWorkerSource("test"), { self, caches: {}, fetch: () => undefined, URL });
  const fire = async (type: string, event: Record<string, unknown>) => {
    const waits: Promise<unknown>[] = [];
    listeners[type]!({ ...event, waitUntil: (p: Promise<unknown>) => waits.push(p) });
    await Promise.all(waits);
  };
  const addWindow = (url: string) =>
    windows.push({
      url,
      navigate: async (u: string) => {
        navigated.push(u);
        return null;
      },
      focus: async () => undefined,
    });
  return { fire, shown, opened, navigated, addWindow };
};

const pushEvent = (body: unknown) => ({ data: { json: () => (typeof body === "string" ? JSON.parse(body) : body) } });

describe("서비스 워커 — push", () => {
  it("Declarative 모양을 읽어 알림 하나 · 주소는 /m 만", async () => {
    const sw = boot();
    await sw.fire("push", pushEvent({ web_push: 8030, notification: { title: "저축 목표에 닿았어요", body: "앱에서", navigate: `${ORIGIN}/m/goals` } }));
    expect(sw.shown).toHaveLength(1);
    expect(sw.shown[0]!.title).toBe("저축 목표에 닿았어요");
    expect(sw.shown[0]!.options.data.navigate).toBe(`${ORIGIN}/m/goals`);
  });

  it("브라우저가 이미 띄울 알림을 들고 오면(Declarative) 다시 띄우지 않는다", async () => {
    const sw = boot();
    await sw.fire("push", { ...pushEvent({ notification: { title: "a" } }), notification: { title: "a" } });
    expect(sw.shown).toHaveLength(0);
  });

  it("본문이 깨져도 알림 하나는 띄운다(조용한 푸시 0)", async () => {
    const sw = boot();
    await sw.fire("push", { data: { json: () => JSON.parse("{") } });
    await sw.fire("push", { data: null });
    expect(sw.shown.map((n) => [n.title, n.options.data.navigate])).toEqual([
      ["SALT", `${ORIGIN}/m/home`],
      ["SALT", `${ORIGIN}/m/home`],
    ]);
  });
});

describe("서비스 워커 — notificationclick", () => {
  const note = (navigate: unknown) => ({ notification: { close: () => undefined, data: { navigate } } });

  it("열린 /m 창이 있으면 그 창을 옮기고, 없으면 새 창", async () => {
    const sw = boot();
    await sw.fire("notificationclick", note(`${ORIGIN}/m/household`));
    expect(sw.opened).toEqual([`${ORIGIN}/m/household`]);

    sw.addWindow(`${ORIGIN}/m/home`);
    await sw.fire("notificationclick", note(`${ORIGIN}/m/goals`));
    expect(sw.navigated).toEqual([`${ORIGIN}/m/goals`]);
  });

  it.each([
    `${ORIGIN}/m/goals`,
    "/m/household",
    `${ORIGIN}/goals`,
    "https://evil.example/m/goals",
    "javascript:alert(1)",
    "//evil.example/m/x",
    undefined,
  ])("주소 규칙이 core 와 같다 — %s", async (navigate) => {
    const sw = boot();
    await sw.fire("notificationclick", note(navigate));
    expect(sw.opened).toEqual([pushNavigateTarget(navigate, ORIGIN)]);
  });
});
