"use client";

import { useState } from "react";

import { NARROW_SCREEN_MESSAGES as M } from "@/shared/i18n";

import { copyButton, copyStatus } from "./NarrowScreenNotice.css";

type CopyState = "idle" | "copied" | "failed";

/**
 * 지금 주소를 복사한다 — PC 에서 같은 화면을 열게. 클립보드는 브라우저 API 라 이 잎만 클라이언트다(`ssr.md`).
 * 결과는 버튼 아래 한 줄로 알린다(`aria-live`). 실패해도 주소창 복사를 안내한다 — 조용히 삼키지 않는다.
 */
export const CopyPcLinkButton = () => {
  const [state, setState] = useState<CopyState>("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setState("copied");
    } catch {
      setState("failed");
    }
  };

  return (
    <>
      <button type="button" className={copyButton} onClick={copy}>
        {M.copy}
      </button>
      <p className={copyStatus} aria-live="polite">
        {state === "copied" ? M.copied : state === "failed" ? M.copyFailed : ""}
      </p>
    </>
  );
};

export default CopyPcLinkButton;
