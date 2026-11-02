"use client";

// 클라이언트 잎: 쿠키 · 브라우저 지원을 마운트 뒤에 본다(`ssr.md`).
import { useEffect } from "react";

import { SPECULATION_RULES, hasSessionHint } from "./prerenderRules";

/**
 * Speculation Rules 를 문서에 단다 (`FE-REQ-054` FR-3). 마운트 뒤 붙여도 브라우저가 규칙을 읽는다.
 * 지원하지 않는 브라우저(`HTMLScriptElement.supports` 없음 · false)는 아무것도 하지 않는다 — 일반 이동.
 */
export const SpeculationRules = () => {
  useEffect(() => {
    const supports = (HTMLScriptElement as unknown as { supports?: (type: string) => boolean }).supports;
    if (!supports?.("speculationrules")) return;
    if (!hasSessionHint(document.cookie)) return;
    const script = document.createElement("script");
    script.type = "speculationrules";
    script.textContent = JSON.stringify(SPECULATION_RULES);
    document.head.appendChild(script);
    return () => script.remove();
  }, []);
  return null;
};
