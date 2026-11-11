"use client";

import type { ScenarioHorizonKey, ScenarioHorizonView, SymbolScenarioResult } from "@repo/core/coach";
import { SegmentedControl, type SegmentedOption } from "@repo/ui/segmentedControl";
import { StatusLine } from "@repo/ui/statusLine";
import { useState } from "react";

import { formatPrice } from "@repo/web-shared/lib";

import { formatRatio } from "../lib";
import { SCENARIO_MESSAGES as M } from "../model";
import * as s from "./DirectionScenarioCard.css";

const MINUS = "−";
/** 서버가 준 %(기준 가격 대비)를 부호와 함께 — 계산 없이 표기만 */
const signedPct = (pct: number) => (pct === 0 ? "0%" : `${pct > 0 ? "+" : MINUS}${Math.abs(pct).toFixed(1)}%`);
const shortDate = (iso: string) => iso.slice(0, 10);

const HORIZONS: SegmentedOption<ScenarioHorizonKey>[] = (["1h", "4h", "1d"] as const).map((h) => ({
  label: M.horizons[h],
  value: h,
}));

/** 범위 띠 좌표 — 0 과 세 분위가 다 들어오는 대칭 축(그리기 좌표만) */
const Band = ({ low, mid, high }: { low: number; mid: number; high: number }) => {
  const span = Math.max(Math.abs(low), Math.abs(high), 0.1) * 1.15;
  const x = (v: number) => `${((v + span) / (2 * span)) * 100}%`;
  return (
    <div className={s.band} aria-hidden="true">
      <span className={s.bandZero} style={{ left: x(0) }} />
      <span className={s.bandFill} style={{ left: x(low), right: `calc(100% - ${x(high)})` }} />
      <span className={s.bandMid} style={{ left: x(mid) }} />
    </div>
  );
};

const Track = ({ view }: { view: ScenarioHorizonView }) => {
  const t = view.track;
  if (!t || t.hitRate === null || t.alwaysUpRate === null || t.alwaysNotUpRate === null) return null;
  return (
    <>
      <p className={s.meta}>
        {M.trackHeading(t.origin)} · {M.trackLine(t.calls, t.hits)}
      </p>
      <div className={s.trackBars} aria-hidden="true">
        {(
          [
            [M.trackThis, t.hitRate, s.trackFill.model],
            [M.trackAlwaysUp, t.alwaysUpRate, s.trackFill.baseline],
            [M.trackAlwaysNotUp, t.alwaysNotUpRate, s.trackFill.baseline],
          ] as const
        ).map(([label, rate, fill]) => (
          <div key={label} className={s.trackRow}>
            <span>{label}</span>
            <span className={s.trackBar}>
              <span className={fill} style={{ display: "block", width: `${Math.round(rate * 100)}%` }} />
            </span>
            <span>{formatRatio(rate)}</span>
          </div>
        ))}
      </div>
    </>
  );
};

const Misses = ({ view }: { view: ScenarioHorizonView }) => {
  const t = view.track;
  if (!t) return null;
  const lines = t.misses.map((m) =>
    M.missLine(shortDate(m.asOf), m.symbol.replace(/^KRW-/, ""), formatRatio(m.pUp), signedPct(m.realizedPct))
  );
  if (t.window) lines.push(M.trackWindow(shortDate(t.window.from), shortDate(t.window.to)));
  if (lines.length === 0) return null;
  return (
    <details className={s.more}>
      <summary className={s.moreSummary}>{M.missesSummary}</summary>
      <ul className={s.moreList}>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </details>
  );
};

const Shown = ({ view }: { view: ScenarioHorizonView }) => {
  if (view.pUp === null || view.upOutOf100 === null || !view.range || view.invalidation === null) return null;
  const up = view.upOutOf100;
  return (
    <>
      <div className={s.oddsRow}>
        <span className={s.oddsLabel}>
          {view.label} {M.upProbability}
        </span>
        <span className={s.oddsValue}>{up}%</span>
      </div>
      <div className={s.split} aria-hidden="true">
        <span className={s.splitPart.up} style={{ width: `${up}%` }} />
        <span className={s.splitPart.down} style={{ width: `${100 - up}%` }} />
      </div>
      <p className={s.line}>{M.oddsLine(up)}</p>
      <Band low={view.range.lowPct} mid={view.range.midPct} high={view.range.highPct} />
      <p className={s.line}>
        {M.rangeLine(view.label, signedPct(view.range.lowPct), signedPct(view.range.highPct), signedPct(view.range.midPct))}
      </p>
      <p className={s.meta}>{M.invalidation(`${formatPrice(view.invalidation)}원`)}</p>
      <Track view={view} />
      <Misses view={view} />
    </>
  );
};

const Blocked = ({ view }: { view: ScenarioHorizonView }) => {
  const t = view.track;
  return (
    <>
      <p className={s.blockedTitle}>{M.blockedTitle}</p>
      <p className={s.meta}>{M.reasons[view.blockedReason ?? "not_tested"] ?? M.reasons.not_tested}</p>
      {t && t.hitRate !== null && t.alwaysUpRate !== null && t.alwaysNotUpRate !== null && (
        <p className={s.meta}>
          {M.blockedTrack(t.calls, formatRatio(t.hitRate), formatRatio(t.alwaysUpRate), formatRatio(t.alwaysNotUpRate))}
        </p>
      )}
      <Misses view={view} />
    </>
  );
};

interface DirectionScenarioCardProps {
  result: SymbolScenarioResult;
  className?: string;
}

/**
 * 시나리오 카드 — 다음 1시간 · 4시간 · 1일 오를 확률(F017 v2 단계 5 · `FE-REQ-064` FR-4). 변동 범위(대칭) 카드 자리를 대신한다.
 *
 * 숫자는 전부 서버 값이다(확률 · 범위 · 무효선 · 성적). 여기서 하는 계산은 **그리기 좌표**뿐이다.
 * 시험을 못 넘은 지평은 "지금은 방향이 안 보여요 — 이유" + 시험 성적 — 대칭 범위로 채우지 않는다.
 * 확률은 혼자 나가지 않는다 — 같은 카드에 "100번 중" 문장 · 확신 때 성적 vs 늘 오른다 · 빗나간 때.
 */
export const DirectionScenarioCard = ({ result, className }: DirectionScenarioCardProps) => {
  const firstOpen = result.status === "ok" ? result.horizons.find((h) => h.renderable)?.horizon : undefined;
  const [picked, setPicked] = useState<ScenarioHorizonKey | null>(null);

  if (result.status !== "ok") {
    return (
      <section className={`${className ?? ""} ${s.card}`} aria-label={M.heading}>
        <span className={s.nameChip}>{M.heading}</span>
        <StatusLine kind="error">{M.unavailable}</StatusLine>
      </section>
    );
  }

  const key = picked ?? firstOpen ?? "1h";
  const view = result.horizons.find((h) => h.horizon === key);

  return (
    <section className={`${className ?? ""} ${s.card}`} aria-label={M.heading}>
      <div className={s.headRow}>
        <span className={s.nameChip}>{M.heading}</span>
        <SegmentedControl options={HORIZONS} value={key} onChange={setPicked} label={M.horizonGroupLabel} />
      </div>
      {view && (view.renderable ? <Shown view={view} /> : <Blocked view={view} />)}
      <p className={s.meta}>{result.disclaimer}</p>
    </section>
  );
};
