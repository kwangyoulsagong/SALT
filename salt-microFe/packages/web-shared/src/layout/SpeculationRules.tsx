"use client";

// 클라이언트 잎: 쿠키 · 브라우저 지원을 마운트 뒤에 본다(`ssr.md`).
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { SPECULATION_RULES, hasSessionHint } from "./prerenderRules";

/**
 * Speculation Rules 를 문서에 단다 (`FE-REQ-054` FR-3). 마운트 뒤 붙여도 브라우저가 규칙을 읽는다.
 * 지원하지 않는 브라우저(`HTMLScriptElement.supports` 없음 · false)는 아무것도 하지 않는다 — 일반 이동.
 *
 * **경로가 바뀔 때마다 다시 본다**(2026-11-03 리뷰) — 로그인은 같은 탭에서 `/` → `/home` 으로 soft 이동이라 루트 레이아웃이 다시
 * 마운트되지 않는다. 마운트 때 한 번만 보면 로그인 직후에는 표지 쿠키가 없어 새로고침 전까지 탭이 prerender 되지 않았다. 한 번 붙이면 끝.
 */
export const SpeculationRules = () => {
  const pathname = usePathname();
  const script = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    if (script.current) return;
    const supports = (HTMLScriptElement as unknown as { supports?: (type: string) => boolean }).supports;
    if (!supports?.("speculationrules")) return;
    if (!hasSessionHint(document.cookie)) return;
    const element = document.createElement("script");
    element.type = "speculationrules";
    element.textContent = JSON.stringify(SPECULATION_RULES);
    document.head.appendChild(element);
    script.current = element;
  }, [pathname]);

  useEffect(() => () => script.current?.remove(), []);
  return null;
};
