import { afterEach, describe, expect, it, vi } from "vitest";

import { PUSH_OWNER_KEY, dropBrowserPushSubscription, readPushOwner, writePushOwner } from "./pushDevice";

/** 로그아웃 · 세션 죽음 → 이 기기 브라우저 구독 뺌 · 주인 지움(`FE-REQ-078` FR-5) */
describe("pushDevice", () => {
  afterEach(() => vi.unstubAllGlobals());

  const stubStorage = () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
    });
    return store;
  };

  it("구독 빼기 · 주인 지움 — 워커 범위 /m/ 로 찾는다", async () => {
    const store = stubStorage();
    writePushOwner("u1");
    const unsubscribe = vi.fn(async () => true);
    const getRegistration = vi.fn(async () => ({ pushManager: { getSubscription: async () => ({ unsubscribe }) } }));
    vi.stubGlobal("navigator", { serviceWorker: { getRegistration } });
    await dropBrowserPushSubscription();
    expect(getRegistration).toHaveBeenCalledWith("/m/");
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(store.has(PUSH_OWNER_KEY)).toBe(false);
    expect(readPushOwner()).toBeNull();
  });

  it("워커 · 구독이 없어도 · 던져도 조용히(로그아웃을 막지 않는다)", async () => {
    stubStorage();
    vi.stubGlobal("navigator", {});
    await expect(dropBrowserPushSubscription()).resolves.toBeUndefined();
    vi.stubGlobal("navigator", { serviceWorker: { getRegistration: async () => undefined } });
    await expect(dropBrowserPushSubscription()).resolves.toBeUndefined();
    vi.stubGlobal("navigator", { serviceWorker: { getRegistration: async () => Promise.reject(new Error("x")) } });
    await expect(dropBrowserPushSubscription()).resolves.toBeUndefined();
  });
});
