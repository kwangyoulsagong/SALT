import type { CoachMode, ModeCoachViewModel } from "@repo/core/coach";
import { Badge } from "@repo/ui/badge";
import { Heading } from "@repo/ui/heading";
import { StatusLine } from "@repo/ui/statusLine";

import { COACH_MESSAGES } from "../model";
import { BlockedNotice } from "./BlockedNotice";
import {
  metaLine,
  scoreLine,
  judgmentSlot,
  scoreNote,
  srOnly,
  summaryLine,
} from "./CoachBlock.css";

interface JudgmentSummaryProps {
  /** `null` = BFF 가 이 모드를 막았다(계약 깨짐). 판단을 지어내지 않고 "불러올 수 없음" */
  view: ModeCoachViewModel | null;
  mode: CoachMode;
  /**
   * 판단 라벨의 **태그** 단계(모양은 늘 h4). 놓이는 자리의 제목 순서를 따른다 — 코치 패널(h5 소제목 뒤,
   * 아래 구간 h5)은 4, 상세 카드(h2 카드 제목 아래)는 3. 단계를 건너뛰면 axe `heading-order`
   */
  labelAs?: 3 | 4;
}

/**
 * ② 지금의 판단 (`FE-REQ-026` FR-113 · FR-114).
 *
 * ## 게이트는 이 컴포넌트가 한다 (FR-1)
 *
 * 부모가 `renderable` 을 보고 고르지 않는다 — 부모가 판단하면 부모마다 한 번씩 잊을
 * 기회가 생긴다. 막힌 분기에는 `judgment` 가 **타입에 없어서** 라벨 · 점수를 꺼낼 길이
 * 없다. 게이트를 끄는 우회 prop 은 만들지 않는다(FR-5 — 수용 기준이 grep 0건이다).
 *
 * 그리지 않는 것: "매수"·"매도" 라벨 · 신뢰도 % (D3) · 점수 게이지(FR-14).
 * 점수는 `scoreNote` 가 있을 때만 그린다(FR-11).
 */
export const JudgmentSummary = ({ view, mode, labelAs = 4 }: JudgmentSummaryProps) => {
  if (!view) {
    return (
      <div className={judgmentSlot}>
        <StatusLine kind="error">{COACH_MESSAGES.judgmentUnavailable}</StatusLine>
      </div>
    );
  }

  if (!view.renderable) {
    return (
      <div className={judgmentSlot}>
        <BlockedNotice
          reason={view.blockedReason}
          sample={view.trackSample}
          assetClass={view.assetClass}
          history={view.history}
        />
      </div>
    );
  }

  const { judgment, trackRecord, failureCases } = view;
  const validity = COACH_MESSAGES.validity[judgment.validity.code];
  const meta = [COACH_MESSAGES.modes[mode], validity].filter(Boolean).join(" · ");

  return (
    <div className={judgmentSlot}>
      <Heading level={4} as={labelAs}>
        {judgment.label}
      </Heading>
      <p className={metaLine}>{meta}</p>
      {judgment.scoreNote && (
        <p className={scoreLine}>
          <span aria-hidden="true">{COACH_MESSAGES.score(judgment.score)}</span>
          <span className={srOnly}>
            {COACH_MESSAGES.scoreAccessible(judgment.score)}
          </span>
          <span className={scoreNote}>{judgment.scoreNote}</span>
        </p>
      )}
      <p className={summaryLine}>
        <span>{COACH_MESSAGES.reasonCount(judgment.reasons.length)}</span>
        <span aria-hidden="true">·</span>
        <span>{COACH_MESSAGES.trackSample(trackRecord.sample)}</span>
        {trackRecord.lowSample && (
          <Badge size="sm" tone="neutral">
            {COACH_MESSAGES.lowSample}
          </Badge>
        )}
        <span aria-hidden="true">·</span>
        <span>
          {trackRecord.claim?.misses.present
            ? COACH_MESSAGES.failureCount(trackRecord.claim.misses.count)
            : COACH_MESSAGES.recentFailureCount(failureCases.length)}
        </span>
      </p>
    </div>
  );
};

export default JudgmentSummary;
