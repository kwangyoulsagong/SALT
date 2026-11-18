import { FlexBox } from "@repo/ui/flexBox";
import { KeyValueList, type KeyValueItem } from "@repo/ui/keyValueList";
import { Text } from "@repo/ui/text";

import { formatPrice } from "@repo/web-shared/lib";

import {
  POSITION_MESSAGES,
  formatSignedPct,
  type PositionOverviewVM,
} from "../model/position";
import { PORTFOLIO_MESSAGES } from "../model/messages";
import { heroTotal, pairGrid } from "./position.css";

type Hero = NonNullable<PositionOverviewVM["hero"]>;

const tone = (n: number | null): KeyValueItem["tone"] =>
  n === null ? "muted" : n > 0 ? "up" : n < 0 ? "down" : "default";
const signedKrw = (n: number) =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${PORTFOLIO_MESSAGES.amount(formatPrice(Math.abs(n)))}`;

/**
 * 포지션 Hero 6항목(F006 G절 FR-70 · `FE-REQ-030` FR-100). 값은 서버 계산 그대로 — 표시만 한다.
 * 매입가 숨김이면 원금 · 평가 손익을 그리지 않는다(F009 FR-27) — `"unknown"` 이면 설정이 오기 전이라 역시 그리지 않는다
 */
export const PositionHero = ({
  hero,
  purchasePrice,
}: {
  hero: Hero;
  purchasePrice: "shown" | "hidden" | "unknown";
}) => {
  const m = POSITION_MESSAGES.hero;
  const showCost = purchasePrice === "shown";
  const items: KeyValueItem[] = [
    {
      label: m.profit,
      value: showCost
        ? `${signedKrw(hero.unrealizedProfitKrw)} (${hero.unrealizedProfitRatePct === null ? m.rateNone : formatSignedPct(hero.unrealizedProfitRatePct)})`
        : m.hiddenByPurchasePrice,
      tone: showCost ? tone(hero.unrealizedProfitKrw) : "muted",
    },
    {
      label: m.invested,
      value: showCost
        ? PORTFOLIO_MESSAGES.amount(formatPrice(hero.investedKrw))
        : m.hiddenByPurchasePrice,
      tone: showCost ? "default" : "muted",
    },
    { label: m.holdingsCount, value: m.count(hero.holdingsCount) },
    {
      label: m.topWeight,
      value: hero.topWeight
        ? `${hero.topWeight.name} ${hero.topWeight.pct.toFixed(1)}%`
        : m.rateNone,
      tone: hero.topWeight ? "default" : "muted",
    },
    {
      label: m.return30d,
      value:
        hero.return30dPct === null
          ? m.return30dNone
          : formatSignedPct(hero.return30dPct),
      tone: tone(hero.return30dPct),
    },
  ];

  return (
    <FlexBox direction="column" gap="sm" fullWidth>
      <Text color="tertiary">{m.totalValue}</Text>
      <p
        className={heroTotal}
        aria-label={`${m.totalValue} ${formatPrice(hero.totalValueKrw)}원`}
      >
        {PORTFOLIO_MESSAGES.amount(formatPrice(hero.totalValueKrw))}
      </p>
      <div className={pairGrid}>
        <KeyValueList items={items.slice(0, 3)} />
        <KeyValueList items={items.slice(3)} />
      </div>
      {hero.return30dPct !== null ? (
        <Text variant="caption" color="tertiary">
          {m.return30dNote}
        </Text>
      ) : null}
    </FlexBox>
  );
};
