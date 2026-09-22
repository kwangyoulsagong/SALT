import type { Zone } from "@repo/core/coach";
import { Badge } from "@repo/ui/badge";
import { Heading } from "@repo/ui/heading";
import { KeyValueList, type KeyValueItem } from "@repo/ui/keyValueList";
import { Text } from "@repo/ui/text";

import { formatPrice } from "@/shared/lib";

import { formatGapAmount } from "../lib";
import { COACH_MESSAGES } from "../model";
import { caption, zoneHeader, zoneSlot, zoneValue } from "./CoachBlock.css";

const { zone: ZONE } = COACH_MESSAGES;

const gapText = (gap: number) => {
  if (gap === 0) return ZONE.gapNone;
  const amount = formatGapAmount(gap);
  return gap > 0 ? ZONE.gapAbove(amount) : ZONE.gapBelow(amount);
};

/** 가격 + 현재가와의 거리(금액). 거리 % 는 그리지 않는다(D13) */
const row = (label: string, price: number, gap: number): KeyValueItem => ({
  label,
  value: (
    <span className={zoneValue}>
      <span>{ZONE.price(formatPrice(price))}</span>
      <span className={caption}>{gapText(gap)}</span>
    </span>
  ),
});

const ZoneHeading = ({ title }: { title: string }) => (
  <div className={zoneHeader}>
    <Heading level={5} color="tertiary">
      {title}
    </Heading>
    <Badge size="sm" tone="neutral">
      {COACH_MESSAGES.notPrediction}
    </Badge>
  </div>
);

/**
 * ③ 내 규칙 가격(보유) / 관찰 구간(미보유) (`FE-REQ-026` FR-115~117).
 *
 * 구간은 **판단이 아니다** — 과거 가격 분포와 사용자 자신의 규칙이다. 그래서 판단이
 * 막혀도(`renderable: false`) 그린다. `예측 아님` 배지는 언제나 붙는다.
 * 가격과 거리는 서버 값을 표시만 한다(제품 공통 수용 기준 §6-3).
 */
export const ZoneSummary = ({ zone }: { zone: Zone }) => {
  if (zone.kind === "unavailable") {
    return (
      <div className={zoneSlot}>
        <ZoneHeading title={ZONE.observationHeading} />
        <Text color="tertiary">{ZONE.unavailable[zone.reasonCode]}</Text>
      </div>
    );
  }

  if (zone.kind === "held_rule") {
    return (
      <div className={zoneSlot}>
        <ZoneHeading title={ZONE.heldRuleHeading} />
        <KeyValueList
          items={zone.stages.map((stage) =>
            row(ZONE.stages[stage.key], stage.price, stage.priceGap),
          )}
        />
      </div>
    );
  }

  const rule = ZONE.rules[zone.ruleCode];
  return (
    <div className={zoneSlot}>
      <ZoneHeading title={ZONE.observationHeading} />
      <KeyValueList
        items={[
          row(ZONE.observation.lower, zone.lower, zone.priceGap.lower),
          row(ZONE.observation.mid, zone.mid, zone.priceGap.mid),
          row(ZONE.observation.upper, zone.upper, zone.priceGap.upper),
        ]}
      />
      {rule && <p className={caption}>{rule}</p>}
    </div>
  );
};

export default ZoneSummary;
