import type { CoachMode, JudgmentCaveat, ModeCoachViewModel, TrackRecord } from "@repo/core/coach";
import { Badge } from "@repo/ui/badge";
import { Heading } from "@repo/ui/heading";
import { StatusLine } from "@repo/ui/statusLine";

import { COACH_MESSAGES } from "../model";
import {
  caveatLines,
  metaLine,
  scoreLine,
  judgmentSlot,
  scoreNote,
  srOnly,
  summaryLine,
} from "./CoachBlock.css";

interface JudgmentSummaryProps {
  /** `null` = BFF 가 이 모드를 막았다(계약 깨짐 — 모양이 틀림). 판단을 지어내지 않고 "불러올 수 없음" */
  view: ModeCoachViewModel | null;
  mode: CoachMode;
  /**
   * 판단 라벨의 **태그** 단계(모양은 늘 h4). 놓이는 자리의 제목 순서를 따른다 — 코치 패널(h5 소제목 뒤,
   * 아래 구간 h5)은 4, 상세 카드(h2 카드 제목 아래)는 3. 단계를 건너뛰면 axe `heading-order`
   */
  labelAs?: 3 | 4;
}

const M = COACH_MESSAGES;

/** 꼬리표 하나 → 문장(서버 사실 칸을 끼운다). `unknown` 은 그리지 않는다 */
const caveatSentence = (caveat: JudgmentCaveat): string | null => {
  switch (caveat.reason) {
    case "insufficient_history":
      return M.caveat.insufficient_history(caveat.have, caveat.need, caveat.dailyIndicator);
    case "exchange_warning":
      return M.caveat.exchange_warning;
    case "stale_inputs":
      return M.caveat.stale_inputs(
        caveat.items.map((row) => `${M.caveatTime(row.lastAt)} ${M.caveat.staleItem[row.item] ?? ""}`.trim()).join(" · "),
      );
    case "live_sample_short":
      return M.caveat.live_sample_short(caveat.live, caveat.backtest);
    case "inputs_missing":
      return M.caveat.inputs_missing;
    case "track_record_unavailable":
      return M.caveat.track_record_unavailable;
    case "backtest_missing":
      return M.caveat.backtest_missing(caveat.live);
    case "unknown":
      return null;
  }
};

/**
 * 성적 한 줄 — 적중률은 기준과 같은 문장에(리서치 v2 규칙 3). 기준 = 서버 `winRate − excessWinRate`(서버가 뺀 값을 되돌릴 뿐 —
 * 새 판정 0). 관망은 기준이 없다(`excessWinRate` null)
 */
const trackSentence = (record: TrackRecord): string | null =>
  record.winRate === null
    ? null
    : M.trackVsBaseline(record.winRate, record.excessWinRate === null ? null : record.winRate - record.excessWinRate);

/**
 * ② 지금의 판단 (`FE-REQ-026` FR-113 · `FE-REQ-064` FR-1 v2).
 *
 * ## 판단은 늘 그린다 (`ADR-010` v2, 2026-11-10)
 *
 * ~~막힌 분기에는 `judgment` 가 타입에 없다~~ — 사용자 *"막히는 게 말이 안 되잖아"*. 판단 · 성적은 늘 있고, 부족한 것은
 * 서버 꼬리표(`caveats`)를 **숫자가 쓰인 문장으로**(배지 · "신뢰도 낮음" 0). `null` 은 계약 깨짐뿐이다.
 *
 * 그리지 않는 것: "매수"·"매도" 라벨 · 신뢰도 % (D3) · 점수 게이지(FR-14). 점수는 `scoreNote` 가 있을 때만(FR-11).
 */
export const JudgmentSummary = ({ view, mode, labelAs = 4 }: JudgmentSummaryProps) => {
  if (!view) {
    return (
      <div className={judgmentSlot}>
        <StatusLine kind="error">{M.judgmentUnavailable}</StatusLine>
      </div>
    );
  }

  const { judgment, trackRecord, failureCases, caveats } = view;
  const validity = M.validity[judgment.validity.code];
  const meta = [M.modes[mode], validity].filter(Boolean).join(" · ");
  const caveatTexts = caveats.map(caveatSentence).filter((text): text is string => text !== null);
  const track = trackSentence(trackRecord);

  return (
    <div className={judgmentSlot}>
      <Heading level={4} as={labelAs}>
        {judgment.label}
      </Heading>
      <p className={metaLine}>{meta}</p>
      {judgment.scoreNote && (
        <p className={scoreLine}>
          <span aria-hidden="true">{M.score(judgment.score)}</span>
          <span className={srOnly}>{M.scoreAccessible(judgment.score)}</span>
          <span className={scoreNote}>{judgment.scoreNote}</span>
        </p>
      )}
      <p className={summaryLine}>
        {/* 피하기는 위험 신호가 곧 근거다 — 서버 `judgmentEvidence` 와 같은 수 */}
        <span>
          {M.reasonCount(
            judgment.action === "avoid" ? judgment.reasons.length + judgment.risks.length : judgment.reasons.length,
          )}
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {trackRecord.sampleOrigin === "backtest"
            ? M.backtestTrackSample(trackRecord.sample)
            : M.trackSample(trackRecord.sample)}
        </span>
        {trackRecord.lowSample && (
          <Badge size="sm" tone="neutral">
            {M.lowSample}
          </Badge>
        )}
        <span aria-hidden="true">·</span>
        <span>
          {trackRecord.claim?.misses.present
            ? M.failureCount(trackRecord.claim.misses.count)
            : M.recentFailureCount(failureCases.length)}
        </span>
      </p>
      {(track || caveatTexts.length > 0) && (
        <ul className={caveatLines}>
          {track && <li>{track}</li>}
          {caveatTexts.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default JudgmentSummary;
