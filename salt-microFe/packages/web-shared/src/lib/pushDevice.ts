/**
 * 이 기기 푸시 구독의 주인(`FE-REQ-078` FR-5) — 브라우저에서만 부른다.
 *
 * 구독은 브라우저 하나에 하나고 로그인과 상관없이 산다. 그래서
 * - 로그아웃 · 세션 죽음(`clearSession`)이면 브라우저 구독을 뺀다 — 다음 사람이 이 기기로 앞 사람 알림을 받지 않게.
 *   서버 행은 쿠키가 없어 못 지우지만, 뺀 구독 주소로 보내면 푸시 서비스가 410 → 서버가 지운다(`SRV-REQ-062` 불변식 4)
 * - 앱이 열릴 때 대조는 구독한 사람과 지금 사람이 같을 때만 서버에 다시 넣는다 — 다르면 뺀다(주인을 몰래 옮기지 않는다)
 */
import { MOBILE_PATHS } from "@repo/core/mobile";

export const PUSH_OWNER_KEY = "salt-m-push-owner";

export const readPushOwner = (): string | null => {
  try {
    return window.localStorage.getItem(PUSH_OWNER_KEY);
  } catch {
    return null;
  }
};

export const writePushOwner = (userId: string | null): void => {
  try {
    if (userId) window.localStorage.setItem(PUSH_OWNER_KEY, userId);
    else window.localStorage.removeItem(PUSH_OWNER_KEY);
  } catch {
    // 프라이빗 모드 — 주인을 못 적으면 대조가 "다른 사람"으로 보고 뺀다(안전한 쪽)
  }
};

/** 브라우저 구독만 뺀다(서버 호출 0) · 실패는 삼킨다 — 로그아웃을 막지 않는다 */
export const dropBrowserPushSubscription = async (): Promise<void> => {
  writePushOwner(null);
  try {
    if (!("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration(MOBILE_PATHS.scope);
    const subscription = await registration?.pushManager?.getSubscription();
    await subscription?.unsubscribe();
  } catch {
    // 워커 없음 · 푸시 없음 — 뺄 것이 없다
  }
};
