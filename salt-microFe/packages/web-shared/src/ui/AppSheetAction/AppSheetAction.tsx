"use client";

import { BottomCTA } from "@repo/ui/bottomCTA";
import { BottomSheet } from "@repo/ui/bottomSheet";
import { Button } from "@repo/ui/button";
import { useCallback, useState, type ReactNode } from "react";

import { useBackCloses, useInAppWebview } from "../../lib";
import { sheetBody, spacer } from "./AppSheetAction.css";

export interface AppSheetActionProps {
  /** 하단 고정 버튼 글자 — 누른 뒤 일이 보이게(`screen-mobile.md` §5) */
  label: string;
  /** 시트 제목(`t4`) */
  title: string;
  /** 시트 본문 — 열 때마다 새로 붙는다(닫았다 연 시트에 앞 입력이 남지 않게). 닫기가 필요하면 함수로 */
  children: ReactNode | ((close: () => void) => ReactNode);
}

/**
 * 앱 웹뷰의 **하단 고정 버튼 → 바텀 시트**(`FE-REQ-060` FR-M1 · M2 · M5, `screen-mobile.md` §4) — 화면을 옮기지 않고 그 자리에서 적는다.
 *
 * - 앱 웹뷰에서만 붙는다(데스크톱은 사이드 · 고정 열이 같은 입력을 이미 펼친다). 판정은 마운트 뒤라 서버 HTML 에는 없다 — 첫 페인트에 버튼이 없다가 붙는다
 * - 시트는 바깥 누름 · Esc · **뒤로**로 닫힌다(`useBackCloses`). 포커스 가둠 · 스크롤 잠금은 `BottomSheet`
 * - 화면당 하나 — 정보 영역 안 큰 버튼 0
 */
export const AppSheetAction = ({ label, title, children }: AppSheetActionProps) => {
  const inApp = useInAppWebview();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useBackCloses(open, close);
  if (!inApp) return null;
  return (
    <>
      <div className={spacer} aria-hidden />
      <BottomCTA fixed>
        <Button size="md" fullWidth onClick={() => setOpen(true)} aria-haspopup="dialog">
          {label}
        </Button>
      </BottomCTA>
      <BottomSheet open={open} onClose={close} title={title}>
        {open ? <div className={sheetBody}>{typeof children === "function" ? children(close) : children}</div> : null}
      </BottomSheet>
    </>
  );
};
