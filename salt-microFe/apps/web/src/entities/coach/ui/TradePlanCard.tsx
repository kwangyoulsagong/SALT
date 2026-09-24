"use client";

import type { TradePlanListResult } from "@repo/core/coach";
import { useId } from "react";

import { formatPrice } from "@/shared/lib";

import { daysSince, formatGeneratedAt } from "../lib";
import { RISK_MESSAGES } from "../model";
import { CoachDisclosure } from "./CoachDisclosure";
import {
  cardTitle,
  chip,
  hint,
  planLabel,
  planMeta,
  planRow,
  planValue,
  stack,
} from "./TradeRisk.css";

const { plan: PLAN } = RISK_MESSAGES;

interface TradePlanCardProps {
  result: TradePlanListResult;
  /** 실시간 현재가(원). 손절가와 나란히 둘 뿐 둘의 차이를 계산하지 않는다 — 거리는 서버 필드가 생기면 싣는다 */
  livePrice: number | null;
  className?: string;
}

/**
 * "내 계획" 카드 (F009 시나리오 2 · `FE-REQ-039`). 종목 상세 우측, 변동 범위 카드 아래.
 *
 * 가장 최근 계획 하나를 보인다 — 손절가 · 이유 · D+N · 거래 연결 · 준수 판정(배치가 생기면).
 * 계획이 없으면 빈 상태 한 줄. 판정 라벨은 정보다 — 색 없이 글자로만 둔다(차단 · 경고 아님).
 * 3종 고지 슬롯은 카드마다 고정이다(FR-32).
 */
export const TradePlanCard = ({ result, livePrice, className }: TradePlanCardProps) => {
  const headingId = useId();
  const body = () => {
    if (result.status === "unavailable") return <p className={hint}>{PLAN.unavailable}</p>;
    const [latest, ...older] = result.plans;
    if (!latest) return <p className={hint}>{PLAN.empty}</p>;

    const days = daysSince(latest.plannedAt);
    const plannedOn = formatGeneratedAt(latest.plannedAt);
    const adherence = latest.adherence.userLabel ?? latest.adherence.label;

    return (
      <>
        <div className={planMeta}>
          <span className={chip}>{PLAN.side[latest.side]}</span>
          {days !== null && <span>{PLAN.daysSince(days)}</span>}
          {plannedOn && <span>{PLAN.plannedOn(plannedOn)}</span>}
          {latest.locked && <span>{PLAN.locked}</span>}
          {adherence && <span className={chip}>{PLAN.adherence[adherence]}</span>}
        </div>
        <dl className={planRow}>
          <dt className={planLabel}>{PLAN.stop}</dt>
          <dd className={planValue}>
            {latest.stopPrice !== null ? PLAN.price(formatPrice(latest.stopPrice)) : PLAN.noStop}
          </dd>
          {livePrice !== null && (
            <>
              <dt className={planLabel}>{PLAN.currentPrice}</dt>
              <dd className={planValue}>{PLAN.price(formatPrice(livePrice))}</dd>
            </>
          )}
          {latest.thesis && (
            <>
              <dt className={planLabel}>{PLAN.thesis}</dt>
              <dd className={planValue}>{latest.thesis}</dd>
            </>
          )}
        </dl>
        {older.length > 0 && <p className={hint}>{PLAN.more(older.length)}</p>}
      </>
    );
  };

  return (
    <section className={className} aria-labelledby={headingId}>
      <div className={stack}>
        <h2 id={headingId} className={cardTitle}>
          {PLAN.heading}
        </h2>
        {body()}
      </div>
      <CoachDisclosure />
    </section>
  );
};
