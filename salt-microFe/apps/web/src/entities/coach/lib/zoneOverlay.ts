import type { Zone } from "@repo/core/coach";
import type {
  TradingPriceBand as PriceBand,
  TradingPriceLine as PriceLine,
} from "@repo/ui/tradingChart";

import { formatPrice } from "@/shared/lib";

import { COACH_MESSAGES } from "../model";

const { zone: ZONE } = COACH_MESSAGES;

/**
 * 구간 → 차트 가격선 (`FE-REQ-026` FR-132 · FR-133).
 *
 * **가격은 서버 값 그대로다** — 여기서 계산하지 않는다(`FE-REQ-027` FR-85). 이 함수가
 * 정하는 것은 선의 모양뿐이다:
 * - `held_rule` = 손실 제한(실선 · 하락 색) · 1차 익절 검토(점선) · 추세 유지(실선)
 * - `observation` = 하단 · 상단(점선) · 중앙(실선)
 * - `unavailable` = 선 없음
 *
 * 손실 제한만 하락 색이다. 나머지를 상승 색으로 칠하면 "여기까지 오른다"로 읽힌다.
 */
export const zoneToPriceLines = (zone: Zone): PriceLine[] => {
  if (zone.kind === "unavailable") return [];

  if (zone.kind === "held_rule") {
    return zone.stages.map((stage) => ({
      key: stage.key,
      price: stage.price,
      tone: stage.key === "protect_loss" ? "down" : "neutral",
      dashed: stage.key === "first_profit",
      label: ZONE.stages[stage.key],
    }));
  }

  return [
    { key: "lower", price: zone.lower, tone: "zone", dashed: true, label: ZONE.observation.lower },
    { key: "mid", price: zone.mid, tone: "zone", dashed: false, label: ZONE.observation.mid },
    { key: "upper", price: zone.upper, tone: "zone", dashed: true, label: ZONE.observation.upper },
  ];
};

/**
 * 구간 → 차트 띠 (`FE-REQ-036` FR-1). **관찰 구간만** 띠가 된다 — 내 규칙 가격 세 개는 서로 다른 뜻의
 * 가격이라(손실 제한 · 익절 검토 · 추세 유지) 그 사이를 칠하면 "이 안이 좋다"로 읽힌다. 가격은 서버 값 그대로.
 */
export const zoneToPriceBand = (zone: Zone): PriceBand | null =>
  zone.kind === "observation"
    ? {
        lower: zone.lower,
        upper: zone.upper,
        label: ZONE.bandLabel(formatPrice(zone.lower), formatPrice(zone.upper)),
      }
    : null;
