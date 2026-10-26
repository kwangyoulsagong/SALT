import type {
  CoachMode,
  FailureCase,
  ModeCoachViewModel,
  TrackRecord,
} from "@repo/core/coach";
import { Heading } from "@repo/ui/heading";

import { formatRatio, formatSignedPoints, formatSignedRate } from "../lib";
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
import { CaseIdentity } from "./CaseIdentity";
import { JudgmentSummary } from "./JudgmentSummary";
import { PerformanceClaimLine } from "./PerformanceClaimLine";

const { detail: DETAIL } = COACH_MESSAGES;

const orEmpty = (value: number | null, format: (v: number) => string) =>
  value === null ? DETAIL.emptyValue : format(value);

/** 이 판단의 과거 성적 — 적중률 · 평균 · 가장 나빴던 수익률. 해설 카드도 같은 것을 쓴다(FR-135) */
export const TrackRecordStats = ({ record }: { record: TrackRecord }) => {
  const tone = record.lowSample ? "lowSample" : "normal";
  const backtest = record.sampleOrigin === "backtest";
  return (
    <section className={detailSection}>
      <Heading level={5} as={4} color="tertiary">
        {backtest ? DETAIL.backtestHeading : DETAIL.trackRecordHeading}
      </Heading>
      {/* 모의 성적은 숫자보다 먼저 밝힌다(F011 슬라이스 7b — 라이브와 섞지 않는다) */}
      {backtest && <p className={statTerm}>{DETAIL.backtestNote}</p>}
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
          <dt className={statTerm}>{DETAIL.worstObservedReturn}</dt>
          <dd className={statValue[tone]}>
            {orEmpty(record.worstObservedReturn, formatSignedRate)}
          </dd>
        </div>
        {record.excessWinRate !== null && (
          <div>
            <dt className={statTerm} title={DETAIL.excessWinRateHint}>
              {DETAIL.excessWinRate}
            </dt>
            <dd className={statValue[tone]}>{formatSignedPoints(record.excessWinRate)}</dd>
          </div>
        )}
      </dl>
      <p className={statTerm}>
        {/* 표본 수는 4요소 줄이 말한다 — 두 번 쓰지 않는다. 옛 서버(claim 없음)면 여기서 */}
        {!record.claim && `${DETAIL.trackSample(record.sample)} · `}
        {DETAIL.horizon(record.horizonHours)}
        {record.lowSample && ` · ${COACH_MESSAGES.lowSample}`}
      </p>
      <PerformanceClaimLine claim={record.claim} />
    </section>
  );
};

/** 최근 틀렸던 때(서버가 최근 3건만 보낸다). 해설 카드도 같은 것을 쓴다(FR-135) */
export const JudgmentCases = ({
  cases,
  backtest = false,
}: {
  cases: readonly FailureCase[];
  /** 사례가 과거 시세로 되돌려 채점한 것(모의)인가 — 성적과 같은 출처다 */
  backtest?: boolean;
}) => (
  <section className={detailSection}>
    <Heading level={5} as={4} color="tertiary">
      {backtest ? DETAIL.backtestFailureHeading : DETAIL.failureHeading}
    </Heading>
    <ul className={caseList}>
      {cases.map((item) => (
        <li key={`${item.date}-${item.symbol}-${item.event}`} className={caseRow}>
          <span>{item.date}</span>
          <CaseIdentity symbol={item.symbol} name={item.name} logoUrl={item.logoUrl} />
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
  if (!view || !view.renderable) return <JudgmentSummary view={view} mode={mode} labelAs={3} />;

  const { judgment, trackRecord, failureCases } = view;

  return (
    <>
      <JudgmentSummary view={view} mode={mode} labelAs={3} />
      {/* 피하기는 긍정 근거가 없을 수 있다 — 근거는 아래 "주의할 점"이다. 빈 제목을 두지 않는다 */}
      {judgment.reasons.length > 0 && (
        <section className={detailSection}>
          <Heading level={5} as={4} color="tertiary">
            {DETAIL.reasonsHeading}
          </Heading>
          <ul className={plainList}>
            {judgment.reasons.map((reason, index) => (
              <li key={`${index}-${reason}`}>{reason}</li>
            ))}
          </ul>
        </section>
      )}
      {judgment.risks.length > 0 && (
        <section className={detailSection}>
          <Heading level={5} as={4} color="tertiary">
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
      <JudgmentCases cases={failureCases} backtest={trackRecord.sampleOrigin === "backtest"} />
    </>
  );
};

export default JudgmentDetail;
