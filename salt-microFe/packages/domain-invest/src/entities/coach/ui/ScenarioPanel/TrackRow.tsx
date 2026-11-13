import type { PanelTrack } from "@repo/core/coach";
import { vars } from "@repo/ui/tokens";

import { formatSignedRate } from "../../lib";
import { PANEL_MESSAGES as M } from "../../model";
import { PanelRow } from "./PanelRow";
import * as s from "./ScenarioPanel.css";

const count = (n: number) => n.toLocaleString("ko-KR");
/** 도넛 둘레(r = 20) — 그리기 좌표 */
const RING = 2 * Math.PI * 20;

const Donut = ({ hits }: { hits: number }) => (
  <svg width="52" height="52" viewBox="0 0 52 52" role="img" aria-label={M.trackDonutSr(hits)}>
    <circle cx="26" cy="26" r="20" fill="none" stroke={vars.colors.neutral[100]} strokeWidth="7" />
    <circle
      cx="26"
      cy="26"
      r="20"
      fill="none"
      stroke={vars.colors.text.primary}
      strokeWidth="7"
      strokeDasharray={`${(hits / 100) * RING} ${RING}`}
      transform="rotate(-90 26 26)"
    />
  </svg>
);

const Bar = ({ label, value, tone }: { label: string; value: number; tone: "self" | "baseline" }) => (
  <div className={s.compare}>
    <span>{label}</span>
    <span className={s.compareTrack} aria-hidden="true">
      <span className={s.compareFill[tone]} style={{ width: `${value}%` }} />
    </span>
    <span className={s.compareValue}>{value}%</span>
  </div>
);

/**
 * ⑤ 이 판단의 성적 — 100번 중 맞힌 번 · 늘 같은 쪽 · 도넛 · 비교 막대 · 틀렸던 때 한 줄(`FE-REQ-064` FR-9 ⑤).
 * 숫자는 BFF 가 판단 블록과 같은 값으로 준다(`hitOutOf100` · `baselineOutOf100`). 표본이 문턱 밑이면 숫자 대신 "아직 n번뿐"
 */
export const TrackRow = ({ track }: { track: PanelTrack }) => {
  const first = track.misses[0];
  return (
    <PanelRow kind="track">
      {track.tier === "defect" || track.hitOutOf100 === null ? (
        <p className={s.sub}>{M.trackDefect(count(track.sample))}</p>
      ) : (
        <>
          <div className={s.score}>
            <p className={s.mainText}>
              {M.trackLine(track.hitOutOf100, track.baselineOutOf100)}
              <br />
              <span className={s.sub}>{M.trackSample(count(track.sample), track.sampleOrigin)}</span>
            </p>
            <Donut hits={track.hitOutOf100} />
          </div>
          <Bar label={M.trackThis} value={track.hitOutOf100} tone="self" />
          {track.baselineOutOf100 === null ? (
            <p className={s.sub}>{M.trackNoBaseline}</p>
          ) : (
            <Bar label={M.trackBaseline} value={track.baselineOutOf100} tone="baseline" />
          )}
        </>
      )}
      <p className={s.sub}>
        {first ? M.trackMiss(first.date.slice(5), first.name ?? first.symbol, formatSignedRate(first.returnRate)) : M.trackNoMiss}
      </p>
    </PanelRow>
  );
};
