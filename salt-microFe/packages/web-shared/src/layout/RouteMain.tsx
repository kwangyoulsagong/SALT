"use client";

import { tokens } from "@repo/tokens";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

const { duration, easing } = tokens.motion;

/**
 * 본문 랜드마크 + 같은 zone 안 이동의 본문 투명도 (FE-REQ-062 FR-9).
 *
 * 주소(경로)가 바뀌면 본문만 `duration.base` 동안 옅은 데서 선명하게 — 머리 · 레일 · 탭은 제자리다.
 * zone 을 넘는 이동은 문서 이동이라 이 잎이 새로 마운트된다 — 첫 렌더는 움직이지 않는다(문서 간 전환 `FE-REQ-054` 가 맡는다 ·
 * 서버 HTML 은 끝 상태). 같은 화면의 `?tab=` · `?symbol=` 바뀜은 경로가 같아 움직이지 않는다(목록 + 미리보기가 깜빡이지 않게).
 * 투명도만 — 레이아웃 0. 줄인 모션이면 끈다.
 */
export const RouteMain = ({ className, children }: { className: string; children: ReactNode }) => {
  const ref = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const first = useRef(pathname);

  useEffect(() => {
    if (first.current === pathname) return;
    first.current = pathname;
    const node = ref.current;
    if (!node || typeof node.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    node.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: duration.base * 1000,
      easing: `cubic-bezier(${easing.enter.join(", ")})`,
    });
  }, [pathname]);

  return (
    <main ref={ref} className={className}>
      {children}
    </main>
  );
};
