"use client";

import { BottomCTA } from "@repo/ui/bottomCTA";
import { BottomSheet } from "@repo/ui/bottomSheet";
import { Button } from "@repo/ui/button";
import { useCallback, useState, type ReactNode } from "react";

import { useBackCloses, useOnline } from "../../lib";
import { MOBILE_MESSAGES } from "./messages";
import { aboveTabs, floatingSheet, offlineFieldset, offlineReason, sheetBody, spacer } from "./MobileSheetAction.css";

/** 화면당 하나라 고정 id — 막힌 버튼이 이유 줄을 읽게 한다 */
const OFFLINE_REASON_ID = "m-sheet-offline-reason";

export interface MobileSheetActionProps {
  /** 하단 고정 버튼 글자 — 누른 뒤 일이 보이게(`screen-mobile.md` §5) */
  label: string;
  /** 시트 제목(`t4`) */
  title: string;
  /** 시트 본문 — 열 때마다 새로 붙는다(닫았다 연 시트에 앞 입력이 남지 않게). 닫기가 필요하면 함수로 */
  children: ReactNode | ((close: () => void) => ReactNode);
}

/**
 * 휴대폰 **하단 고정 버튼 → 바텀 시트**(`FE-REQ-072` FR-2 ← `FE-REQ-060` FR-M1 · M2 · M5, `screen-mobile.md` §4) — 화면을 옮기지 않고 그 자리에서 적는다.
 *
 * - `/m` 화면만 부른다 — 서버 HTML 부터 버튼이 있다(옛 웹뷰는 마운트 뒤 판정이라 첫 페인트에 없다가 붙었다)
 * - 시트는 바깥 누름 · Esc · **뒤로**로 닫힌다(`useBackCloses`). 포커스 가둠 · 스크롤 잠금은 `BottomSheet`
 * - 화면당 하나 — 정보 영역 안 큰 버튼 0
 * - **오프라인이면 버튼을 막고 이유 한 줄**(`FE-REQ-073` FR-3) — 쓰기 큐 · 낙관적 갱신 0. 시트가 열린 채 끊기면 안의 입력 · 제출을 `fieldset disabled` 로 막는다
 */
export const MobileSheetAction = ({ label, title, children }: MobileSheetActionProps) => {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const online = useOnline();
  useBackCloses(open, close);
  return (
    <>
      <div className={spacer} aria-hidden />
      <BottomCTA fixed className={aboveTabs}>
        {online ? null : (
          <p className={offlineReason} id={OFFLINE_REASON_ID} role="status">
            {MOBILE_MESSAGES.writeOffline}
          </p>
        )}
        <Button
          size="md"
          fullWidth
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          disabled={!online}
          aria-describedby={online ? undefined : OFFLINE_REASON_ID}
        >
          {label}
        </Button>
      </BottomCTA>
      <BottomSheet open={open} onClose={close} title={title} className={floatingSheet}>
        {open ? (
          <div className={sheetBody}>
            {online ? null : <p className={offlineReason}>{MOBILE_MESSAGES.writeOffline}</p>}
            <fieldset className={offlineFieldset} disabled={!online}>
              {typeof children === "function" ? children(close) : children}
            </fieldset>
          </div>
        ) : null}
      </BottomSheet>
    </>
  );
};
