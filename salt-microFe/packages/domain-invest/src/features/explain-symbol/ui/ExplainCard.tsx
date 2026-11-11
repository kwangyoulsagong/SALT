"use client";

import { useEffect, useState } from "react";

import type { CoachMode, ExplainSection, ExplanationCitation, SymbolExplanation } from "@repo/core/coach";
import { Badge } from "@repo/ui/badge";
import { Skeleton } from "@repo/ui/skeleton";
import { StatusLine } from "@repo/ui/statusLine";

import { useSymbolExplanation } from "@/entities/coach";
import { formatClockTime, formatRelativeTime } from "@repo/web-shared/lib";

import { EXPLAIN_MESSAGES as M } from "../model";
import * as s from "./ExplainCard.css";

/** 짧은 대기엔 아무것도 그리지 않는다 — 반짝임이 깜빡 지나가면 더 느려 보인다(`FE-REQ-064` FR-2) */
const SKELETON_DELAY_MS = 1_000;
/** 문장 차례 등장 간격 · 상한 — 다 합쳐 1초 안(`motion.md` §4-1) */
const SENTENCE_STAGGER_MS = 60;
const SENTENCE_STAGGER_MAX = 12;

const SECTION_ORDER: { section: ExplainSection; heading: string }[] = [
  { section: "modeReasoning", heading: M.modeReasoningHeading },
  { section: "keyDrivers", heading: M.keyDriversHeading },
  { section: "risks", heading: M.risksHeading },
  { section: "newsSummary", heading: M.newsHeading },
];

/** 출처 번호 — 해설 전체에서 처음 나온 순서로 1, 2, 3 … (같은 사실은 같은 번호) */
const numberCitations = (view: SymbolExplanation): Map<string, number> => {
  const numbers = new Map<string, number>();
  for (const sentence of view.sentences) {
    for (const c of sentence.citations) if (!numbers.has(c.id)) numbers.set(c.id, numbers.size + 1);
  }
  return numbers;
};

const whenOf = (at: string | null): string => (at ? formatRelativeTime(at) : "");

const Sources = ({ citations }: { citations: ExplanationCitation[] }) => (
  <ul className={s.sources} aria-label={M.citationListLabel}>
    {citations.map((c) => (
      <li key={c.id} className={s.sourceRow}>
        <span>{M.citationLine(c.label, whenOf(c.at))}</span>
        {c.url && (
          // 새 탭 + `noopener` — 없으면 열린 문서가 `window.opener` 로 이 탭을 조작할 수 있다
          <a className={s.sourceLink} href={c.url} target="_blank" rel="noopener noreferrer" aria-label={M.citationLinkLabel(c.label)}>
            {M.citationOpen}
          </a>
        )}
      </li>
    ))}
  </ul>
);

const Sentence = ({
  text,
  citations,
  numbers,
  order,
}: {
  text: string;
  citations: ExplanationCitation[];
  numbers: Map<string, number>;
  order: number;
}) => {
  const [open, setOpen] = useState(false);
  const delay = `${Math.min(order, SENTENCE_STAGGER_MAX) * SENTENCE_STAGGER_MS}ms`;
  return (
    <div>
      <p className={s.sentence} style={{ animationDelay: delay }}>
        {text}
        {citations.map((c) => (
          <button
            key={c.id}
            type="button"
            className={s.chip}
            aria-expanded={open}
            aria-label={M.citationChipLabel(numbers.get(c.id) ?? 0, c.label)}
            onClick={() => setOpen((v) => !v)}
          >
            {numbers.get(c.id)}
          </button>
        ))}
      </p>
      {open && <Sources citations={citations} />}
    </div>
  );
};

const Body = ({ view }: { view: SymbolExplanation }) => {
  const numbers = numberCitations(view);
  let order = 0;
  return (
    <>
      {SECTION_ORDER.map(({ section, heading }) => {
        const rows = view.sentences.filter((x) => x.section === section);
        if (rows.length === 0) return null;
        return (
          <div key={section} className={s.block}>
            <h5 className={s.blockHeading}>{heading}</h5>
            {rows.map((row, i) => (
              <Sentence key={`${section}-${i}`} text={row.text} citations={row.citations} numbers={numbers} order={order++} />
            ))}
          </div>
        );
      })}
    </>
  );
};

/** 머리 오른쪽 — 단마다 한 줄. AI 표시는 AI 가 쓴 단(`latest` · `previous`)에만 */
const TierNote = ({ view }: { view: SymbolExplanation }) => {
  const at = new Date(view.generatedAt);
  if (view.tier === "latest") return <span className={s.note}>{M.latestAt(formatClockTime(at), view.provider)}</span>;
  if (view.tier === "previous") return <span className={s.note}>{M.previousAt(formatClockTime(at))}</span>;
  if (view.tier === "template") return <span className={s.note}>{M.templateNote}</span>;
  return <span className={s.note}>{M.noneNote}</span>;
};

interface ExplainCardProps {
  symbol: string;
  mode: CoachMode;
  /** 카드 상자 스타일 — 부르는 쪽이 준다 */
  className?: string;
}

/**
 * AI 해설 칸 — **늘 보인다**(F017 v2 단계 3 · `FE-REQ-064` FR-2). 버튼 · 스트림 · 기다림이 없다: 서버가 미리 만든 해설을 읽는다.
 *
 * 4단 — 최신 AI(정리 시각 · 공급자) · 이전 AI("HH:MM에 정리") · 사실표 문장(AI 표시 없음) · "특이 소식이 없어요" + 판단 근거.
 * 문장마다 끝에 출처 번호 칩 — 누르면 그 사실의 이름 · 시각(· 기사 원문). 1초 안의 대기엔 아무것도 그리지 않고, 그 뒤 반짝임.
 * 문장은 차례로 짧게 떠오른다(줄인 모션이면 바로). 로그아웃이면 그리지 않는다 — 패널이 이미 로그인 안내를 둔다
 */
export const ExplainCard = ({ symbol, mode, className }: ExplainCardProps) => {
  const { data, isPending, isError, isSignedOut } = useSymbolExplanation(symbol, mode);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!isPending) return;
    setSlow(false);
    const timer = setTimeout(() => setSlow(true), SKELETON_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isPending]);

  if (isSignedOut) return null;

  const body = () => {
    if (isError && !data) return <StatusLine kind="error">{M.unavailable}</StatusLine>;
    if (!data) return slow ? <Skeleton lines={4} height={16} /> : null;
    return (
      <>
        {data.tier === "none" && <p className={s.sentence}>{M.noneHeading}</p>}
        {/* 면책은 판단 카드가 이미 그린다 — 같은 문장 두 번 0 */}
        <Body view={data} />
      </>
    );
  };

  return (
    <section className={className ? `${s.card} ${className}` : s.card} aria-label={M.heading} aria-busy={isPending || undefined}>
      <div className={s.cardHeader}>
        {/* 제목 단 — 칸 안 묶음 제목이 h5 라 이름 칩이 h4(axe heading-order, 2026-11-11 실화면) */}
        <h4 className={s.nameChip}>{M.heading}</h4>
        {data?.aiGenerated && (
          <Badge size="sm" tone="ai">
            {M.aiBadge}
          </Badge>
        )}
        {data && <TierNote view={data} />}
      </div>
      {body()}
    </section>
  );
};

export default ExplainCard;
