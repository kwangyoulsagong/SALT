"use client";

import { BottomSheet } from "@repo/ui/bottomSheet";
import { Button } from "@repo/ui/button";
import { Illustration } from "@repo/ui/illustration";
import { useCallback, useState } from "react";

import { useBackCloses } from "../../lib";

import { MOBILE_INSTALL_MESSAGES as M } from "./messages";
import { floatingSheet } from "./MobileSheetAction.css";
import * as s from "./MobileInstallCard.css";

export interface MobileInstallCardBodyProps {
  mode: "prompt" | "apple";
  onDismiss: () => void;
  onInstall: () => void;
}

/**
 * 설치 안내 카드 몸통(`FE-REQ-073` FR-4) — 보일 때만 받는 청크(`MobileInstallCard` 가 `useLazyComponent` 로). 시트 · 모션 그림이 무거워
 * 첫 진입(늘 0)의 홈 번들에 싣지 않는다. 배럴에 올리지 않는다(올리면 정적으로 딸려 와 분할이 무효)
 */
export const MobileInstallCardBody = ({ mode, onDismiss, onInstall }: MobileInstallCardBodyProps) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  useBackCloses(sheetOpen, closeSheet);
  return (
    <section className={s.card} aria-labelledby="m-install-title" data-install-card={mode}>
      <div className={s.head}>
        <h2 id="m-install-title" className={s.title}>
          {M.title}
        </h2>
        <button type="button" className={s.close} onClick={onDismiss} aria-label={M.close}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden focusable="false">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <p className={s.body}>{M.body}</p>
      {mode === "prompt" ? (
        <Button size="md" variant="weak" fullWidth onClick={onInstall}>
          {M.install}
        </Button>
      ) : (
        <Button size="md" variant="weak" fullWidth onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
          {M.howTo}
        </Button>
      )}
      <BottomSheet open={sheetOpen} onClose={closeSheet} title={M.sheetTitle} className={floatingSheet}>
        {sheetOpen ? (
          <div className={s.sheetBody}>
            <figure className={s.figure} aria-label={M.figureLabel}>
              <Illustration scene="addToHome" size="md" />
            </figure>
            <ol className={s.steps}>
              {M.steps.map((step) => (
                <li key={step} className={s.step}>
                  {step}
                </li>
              ))}
            </ol>
            <Button size="md" fullWidth onClick={closeSheet}>
              {M.sheetClose}
            </Button>
          </div>
        ) : null}
      </BottomSheet>
    </section>
  );
};
