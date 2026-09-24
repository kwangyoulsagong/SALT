"use client";

import { type CSSProperties, useState } from "react";

import type { EventHorizonView, MacroEventView, SymbolEventsResult } from "@repo/core/coach";

import { formatSignedRate } from "../lib";
import { EVENT_MESSAGES as M } from "../model";
import * as s from "./EventsCard.css";

type Shown = Extract<EventHorizonView, { renderable: true }>;

const KST = "Asia/Seoul";
const whenFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KST,
  month: "numeric",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: KST }).format(d);
const shortDate = (iso: string) => dayKey(new Date(iso));
/** 달력 날짜 차이(서울 기준) — 시각이 아니라 날짜로 센다 */
const daysUntil = (iso: string, now: Date) =>
  Math.round((Date.parse(dayKey(new Date(iso))) - Date.parse(dayKey(now))) / 86_400_000);
const pct = (ratio: number) => `${Math.round(ratio * 100)}%`;

/** 막대 위치(%) — 그리기 좌표다. 두 줄이 같은 축을 쓴다 */
const axis = (h: Shown) => {
  const min = Math.min(h.range.q05, h.baseline.q05, 0);
  const max = Math.max(h.range.q95, h.baseline.q95, 0);
  const span = max - min || 1;
  return (v: number) => ((v - min) / span) * 100;
};

const Bar = ({ at, low, high, inner, mid, strong }: {
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
  const origin: CSSProperties = { transformOrigin: `${((at(0) - left) / (width || 1)) * 100}% 50%` };
  return (
    <div className={s.track} aria-hidden="true">
      <span className={s.zero} style={{ left: `${at(0)}%` }} />
      <span className={strong ? s.outer : s.outerMuted} style={{ left: `${left}%`, width: `${width}%`, ...origin }} />
      {inner && (
        <span
          className={s.inner}
          style={{ left: `${at(inner[0])}%`, width: `${at(inner[1]) - at(inner[0])}%`, transformOrigin: origin.transformOrigin }}
        />
      )}
      <span className={strong ? s.mid : s.midMuted} style={{ left: `${at(mid)}%` }} />
    </div>
  );
};

const Detail = ({ event }: { event: MacroEventView }) => {
  const first = event.horizons.findIndex((h) => h.renderable);
  const [picked, setPicked] = useState(first === -1 ? 0 : first);
  const current = event.horizons[picked] ?? event.horizons[0];
  if (!current) return null;

  return (
    <div className={s.detail}>
      <div className={s.picker} role="group" aria-label={M.horizonPicker}>
        {event.horizons.map((h, i) => (
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
        <HorizonDetail key={current.horizonDays} kind={M.kind[event.kind]} h={current} />
      ) : (
        <p className={s.note}>{M.blockedReason[current.blockedReason] ?? M.blockedFallback}</p>
      )}
    </div>
  );
};

const HorizonDetail = ({ kind, h }: { kind: string; h: Shown }) => {
  const at = axis(h);
  return (
    <div className={s.body}>
      <p className={s.headline}>{M.moveRatio(h.moveRatio.toFixed(1))}</p>
      <div className={s.rows}>
        <div className={s.row}>
          <span className={s.rowLabel}>{M.rowEvent}</span>
          <Bar at={at} low={h.range.q05} high={h.range.q95} inner={[h.range.q25, h.range.q75]} mid={h.range.q50} strong />
          <span className={s.rowValue}>{formatSignedRate(h.range.q50)}</span>
        </div>
        <div className={s.row}>
          <span className={s.rowLabel}>{M.rowBaseline}</span>
          <Bar at={at} low={h.baseline.q05} high={h.baseline.q95} mid={h.baseline.q50} strong={false} />
          <span className={s.rowValueMuted}>{formatSignedRate(h.baseline.q50)}</span>
        </div>
      </div>
      <ul className={s.facts}>
        <li>{M.range(formatSignedRate(h.range.q05), formatSignedRate(h.range.q95))}</li>
        <li>{M.upRate(pct(h.upRate), h.sample)}</li>
        {h.preReturn5dMedian !== null && <li>{M.preReturn(formatSignedRate(h.preReturn5dMedian))}</li>}
      </ul>

      <table className={s.srOnly}>
        <caption>{M.tableCaption(kind, M.horizon(h.horizonDays))}</caption>
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
            <th scope="row">{M.rowEvent}</th>
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
              {M.miss(shortDate(m.eventAt), formatSignedRate(m.realized), formatSignedRate(m.low), formatSignedRate(m.high))}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

/**
 * 주요 사건 카드 — 표시 전용 (`fsd-entities.md`, F008 `FE-REQ-038` FR-13 · FEATURE-008 FR-29~31).
 *
 * 다가오는 거시 일정마다 과거 같은 일정 뒤의 수익률 분포를 **평소 날과 같은 축에** 둔다. "호재 · 악재"는
 * 판정하지 않는다. 숫자는 전부 서버 값 — 여기서 하는 계산은 그리기 좌표와 D-day 뿐이다.
 * 한 번에 한 일정만 펼친다(첫 일정이 펼쳐져 있다).
 */
export const EventsCard = ({ result, className }: { result: SymbolEventsResult; className?: string }) => {
  const [open, setOpen] = useState(0);

  if (result.status !== "ok") {
    return (
      <section className={className}>
        <p className={s.note}>{M.unavailable}</p>
      </section>
    );
  }
  const now = new Date();

  return (
    <section className={`${className ?? ""} ${s.section}`} aria-labelledby="events-heading">
      <div className={s.head}>
        <h2 id="events-heading" className={s.title}>
          {M.heading}
        </h2>
        <span className={s.badge}>{M.badge}</span>
      </div>
      <p className={s.lead}>{M.lead}</p>

      {result.events.length === 0 ? (
        <p className={s.note}>{M.empty}</p>
      ) : (
        <ul className={s.list}>
          {result.events.map((event, i) => {
            const expanded = i === open;
            const id = `event-${event.kind}-${i}`;
            return (
              <li key={`${event.kind}-${event.eventAt}`} className={s.item} style={{ animationDelay: `${i * 80}ms` }}>
                <button
                  type="button"
                  className={s.rowButton}
                  aria-expanded={expanded}
                  aria-controls={id}
                  onClick={() => setOpen(expanded ? -1 : i)}
                >
                  <span className={s.dday}>{M.dday(daysUntil(event.eventAt, now))}</span>
                  <span className={s.eventName}>{M.kind[event.kind]}</span>
                  <span className={s.when}>{whenFormat.format(new Date(event.eventAt))}</span>
                  <span className={expanded ? `${s.chevron} ${s.chevronOpen}` : s.chevron} aria-hidden="true">
                    ›
                  </span>
                </button>
                {expanded && (
                  <div id={id}>
                    <Detail event={event} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className={s.disclaimer}>{result.disclaimer}</p>
    </section>
  );
};
