import { describe, expect, it } from "vitest";

import { base64UrlToBytes, pushAvailability, pushReconcileAction, pushNavigateTarget, pushStepsFor, pushToggleOn, sameServerKey, type PushEnvironment } from "./push";

/** 웹 푸시 판정(`FE-REQ-078`) — 허용 · 거절 경계 표 */
describe("pushAvailability", () => {
  const env = (over: Partial<PushEnvironment> = {}): PushEnvironment => ({
    serverEnabled: true,
    standalone: true,
    supported: true,
    permission: "default",
    appleTouch: false,
    ...over,
  });

  it.each([
    [{ serverEnabled: false }, "off"],
    [{ serverEnabled: false, standalone: false }, "off"],
    [{ standalone: false }, "install"], // 안드로이드 브라우저 탭 — 설치 앱에서만
    [{ standalone: false, supported: false, appleTouch: true }, "install"], // iOS Safari — API 가 없어도 설치 먼저
    [{ standalone: false, supported: false }, "unsupported"],
    [{ supported: false }, "unsupported"], // 설치했는데 iOS 16.3 이하
    [{ permission: "denied" }, "denied"],
    [{ permission: "granted" }, "ready"],
    [{}, "ready"],
  ] as const)("%o → %s", (over, expected) => {
    expect(pushAvailability(env(over))).toBe(expected);
  });
});

describe("토글 — 보이는 값 · 누를 때 순서", () => {
  it("켜짐은 사람 설정 + 이 기기 구독 둘 다", () => {
    expect(pushToggleOn(true, true)).toBe(true);
    expect(pushToggleOn(true, false)).toBe(false);
    expect(pushToggleOn(false, true)).toBe(false);
  });

  it.each([
    [{ turnOn: true, domainEnabled: false, deviceSubscribed: false, otherEnabled: 0 }, ["subscribe", "enable"]],
    [{ turnOn: true, domainEnabled: true, deviceSubscribed: false, otherEnabled: 0 }, ["subscribe"]], // 데스크톱에서 켠 도메인 — 이 기기만
    [{ turnOn: true, domainEnabled: false, deviceSubscribed: true, otherEnabled: 1 }, ["enable"]],
    [{ turnOn: false, domainEnabled: true, deviceSubscribed: true, otherEnabled: 0 }, ["disable", "unsubscribe"]],
    [{ turnOn: false, domainEnabled: true, deviceSubscribed: true, otherEnabled: 1 }, ["disable"]], // 다른 도메인이 남아 구독 유지
    [{ turnOn: false, domainEnabled: true, deviceSubscribed: false, otherEnabled: 0 }, ["disable"]],
  ] as const)("%o → %o", (input, steps) => {
    expect(pushStepsFor(input)).toEqual(steps);
  });
});

describe("서버 키", () => {
  const key = "BPk_-A";
  it("base64url — 채움 없음 · 있음 · URL 글자", () => {
    expect([...base64UrlToBytes(key)]).toEqual([0x04, 0xf9, 0x3f, 0xf8]);
    expect([...base64UrlToBytes(`${key}==`)]).toEqual([0x04, 0xf9, 0x3f, 0xf8]);
  });
  it("같은 키만 같다 · 없으면 다르다", () => {
    expect(sameServerKey(base64UrlToBytes(key).buffer, key)).toBe(true);
    expect(sameServerKey(new Uint8Array([4, 249, 63]).buffer, key)).toBe(false);
    expect(sameServerKey(new Uint8Array([4, 249, 63, 0]).buffer, key)).toBe(false);
    expect(sameServerKey(null, key)).toBe(false);
  });
});

describe("pushNavigateTarget — 우리 origin 의 /m 만", () => {
  const origin = "https://salt.example";
  it.each([
    ["https://salt.example/m/goals", "https://salt.example/m/goals"],
    ["/m/household", "https://salt.example/m/household"],
    ["https://salt.example/m", "https://salt.example/m"],
    ["https://salt.example/goals", "https://salt.example/m/home"], // 데스크톱 경로
    ["https://salt.example/mx", "https://salt.example/m/home"],
    ["https://evil.example/m/goals", "https://salt.example/m/home"],
    ["javascript:alert(1)", "https://salt.example/m/home"],
    ["//evil.example/m/goals", "https://salt.example/m/home"],
    [undefined, "https://salt.example/m/home"],
    [42, "https://salt.example/m/home"],
  ])("%s → %s", (navigate, expected) => {
    expect(pushNavigateTarget(navigate, origin)).toBe(expected);
  });
});

describe("pushReconcileAction — 주인을 몰래 옮기지 않는다", () => {
  it.each([
    ["u1", "u1", "refresh"],
    ["u1", "u2", "drop"], // 다른 사람이 이 기기에 로그인
    ["u1", null, "drop"], // 로그아웃 뒤 열기
    [null, "u1", "drop"], // 주인을 모른다(옛 구독 · 저장 실패)
    [null, null, "drop"],
  ] as const)("구독 %s · 지금 %s → %s", (owner, current, action) => {
    expect(pushReconcileAction(owner, current)).toBe(action);
  });
});
