"use client";

import { tokens } from "@repo/tokens";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Toast } from "./Toast";
import { ToastContext } from "./ToastContext";
import type { ToastOptions } from "./ToastContext";
import { toastLeavingStyles, viewportStyles } from "./styles/toast.css";

interface ToastEntry extends ToastOptions {
  id: string;
  /** 퇴장 중 — 애니메이션이 끝나면 목록에서 뺀다 (FE-REQ-044 FR-35) */
  leaving?: boolean;
}

export interface ToastProviderProps {
  children: ReactNode;
  /** 동시에 보여줄 최대 개수. 넘치면 오래된 것부터 사라진다. */
  max?: number;
  /** 기본 유지 시간(ms) */
  duration?: number;
}

let sequence = 0;

export const ToastProvider = ({
  children,
  max = 3,
  duration = 3000,
}: ToastProviderProps) => {
  const [entries, setEntries] = useState<ToastEntry[]>([]);
  const [mounted, setMounted] = useState(false);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    // 바로 지우지 않고 퇴장을 보인 뒤 뺀다. 줄인 모션이면 바로 뺀다
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
      return;
    }
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, leaving: true } : entry)));
    timers.current.set(
      id,
      setTimeout(() => {
        timers.current.delete(id);
        setEntries((prev) => prev.filter((entry) => entry.id !== id));
      }, tokens.motion.duration.base * 1000),
    );
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      sequence += 1;
      const id = `toast-${sequence}`;

      setEntries((prev) => [...prev, { ...options, id }].slice(-max));

      const lifetime = options.duration ?? duration;
      if (lifetime > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), lifetime)
        );
      }

      return id;
    },
    [dismiss, duration, max]
  );

  // 언마운트 시 남은 타이머를 전부 정리한다.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted
        ? createPortal(
            <div className={viewportStyles}>
              {entries.map((entry) => (
                <Toast
                  key={entry.id}
                  tone={entry.tone}
                  action={entry.action}
                  className={entry.leaving ? toastLeavingStyles : undefined}
                >
                  {entry.message}
                </Toast>
              ))}
            </div>,
            document.body
          )
        : null}
    </ToastContext.Provider>
  );
};
