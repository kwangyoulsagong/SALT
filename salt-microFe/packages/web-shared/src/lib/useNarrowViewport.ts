"use client";

import { useEffect, useState } from "react";

/**
 * 바텀시트로 여는 폭(FR-155 "모바일 폭") — 주문 전 계산 · 거래 기록 시트가 같이 쓴다(2026-11-18 `run-preflight` 에서 내림). 웹은 이 폭에서 좁은 화면 안내가 덮고(`NarrowScreenNotice` 와 같은 경계),
 * 실제로 보는 곳은 앱 웹뷰(UA `SALTApp/`)다.
 */
const NARROW_QUERY = "(max-width: 767px)";

/**
 * 좁은 폭이면 `true`. 렌더 중에 `matchMedia` 를 읽지 않는다(`ssr.md`) — 첫 렌더는 `false`(넓은 화면 카드)이고
 * 마운트 뒤 바로잡는다. 본문은 `ssr:false` 라 수화 불일치는 없다.
 */
export const useNarrowViewport = (): boolean => {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(NARROW_QUERY);
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return narrow;
};
