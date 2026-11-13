"use client";

import type { ScenarioHorizonKey, ScenarioHorizonView, SymbolScenarioResult, ScenarioTrack } from "@repo/core/coach";
import { kstClock, kstMonthDay } from "@repo/core/marketKr";
import { SegmentedControl, type SegmentedOption } from "@repo/ui/segmentedControl";
import { Skeleton } from "@repo/ui/skeleton";
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
const count = (n: number) => n.toLocaleString("ko-KR");

const HORIZON_KEYS = ["1h", "4h", "1d", "5d"] as const;
const HORIZONS: SegmentedOption<ScenarioHorizonKey>[] = HORIZON_KEYS.map((h) => ({ label: M.horizons[h], value: h }));
/** 처음 보이는 기간 — 제 기록이 있는 하루(장중 기간은 아직 하루 값을 빌린다) */
const DEFAULT_HORIZON: ScenarioHorizonKey = "1d";

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

const Track = ({ track: t }: { track: ScenarioTrack | null }) => {
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

const Misses = ({ track: t }: { track: ScenarioTrack | null }) => {
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

/** 큰 숫자 — "100번 중 n번 올랐어요 (n%)" + 오른 몫 · 안 오른 몫 막대. 횟수와 % 를 같이(색만으로 말하지 않는다) */
const BigNumber = ({ context, up }: { context: string; up: number }) => (
  <div className={s.big}>
    <span className={s.context}>
      {context} · {M.outOf100}
    </span>
    <p className={s.oddsRow}>
      <span className={s.oddsValue}>{up}</span>
      <span className={s.oddsSuffix}>
        {M.upSuffix} <span className={s.oddsPct}>{M.upPct(up)}</span>
      </span>
    </p>
    <div className={s.split} aria-hidden="true">
      <span className={s.splitPart.up} style={{ width: `${up}%` }} />
      <span className={s.splitPart.down} style={{ width: `${100 - up}%` }} />
    </div>
    <div className={s.splitLabels}>
      <span className={s.splitLabel.up}>{M.upLabel(up)}</span>
      <span className={s.splitLabel.down}>{M.notUpLabel(100 - up)}</span>
    </div>
  </div>
);

const RangeLines = ({ view, past }: { view: ScenarioHorizonView; past: boolean }) => {
  if (!view.range) return null;
  const price = view.invalidation === null ? null : `${formatPrice(view.invalidation)}원`;
  return (
    <>
      <Band low={view.range.lowPct} mid={view.range.midPct} high={view.range.highPct} />
      <p className={s.line}>
        {M.rangeLine(signedPct(view.range.lowPct), signedPct(view.range.highPct), signedPct(view.range.midPct))}
      </p>
      {price && <p className={s.meta}>{past ? M.invalidationPast(price) : M.invalidation(price)}</p>}
    </>
  );
};

/** 모델 확률 — 시험을 넘은 칸(소유자) */
const Model = ({ view }: { view: ScenarioHorizonView }) => {
  if (view.upOutOf100 === null) return null;
  return (
    <>
      <BigNumber context={view.label} up={view.upOutOf100} />
      <p className={s.line}>{M.oddsLine(view.upOutOf100)}</p>
      <RangeLines view={view} past={false} />
      <Track track={view.track} />
      <Misses track={view.track} />
    </>
  );
};

/** 과거 실제 결과 — 지금 조건 · 평소 · 한 단계 긴 지평. 예측이라 부르지 않는다 */
const Past = ({ view }: { view: ScenarioHorizonView }) => {
  const basis = view.basis;
  if (view.upOutOf100 === null || !basis) return null;
  // 숫자가 속한 기간 — 빌려 왔으면 그 지평의 이름으로 말한다
  const label = view.fallbackLabel ?? view.label;
  const context = basis.condition ? M.contextCondition(basis.condition.phrase, label) : M.contextUsual(label);
  const usual = basis.usualUpOutOf100;
  return (
    <>
      {view.fallbackLabel && <p className={s.fallback}>{M.fallback(view.label, view.fallbackLabel)}</p>}
      <BigNumber context={context} up={view.upOutOf100} />
      {basis.condition && usual !== null && (
        <p className={s.line}>{basis.differsFromUsual ? M.differs(usual, basis.differsFromUsual) : M.usualToo(usual)}</p>
      )}
      <RangeLines view={view} past />
      <p className={s.meta}>
        {M.sample(count(basis.sampleDays), count(basis.sample))}
        {view.upRange && ` · ${M.upRange(view.upRange.low, view.upRange.high)}`}
      </p>
    </>
  );
};

/** 결함 단 — 숫자로 말하기엔 적다. 대칭 범위로 채우지 않는다 */
const Defect = ({ view }: { view: ScenarioHorizonView }) => {
  const n = view.basis?.sampleEffective ?? 0;
  return <p className={s.defect}>{n > 0 ? M.defectFew(count(n)) : M.defectNone}</p>;
};

/** 소유자에게만 — 모델 확률이 이 칸에 안 나오는 이유와 시험 성적(접힘) */
const ModelBlocked = ({ blocked }: { blocked: NonNullable<ScenarioHorizonView["modelBlocked"]> }) => {
  const t = blocked.track;
  return (
    <details className={s.more}>
      <summary className={s.moreSummary}>{M.modelBlockedSummary}</summary>
      <ul className={s.moreList}>
        <li>{M.reasons[blocked.reason] ?? M.reasons.not_tested}</li>
        {t && t.hitRate !== null && t.alwaysUpRate !== null && t.alwaysNotUpRate !== null && (
          <li>{M.blockedTrack(t.calls, formatRatio(t.hitRate), formatRatio(t.alwaysUpRate), formatRatio(t.alwaysNotUpRate))}</li>
        )}
      </ul>
    </details>
  );
};

interface DirectionScenarioCardProps {
  result: SymbolScenarioResult;
  className?: string;
}

/**
 * 시나리오 — 모든 종목 · 기간 넷에 늘(F017 v4 순서 1 · `FE-REQ-064` FR-8 · `ADR-010` v4).
 *
 * 칸마다 출처가 있다: 과거 실제 결과("100번 중 n번 올랐어요") 또는 시험을 넘은 모델 확률(소유자). 숫자는 전부 서버 값이고
 * 여기서 하는 계산은 **그리기 좌표**뿐이다(100 − n 은 분모 100 고정의 나머지). 숫자를 말할 수 없는 칸은 "아직 n번뿐" —
 * 대칭 범위로 채우지 않는다. 기간을 바꿔도 높이가 같게(`min-height`).
 */
export const DirectionScenarioCard = ({ result, className }: DirectionScenarioCardProps) => {
  const [key, setKey] = useState<ScenarioHorizonKey>(DEFAULT_HORIZON);

  if (result.status !== "ok") {
    return (
      <section className={`${className ?? ""} ${s.card}`} aria-label={M.heading}>
        <span className={s.nameChip}>{M.heading}</span>
        <StatusLine kind="error">{M.unavailable}</StatusLine>
      </section>
    );
  }

  const view = result.horizons.find((h) => h.horizon === key);

  return (
    <section className={`${className ?? ""} ${s.card}`} aria-label={M.heading}>
      <div className={s.headRow}>
        <span className={s.headNames}>
          <span className={s.nameChip}>{M.heading}</span>
          {view && view.tier !== "defect" && <span className={s.sourceChip}>{M.source[view.source]}</span>}
          {view?.asOf && <span className={s.asOf}>{M.asOf(`${kstMonthDay(view.asOf)} ${kstClock(view.asOf)}`)}</span>}
        </span>
        <SegmentedControl options={HORIZONS} value={key} onChange={setKey} label={M.horizonGroupLabel} />
      </div>
      {view && (view.tier === "defect" ? <Defect view={view} /> : view.source === "model" ? <Model view={view} /> : <Past view={view} />)}
      {view?.modelBlocked && <ModelBlocked blocked={view.modelBlocked} />}
      <p className={s.meta}>{result.disclaimer}</p>
    </section>
  );
};

/** 불러오는 동안의 자리 — 카드와 같은 최소 높이(도착해도 아래가 밀리지 않는다) */
export const DirectionScenarioSkeleton = ({ className }: { className?: string }) => (
  <section className={`${className ?? ""} ${s.card}`} aria-label={M.heading} aria-busy="true">
    <span className={s.nameChip}>{M.heading}</span>
    <Skeleton lines={5} />
  </section>
);
