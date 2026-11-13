"use client";

import type { TradeCheckResult, TradeCheckSide } from "@repo/core/coach";
import { SegmentedControl, type SegmentedOption } from "@repo/ui/segmentedControl";
import { Skeleton } from "@repo/ui/skeleton";
import { StatusLine } from "@repo/ui/statusLine";
import { useState } from "react";

import { useTradeCheck } from "@/entities/coach";

import { TRADE_CHECK_MESSAGES as M } from "../model/messages";
import * as s from "./TradeCheckCard.css";

const SIDES: SegmentedOption<TradeCheckSide>[] = [
  { label: M.sides.buy, value: "buy" },
  { label: M.sides.sell, value: "sell" },
];

const DOT_INDEXES = Array.from({ length: 100 }, (_, i) => i);

/** 100칸 점 — 그림이다(`aria-hidden`). 숫자는 바로 위 서버 문장에 같이 있다 */
const Dots = ({ filled }: { filled: number }) => (
  <div className={s.dots} aria-hidden="true" title={M.dotsLabel(filled)}>
    {DOT_INDEXES.map((i) => (
      <span key={i} className={i < filled ? `${s.dot} ${s.dotOn}` : s.dot} />
    ))}
  </div>
);

/**
 * 조건이 없을 때 한 줄 이유 — 서버 사유 코드로 고른다. `none_matched` 는 서버 문장이 이미 "평소엔 …"이라 말해
 * 줄을 더하지 않는다(같은 말 두 번)
 */
const reasonLine = (view: TradeCheckResult): string | null => {
  if (view.status !== "no_condition") return null;
  if (view.conditionReason === "stale_reference") return M.staleReference;
  if (view.conditionReason === "not_covered") return M.notCovered;
  return null;
};

const Details = ({ view }: { view: TradeCheckResult }) => {
  const lines: string[] = [];
  if (view.side === "sell") lines.push(view.holding ? M.realized(view.holding.realizedPct) : M.noHolding);
  for (const h of view.horizons) {
    const range = view.side === "buy" ? h.range : h.hold.range;
    if (h.status === "below_min" || !range) lines.push(M.horizonBelowMin(h.label));
    else lines.push(view.side === "buy" ? M.horizonBuy(h.label, range.text) : M.horizonHold(h.label, range.text));
  }
  if (view.alsoMatched.length > 0) lines.push(M.alsoMatched(view.alsoMatched.map((m) => m.phrase)));
  lines.push(M.costNote[view.market], view.disclaimer);
  return (
    <details className={s.more}>
      <summary className={s.moreSummary}>{M.more}</summary>
      <ul className={s.moreList}>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </details>
  );
};

interface TradeCheckCardProps {
  symbol: string | undefined;
  /**
   * 이름 칩 없이 — 한 장 패널의 '이런 상황 뒤 보통은' 줄 안에 놓일 때(줄 이름이 제목이다, F017 v4 1e). 방향 전환은 그대로
   */
  bare?: boolean;
}

/**
 * 사기 전 · 팔기 전 점검 — AI 패널 맨 위 쉬운 한 줄(F017 v2 단계 2 · `FE-REQ-064` FR-3).
 *
 * 한 줄은 **서버 문장 그대로**(숫자 · 조건 · 기간이 한 문장). 그 아래 100칸 점(분모 고정 · 방향 색 없음) ·
 * 표본 한 줄 · 펼침(기간별 분포 · 팔기 전 확정 수익률). 표본이 모자라면 서버가 비율 없이 이유 문장을 주고 점을 그리지 않는다.
 * 로그아웃이면 그리지 않는다 — 패널이 이미 로그인 안내를 둔다.
 */
export const TradeCheckCard = ({ symbol, bare = false }: TradeCheckCardProps) => {
  const [side, setSide] = useState<TradeCheckSide>("buy");
  const { data, isPending, isError, isSignedOut } = useTradeCheck(symbol, side);
  if (isSignedOut || !symbol) return null;

  const body = () => {
    if (isError) return <StatusLine kind="error">{M.unavailable}</StatusLine>;
    if (isPending || !data) return <Skeleton lines={3} height={16} />;
    const reason = reasonLine(data);
    return (
      <>
        <p className={s.summary}>{data.summary}</p>
        {data.dots !== null && <Dots filled={data.dots} />}
        {/* 조건이 없으면 숫자는 평소 값이다 — '비슷한 상황 n번'이라 부르지 않고 이유만 */}
        {reason !== null && <p className={s.meta}>{reason}</p>}
        {data.status !== "no_condition" && data.sample !== null && data.sampleDays !== null && (
          <p className={s.meta}>{M.sampleLine(data.sample, data.sampleDays)}</p>
        )}
        {data.condition?.describeOnly && <p className={s.meta}>{M.describeOnly}</p>}
        {data.recentDiffers === true && data.status !== "no_condition" && <p className={s.meta}>{M.recentDiffers}</p>}
        <Details view={data} />
      </>
    );
  };

  return (
    <section className={s.card} aria-label={M.heading}>
      <div className={s.headRow}>
        {!bare && <span className={s.nameChip}>{M.heading}</span>}
        <SegmentedControl options={SIDES} value={side} onChange={setSide} label={M.sideGroupLabel} />
      </div>
      {body()}
    </section>
  );
};
