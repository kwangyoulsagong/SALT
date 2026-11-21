/**
 * 설치 안내 상태(`FE-REQ-073` FR-4) — 브라우저에서만 부른다(효과 · 처리기 안).
 *
 * - Android Chromium 의 `beforeinstallprompt` 는 페이지마다 **한 번**, 대개 로드 직후에 온다. 안내 카드는 홈에 있으므로
 *   루트 레이아웃 잎(`RegisterServiceWorker`)이 먼저 붙잡아 여기 둔다 — 카드가 나중에 마운트돼도 쓸 수 있게
 * - 보일지 말지는 이 기기 저장소 한 칸: 없음(첫 진입 — 띄우지 않고 "봤음"만 적는다) → 봤음(다음 진입부터 보임) → 닫음(다시 안 뜸)
 */

/** Chromium 전용 사건 — 표준 타입에 없다 */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

/** 루트 레이아웃이 한 번 붙인다 — 기본 미니 막대를 막고 사건을 쥔다. 설치되면 버린다 */
export const captureInstallPrompt = (): (() => void) => {
  const onPrompt = (event: Event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  };
  const onInstalled = () => {
    deferred = null;
    notify();
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
};

export const installPromptEvent = (): BeforeInstallPromptEvent | null => deferred;

export const subscribeInstallPrompt = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** 한 번 쓴 사건은 다시 못 쓴다 — 결과와 상관없이 버린다 */
export const consumeInstallPrompt = async (): Promise<boolean> => {
  const event = deferred;
  if (!event) return false;
  deferred = null;
  notify();
  await event.prompt();
  return (await event.userChoice).outcome === "accepted";
};

/** 이 기기 저장소 한 칸 — 값 셋 */
export const INSTALL_HINT_KEY = "salt-m-install-hint";
export type InstallHintState = "seen" | "dismissed";

export const readInstallHint = (): InstallHintState | null => {
  try {
    const value = window.localStorage.getItem(INSTALL_HINT_KEY);
    return value === "seen" || value === "dismissed" ? value : null;
  } catch {
    // 저장소가 막히면 "닫음"으로 — 첫 진입 판정을 못 하니 띄우지 않는다
    return "dismissed";
  }
};

export const writeInstallHint = (state: InstallHintState): void => {
  try {
    window.localStorage.setItem(INSTALL_HINT_KEY, state);
  } catch {
    // 프라이빗 모드 — 다음 진입에도 띄우지 않는다(위 읽기가 "닫음")
  }
};

/** 설치한 앱으로 열었나 — iOS 는 `navigator.standalone`, 나머지는 표시 모드 */
export const isStandalone = (): boolean =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** iOS · iPadOS(데스크톱 UA 를 쓰는 iPad 포함) — 설치는 공유 메뉴로만 */
export const isAppleTouch = (): boolean =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
