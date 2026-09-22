import type { JudgmentBlockedReason } from "@repo/core/coach";

import { COACH_MESSAGES } from "../model";
import { blockedBox } from "./CoachBlock.css";

interface BlockedNoticeProps {
  reason: JudgmentBlockedReason;
  /** 표본 수. 성적표가 아직 없으면 `null` 이고 줄을 그리지 않는다 */
  sample: number | null;
}

/**
 * 막힌 판단 (`FE-REQ-026` FR-1~3). 회색 상자 한 칸이다.
 *
 * 오류처럼 보이면 안 된다 — 표본이 쌓이는 중인 **정상 상태**이고, 초기에는 거의 모든
 * 종목이 이 상태다(FR-143). 그래서 빨간색 · 경고 아이콘 · [다시 시도]가 없다.
 */
export const BlockedNotice = ({ reason, sample }: BlockedNoticeProps) => (
  <div className={blockedBox}>
    <span>{COACH_MESSAGES.blocked[reason]}</span>
    {sample !== null && <span>{COACH_MESSAGES.blockedSample(sample)}</span>}
    <span>{COACH_MESSAGES.blockedNormal}</span>
  </div>
);

export default BlockedNotice;
