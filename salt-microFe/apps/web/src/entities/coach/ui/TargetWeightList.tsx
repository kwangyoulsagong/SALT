import type { TargetWeightLive, TargetWeightMonth, TargetWeightRow, TargetWeightView } from "@repo/core/coach";
import { Badge } from "@repo/ui/badge";
import type { ReactNode } from "react";

import { formatPrice } from "@/shared/lib";

import { formatFineRate, formatQuantity, formatShortDate, formatSignedKrw, formatSignedRate } from "../lib";
import { TARGET_WEIGHT_MESSAGES } from "../model";
import {
  disclosure,
  failureGrid,
  plainList,
  recordBox,
  row,
  rowGap,
  rowHead,
  rowLine,
  rowList,
  rowWeights,
  section,
  sectionTitle,
  strongText,
  text,
} from "./TargetWeight.css";
import { PerformanceClaimLine } from "./PerformanceClaimLine";

const M = TARGET_WEIGHT_MESSAGES;
const MINUS = "−";

const weightFormatter = new Intl.NumberFormat("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** 비중(0.0714) → `7.1%`. 목표 비중이 작아 정수 %(`formatRatio`)로는 7% · 5% 가 뭉개진다 */
export const formatWeight = (ratio: number): string => `${weightFormatter.format(ratio * 100)}%`;

/** 낙폭(0.36) → `−36.0%` — 서버는 크기(양수)로 준다 */
export const formatDrawdown = (mdd: number): string => `${MINUS}${(mdd * 100).toFixed(1)}%`;

/** 부호 있는 수량 — 음수 부호는 U+2212 */
const formatSignedQuantity = (quantity: number): string =>
  quantity > 0 ? `+${formatQuantity(quantity)}` : quantity < 0 ? `${MINUS}${formatQuantity(-quantity)}` : "0";

/** `2019-05` → `2019년 5월` */
export const formatMonth = (month: string): string => {
  const [year, m] = month.split("-");
  return `${year}년 ${Number(m)}월`;
};

interface TargetWeightListProps {
  view: TargetWeightView;
  /** 종목 자리(로고 · 이름). 시세 슬라이스 것이라 조합하는 위젯이 넣는다 */
  renderIdentity: (symbol: string) => ReactNode;
  /** 투자금을 적는 곳 — 위젯이 링크를 넣는다. 전체가 코인 평가금 합일 때만 보인다 */
  capitalAction?: ReactNode;
}

const Row = ({ item, renderIdentity, amounts }: { item: TargetWeightRow; renderIdentity: TargetWeightListProps["renderIdentity"]; amounts: boolean }) => (
  <li className={row}>
    <div className={rowHead}>
      {renderIdentity(item.symbol)}
      <span className={rowWeights}>
        {M.weights(formatWeight(item.targetWeight), formatWeight(item.currentWeight))}
        {amounts && (
          <Badge size="sm" tone="neutral">
            {M.status[item.status]}
          </Badge>
        )}
      </span>
    </div>
    {amounts && (
      <p className={item.status === "at" || item.status === "no_room" ? rowLine : rowGap}>
        {item.status === "at"
          ? M.atGap
          : item.status === "no_room"
            ? M.noRoomGap
            : M.gap(formatSignedKrw(item.gapValueKrw), formatSignedQuantity(item.gapQuantity), item.symbol)}
      </p>
    )}
    {amounts && item.gapCapped && item.status === "under" && <p className={rowLine}>{M.cappedGap}</p>}
    <p className={rowLine}>
      {[
        M.basisLine(formatWeight(item.sigma)),
        item.stopPriceKrw !== null && item.lossAtStopKrw !== null && amounts
          ? M.stopLine(formatPrice(item.stopPriceKrw), formatSignedKrw(-item.lossAtStopKrw))
          : null,
        item.held ? null : M.notHeld,
      ]
        .filter(Boolean)
        .join(" · ")}
    </p>
  </li>
);

const MonthList = ({ title, months }: { title: string; months: TargetWeightMonth[] }) => (
  <div className={section}>
    <p className={sectionTitle}>{title}</p>
    <ul className={plainList}>
      {months.map((m) => (
        <li key={m.month}>{M.monthLine(formatMonth(m.month), formatSignedRate(m.strategy), formatSignedRate(m.btc))}</li>
      ))}
    </ul>
  </div>
);

/** 라이브 기록 — 30주 뒤 과거 성적 자리(`recordSource: "live"`). 숫자는 서버(salt-forecast 원장) 값 그대로 */
const LiveRecord = ({ live }: { live: TargetWeightLive }) => (
  <div className={recordBox}>
    <p className={rowLine}>{M.liveLabel}</p>
    {live.cumReturn !== null && live.mdd !== null && (
      <p className={strongText}>{M.liveRecordLine(live.nWeeks, formatSignedRate(live.cumReturn), formatDrawdown(live.mdd))}</p>
    )}
    {live.btcCumReturn !== null && live.btcMdd !== null && (
      <p className={text}>{M.liveHoldLine(formatSignedRate(live.btcCumReturn), formatDrawdown(live.btcMdd))}</p>
    )}
    {live.upside !== null && <p className={text}>{M.upside(formatWeight(live.upside))}</p>}
    <p className={sectionTitle}>{M.liveWorstHeading}</p>
    <ul className={plainList}>
      {live.worstWeeks.map((w) => (
        <li key={w.rebalanceAt}>
          {M.weekLine(formatShortDate(w.rebalanceAt) ?? w.rebalanceAt.slice(0, 10), formatSignedRate(w.strategy), formatSignedRate(w.btc))}
        </li>
      ))}
    </ul>
  </div>
);

/**
 * 목표 비중 안내 (F010 슬라이스 5 · `FE-REQ-042` · 리서치 §4-3 6 · §9-5 ①).
 *
 * - 비중 · 금액 · 수량 · 부족/초과는 **서버 값 그대로**다. 화면은 표시만(공통 수용 기준 3)
 * - 3종 고지 — 근거(규칙 · 종목 σ) · 과거 성적(8년 주간 기록 + BTC 보유 비교 · 상승 포착) · 실패 사례(놓친 상승 · 잃은 달)가
 *   **같은 카드에 늘 같이** 나간다. 접지 않는다 — 비중만 보이고 고지가 한 번 눌러야 보이면 고지가 아니다
 * - "덜 빠졌다 · 나았다"는 서버 `claims` 가 참일 때만. 타이밍 몫이 증명되지 않았으면 그렇다고 쓴다
 * - 무효화 3조건(만료 · σ 급변 · 손절선)을 늘 붙인다 — 이 숫자는 다음 월요일까지의 계산이다
 * - 알트는 목표 비중이 없다(`target-weight@2` 채택 없음) — "없음"과 그 근거 기록만. 부족 · 초과 · 금액이 없다
 * - 과거 성적 자리는 `recordSource` 가 정한다. 라이브가 30주 전이면 진행만 알리고 백테스트를 그대로 쓴다
 */
export const TargetWeightList = ({ view, renderIdentity, capitalAction }: TargetWeightListProps) => {
  const amounts = view.status === "ok";
  const { totals, record } = view;
  const expires = view.expiresAt ? formatShortDate(view.expiresAt) : null;
  const targetVol = view.targetVolatility;
  const recordTargetDiffers = targetVol !== null && Math.abs(record.target - targetVol) > 1e-9;
  const hasNoRecord = view.excluded.some((item) => item.reason === "no_record");
  const useLive = view.recordSource === "live" && view.live !== null;

  return (
    <>
      {view.basis === "crypto_value" && amounts && (
        <p className={text}>
          {M.basisCryptoValue} {capitalAction}
        </p>
      )}
      {view.capitalBelowHoldings && (
        <p className={text}>
          {M.capitalBelowHoldings} {capitalAction}
        </p>
      )}
      {!amounts && (
        <p className={text}>
          {M.noCapital} {capitalAction}
        </p>
      )}

      <ul className={rowList}>
        {view.rows.map((item) => (
          <Row key={item.symbol} item={item} renderIdentity={renderIdentity} amounts={amounts} />
        ))}
      </ul>

      {view.excluded.length > 0 && (
        <ul className={rowList}>
          {view.excluded.map((item) => (
            <li key={item.symbol} className={row}>
              {renderIdentity(item.symbol)}
              <p className={rowLine}>{M.excluded[item.reason]}</p>
            </li>
          ))}
        </ul>
      )}
      {hasNoRecord && view.altShare && (
        <div className={section}>
          <p className={sectionTitle}>{M.altRecordHeading}</p>
          <ul className={plainList}>
            {view.altShare.candidates.map((c) =>
              c.cagr !== null && c.coreCagr !== null ? (
                <li key={c.altShare}>
                  {M.altRecordLine(formatWeight(c.altShare), formatSignedRate(c.cagr), formatSignedRate(c.coreCagr))}
                </li>
              ) : null,
            )}
            <li>{M.altRecordVerdict}</li>
            {view.altShare.survivorshipBias && <li>{M.altRecordBias}</li>}
          </ul>
        </div>
      )}

      <div className={section}>
        {totals.targetExposure !== null && totals.currentExposure !== null && totals.cashTargetWeight !== null && (
          <p className={strongText}>
            {M.totals(
              formatWeight(totals.targetExposure),
              formatWeight(totals.currentExposure),
              formatWeight(totals.cashTargetWeight),
            )}
          </p>
        )}
        {amounts && totals.lossAtStopTotalKrw !== null && (
          <p className={text}>
            {M.lossTotal(formatSignedKrw(-totals.lossAtStopTotalKrw))}
            {totals.lossAtStopMonthlyBudgetRate !== null &&
              M.lossBudget(formatWeight(totals.lossAtStopMonthlyBudgetRate))}
          </p>
        )}
        {totals.targetBetaSum !== null && (
          <p className={text}>{M.beta(weightFormatter.format(totals.targetBetaSum))}</p>
        )}
        {amounts && totals.outsideRuleWeight !== null && totals.outsideRuleWeight > 0 && (
          <p className={text}>{M.outsideRule(formatWeight(totals.outsideRuleWeight))}</p>
        )}
        {amounts && view.capitalKrw !== null && <p className={text}>{M.capital(formatPrice(view.capitalKrw))}</p>}
      </div>

      <div className={section}>
        <p className={sectionTitle}>{M.invalidationHeading}</p>
        <ul className={plainList}>
          {expires && <li>{M.expires(expires)}</li>}
          <li>{M.sigmaDrift}</li>
          <li>{M.stopHit}</li>
        </ul>
      </div>

      <div className={disclosure}>
        <p className={sectionTitle}>{M.disclosureHeading}</p>
        {targetVol !== null && <p className={text}>{M.rule(formatWeight(targetVol), view.targetVolatilityIsDefault)}</p>}
        {useLive && view.live && <LiveRecord live={view.live} />}
        {/* 성적 4요소(F009 FR-33)는 지금 과거 성적 자리의 것 — 라이브면 라이브 줄 아래, 아니면 백테스트 상자 안 */}
        {useLive && <PerformanceClaimLine claim={view.claim} unit="주" />}
        <div className={recordBox}>
          {useLive && <p className={rowLine}>{M.backtestLabel}</p>}
          {record.window && (
            <p className={rowLine}>
              {M.recordWindow(
                record.window.from.slice(0, 7),
                record.window.to.slice(0, 7),
                record.feeRatePerSide !== null ? formatFineRate(record.feeRatePerSide) : "—",
              )}
            </p>
          )}
          {recordTargetDiffers && <p className={rowLine}>{M.recordTarget(formatWeight(record.target))}</p>}
          <p className={strongText}>
            {M.recordLine(formatSignedRate(record.strategy.cagr), formatDrawdown(record.strategy.mdd))}
          </p>
          <p className={text}>{M.holdLine(formatSignedRate(record.holdBtc.cagr), formatDrawdown(record.holdBtc.mdd))}</p>
          <p className={text}>{M.upside(formatWeight(record.strategy.upside))}</p>
          {!useLive && <PerformanceClaimLine claim={view.claim} unit="주" />}
        </div>
        <ul className={plainList}>
          {record.claims.lessDrawdown && <li>{M.claimLessDrawdown}</li>}
          <li>{record.claims.timing ? M.claimTiming : M.claimNoTiming}</li>
          <li>
            {record.claims.targetHit
              ? M.claimTargetHit(formatWeight(record.strategy.vol))
              : M.claimVolOnly(formatWeight(record.strategy.vol))}
          </li>
        </ul>
        <div className={failureGrid}>
          <MonthList title={M.missedHeading} months={record.missedUpside} />
          <MonthList title={M.worstHeading} months={record.worstMonths} />
        </div>
        {!useLive && (
          <p className={rowLine}>
            {view.live
              ? M.liveProgress(view.live.nWeeks, view.live.minWeeks)
              : M.livePending(M.liveStartFallback)}
          </p>
        )}
        <p className={rowLine}>{M.doesNot}</p>
      </div>
    </>
  );
};

export default TargetWeightList;
