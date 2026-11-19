"use client";

import { useEffect, useState } from "react";

/** 데스크톱 틀이 되는 폭(`screen-desktop.md` — 1024 이상). 하단 탭 · 앱 웹뷰는 이보다 좁다 */
const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * 1024 이상이면 `true`. 렌더 중에 `matchMedia` 를 읽지 않는다(`ssr.md`) — 첫 렌더는 `false`(손가락 크기 입력)이고 마운트 뒤 바로잡는다.
 * 쓰는 곳: 데스크톱에서만 조밀한 입력(32)을 쓰는 폼(`FE-REQ-060` FR-6 — 지출 적기)
 */
export const useDesktopViewport = (): boolean => {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const sync = () => setDesktop(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return desktop;
};
