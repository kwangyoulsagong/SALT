/**
 * 휴대폰 웹 푸시 판정(`FE-REQ-078`, F019 순서 4 — `ADR-012` 푸시 행). 플랫폼 무관 — 브라우저 API 를 부르지 않고, 부르는 쪽이 사실을 넘긴다.
 *
 * - **설치한 앱(standalone) 안에서만 켤 수 있다** — iOS 는 홈 화면 웹앱만 푸시를 받고, 다른 브라우저도 같은 선으로 맞춘다(`FEATURE-019` FR-12)
 * - 권한 요청은 사용자가 누른 처리기 안에서만(iOS 규칙) — 판정 `ready` 일 때 토글을 누르면 그때 묻는다
 * - 도메인별 켬/끔은 사람 하나에 한 벌(서버 `notification_pref` — 데스크톱 설정과 같은 값). 이 기기가 울리는지는 구독이 정한다
 */

/** 이 기기에서 알림 칸이 할 수 있는 일 */
export type PushAvailability =
  /** 서버 푸시가 꺼져 있다 — 칸을 그리지 않는다 */
  | "off"
  /** 이 브라우저엔 푸시가 없다 */
  | "unsupported"
  /** 홈 화면에 추가한 앱에서만 켤 수 있다 */
  | "install"
  /** 기기 설정에서 막았다 — 앱이 다시 물을 수 없다 */
  | "denied"
  | "ready";

export interface PushEnvironment {
  readonly serverEnabled: boolean;
  readonly standalone: boolean;
  /** `PushManager` · `Notification` · 서비스 워커가 다 있다 */
  readonly supported: boolean;
  readonly permission: "default" | "granted" | "denied";
  /** iOS · iPadOS — 설치 전엔 푸시 API 자체가 없다(그래서 "지원 안 함"이 아니라 "설치 먼저") */
  readonly appleTouch: boolean;
}

export const pushAvailability = (env: PushEnvironment): PushAvailability => {
  if (!env.serverEnabled) return "off";
  if (!env.standalone) return env.supported || env.appleTouch ? "install" : "unsupported";
  if (!env.supported) return "unsupported";
  if (env.permission === "denied") return "denied";
  return "ready";
};

/** 토글 하나의 보이는 값 — 사람 설정이 켜졌고 **이 기기도** 구독돼 있어야 켜짐(켜짐으로 보이는데 울리지 않는 일이 없게) */
export const pushToggleOn = (domainEnabled: boolean, deviceSubscribed: boolean): boolean => domainEnabled && deviceSubscribed;

/**
 * 토글을 눌렀을 때 할 일 — 순서가 중요하다: 켤 때는 구독을 먼저(권한 거절이면 설정을 켜지 않는다), 끌 때는 설정을 먼저.
 * 마지막으로 켜진 도메인을 끄면 이 기기 구독도 뺀다(받을 것이 없는 구독을 남기지 않는다).
 */
export type PushStep = "subscribe" | "enable" | "disable" | "unsubscribe";

export const pushStepsFor = (input: {
  readonly turnOn: boolean;
  readonly domainEnabled: boolean;
  readonly deviceSubscribed: boolean;
  /** 이 도메인 말고 켜진 도메인 수 */
  readonly otherEnabled: number;
}): PushStep[] => {
  if (input.turnOn) {
    return [...(input.deviceSubscribed ? [] : (["subscribe"] as const)), ...(input.domainEnabled ? [] : (["enable"] as const))];
  }
  return [...(input.domainEnabled ? (["disable"] as const) : []), ...(input.otherEnabled === 0 && input.deviceSubscribed ? (["unsubscribe"] as const) : [])];
};

/**
 * 앱이 열릴 때 대조에서 할 일(`FE-REQ-078` FR-5) — 구독한 사람(이 기기에 적어 둔 id)과 지금 세션 사람이 같을 때만 서버에 다시 넣는다.
 * 로그아웃(지금 사람 없음) · 다른 사람 · 주인 모름이면 브라우저 구독을 뺀다 — 서버가 주인을 몰래 옮기지 않게
 */
export const pushReconcileAction = (owner: string | null, current: string | null): "refresh" | "drop" =>
  owner !== null && owner === current ? "refresh" : "drop";

/** base64url(채움 없음 · 있음 둘 다) → 바이트 — `applicationServerKey` 로 넘긴다 */
export const base64UrlToBytes = (value: string): Uint8Array<ArrayBuffer> => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

/** 구독이 만들어진 서버 키가 지금 서버 키와 같은가 — 키를 바꾸면 옛 구독은 403 이라 다시 구독한다 */
export const sameServerKey = (subscriptionKey: ArrayBuffer | null | undefined, serverKey: string): boolean => {
  if (!subscriptionKey) return false;
  const a = new Uint8Array(subscriptionKey);
  const b = base64UrlToBytes(serverKey);
  return a.length === b.length && a.every((byte, i) => byte === b[i]);
};

/**
 * 알림을 누르면 열 주소 — 우리 origin 의 `/m/…` 만, 그 밖이면 `/m/home`. 서비스 워커가 같은 규칙을 쓴다(`serviceWorkerSource`).
 * 푸시 본문은 서버가 만들지만 브라우저가 받은 값이라 그대로 열지 않는다.
 */
export const pushNavigateTarget = (navigate: unknown, origin: string): string => {
  const fallback = `${origin}/m/home`;
  if (typeof navigate !== "string") return fallback;
  try {
    const url = new URL(navigate, origin);
    return url.origin === origin && (url.pathname === "/m" || url.pathname.startsWith("/m/")) ? url.href : fallback;
  } catch {
    return fallback;
  }
};
