"use client";

import { useEffect, useRef } from "react";

/** 시트가 쌓은 기록 칸 표시 — 다른 기록과 섞이지 않게 이름을 붙인다 */
const SHEET_STATE_KEY = "saltSheet";
/** 우리가 부른 `history.back()` 의 popstate 한 번은 닫기로 읽지 않는다(StrictMode 이중 effect · 다시 열기) */
let ignoreNextPop = false;

/**
 * 열린 동안 **뒤로가 닫기**다(`FE-REQ-060` FR-M5 · `screen-mobile.md` §4 "바텀 시트 — 뒤로로 닫힌다").
 * 열 때 같은 주소로 기록 칸 하나를 쌓고, 뒤로(안드로이드 뒤로 · 웹뷰 goBack)가 그 칸을 빼면 닫는다.
 * 다른 길(바깥 누름 · Esc · 저장 뒤 닫기)로 닫히면 쌓은 칸을 우리가 뺀다 — 다음 뒤로가 화면을 떠나게.
 * 주소는 바꾸지 않는다(같은 URL) — Next 는 `pushState` 를 감싸 내부 상태를 이어 붙인다
 */
export const useBackCloses = (open: boolean, onClose: () => void): void => {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    window.history.pushState({ ...(window.history.state as object | null), [SHEET_STATE_KEY]: true }, "");
    let popped = false;
    const onPop = () => {
      if (ignoreNextPop) {
        ignoreNextPop = false;
        return;
      }
      popped = true;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      const state = window.history.state as Record<string, unknown> | null;
      if (!popped && state?.[SHEET_STATE_KEY]) {
        ignoreNextPop = true;
        window.history.back();
      }
    };
  }, [open]);
};
