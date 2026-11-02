"use client";

import { useSyncExternalStore } from "react";

import { readAccessToken } from "./authToken";

const subscribe = (onChange: () => void) => {
  // 다른 탭의 로그인 · 로그아웃만 알린다. 같은 탭의 쓰기는 화면 이동과 함께 다시 그려진다
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

const hasToken = () => readAccessToken() !== null;
/** 서버는 토큰을 모른다 — 수화 동안 이 값(`null`)을 쓴다. "없다"(`false`)와 다르다 */
const unknownOnServer = () => null;

/**
 * 토큰이 있는가 — **수화에 안전하게** (`ssr.md`).
 *
 * 렌더 중에 `readAccessToken()` 을 부르면 서버는 `null`, 브라우저는 토큰이라 첫 렌더 마크업이
 * 갈린다(홈 보유 블록이 "로그인하면…" vs 목록으로 갈렸다, 2026-09-23). `useSyncExternalStore` 는
 * 수화 동안 서버 값을 쓰고 끝난 뒤 실제 값으로 다시 그린다.
 *
 * `null` = 아직 모름(서버 · 수화 중). 이때 "로그인하세요"를 그리면 로그인한 사람에게 잠깐
 * 비친다 — 부르는 쪽은 `null` 을 **로딩**으로 그린다.
 */
export const useHasAccessToken = (): boolean | null =>
  useSyncExternalStore<boolean | null>(subscribe, hasToken, unknownOnServer);
