import { vars } from "@repo/ui/tokens";

import { PANEL_MESSAGES as M } from "../../model";
import * as s from "./ScenarioPanel.css";

const MINUS = "−";
const signedPct = (pct: number) => (pct === 0 ? "0%" : `${pct > 0 ? "+" : MINUS}${Math.abs(pct).toFixed(1)}%`);

/** 그리기 판 — 시안 420 × 150 를 글자 12 가 380 폭 열에서도 읽히게 줄였다 */
const W = 360;
const H = 150;
const Y0 = 75;
const HALF = 58;
const X_NOW = 178;
const X_END = 262;

/** 라벨 줄 간격(글자 12 + 여백) — 세 라벨(위 · 가운데 · 아래)이 겹치지 않게 아래로 · 위로 민다(그리기 좌표만) */
const LABEL_GAP = 14;
const spreadLabels = (ys: readonly [number, number, number]): [number, number, number] => {
  const [hi, mid, lo] = ys;
  const m = Math.max(mid, hi + LABEL_GAP);
  const l = Math.max(lo, m + LABEL_GAP);
  // 판 아래로 넘치면 거꾸로 위로 올린다
  const lClamped = Math.min(l, H - 4);
  const mClamped = Math.min(m, lClamped - LABEL_GAP);
  return [Math.min(hi, mClamped - LABEL_GAP), mClamped, lClamped];
};

interface ScenarioFanProps {
  /** 지난 종가(오래된 → 최근). 비면 지난 선 없이 부채꼴만 */
  closes: readonly number[];
  /** 기준 가격 대비 %(서버) — 나빴던 10% · 가운데 · 좋았던 10% */
  range: { lowPct: number; midPct: number; highPct: number };
}

/**
 * 부채꼴 — 지난 가격 선 + 지금 점 + 과거 비슷한 때 10번 중 8번이 움직인 범위(좋았을 때 · 보통 · 나빴을 때) + 나빴을 때 선
 * (`FE-REQ-064` FR-8 · 시안 §6). 라벨은 서버가 준 % 만 — 가격을 화면이 계산하지 않는다(틀리는 선 가격은 '틀리는 때' 줄이 서버 값으로).
 * 계산은 **그리기 좌표**뿐이다: 지난 선은 마지막 종가 대비 %, 세로 축은 그려지는 값 중 가장 큰 크기로 맞춘다.
 */
export const ScenarioFan = ({ closes, range }: ScenarioFanProps) => {
  const last = closes.length > 0 ? closes[closes.length - 1]! : null;
  const past = last && last > 0 ? closes.map((c) => (c / last - 1) * 100) : [];
  const scale = Math.max(Math.abs(range.lowPct), Math.abs(range.highPct), ...past.map(Math.abs), 0.5);
  const y = (pct: number) => Y0 - (pct / scale) * HALF;
  const pastPath =
    past.length > 1
      ? past.map((p, i) => `${i === 0 ? "M" : "L"}${((i / (past.length - 1)) * X_NOW).toFixed(1)},${y(p).toFixed(1)}`).join(" ")
      : null;
  const [yHi, yMid, yLo] = [y(range.highPct), y(range.midPct), y(range.lowPct)];
  const [lHi, lMid, lLo] = spreadLabels([yHi, yMid, yLo]);
  const up = vars.colors.special.up;
  const down = vars.colors.special.down;
  const ink = vars.colors.text.primary;

  return (
    <svg
      className={s.fan}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={M.fanSr(signedPct(range.lowPct), signedPct(range.midPct), signedPct(range.highPct))}
    >
      <path d={`M${X_NOW},${Y0} L${X_END},${yHi} L${X_END},${yMid} Z`} fill={up} fillOpacity={0.12} />
      <path d={`M${X_NOW},${Y0} L${X_END},${yMid} L${X_END},${yLo} Z`} fill={down} fillOpacity={0.12} />
      <line x1={0} x2={X_END} y1={yLo} y2={yLo} stroke={down} strokeWidth={1} strokeDasharray="3 3" />
      {pastPath && <path d={pastPath} fill="none" stroke={ink} strokeWidth={1.6} strokeLinejoin="round" />}
      <line x1={X_NOW} x2={X_END} y1={Y0} y2={yMid} stroke={ink} strokeWidth={1.2} strokeDasharray="2 3" />
      <circle cx={X_NOW} cy={Y0} r={4.5} fill={vars.colors.background.white} stroke={ink} strokeWidth={2} />
      <text className={s.fanText} x={X_END + 6} y={lHi + 4} fill={vars.colors.special.upDark}>
        {signedPct(range.highPct)}
      </text>
      <text className={s.fanText} x={X_END + 6} y={lMid + 4} fill={vars.colors.neutral[700]}>
        {M.fanUsual(signedPct(range.midPct))}
      </text>
      <text className={s.fanText} x={X_END + 6} y={lLo + 4} fill={vars.colors.special.downDark}>
        {signedPct(range.lowPct)}
      </text>
      <text
        className={s.fanText}
        x={0}
        y={yLo - 5}
        fill={vars.colors.special.downDark}
        stroke={vars.colors.background.white}
        strokeWidth={3}
        paintOrder="stroke"
      >
        {M.fanBadLine}
      </text>
    </svg>
  );
};
