import type { CoachAction, ReportRecommendation } from "@repo/core/coach";
import { Badge, type BadgeTone } from "@repo/ui/badge";
import { Heading } from "@repo/ui/heading";
import { Text } from "@repo/ui/text";

import { formatRatio, formatSignedRate, passesRecommendationGate } from "../lib";
import { COACH_MESSAGES } from "../model";
import { BlockedNotice } from "./BlockedNotice";
import { srOnly } from "./CoachBlock.css";
import {
  detailSection,
  plainList,
  statRow,
  statTerm,
  statValue,
} from "./CoachDetail.css";
import {
  explanation,
  factorDetails,
  factorRow,
  factorSummary,
  failureDate,
  failureItem,
  factList,
  recommendationHead,
  recommendationSymbol,
  scoreNoteText,
  scoreRow,
} from "./CoachReport.css";

const { report: REPORT, detail: DETAIL } = COACH_MESSAGES;

/** 행동 4종의 색. 상승 빨강 · 하락 파랑 규칙을 그대로 쓴다 — 색만으로 구분하지 않는다(FR-12) */
const ACTION_TONE: Record<CoachAction, BadgeTone> = {
  buy: "up",
  sell: "down",
  hold: "neutral",
  rebalance: "brand",
};

const orEmpty = (value: number | null, format: (v: number) => string) =>
  value === null ? DETAIL.emptyValue : format(value);

interface RecommendationCardProps {
  recommendation: ReportRecommendation;
}

/**
 * 코치 추천 카드 (`FE-REQ-026` A · B · C · D).
 *
 * ## 게이트는 카드 자신이 한다 (FR-1)
 *
 * `renderable: false` 면 `BlockedNotice` 다. 막힌 분기에는 행동 · 종목 · 점수가 **타입에 없다.**
 * `true` 여도 3종 세트를 한 번 더 본다(`passesRecommendationGate`) — 비었으면 계약 위반이라
 * 막힘 문구가 아니라 "불러올 수 없음"이다. 우회 prop 은 없다(FR-5).
 *
 * ## 3종이 한 화면에 있다 (FR-4)
 *
 * 근거 · 과거 성적 · 틀렸던 때를 **접지 않고** 차례로 둔다. 접는 것은 점수 기여도(`topFactors`)
 * 하나다(FR-7 · FR-33).
 */
export const RecommendationCard = ({ recommendation }: RecommendationCardProps) => {
  if (!recommendation.renderable) {
    return (
      <BlockedNotice
        reason={recommendation.blockedReason}
        sample={recommendation.trackSample}
      />
    );
  }

  if (!passesRecommendationGate(recommendation)) {
    return <Text color="tertiary">{REPORT.blockUnavailable}</Text>;
  }

  const {
    action,
    symbol,
    score,
    scoreNote,
    reasons,
    topFactors,
    signalTrackRecord: record,
    failureCases,
    explanation: note,
  } = recommendation;
  const tone = record.lowSample ? "lowSample" : "normal";
  const signalName = REPORT.signalTypes[record.signalType];

  return (
    <>
      <div className={recommendationHead}>
        <Badge tone={ACTION_TONE[action]}>
          <span aria-hidden="true">{REPORT.actionGlyphs[action]} </span>
          {REPORT.actions[action]}
        </Badge>
        <p className={recommendationSymbol}>{symbol}</p>
      </div>

      <p className={scoreRow}>
        <span aria-hidden="true">{COACH_MESSAGES.score(score)}</span>
        <span className={srOnly}>{COACH_MESSAGES.scoreAccessible(score)}</span>
        <span className={scoreNoteText}>{scoreNote}</span>
      </p>

      <section className={detailSection}>
        <Heading level={5} color="tertiary">
          {REPORT.reasonsHeading}
        </Heading>
        <ul className={plainList}>
          {reasons.map((reason, index) => (
            <li key={`${reason.type}-${index}`}>{reason.message}</li>
          ))}
        </ul>
        {topFactors.length > 0 && (
          <details className={factorDetails}>
            <summary className={factorSummary}>{REPORT.factorsSummary}</summary>
            <ul className={plainList}>
              {topFactors.map((factor) => (
                <li key={factor.key} className={factorRow}>
                  <span>{factor.message}</span>
                  <span>{REPORT.factorScore(factor.score)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className={detailSection}>
        <Heading level={5} color="tertiary">
          {REPORT.trackRecordHeading}
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
          {[signalName, REPORT.trackSample(record.sample)].filter(Boolean).join(" · ")}
          {record.lowSample && ` · ${COACH_MESSAGES.lowSample}`}
        </p>
      </section>

      <section className={detailSection}>
        <Heading level={5} color="tertiary">
          {REPORT.failureHeading}
        </Heading>
        <ul className={factList}>
          {failureCases.map((item, index) => (
            <li key={`${item.date}-${index}`} className={failureItem}>
              <span className={failureDate}>{item.date}</span>
              <span>{item.event}</span>
              <span>{item.outcome}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className={explanation}>
        <span>
          {note.source === "llm" ? (
            <Badge size="sm" tone="ai">
              {REPORT.aiBadge}
            </Badge>
          ) : (
            <Badge size="sm" tone="neutral">
              {REPORT.ruleBadge}
            </Badge>
          )}
        </span>
        <span>{note.text}</span>
      </p>
    </>
  );
};

export default RecommendationCard;
