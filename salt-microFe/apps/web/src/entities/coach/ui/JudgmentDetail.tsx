import type {
  CoachMode,
  FailureCase,
  ModeCoachViewModel,
  TrackRecord,
} from "@repo/core/coach";
import { Heading } from "@repo/ui/heading";

import { formatRatio, formatSignedRate } from "../lib";
import { COACH_MESSAGES } from "../model";
import {
  caseList,
  caseRow,
  detailSection,
  plainList,
  statRow,
  statTerm,
  statValue,
} from "./CoachDetail.css";
import { JudgmentSummary } from "./JudgmentSummary";

const { detail: DETAIL } = COACH_MESSAGES;

const orEmpty = (value: number | null, format: (v: number) => string) =>
  value === null ? DETAIL.emptyValue : format(value);

/** 이 판단의 과거 성적 — 적중률 · 평균 · 최대 낙폭. 해설 카드도 같은 것을 쓴다(FR-135) */
export const TrackRecordStats = ({ record }: { record: TrackRecord }) => {
  const tone = record.lowSample ? "lowSample" : "normal";
  return (
    <section className={detailSection}>
      <Heading level={5} color="tertiary">
        {DETAIL.trackRecordHeading}
      </Heading>
      <dl className={statRow}>
        <div>
          <dt className={statTerm}>{DETAIL.winRate}</dt>
          <dd className={statValue[tone]}>{orEmpty(record.winRate, formatRatio)}</dd>
        </div>
        <div>
          <dt className={statTerm}>{DETAIL.avgReturn}</dt>
          <dd className={statValue[tone]}>
            {orEmpty(record.avgReturn, formatSignedRate)}
          </dd>
        </div>
        <div>
          <dt className={statTerm}>{DETAIL.maxDrawdown}</dt>
          <dd className={statValue[tone]}>
            {orEmpty(record.maxDrawdown, formatSignedRate)}
          </dd>
        </div>
      </dl>
      <p className={statTerm}>
        {DETAIL.trackSample(record.sample)} · {DETAIL.horizon(record.horizonHours)}
        {record.lowSample && ` · ${COACH_MESSAGES.lowSample}`}
      </p>
    </section>
  );
};

/** 맞았던 때 · 틀렸던 때. 해설 카드도 같은 것을 쓴다(FR-135) */
export const JudgmentCases = ({ cases }: { cases: readonly FailureCase[] }) => (
  <section className={detailSection}>
    <Heading level={5} color="tertiary">
      {DETAIL.failureHeading}
    </Heading>
    <ul className={caseList}>
      {cases.map((item) => (
        <li key={`${item.date}-${item.symbol}-${item.event}`} className={caseRow}>
          <span>{item.date}</span>
          <span>{DETAIL.outcome[item.outcome]}</span>
          <span>{formatSignedRate(item.returnRate)}</span>
        </li>
      ))}
    </ul>
  </section>
);

interface JudgmentDetailProps {
  /** `null` = BFF 가 이 모드를 막았다(계약 깨짐) */
  view: ModeCoachViewModel | null;
  mode: CoachMode;
}

/**
 * 상세 분석 코치 카드 — 판단 + 근거 · 위험 + 3종 (`FE-REQ-026` FR-134).
 *
 * ## 게이트는 패널과 **같은 컴포넌트**가 한다
 *
 * 막힘 · 계약 깨짐은 `JudgmentSummary` 가 그린다(FR-1 · FR-114). 이 카드는 `renderable: true`
 * 분기에만 근거 목록 · 성적 · 사례를 덧붙인다 — 막힌 분기에는 그 필드가 **타입에 없다.**
 *
 * 맞았던 때 · 틀렸던 때는 **한 목록에 같은 크기로** 둔다. 틀렸던 때를 접거나 뒤로 미루지
 * 않는다(B2 · FR-142 의 원칙을 여기에도).
 */
export const JudgmentDetail = ({ view, mode }: JudgmentDetailProps) => {
  if (!view || !view.renderable) return <JudgmentSummary view={view} mode={mode} />;

  const { judgment, trackRecord, failureCases } = view;

  return (
    <>
      <JudgmentSummary view={view} mode={mode} />
      <section className={detailSection}>
        <Heading level={5} color="tertiary">
          {DETAIL.reasonsHeading}
        </Heading>
        <ul className={plainList}>
          {judgment.reasons.map((reason, index) => (
            <li key={`${index}-${reason}`}>{reason}</li>
          ))}
        </ul>
      </section>
      {judgment.risks.length > 0 && (
        <section className={detailSection}>
          <Heading level={5} color="tertiary">
            {DETAIL.risksHeading}
          </Heading>
          <ul className={plainList}>
            {judgment.risks.map((risk, index) => (
              <li key={`${index}-${risk}`}>{risk}</li>
            ))}
          </ul>
        </section>
      )}
      <TrackRecordStats record={trackRecord} />
      <JudgmentCases cases={failureCases} />
    </>
  );
};

export default JudgmentDetail;
