"use client";

import { useState } from "react";

import { Button } from "@repo/ui/button";

import { NARROW_SCREEN_MESSAGES as M } from "@/shared/i18n";

import { copyStatus } from "./NarrowScreenNotice.css";

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
      {/* 앱의 기본 버튼(보라 · 흰 글자 4.99:1) — 해설 보기와 같은 컴포넌트(2026-09-30 사용자) */}
      <Button variant="primary" size="lg" fullWidth onClick={copy}>
        {M.copy}
      </Button>
      <p className={copyStatus} aria-live="polite">
        {state === "copied" ? M.copied : state === "failed" ? M.copyFailed : ""}
      </p>
    </>
  );
};

export default CopyPcLinkButton;
