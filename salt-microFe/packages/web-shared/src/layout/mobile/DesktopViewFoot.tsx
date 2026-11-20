import { MOBILE_PATHS } from "@repo/core/mobile";

import { MOBILE_MESSAGES } from "./messages";
import { foot, footNote, footPill } from "./MobileFoot.css";

/**
 * 화면 바닥 "데스크톱 화면으로 보기" 알약 + 안내 한 줄(`FE-REQ-074` FR-4) — 휴대폰에 없는 화면을 말하는 자리.
 * 링크 동작은 `DesktopViewLink` 와 같다(`/m/desktop` → 쿠키 → 문서 이동)
 */
export const DesktopViewFoot = ({ to, note }: { to: string; note?: string }) => (
  <div className={foot}>
    {note ? <p className={footNote}>{note}</p> : null}
    <a className={footPill} href={`${MOBILE_PATHS.desktop}?to=${encodeURIComponent(to)}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden focusable="false">
        <rect x="3" y="4" width="18" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M8 20h8M12 16v4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {MOBILE_MESSAGES.desktopView}
    </a>
  </div>
);
