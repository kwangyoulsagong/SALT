import type { JudgmentBlockedReason } from "@repo/core/coach";

import { COACH_MESSAGES } from "../model";
import {
  blockedBox,
  blockedIcon,
  blockedMeta,
  blockedReason,
  blockedText,
} from "./CoachBlock.css";

interface BlockedNoticeProps {
  reason: JudgmentBlockedReason;
  /** 표본 수. 성적표가 아직 없으면 `null` 이고 표본을 말하지 않는다 */
  sample: number | null;
}

/**
 * 막힌 판단 · 추천 (`FE-REQ-026` FR-1~3). 회색 약한 면 한 칸이다.
 *
 * 오류처럼 보이면 안 된다 — 표본이 쌓이는 중인 **정상 상태**이고, 초기에는 거의 모든
 * 판단이 이 상태다(FR-143). 그래서 빨간색 · 경고 아이콘 · [다시 시도]가 없고, 아이콘은 정보(ⓘ)다.
 */
export const BlockedNotice = ({ reason, sample }: BlockedNoticeProps) => {
  const meta = [
    sample !== null ? COACH_MESSAGES.blockedSample(sample) : null,
    COACH_MESSAGES.blockedNormal,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={blockedBox}>
      <svg className={blockedIcon} viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 9v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="10" cy="6.25" r="1" fill="currentColor" />
      </svg>
      <div className={blockedText}>
        <span className={blockedReason}>{COACH_MESSAGES.blocked[reason]}</span>
        <span className={blockedMeta}>{meta}</span>
      </div>
    </div>
  );
};

export default BlockedNotice;
