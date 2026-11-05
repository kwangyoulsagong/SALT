"use client";

import { useSyncExternalStore } from "react";

import { hasSession } from "./session";

const subscribe = (onChange: () => void) => {
  // 쿠키는 바뀌어도 알림이 없다 — 탭으로 돌아올 때 다시 읽는다(다른 탭의 로그인 · 로그아웃). 같은 탭의 쓰기는 화면 이동과 함께 다시 그려진다
  window.addEventListener("focus", onChange);
  return () => window.removeEventListener("focus", onChange);
};

/** 서버는 표지를 모른다고 본다 — 수화 동안 이 값(`null`)을 쓴다. "없다"(`false`)와 다르다 */
const unknownOnServer = () => null;

/**
 * 로그인 세션이 있는가 — **수화에 안전하게** (`ssr.md`). 표지 쿠키(`SESSION_HINT_COOKIE`)를 읽는다 — 토큰 쿠키는 httpOnly.
 *
 * 렌더 중에 쿠키를 읽으면 서버와 브라우저의 첫 마크업이 갈린다(홈 보유 블록이 "로그인하면…" vs 목록으로 갈렸다, 2026-09-23).
 * `useSyncExternalStore` 는 수화 동안 서버 값을 쓰고 끝난 뒤 실제 값으로 다시 그린다.
 *
 * `null` = 아직 모름(서버 · 수화 중). 이때 "로그인하세요"를 그리면 로그인한 사람에게 잠깐 비친다 — 부르는 쪽은 `null` 을 **로딩**으로 그린다.
 */
export const useHasSession = (): boolean | null =>
  useSyncExternalStore<boolean | null>(subscribe, hasSession, unknownOnServer);
