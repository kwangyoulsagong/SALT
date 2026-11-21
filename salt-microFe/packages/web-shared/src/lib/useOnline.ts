"use client";

import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

const readOnline = () => navigator.onLine;
/** 서버 · 첫 렌더는 "연결됨" — 서버 HTML 은 늘 버튼이 살아 있다(수화 일치) */
const onlineOnServer = () => true;

/**
 * 브라우저가 연결됐다고 보나(`FE-REQ-073` FR-3) — `navigator.onLine` + `online` · `offline` 사건.
 * `false` 는 확실히 끊김, `true` 는 "아마 됨"(BFF 가 죽어도 true) — 쓰기를 막는 데만 쓴다. 받기 실패는 요청 결과로 안다
 */
export const useOnline = (): boolean => useSyncExternalStore(subscribe, readOnline, onlineOnServer);
