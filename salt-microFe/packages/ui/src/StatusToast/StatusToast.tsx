"use client";

import { tokens } from "@repo/tokens";
import { AnimatePresence, m } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

import { durations, ease } from "../Motion/motionPresets";
import { StatusGraphic, type StatusGraphicKind } from "../StatusGraphic/StatusGraphic";
import { statusToastStyles } from "./styles/statusToast.css";

export interface StatusToastProps {
  /** 바뀔 때마다 한 번 뜬다. `null` 이면 아무것도 띄우지 않는다(첫 렌더 · 이미 끝난 상태로 열린 화면) */
  trigger: string | number | null;
  children: ReactNode;
  kind?: StatusGraphicKind;
  /** 떠 있는 시간(ms). 기본은 체크가 그려지고 읽을 시간 */
  duration?: number;
}

/** 체크가 그려지는 장면(0.9s) + 한 줄 읽는 시간 */
const DEFAULT_DURATION_MS = Math.round(tokens.motion.duration.scene * 1000) + 1300;

/**
 * 패널 위에 잠깐 떴다가 사라지는 상태 알림 (FE-REQ-044 P-6 · 2026-09-30 사용자 QA).
 *
 * "분석이 완료됐어요"처럼 **방금 끝난 사실**을 알리고 비켜난다 — 헤더 줄에 계속 남으면 판단 문장 옆 장식이 된다.
 * 부모가 `position: relative` 여야 한다(윗변 가운데에 뜬다). 화면 전체 알림은 `Toast` 를 쓴다.
 * 스크린리더는 `role="status"` 로 한 번 읽는다.
 */
export const StatusToast = ({ trigger, children, kind = "success", duration = DEFAULT_DURATION_MS }: StatusToastProps) => {
  const [shown, setShown] = useState<string | number | null>(null);

  useEffect(() => {
    if (trigger === null) return undefined;
    setShown(trigger);
    const timer = window.setTimeout(() => setShown(null), duration);
    return () => window.clearTimeout(timer);
  }, [trigger, duration]);

  return (
    <AnimatePresence>
      {shown !== null ? (
        <m.div
          key={shown}
          role="status"
          className={statusToastStyles}
          initial={{ opacity: 0, y: -8, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%", transition: { duration: durations.base, ease: ease.enter } }}
          exit={{ opacity: 0, y: -8, x: "-50%", transition: { duration: durations.base, ease: ease.exit } }}
        >
          <StatusGraphic kind={kind} size="sm" />
          <span>{children}</span>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
};
