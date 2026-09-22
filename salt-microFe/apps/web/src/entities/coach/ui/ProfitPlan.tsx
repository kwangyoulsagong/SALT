import type { Zone } from "@repo/core/coach";
import { Heading } from "@repo/ui/heading";
import { Text } from "@repo/ui/text";

import { formatPrice } from "@/shared/lib";

import { describePriceGap, formatRatio } from "../lib";
import { COACH_MESSAGES } from "../model";
import {
  detailSection,
  gapCaption,
  rowHeader,
  table,
  tableCaption,
  td,
  th,
} from "./CoachDetail.css";

const { profitPlan: PLAN, zone: ZONE } = COACH_MESSAGES;

/**
 * 수익 플랜 — 보유 종목의 3단계 (`FE-REQ-026` FR-137 · FR-102).
 *
 * 재료는 구간(`zone`)의 `held_rule` 분기다 — 가격 · 비중 · 상태 · 현재가와의 차이 전부 서버 값.
 * 보유가 아니면(`observation` · `unavailable`) 플랜이 없다는 한 줄이다. REQ 의 "거래 기록 추가"
 * 진입은 그 화면이 없어(F006) 아직 그리지 않는다.
 *
 * 3단계는 실제 `<table>` + `<caption>` 이다(FR-102). 거리 % 는 그리지 않는다(D13).
 * 현재가와의 차이는 가격 칸 아래 한 줄이다 — 네 칸이면 우측 380px 열에서 단계 이름이 끊겼다.
 */
export const ProfitPlan = ({ zone }: { zone: Zone }) => {
  if (zone.kind !== "held_rule") {
    return (
      <section className={detailSection}>
        <Heading level={5} color="tertiary">
          {PLAN.heading}
        </Heading>
        <Text color="tertiary">{PLAN.noHolding}</Text>
      </section>
    );
  }

  const status = PLAN.status[zone.status];

  return (
    <section className={detailSection}>
      <Heading level={5} color="tertiary">
        {PLAN.heading}
      </Heading>
      {status && <Text>{status}</Text>}
      <table className={table}>
        <caption className={tableCaption}>{PLAN.caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={th}>{PLAN.columns.stage}</th>
            <th scope="col" className={th}>{PLAN.columns.price}</th>
            <th scope="col" className={th}>{PLAN.columns.ratio}</th>
          </tr>
        </thead>
        <tbody>
          {zone.stages.map((stage) => (
            <tr key={stage.key}>
              <th scope="row" className={rowHeader}>{ZONE.stages[stage.key]}</th>
              <td className={td}>
                {ZONE.price(formatPrice(stage.price))}
                <span className={gapCaption}>{describePriceGap(stage.priceGap)}</span>
              </td>
              <td className={td}>{formatRatio(stage.ratio)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

export default ProfitPlan;
