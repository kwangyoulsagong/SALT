"use client";

import type { CoachMode, SymbolCoachViewModel } from "@repo/core/coach";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Heading } from "@repo/ui/heading";
import { Text } from "@repo/ui/text";

import {
  JudgmentCases,
  selectModeView,
  TrackRecordStats,
} from "@/entities/coach";
import { HTTP_STATUS_CODE } from "@/shared/config";
import { formatClockTime } from "@/shared/lib";

import { ExplainApiError, useExplainSymbol } from "../api";
import {
  buildExplainRequest,
  type CoachExplanation,
  EXPLAIN_MESSAGES,
  type ExplainSubject,
} from "../model";
import { card, cardHeader, list, note, section } from "./ExplainCard.css";

const M = EXPLAIN_MESSAGES;

const ListSection = ({ title, items }: { title: string; items: readonly string[] }) =>
  items.length === 0 ? null : (
    <section className={section}>
      <Heading level={5} color="tertiary">
        {title}
      </Heading>
      <ul className={list}>
        {items.map((item, index) => (
          <li key={`${index}-${item}`}>{item}</li>
        ))}
      </ul>
    </section>
  );

/** 서버 해설. `timeframe` 은 그리지 않는다(FR-136) */
const Explanation = ({ data }: { data: CoachExplanation }) => (
  <>
    <section className={section}>
      <Heading level={5} color="tertiary">
        {M.modeReasoningHeading}
      </Heading>
      <Text>{data.modeReasoning}</Text>
    </section>
    <ListSection title={M.keyDriversHeading} items={data.keyDrivers} />
    <ListSection title={M.risksHeading} items={data.risks} />
    <ListSection title={M.newsHeading} items={data.newsSummary.slice(0, 5)} />
    <p className={note}>{data.disclaimer}</p>
  </>
);

interface ExplainCardProps {
  view: SymbolCoachViewModel;
  mode: CoachMode;
  /** 시세 목록에서 찾은 종목. 없으면 요청할 재료(이름 · 거래대금)가 없다 */
  subject: ExplainSubject | null;
  /**
   * 카드 상자 스타일. 부르는 쪽이 준다 — 상자를 바깥에 두면 판단이 막혀 이 카드가 `null` 일 때
   * **빈 상자가 남는다**(2026-09-22 실측). 게이트가 상자까지 가져간다
   */
  className?: string;
}

/**
 * Gemini 해설 카드 (`FE-REQ-026` FR-135 · FR-136 · `FE-REQ-028` FR-10~13 · FR-62).
 *
 * - **판단이 막힌 모드에는 카드가 없다** — 버튼도 없다(FR-135). 게이트는 뷰모델의 `renderable`
 * - 누를 때만 부른다. 결과 · 실패는 이 카드 안에서 끝난다 — 화면 전체 오류가 0건이다
 * - 같은 카드 안에 **적중률 · 사례**(3종의 나머지 둘)를 둔다. 해설만 떼어 읽히지 않게
 * - 모드가 바뀌면 부르는 쪽이 `key={mode}` 로 새로 만든다(FR-138) — 진행 중 요청은 끊긴다
 */
export const ExplainCard = ({ view, mode, subject, className }: ExplainCardProps) => {
  const explain = useExplainSymbol();
  const modeView = selectModeView(view, mode);
  if (!modeView?.renderable) return null;

  const body = subject ? buildExplainRequest(view, mode, subject) : null;
  const error = explain.error;
  const busy =
    error instanceof ExplainApiError &&
    error.status === HTTP_STATUS_CODE.TOO_MANY_REQUESTS;
  const ruleBased = Boolean(error) && !busy;

  const rendered = explain.data?.renderable ? explain.data : null;

  const renderBody = () => {
    if (rendered) return <Explanation data={rendered} />;
    if (explain.data) return <p className={note}>{M.blocked}</p>;
    if (ruleBased) {
      // FR-62 — 규칙 기반 문장. 서버가 만든 판단의 headline · 근거를 그대로 보여 준다
      return (
        <>
          <p className={note}>{M.ruleBasedNote}</p>
          <Text>{modeView.judgment.headline}</Text>
          <ListSection title={M.keyDriversHeading} items={modeView.judgment.reasons} />
        </>
      );
    }
    return (
      <>
        <Button
          variant="outline"
          loading={explain.isPending}
          disabled={!body}
          onClick={() => body && explain.request(body)}
        >
          {M.open}
        </Button>
        {!body && <p className={note}>{M.subjectMissing}</p>}
        {busy && <p className={note}>{M.busy}</p>}
      </>
    );
  };

  return (
    <section
      className={className ? `${card} ${className}` : card}
      aria-busy={explain.isPending || undefined}
    >
      <div className={cardHeader}>
        <Heading level={4}>{M.heading}</Heading>
        {rendered && (
          <>
            <Badge size="sm" tone="ai">
              {M.aiBadge}
            </Badge>
            <span className={note}>
              {M.generatedAt(formatClockTime(new Date(rendered.generatedAt)))}
            </span>
          </>
        )}
        {ruleBased && (
          <Badge size="sm" tone="neutral">
            {M.ruleBasedBadge}
          </Badge>
        )}
      </div>
      {renderBody()}
      <TrackRecordStats record={modeView.trackRecord} />
      <JudgmentCases cases={modeView.failureCases} />
    </section>
  );
};

export default ExplainCard;
