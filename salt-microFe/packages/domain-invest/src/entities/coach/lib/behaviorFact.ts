import type { ReportBehaviorFact } from "@repo/core/coach";

import { COACH_MESSAGES } from "../model";
import { formatRatio } from "./format";

const { report: REPORT } = COACH_MESSAGES;
const HOURS_PER_DAY = 24;

/** 기간 표시 — 168 → `7일`, 36 → `36시간`. 포맷이지 계산이 아니다 */
const formatPeriod = (hours: number): string =>
  hours % HOURS_PER_DAY === 0
    ? REPORT.periodDays(hours / HOURS_PER_DAY)
    : REPORT.periodHours(hours);

const numberParam = (fact: ReportBehaviorFact, key: string): number | null => {
  const value = fact.params[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

/**
 * 행동 기록 한 줄 → 사실 문장 (`FE-REQ-026` FR-60 · `FE-REQ-027` FR-22 · 23).
 *
 * 모르는 `factCode` 이거나 재료가 빠졌으면 `null` — 그 줄을 그리지 않는다. 코드 원문도,
 * 반쯤 채운 문장도 내보내지 않는다.
 */
export const describeBehaviorFact = (fact: ReportBehaviorFact): string | null => {
  const hours = numberParam(fact, "windowHours");
  if (hours === null) return null;
  const period = formatPeriod(hours);
  const facts = REPORT.behaviorFacts;

  switch (fact.factCode) {
    case "over_trading": {
      const trades = numberParam(fact, "trades");
      const threshold = numberParam(fact, "threshold");
      if (trades === null || threshold === null) return null;
      return facts.over_trading(period, trades, threshold);
    }
    case "panic_sell": {
      const sells = numberParam(fact, "sellCount");
      const recovered = numberParam(fact, "lossSellCount");
      const rate = numberParam(fact, "avgSellLossRate");
      if (sells === null || recovered === null || rate === null) return null;
      return facts.panic_sell(period, sells, recovered, formatRatio(rate));
    }
    case "chasing_high": {
      const buys = numberParam(fact, "buyCount");
      const nearHigh = numberParam(fact, "highChaseCount");
      const ratio = numberParam(fact, "thresholdRatio");
      if (buys === null || nearHigh === null || ratio === null) return null;
      return facts.chasing_high(period, buys, nearHigh, formatRatio(ratio));
    }
    default:
      return null;
  }
};
