"use client";

import { useEffect, useState } from "react";

/** PC 격자 폭(F006 A절 · `FE-REQ-030` FR-50 · 57) — 이 폭부터 코치 화면이 칸 여럿을 한 번에 놓는다 */
const WIDE_QUERY = "(min-width: 1280px)";

/**
 * 넓은 폭이면 `true`, 좁으면 `false`, **아직 모르면 `null`**. 렌더 중에 `matchMedia` 를 읽지 않는다(`ssr.md`) — 서버 · 첫 렌더는
 * `null` 이라 수화가 갈리지 않고, 부르는 쪽은 `null` 동안 같은 높이 자리만 그린다(한 배치를 그렸다가 다른 배치로 다시 마운트하지 않게).
 */
export const useWideViewport = (): boolean | null => {
  const [wide, setWide] = useState<boolean | null>(null);
  useEffect(() => {
    const query = window.matchMedia(WIDE_QUERY);
    const sync = () => setWide(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return wide;
};
