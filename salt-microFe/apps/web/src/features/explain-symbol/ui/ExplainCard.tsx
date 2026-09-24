"use client";

import type { ReactNode } from "react";

import type { CoachMode, ExplainSections, SymbolCoachViewModel } from "@repo/core/coach";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Heading } from "@repo/ui/heading";
import { Text } from "@repo/ui/text";

import { JudgmentCases, selectModeView, TrackRecordStats } from "@/entities/coach";
import { formatClockTime } from "@/shared/lib";

import { useExplainStream } from "../api";
import { buildExplainRequest, EXPLAIN_MESSAGES, type ExplainStreamState } from "../model";
import { ExplainSteps } from "./ExplainSteps";
import * as s from "./ExplainCard.css";
import { useReveal } from "./useReveal";

const M = EXPLAIN_MESSAGES;

type Block = { key: string; heading: string | null; text: string; list: boolean };

/** 본문 칸을 드러낼 순서로 편다. 제목은 그 칸의 첫 줄에만 붙는다 */
const toBlocks = (sections: ExplainSections): Block[] => [
  ...(sections.modeReasoning
    ? [{ key: "mode", heading: M.modeReasoningHeading, text: sections.modeReasoning, list: false }]
    : []),
  ...(
    [
      ["keyDrivers", M.keyDriversHeading],
      ["risks", M.risksHeading],
      ["newsSummary", M.newsHeading],
    ] as const
  ).flatMap(([field, heading]) =>
    sections[field].slice(0, 5).map((text, i) => ({ key: `${field}-${i}`, heading: i === 0 ? heading : null, text, list: true })),
  ),
];

/** 흐르는 해설 본문 — 도착한 글자를 타자처럼 드러내고, 드러나는 중인 줄 끝에 커서를 둔다 */
const StreamedBody = ({ state, footer }: { state: ExplainStreamState; footer: ReactNode }) => {
  const blocks = toBlocks(state.sections);
  const total = blocks.reduce((sum, b) => sum + b.text.length, 0);
  // 바뀐 문장(replace)은 다시 치지 않는다 — 이미 읽은 사람이 처음부터 기다리지 않게 한 번에 바꾼다
  const shown = useReveal(total, state.replaced);
  const typing = shown < total || state.status === "streaming";

  let budget = shown;
  const visible = blocks.map((b) => {
    const count = Math.max(0, Math.min(b.text.length, budget));
    budget -= b.text.length;
    return { ...b, visible: b.text.slice(0, count), started: count > 0, finished: count === b.text.length };
  });
  const cursorAt = visible.findIndex((b) => !b.finished);
  const newsDone = visible.filter((b) => b.key.startsWith("newsSummary")).every((b) => b.finished);

  return (
    <div className={state.replaced ? s.bodyReplaced : s.body} key={state.replaced ? "replaced" : "draft"}>
      {visible.map((b, i) =>
        b.started ? (
          <div key={b.key} className={b.heading ? s.blockFirst : s.block}>
            {b.heading && (
              <Heading level={5} color="tertiary">
                {b.heading}
              </Heading>
            )}
            <p className={b.list ? s.bullet : s.paragraph}>
              {b.visible}
              {typing && i === (cursorAt === -1 ? visible.length - 1 : cursorAt) && (
                <span className={s.caret} aria-hidden="true" />
              )}
            </p>
          </div>
        ) : null,
      )}
      {state.citations.length > 0 && state.sections.newsSummary.length > 0 && newsDone && (
        <ul className={s.chips} aria-label={M.citationsLabel}>
          {state.citations
            .filter((c) => c.source)
            .map((c) => (
              <li key={`${c.source}-${c.title}`} className={s.chip} title={c.title}>
                {c.source}
              </li>
            ))}
        </ul>
      )}
      {/* 알림(바뀜 · 규칙 기반)은 글자가 다 드러난 뒤에 — 읽는 중에 끼어들지 않는다 */}
      {!typing && footer}
    </div>
  );
};

interface ExplainCardProps {
  view: SymbolCoachViewModel;
  mode: CoachMode;
  /**
   * 카드 상자 스타일. 부르는 쪽이 준다 — 상자를 바깥에 두면 판단이 막혀 이 카드가 `null` 일 때
   * **빈 상자가 남는다**(2026-09-22 실측). 게이트가 상자까지 가져간다
   */
  className?: string;
}

/**
 * AI 해설 카드 — **스트림** (F008 `FE-REQ-038` FR-7 · FEATURE-008 FR-47 · FR-60~64, 이전 `FE-REQ-026` FR-135).
 *
 * - 판단이 막힌 모드에는 카드가 없다 — 버튼도 없다(FR-135)
 * - 누르면 단계가 하나씩 켜지고(실제 서버 작업), 근거 문장이 타자처럼 흐른다. 검사를 통과한 AI 문장이
 *   오면 한 번에 바뀌고 그 사실을 알린다. AI 가 실패하면 흐른 문장이 최종이고 "규칙 기반 설명" 배지가 붙는다
 * - 같은 카드 안에 **적중률 · 사례**(3종의 나머지 둘)를 둔다. 해설만 떼어 읽히지 않게
 * - 모드가 바뀌면 부르는 쪽이 `key={mode}` 로 새로 만든다 — 진행 중 스트림은 끊긴다
 */
export const ExplainCard = ({ view, mode, className }: ExplainCardProps) => {
  const { state, request } = useExplainStream();
  const modeView = selectModeView(view, mode);
  if (!modeView?.renderable) return null;

  const body = buildExplainRequest(view, mode);
  const started = state.status !== "idle" && state.status !== "busy";
  const finished = state.status === "done";
  const ruleBased = finished && state.source === "template";

  const renderBody = () => {
    if (state.status === "blocked") return <p className={s.note}>{M.blocked}</p>;
    if (state.status === "failed") {
      // 글자 하나 못 받았다 — 서버가 만든 판단의 headline · 근거를 그대로 보여 준다(FR-62)
      return (
        <>
          <p className={s.note}>{M.ruleBasedNote}</p>
          <Text>{modeView.judgment.headline}</Text>
          <ul className={s.list}>
            {modeView.judgment.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </>
      );
    }
    if (started) {
      return (
        <>
          <ExplainSteps steps={state.steps} />
          <StreamedBody
            state={state}
            footer={
              state.replaced ? (
                <p className={s.flash} role="status">
                  {state.droppedSentences > 0 ? M.droppedNote(state.droppedSentences) : M.replacedNote}
                </p>
              ) : ruleBased ? (
                <p className={s.flash}>{M.templateNote}</p>
              ) : null
            }
          />
        </>
      );
    }
    return (
      <>
        <Button variant="primary" fullWidth disabled={!body} onClick={() => body && request(body)}>
          {M.open}
        </Button>
        {state.status === "busy" && <p className={s.note}>{M.busy}</p>}
      </>
    );
  };

  return (
    <section
      className={className ? `${s.card} ${className}` : s.card}
      aria-busy={state.status === "streaming" || undefined}
    >
      <div className={s.cardHeader}>
        <Heading level={4}>{M.heading}</Heading>
        {finished && !ruleBased && (
          <>
            <Badge size="sm" tone="ai">
              {M.aiBadge}
            </Badge>
            {state.generatedAt && (
              <span className={s.note}>{M.generatedAt(formatClockTime(new Date(state.generatedAt)))}</span>
            )}
          </>
        )}
        {(ruleBased || state.status === "failed") && (
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
