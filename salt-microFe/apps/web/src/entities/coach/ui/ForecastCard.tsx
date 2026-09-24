"use client";

import { useEffect, useState } from "react";

import type { ForecastHorizonView, SymbolForecastResult } from "@repo/core/coach";

import { formatPrice } from "@/shared/lib";

import { formatRatio, formatSignedRate } from "../lib";
import { FORECAST_MESSAGES as M } from "../model";
import * as s from "./ForecastCard.css";
import { ForecastFanChart } from "./ForecastFanChart";

type Shown = Extract<ForecastHorizonView, { renderable: true }>;

const MINUS = "−";
const signedKrw = (value: number) =>
  value === 0 ? `0원` : `${value > 0 ? "+" : MINUS}${formatPrice(Math.abs(value))}원`;
const tone = (value: number) => (value > 0 ? s.signed.up : value < 0 ? s.signed.down : s.signed.flat);
const shortDate = (iso: string) => iso.slice(0, 10);
/** 차트가 다 그려진 뒤 기간 하이라이트를 넘기기 시작한다 · 한 기간을 보여 주는 시간 */
const AUTOPLAY_START_MS = 1800;
const AUTOPLAY_STEP_MS = 2800;

/**
 * 가격 변동 범위 카드 — 표시 전용 (`fsd-entities.md`, F008 `FE-REQ-038`).
 *
 * 숫자는 전부 서버 값이다(가격 · 원화 · 성적). 여기서 하는 계산은 **그리기 좌표**뿐이다.
 * 막힌 기간은 가격 없이 사유만, 방향은 서버가 줄 때만 — 지금 챔피언은 방향이 없다.
 *
 * 적중률은 혼자 나가지 않는다(FEATURE-008 FR-10) — 같은 줄에 범위 폭(단순 예측 대비) · 표본.
 */
interface ForecastCardProps {
  result: SymbolForecastResult;
  /** 실시간 현재가 — 차트 선 끝을 움직인다. 없으면 어제 종가에서 멈춘다 */
  livePrice?: number | null;
  className?: string;
}

export const ForecastCard = ({ result, livePrice = null, className }: ForecastCardProps) => {
  const count = result.status === "ok" ? result.horizons.filter((h) => h.renderable).length : 0;
  const [active, setActive] = useState(0);
  // 손을 대면 자동 넘김을 멈춘다 — 보고 있는 기간을 빼앗지 않는다
  const [autoplay, setAutoplay] = useState(true);

  useEffect(() => {
    if (!autoplay || count < 2) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let step: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      step = setInterval(() => setActive((i) => (i + 1) % count), AUTOPLAY_STEP_MS);
    }, AUTOPLAY_START_MS);
    return () => {
      clearTimeout(start);
      if (step) clearInterval(step);
    };
  }, [autoplay, count]);

  const pick = (index: number) => {
    setAutoplay(false);
    setActive(index);
  };

  if (result.status !== "ok") {
    return (
      <section className={className}>
        <p className={s.note}>{M.unavailable}</p>
      </section>
    );
  }

  const shown = result.horizons.filter((h): h is Shown => h.renderable);
  const blocked = result.horizons.filter((h) => !h.renderable);
  const first = shown[0];
  const current = shown[active] ?? first;

  return (
    <section className={`${className ?? ""} ${s.section}`} aria-labelledby="forecast-heading">
      <div className={s.head}>
        <h2 id="forecast-heading" className={s.title}>
          {M.heading}
        </h2>
        <span className={s.badge}>{M.badge}</span>
      </div>
      <p className={s.lead}>{M.lead}</p>

      {shown.length === 0 ? (
        <p className={s.note}>{M.allBlocked}</p>
      ) : (
        <>
          <div className={s.chartHead}>
            {livePrice !== null ? (
              <span className={s.live}>
                <span className={s.liveDot} aria-hidden="true" />
                {M.live} · {M.livePrice(`${formatPrice(livePrice)}원`)}
              </span>
            ) : (
              first && <span className={s.note}>{M.basePrice(`${formatPrice(first.basePrice)}원`, shortDate(first.asOf))}</span>
            )}
          </div>

          <ForecastFanChart history={result.history} shown={shown} livePrice={livePrice} active={active} />

          <ul className={s.legend} aria-hidden="true">
            <li className={s.legendItem}><span className={`${s.swatch} ${s.swatch90}`} />{M.legend90}</li>
            <li className={s.legendItem}><span className={`${s.swatch} ${s.swatch50}`} />{M.legend50}</li>
            <li className={s.legendItem}><span className={s.swatchMedian} />{M.legendMedian}</li>
          </ul>

          <div
            className={s.weekPicker}
            role="group"
            aria-label={M.weekPicker}
            onPointerEnter={() => setAutoplay(false)}
            onFocus={() => setAutoplay(false)}
          >
            {shown.map((h, i) => (
              <button
                key={h.horizonWeeks}
                type="button"
                className={i === active ? `${s.weekChip} ${s.weekChipActive}` : s.weekChip}
                aria-pressed={i === active}
                onClick={() => pick(i)}
              >
                {M.horizon(h.horizonWeeks)}
              </button>
            ))}
          </div>

          {current && (
            <div key={current.horizonWeeks} className={s.readout} aria-live="polite">
              <div className={s.readoutRow}>
                <span className={s.readoutLabel}>{M.readoutRange}</span>
                <span className={s.readoutValue}>
                  {formatPrice(current.range.low)} ~ {formatPrice(current.range.high)}원
                </span>
              </div>
              <div className={s.readoutRow}>
                <span className={s.readoutLabel}>{M.readoutMedian}</span>
                <span className={s.readoutValue}>{formatPrice(current.range.median)}원</span>
              </div>
              {current.scenario && (
                <>
                  <p className={s.readoutSub}>{M.scenarioLead(String(current.scenario.quantity))}</p>
                  <div className={s.scenarioGrid}>
                    {(
                      [
                        [M.colBad, current.scenario.valueChangeLow],
                        [M.colMedian, current.scenario.valueChangeMedian],
                        [M.colGood, current.scenario.valueChangeHigh],
                      ] as const
                    ).map(([label, value]) => (
                      <div key={label} className={s.scenarioCell}>
                        <span className={s.readoutLabel}>{label}</span>
                        <span className={`${s.scenarioValue} ${tone(value)}`}>{signedKrw(value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* 그림 대신 읽는 표 — 차트는 aria-hidden 이다(a11y-policy.md) */}
          <table className={s.srOnly}>
            <caption>{M.tableCaption}</caption>
            <thead>
              <tr>
                <th scope="col">{M.colPeriod}</th>
                <th scope="col">{M.colLow}</th>
                <th scope="col">{M.colMedian}</th>
                <th scope="col">{M.colHigh}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((h) => (
                <tr key={h.horizonWeeks}>
                  <th scope="row">{M.horizon(h.horizonWeeks)}</th>
                  <td>{formatPrice(h.range.low)}</td>
                  <td>{formatPrice(h.range.median)}</td>
                  <td>{formatPrice(h.range.high)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div>
            <h3 className={s.subHeading}>
              {M.trackHeading} · {first ? M.trackKind[first.trackRecord.kind] : ""}
            </h3>
            <table className={s.table}>
              <thead>
                <tr>
                  <th className={s.th} scope="col">{M.colPeriod}</th>
                  <th className={s.th} scope="col">{M.colHit}</th>
                  <th className={s.th} scope="col">{M.colWidth}</th>
                  <th className={s.th} scope="col">{M.colSample}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((h) => {
                  const ratio = h.trackRecord.width90 / h.trackRecord.baselineWidth90 - 1;
                  const pct = formatRatio(Math.abs(ratio));
                  return (
                    <tr key={h.horizonWeeks} className={s.tr}>
                      <th className={s.td} scope="row">{M.horizon(h.horizonWeeks)}</th>
                      <td className={s.td}>{M.hitValue(formatRatio(h.trackRecord.coverage90))}</td>
                      <td className={s.td}>{pct === "0%" ? M.widthSame : M.widthVsBaseline(pct, ratio > 0)}</td>
                      <td className={s.td}>{M.sampleValue(h.trackRecord.sample)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {first && first.trackRecord.misses.length > 0 && (
            <div>
              <h3 className={s.subHeading}>
                {M.missesHeading} · {M.horizon(first.horizonWeeks)}
              </h3>
              <ul className={s.plainList}>
                {first.trackRecord.misses.map((m) => (
                  <li key={m.asOf}>
                    {M.miss(shortDate(m.asOf), formatSignedRate(m.realizedReturn), formatSignedRate(m.lowReturn), formatSignedRate(m.highReturn))}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {blocked.length > 0 && (
        <div>
          <h3 className={s.subHeading}>{M.blockedHeading}</h3>
          <ul className={s.plainList}>
            {blocked.map((h) =>
              h.renderable ? null : (
                <li key={h.horizonWeeks}>
                  {M.horizon(h.horizonWeeks)} — {M.blockedReason[h.blockedReason] ?? M.blockedFallback}
                </li>
              ),
            )}
          </ul>
        </div>
      )}
    </section>
  );
};
