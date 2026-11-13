"use client";

import type { ScenarioHorizonView, ScenarioTrack } from "@repo/core/coach";

import { formatRatio } from "../../lib";
import { SCENARIO_MESSAGES as M } from "../../model";
import * as s from "./ScenarioHeadline.css";

const MINUS = "−";
/** 서버가 준 %(기준 가격 대비)를 부호와 함께 — 계산 없이 표기만 */
const signedPct = (pct: number) => (pct === 0 ? "0%" : `${pct > 0 ? "+" : MINUS}${Math.abs(pct).toFixed(1)}%`);
const shortDate = (iso: string) => iso.slice(0, 10);
const count = (n: number) => n.toLocaleString("ko-KR");

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

/** 큰 숫자 — 과거 실제 결과 "100번 중 n번 올랐어요 (n%)" · 모델 확률 "오를 확률 n%" + 오른 몫 · 안 오른 몫 막대(색만으로 말하지 않는다) */
const BigNumber = ({ context, up, past }: { context: string; up: number; past: boolean }) => (
  <div className={s.big}>
    <span className={s.context}>{past ? M.contextPast(context) : M.contextModel(context)}</span>
    <p className={s.oddsRow}>
      <span className={s.oddsValue}>{up}</span>
      {/* 지난 기록은 과거형("번 올랐어요"), 모델 확률은 확률로("%") — 확률을 지난 일처럼 말하지 않는다 */}
      {past ? (
        <span className={s.oddsSuffix}>
          {M.upSuffix} <span className={s.oddsPct}>{M.upPct(up)}</span>
        </span>
      ) : (
        <span className={s.oddsSuffix}>%</span>
      )}
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

/**
 * 한 장 패널 머리 — 기간 하나의 큰 숫자(F017 v4 · `FE-REQ-064` FR-8 · `ADR-010` v4). 옛 시나리오 카드의 몸통이다.
 *
 * 칸마다 출처가 있다: 과거 실제 결과("100번 중 n번 올랐어요") 또는 시험을 넘은 모델 확률(소유자). 숫자는 전부 서버 값이고
 * 여기서 하는 계산은 **그리기 좌표**뿐이다(100 − n 은 분모 100 고정의 나머지). 숫자를 말할 수 없는 칸은 "아직 n번뿐".
 * 범위 · 틀리는 선은 부채꼴 · 틀리는 때 줄이, 평소 대비 · 표본은 '보통은' 줄이 말한다 — 여기서 되풀이하지 않는다.
 */
export const ScenarioHeadline = ({ view }: { view: ScenarioHorizonView }) => {
  if (view.tier === "defect") {
    return (
      <>
        <Defect view={view} />
        {view.modelBlocked && <ModelBlocked blocked={view.modelBlocked} />}
      </>
    );
  }
  if (view.source === "model" && view.upOutOf100 !== null) {
    return (
      <>
        <BigNumber context={view.label} up={view.upOutOf100} past={false} />
        <p className={s.line}>{M.oddsLine(view.upOutOf100)}</p>
        <Track track={view.track} />
        <Misses track={view.track} />
      </>
    );
  }
  if (view.upOutOf100 === null || !view.basis) return <Defect view={view} />;
  // 숫자가 속한 기간 — 빌려 왔으면 그 지평의 이름으로 말한다
  const label = view.fallbackLabel ?? view.label;
  const context = view.basis.condition ? M.contextCondition(view.basis.condition.phrase, label) : M.contextUsual(label);
  return (
    <>
      {view.fallbackLabel && <p className={s.fallback}>{M.fallback(view.label, view.fallbackLabel)}</p>}
      <BigNumber context={context} up={view.upOutOf100} past />
      {view.modelBlocked && <ModelBlocked blocked={view.modelBlocked} />}
    </>
  );
};
