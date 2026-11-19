"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { headButton, moreChevron, morePop, moreWrap, stat, statLabel, statValue } from "./DetailHead.css";

interface StatsMoreProps {
  /** 버튼 글자 — "더 보기" */
  label: string;
  items: readonly { label: string; value: string }[];
}

/**
 * 머리 [더 보기] 팝오버(`FE-REQ-049` FR-1) — 핵심 4칸 밖의 통계. 누르면 열고, 다시 누르기 · Esc · 바깥 누름으로 닫는다.
 * Esc 로 닫으면 포커스를 버튼으로 돌린다. 값은 전부 서버 것이다(표시만)
 */
export const StatsMore = ({ label, items }: StatsMoreProps) => {
  const [open, setOpen] = useState(false);
  const popId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (items.length === 0) return null;
  return (
    <div ref={wrapRef} className={moreWrap}>
      <button
        ref={buttonRef}
        type="button"
        className={headButton}
        aria-expanded={open}
        aria-controls={popId}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <ChevronDown className={moreChevron} size={14} aria-hidden="true" />
      </button>
      {open && (
        <dl id={popId} className={morePop}>
          {items.map((item) => (
            <div key={item.label} className={stat}>
              <dt className={statLabel}>{item.label}</dt>
              <dd className={statValue}>{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
};
