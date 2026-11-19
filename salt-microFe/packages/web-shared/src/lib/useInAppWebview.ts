"use client";

import { useEffect, useState } from "react";

import { EMBED_APP, EMBED_ATTRIBUTE } from "@repo/core/embed";

/**
 * 앱 웹뷰(`<html data-embed="app">`, 첫 스크립트가 단다)인가. 렌더 중에 `document` 를 읽지 않는다(`ssr.md`) — 첫 렌더는 `false`, 마운트 뒤 바로잡는다.
 * 쓰는 곳: 데스크톱 사이드(`PageFrame` — 웹뷰에서 숨는다)에만 있던 도구를 웹뷰 본문에 한 번 더 붙일 때(저축 나눠 넣기 · 저울 — `FE-REQ-060` FR-8).
 * 모양만 바꾸는 것은 CSS `IN_APP_WEBVIEW` 로 — 이 훅은 마운트 여부를 가를 때만
 */
export const useInAppWebview = (): boolean => {
  const [inApp, setInApp] = useState(false);
  useEffect(() => {
    setInApp(document.documentElement.getAttribute(EMBED_ATTRIBUTE) === EMBED_APP);
  }, []);
  return inApp;
};
