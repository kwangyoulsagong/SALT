/**
 * 웹 푸시 브라우저 쪽(`FE-REQ-078` FR-2 · FR-4) — 브라우저에서만 부른다(효과 · 누름 처리기 안). 판정은 `@repo/core/mobile` `push`.
 * BFF `/api/app/me/push`(`BFF-REQ-056`) · `/api/app/me/notifications`(도메인별 켬/끔 — 데스크톱 설정과 같은 값).
 */
import { MOBILE_PATHS, base64UrlToBytes, sameServerKey, type PushEnvironment } from "@repo/core/mobile";

import { apiFetch, readApiError } from "../../api";
import { INVESTMENTS_BASE_URL } from "../../config";

import { isAppleTouch, isStandalone } from "./installPrompt";

export interface PushConfig {
  enabled: boolean;
  publicKey: string | null;
}

export interface PushDomainPref {
  domain: string;
  enabled: boolean;
}

const BASE = `${INVESTMENTS_BASE_URL}/api/app/me`;
const JSON_HEADERS = { "Content-Type": "application/json" };

export const readPushConfig = async (signal?: AbortSignal): Promise<PushConfig> => {
  const response = await apiFetch(`${BASE}/push`, { signal });
  if (!response.ok) throw await readApiError(response, "push config");
  return (await response.json()) as PushConfig;
};

export const readPushPrefs = async (signal?: AbortSignal): Promise<PushDomainPref[]> => {
  const response = await apiFetch(`${BASE}/notifications`, { signal });
  if (!response.ok) throw await readApiError(response, "notification prefs");
  return ((await response.json()) as { domains: PushDomainPref[] }).domains;
};

export const savePushPref = async (domain: string, enabled: boolean): Promise<PushDomainPref[]> => {
  const response = await apiFetch(`${BASE}/notifications/${encodeURIComponent(domain)}`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify({ enabled }),
  });
  if (!response.ok) throw await readApiError(response, "notification pref");
  return ((await response.json()) as { domains: PushDomainPref[] }).domains;
};

const sendSubscription = async (subscription: PushSubscription): Promise<void> => {
  const response = await apiFetch(`${BASE}/push/subscription`, { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify(subscription.toJSON()) });
  if (!response.ok) throw await readApiError(response, "push subscribe");
};

const dropSubscription = async (endpoint: string): Promise<void> => {
  const response = await apiFetch(`${BASE}/push/subscription`, { method: "DELETE", headers: JSON_HEADERS, body: JSON.stringify({ endpoint }) });
  if (!response.ok) throw await readApiError(response, "push unsubscribe");
};

export const pushEnvironment = (serverEnabled: boolean): PushEnvironment => {
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  return {
    serverEnabled,
    standalone: isStandalone(),
    supported,
    permission: supported ? Notification.permission : "default",
    appleTouch: isAppleTouch(),
  };
};

/** `/m` 범위 워커 — 등록은 `RegisterServiceWorker` 가 한다. 없으면(개발 · 등록 실패) null */
const registration = async (): Promise<ServiceWorkerRegistration | null> =>
  (await navigator.serviceWorker.getRegistration(MOBILE_PATHS.scope)) ?? null;

export const currentSubscription = async (): Promise<PushSubscription | null> => (await registration())?.pushManager.getSubscription() ?? null;

/**
 * 이 기기 구독 — **누름 처리기 안에서** 부른다(iOS 는 권한 요청이 사용자 동작 안이어야 한다). 권한이 거절되면 false.
 * 서버 키가 바뀐 옛 구독은 빼고 새로(옛 것은 403 이다).
 */
export const subscribeDevice = async (publicKey: string): Promise<boolean> => {
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return false;
  const reg = await registration();
  if (!reg) return false;
  const existing = await reg.pushManager.getSubscription();
  if (existing && !sameServerKey(existing.options.applicationServerKey, publicKey)) await existing.unsubscribe();
  const subscription =
    existing && sameServerKey(existing.options.applicationServerKey, publicKey)
      ? existing
      : await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) });
  await sendSubscription(subscription);
  return true;
};

/** 이 기기 구독 빼기 — 서버 행 먼저(실패해도 브라우저 구독은 뺀다: 받을 것이 없는 구독을 남기지 않는다) */
export const unsubscribeDevice = async (): Promise<void> => {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await dropSubscription(subscription.endpoint).catch(() => undefined);
  await subscription.unsubscribe();
};

/**
 * 앱이 열릴 때 대조(FR-4) — `pushsubscriptionchange` 에 기대지 않는다. 설치 앱 · 권한 있음 · 구독 있음일 때만 서버에 다시 넣는다
 * (같은 주소면 행 하나 · 다른 사람이 로그인했으면 주인이 바뀐다). 서버 키가 바뀌었으면 다시 구독. 실패는 조용히 — 다음에 열 때 다시
 */
export const reconcilePush = async (): Promise<void> => {
  const env = pushEnvironment(true);
  if (!env.standalone || !env.supported || env.permission !== "granted") return;
  const subscription = await currentSubscription();
  if (!subscription) return;
  const config = await readPushConfig();
  if (!config.enabled || !config.publicKey) return;
  if (sameServerKey(subscription.options.applicationServerKey, config.publicKey)) await sendSubscription(subscription);
  else await subscribeDevice(config.publicKey);
};
