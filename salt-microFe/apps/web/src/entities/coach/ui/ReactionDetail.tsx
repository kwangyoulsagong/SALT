"use client";

import { type CSSProperties, useState } from "react";

import type { EventHorizonView } from "@repo/core/coach";

import { formatSignedRate } from "../lib";
import { EVENT_MESSAGES as M } from "../model";
import * as s from "./EventsCard.css";
import { PerformanceClaimLine } from "./PerformanceClaimLine";

const KST = "Asia/Seoul";
const shortDate = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: KST }).format(new Date(iso));
const pct = (ratio: number) => `${Math.round(ratio * 100)}%`;

type Shown = Extract<EventHorizonView, { renderable: true }>;

/** 막대 위치(%) — 그리기 좌표다. 두 줄이 같은 축을 쓴다 */
const axis = (h: Shown) => {
  const min = Math.min(h.range.q05, h.baseline.q05, 0);
  const max = Math.max(h.range.q95, h.baseline.q95, 0);
  const span = max - min || 1;
  return (v: number) => ((v - min) / span) * 100;
};

const Bar = ({
  at,
  low,
  high,
  inner,
  mid,
  strong,
}: {
  at: (v: number) => number;
  low: number;
  high: number;
  inner?: [number, number];
  mid: number;
  strong: boolean;
}) => {
  const left = at(low);
  const width = at(high) - left;
  // 막대가 0% 에서 양쪽으로 펼쳐진다 — 기준점이 0 이다
  const origin: CSSProperties = {
    transformOrigin: `${((at(0) - left) / (width || 1)) * 100}% 50%`,
  };
  return (
    <div className={s.track} aria-hidden="true">
      <span className={s.zero} style={{ left: `${at(0)}%` }} />
      <span
        className={strong ? s.outer : s.outerMuted}
        style={{ left: `${left}%`, width: `${width}%`, ...origin }}
      />
      {inner && (
        <span
          className={s.inner}
          style={{
            left: `${at(inner[0])}%`,
            width: `${at(inner[1]) - at(inner[0])}%`,
            transformOrigin: origin.transformOrigin,
          }}
        />
      )}
      <span
        className={strong ? s.mid : s.midMuted}
        style={{ left: `${at(mid)}%` }}
      />
    </div>
  );
};

/** 막대 · 표 · 빗나간 때의 말 — 주요 사건은 "이 일정 뒤", 쏠림 신호는 "이 신호 뒤" */
export interface ReactionLabels {
  kind: string;
  row: string;
  pre: (value: string) => string;
}

/**
 * 사건 뒤 반응 분포 — 기간 고르기 + 사건 · 평소 두 막대(같은 축) + 빗나간 때.
 * 주요 사건(`EventsCard`) · 쏠림 신호(`PositioningCard`)가 같이 쓴다. 숫자는 전부 서버 값이다.
 */
export const ReactionDetail = ({
  horizons,
  labels,
}: {
  horizons: EventHorizonView[];
  labels: ReactionLabels;
}) => {
  const first = horizons.findIndex((h) => h.renderable);
  const [picked, setPicked] = useState(first === -1 ? 0 : first);
  const current = horizons[picked] ?? horizons[0];
  if (!current) return null;

  return (
    <div className={s.detail}>
      <div className={s.picker} role="group" aria-label={M.horizonPicker}>
        {horizons.map((h, i) => (
          <button
            key={h.horizonDays}
            type="button"
            className={i === picked ? `${s.chip} ${s.chipActive}` : s.chip}
            aria-pressed={i === picked}
            onClick={() => setPicked(i)}
          >
            {M.horizon(h.horizonDays)}
          </button>
        ))}
      </div>

      {current.renderable ? (
        <HorizonDetail key={current.horizonDays} labels={labels} h={current} />
      ) : (
        <p className={s.note}>
          {M.blockedReason[current.blockedReason] ?? M.blockedFallback}
        </p>
      )}
    </div>
  );
};

const HorizonDetail = ({ labels, h }: { labels: ReactionLabels; h: Shown }) => {
  const at = axis(h);
  return (
    <div className={s.body}>
      <p className={s.headline}>{M.moveRatio(h.moveRatio.toFixed(1))}</p>
      <div className={s.rows}>
        <div className={s.row}>
          <span className={s.rowLabel}>{labels.row}</span>
          <Bar
            at={at}
            low={h.range.q05}
            high={h.range.q95}
            inner={[h.range.q25, h.range.q75]}
            mid={h.range.q50}
            strong
          />
          <span className={s.rowValue}>{formatSignedRate(h.range.q50)}</span>
        </div>
        <div className={s.row}>
          <span className={s.rowLabel}>{M.rowBaseline}</span>
          <Bar
            at={at}
            low={h.baseline.q05}
            high={h.baseline.q95}
            mid={h.baseline.q50}
            strong={false}
          />
          <span className={s.rowValueMuted}>
            {formatSignedRate(h.baseline.q50)}
          </span>
        </div>
      </div>
      <ul className={s.facts}>
        <li>
          {M.range(
            formatSignedRate(h.range.q05),
            formatSignedRate(h.range.q95),
          )}
        </li>
        <li>{M.upRate(pct(h.upRate), h.sample)}</li>
        {h.preReturn5dMedian !== null && (
          <li>{labels.pre(formatSignedRate(h.preReturn5dMedian))}</li>
        )}
      </ul>
      {/* 성적 4요소(F009 FR-33) — 빗나간 수는 앞 사건이 10건 이상 쌓인 사건 중에서 */}
      <PerformanceClaimLine claim={h.claim} />

      <table className={s.srOnly}>
        <caption>
          {M.tableCaption(labels.kind, M.horizon(h.horizonDays))}
        </caption>
        <thead>
          <tr>
            <th scope="col">{M.colRow}</th>
            <th scope="col">{M.colLow}</th>
            <th scope="col">{M.colMedian}</th>
            <th scope="col">{M.colHigh}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">{labels.row}</th>
            <td>{formatSignedRate(h.range.q05)}</td>
            <td>{formatSignedRate(h.range.q50)}</td>
            <td>{formatSignedRate(h.range.q95)}</td>
          </tr>
          <tr>
            <th scope="row">{M.rowBaseline}</th>
            <td>{formatSignedRate(h.baseline.q05)}</td>
            <td>{formatSignedRate(h.baseline.q50)}</td>
            <td>{formatSignedRate(h.baseline.q95)}</td>
          </tr>
        </tbody>
      </table>

      <div>
        <h4 className={s.subHeading}>{M.missesHeading}</h4>
        <ul className={s.misses}>
          {h.misses.map((m) => (
            <li key={m.eventAt}>
              {M.miss(
                shortDate(m.eventAt),
                formatSignedRate(m.realized),
                formatSignedRate(m.low),
                formatSignedRate(m.high),
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
