"use client";

import { useEffect } from "react";

import { MOBILE_PATHS } from "@repo/core/mobile";

/**
 * 서비스 워커 등록(`FE-REQ-071` FR-4) — `/m` 페이지에서만 그려진다(데스크톱 경로 등록 0).
 * 범위는 `/m/` 하나 · `updateViaCache: "none"`(sw.js 를 HTTP 캐시에서 꺼내지 않는다).
 * dev 는 등록하지 않는다 — dev 청크는 이름에 해시가 없어 캐시하면 옛 코드가 남는다.
 */
export const RegisterServiceWorker = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register(MOBILE_PATHS.serviceWorker, { scope: MOBILE_PATHS.scope, updateViaCache: "none" })
      .catch(() => {
        // 등록 실패는 화면을 막지 않는다 — 오프라인 한 장만 없다
      });
  }, []);
  return null;
};
