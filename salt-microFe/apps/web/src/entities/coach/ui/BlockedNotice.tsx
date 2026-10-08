import type { JudgmentAssetClass, JudgmentBlockedReason, JudgmentHistory } from "@repo/core/coach";

import { COACH_MESSAGES } from "../model";
import {
  blockedBox,
  blockedIcon,
  blockedMeta,
  blockedReason,
  blockedText,
  exchangeLine,
  exchangeReason,
} from "./CoachBlock.css";

interface BlockedNoticeProps {
  reason: JudgmentBlockedReason;
  /** 표본 수. 성적표가 아직 없으면 `null` 이고 표본을 말하지 않는다 */
  sample: number | null;
  /** 국내 주식이면 표본이 국내 주식 것이라고 밝힌다(F011 FR-61). 추천 블록은 주지 않는다 */
  assetClass?: JudgmentAssetClass;
  /** `insufficient_history` 의 수치(F011 FR-62) */
  history?: JudgmentHistory | null;
}

/** 둘째 줄 — 표본이 쌓이는 정상 상태면 "정상 동작", 아니면 막은 이유 */
const metaLine = ({ reason, sample, assetClass, history }: BlockedNoticeProps): string => {
  if (reason === "exchange_warning") return COACH_MESSAGES.blockedExchange;
  // 재료 정지도 표본 이야기가 아니다 — "정상 동작"이라고 하지 않는다
  if (reason === "stale_inputs") return COACH_MESSAGES.blockedStale;
  if (reason === "mode_not_open") return COACH_MESSAGES.blockedModeNotOpen;
  const progress =
    reason === "insufficient_history" && history
      ? [
          COACH_MESSAGES.blockedHistory(history.dailyBars, history.requiredDailyBars),
          history.dailyIndicator ? null : COACH_MESSAGES.blockedHistoryIndicator,
        ]
      : [
          sample === null
            ? null
            : assetClass === "kr_stock"
              ? COACH_MESSAGES.blockedKrSample(sample)
              : COACH_MESSAGES.blockedSample(sample),
        ];
  return [...progress, COACH_MESSAGES.blockedNormal].filter(Boolean).join(" · ");
};

/**
 * 막힌 판단 · 추천 (`FE-REQ-026` FR-1~3). 회색 약한 면 한 칸이다.
 *
 * 오류처럼 보이면 안 된다 — 표본이 쌓이는 중인 **정상 상태**이고, 초기에는 거의 모든
 * 판단이 이 상태다(FR-143). 그래서 빨간색 · 경고 아이콘 · [다시 시도]가 없고, 아이콘은 정보(ⓘ)다.
 */
export const BlockedNotice = (props: BlockedNoticeProps) => {
  const { reason } = props;
  // 투자유의는 표본이 쌓이는 중이 아니다 — 표본 수 · "정상 동작" 대신 막은 이유의 둘째 줄
  const warned = reason === "exchange_warning";
  const meta = metaLine(props);

  return (
    <div className={blockedBox}>
      <svg className={blockedIcon} viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 9v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="10" cy="6.25" r="1" fill="currentColor" />
      </svg>
      <div className={blockedText}>
        <span className={warned ? `${blockedReason} ${exchangeReason}` : blockedReason}>
          {COACH_MESSAGES.blocked[reason]}
        </span>
        {/* 투자유의 둘째 줄은 막은 이유라 AA 대비 — 표본 메타의 옅은 회색을 쓰지 않는다 */}
        <span className={warned ? exchangeLine : blockedMeta}>{meta}</span>
      </div>
    </div>
  );
};

export default BlockedNotice;
