"use client";

import type { PreflightMode } from "@repo/core/coach";
import { BottomSheet } from "@repo/ui/bottomSheet";
import { ChevronRight } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { useHasAccessToken } from "@/shared/api";
import { PREFLIGHT_ANCHOR_ID } from "@/shared/config";

import { useNarrowViewport } from "../lib";
import { RUN_PREFLIGHT_MESSAGES as MSG } from "../model";
import { PreflightForm } from "./PreflightForm";
import { description, form, head, hint, launcher, launcherHint, title } from "./Preflight.css";

const ANCHOR_HREF = `#${PREFLIGHT_ANCHOR_ID}`;

interface PreflightCardProps {
  symbol: string;
  mode: PreflightMode;
  livePrice: number | null;
  className?: string;
}

/**
 * 주문 전 체크 자리 (F004 FR-30 · `FE-REQ-026` FR-155).
 *
 * - **넓은 화면 = 상세 페이지 오른쪽 상주 카드.** 화면을 덮지 않는다
 * - **좁은 폭(앱 웹뷰) = 여는 줄 하나 + 바텀시트**
 *
 * Hero 의 [주문 전 체크] 는 서버 컴포넌트의 해시 링크(`#preflight-check`)다 — 머리에 JS 를 더하지 않는다.
 * 여기서 그 링크 누름을 듣는다: 넓은 화면은 브라우저가 스크롤하고 카드 제목으로 포커스를 옮기고, 좁은 폭은 기본
 * 이동을 막고 시트를 연다. `hashchange` 가 아니라 누름을 듣는 이유 — 같은 링크를 두 번 누르면 해시가 안 바뀐다.
 */
export const PreflightCard = ({ symbol, mode, livePrice, className }: PreflightCardProps) => {
  const hasToken = useHasAccessToken();
  const narrow = useNarrowViewport();
  const [sheetOpen, setSheetOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();

  useEffect(() => {
    const reveal = () => {
      if (narrow) setSheetOpen(true);
      // 해시 이동이 끝난 뒤에 옮긴다 — 누름 안에서 옮기면 브라우저의 조각 이동이 포커스를 body 로 되돌린다(실측)
      else window.setTimeout(() => headingRef.current?.focus({ preventScroll: true }), 0);
    };
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.(`a[href="${ANCHOR_HREF}"]`);
      if (!link) return;
      if (narrow) event.preventDefault();
      reveal();
    };
    // 해시를 단 주소로 들어왔을 때도 같은 자리로
    if (window.location.hash === ANCHOR_HREF) reveal();
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [narrow]);

  if (narrow) {
    return (
      <section className={className} aria-label={MSG.heading}>
        <button
          id={PREFLIGHT_ANCHOR_ID}
          type="button"
          className={launcher}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          onClick={() => setSheetOpen(true)}
        >
          {MSG.heading}
          <span className={launcherHint}>
            {MSG.openSheet}
            <ChevronRight size={16} aria-hidden="true" />
          </span>
        </button>
        <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={MSG.heading}>
          <div className={form}>
            <p className={description}>{MSG.description}</p>
            {hasToken === false ? (
              <p className={hint}>{MSG.signedOut}</p>
            ) : (
              <PreflightForm symbol={symbol} mode={mode} livePrice={livePrice} />
            )}
          </div>
        </BottomSheet>
      </section>
    );
  }

  return (
    <section id={PREFLIGHT_ANCHOR_ID} className={`${form} ${className ?? ""}`} aria-labelledby={headingId}>
      <div className={head}>
        {/* 해시 링크가 포커스를 옮겨 올 자리 — 탭 순서에는 넣지 않는다 */}
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className={title}>
          {MSG.heading}
        </h2>
        <p className={description}>{MSG.description}</p>
      </div>
      {hasToken === false ? (
        <p className={hint}>{MSG.signedOut}</p>
      ) : (
        <PreflightForm symbol={symbol} mode={mode} livePrice={livePrice} />
      )}
    </section>
  );
};
