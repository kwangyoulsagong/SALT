import type { CSSProperties } from "react";

import type { ForecastHorizonView, SymbolForecastResult } from "@repo/core/coach";

import { formatPrice } from "@/shared/lib";

import { formatRatio, formatSignedRate } from "../lib";
import { FORECAST_MESSAGES as M } from "../model";
import * as s from "./ForecastCard.css";

type Shown = Extract<ForecastHorizonView, { renderable: true }>;

const MINUS = "−";
const signedKrw = (value: number) =>
  value === 0 ? `0원` : `${value > 0 ? "+" : MINUS}${formatPrice(Math.abs(value))}원`;
const tone = (value: number) => (value > 0 ? s.signed.up : value < 0 ? s.signed.down : s.signed.flat);
const shortDate = (iso: string) => iso.slice(0, 10);
/** 띠 안 위치(%) — 모든 기간을 같은 축에 둔다. 금액 계산이 아니라 그리기 좌표다 */
const pos = (v: number, min: number, max: number) => `${((v - min) / (max - min || 1)) * 100}%`;
const delay = (i: number): CSSProperties => ({ animationDelay: `${i * 120}ms` });

/**
 * 가격 변동 범위 카드 — 표시 전용 (`fsd-entities.md`, F008 `FE-REQ-038`).
 *
 * 숫자는 전부 서버 값이다(가격 · 원화 · 성적). 여기서 하는 계산은 **그리기 좌표**뿐이다.
 * 막힌 기간은 가격 없이 사유만, 방향은 서버가 줄 때만 — 지금 챔피언은 방향이 없다.
 *
 * 적중률은 혼자 나가지 않는다(FEATURE-008 FR-10) — 같은 줄에 범위 폭(단순 예측 대비) · 표본.
 */
export const ForecastCard = ({ result, className }: { result: SymbolForecastResult; className?: string }) => {
  if (result.status !== "ok") {
    return (
      <section className={className}>
        <p className={s.note}>{M.unavailable}</p>
      </section>
    );
  }

  const shown = result.horizons.filter((h): h is Shown => h.renderable);
  const blocked = result.horizons.filter((h) => !h.renderable);
  const min = Math.min(...shown.map((h) => Math.min(h.range.low, h.basePrice)));
  const max = Math.max(...shown.map((h) => Math.max(h.range.high, h.basePrice)));
  const first = shown[0];
  const withScenario = shown.filter((h) => h.scenario);

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
          <ul className={s.bandList} aria-label={M.bandCaption}>
            {shown.map((h, i) => (
              <li key={h.horizonWeeks} className={s.bandRow}>
                <span className={s.bandLabel}>{M.horizon(h.horizonWeeks)}</span>
                <div className={s.track} aria-hidden="true">
                  <span
                    className={s.whisker}
                    style={{ left: pos(h.range.low, min, max), right: `calc(100% - ${pos(h.range.high, min, max)})`, ...delay(i) }}
                  />
                  <span
                    className={s.box}
                    style={{
                      left: pos(h.range.lowerQuartile, min, max),
                      right: `calc(100% - ${pos(h.range.upperQuartile, min, max)})`,
                      ...delay(i),
                    }}
                  />
                  <span className={s.medianTick} style={{ left: pos(h.range.median, min, max), animationDelay: `${i * 120 + 450}ms` }} />
                  <span className={s.baseLine} style={{ left: pos(h.basePrice, min, max) }} />
                </div>
              </li>
            ))}
          </ul>
          {first && <p className={s.note}>{M.basePrice(`${formatPrice(first.basePrice)}원`, shortDate(first.asOf))}</p>}

          <table className={s.table}>
            <caption className={s.caption}>{M.tableCaption}</caption>
            <thead>
              <tr>
                <th className={s.th} scope="col">{M.colPeriod}</th>
                <th className={s.th} scope="col">{M.colLow}</th>
                <th className={s.th} scope="col">{M.colMedian}</th>
                <th className={s.th} scope="col">{M.colHigh}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((h, i) => (
                <tr key={h.horizonWeeks} className={s.tr} style={delay(i)}>
                  <th className={s.td} scope="row">{M.horizon(h.horizonWeeks)}</th>
                  <td className={s.td}>{formatPrice(h.range.low)}</td>
                  <td className={s.td}>{formatPrice(h.range.median)}</td>
                  <td className={s.td}>{formatPrice(h.range.high)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {withScenario.length > 0 && withScenario[0]?.scenario && (
            <div>
              <h3 className={s.subHeading}>{M.scenarioHeading}</h3>
              <table className={s.table}>
                <caption className={s.caption}>{M.scenarioLead(String(withScenario[0].scenario.quantity))}</caption>
                <thead>
                  <tr>
                    <th className={s.th} scope="col">{M.colPeriod}</th>
                    <th className={s.th} scope="col">{M.colBad}</th>
                    <th className={s.th} scope="col">{M.colMedian}</th>
                    <th className={s.th} scope="col">{M.colGood}</th>
                  </tr>
                </thead>
                <tbody>
                  {withScenario.map((h, i) =>
                    h.scenario ? (
                      <tr key={h.horizonWeeks} className={s.tr} style={delay(i + shown.length)}>
                        <th className={s.td} scope="row">{M.horizon(h.horizonWeeks)}</th>
                        <td className={`${s.td} ${tone(h.scenario.valueChangeLow)}`}>{signedKrw(h.scenario.valueChangeLow)}</td>
                        <td className={`${s.td} ${tone(h.scenario.valueChangeMedian)}`}>{signedKrw(h.scenario.valueChangeMedian)}</td>
                        <td className={`${s.td} ${tone(h.scenario.valueChangeHigh)}`}>{signedKrw(h.scenario.valueChangeHigh)}</td>
                      </tr>
                    ) : null,
                  )}
                </tbody>
              </table>
            </div>
          )}

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
