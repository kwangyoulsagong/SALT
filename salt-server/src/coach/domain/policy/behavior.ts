import type { CoachTrade } from "../model";

/**
 * 투자 행동 판정 — `behavior-analysis.service` 에서 옮겨온 **순수 판정**.
 *
 * 원문은 판정과 저장(`prisma.investmentInsight.upsert`)이 한 메서드에 붙어 있어
 * **DB 없이는 한 줄도 실행할 수 없었다.** 판정만 떼어 여기 두고, 저장은
 * `application` 이 한다.
 *
 * ## 2인칭 인격 평가를 하지 않는다
 *
 * 문구가 전부 **행동 서술**이다("~가 감지되었습니다"). 원문도 그랬고 그대로 옮겼다 —
 * "당신은 충동적입니다" 류로 바꾸지 않는다.
 */

export const BEHAVIOR_DEFAULTS = {
  overTradingWindowHours: 24,
  overTradingThreshold: 12,
  panicSellWindowHours: 24,
  chasingWindowHours: 48,
  chasingThresholdRatio: 0.98,
  /** 인사이트 유효 시간. 원문의 `ttlHours` 기본값이다. */
  ttlHours: 6,
} as const;

export type BehaviorKind = "over_trading" | "panic_sell" | "chasing_high";

export type BehaviorPayload =
  | {
      kind: "over_trading";
      windowHours: number;
      trades: number;
      threshold: number;
      symbols: string[];
    }
  | {
      kind: "panic_sell";
      windowHours: number;
      sellCount: number;
      lossSellCount: number;
      /** 0~1 */
      avgSellLossRate: number;
      examples: Array<{ symbol: string; lossRate: number; soldAt: Date }>;
    }
  | {
      kind: "chasing_high";
      windowHours: number;
      buyCount: number;
      highChaseCount: number;
      thresholdRatio: number;
      examples: Array<{
        symbol: string;
        buyPrice: number;
        recentHigh: number;
        boughtAt: Date;
      }>;
    };

/** 판정 하나. 저장에 필요한 값만 담고 `userId` 는 `application` 이 붙인다. */
export interface BehaviorFinding {
  dedupeKey: string;
  title: string;
  summary: string;
  severity: number;
  confidence: number;
  payload: BehaviorPayload;
}

export const hoursBefore = (now: Date, hours: number): Date =>
  new Date(now.getTime() - hours * 60 * 60 * 1000);

/** 1) 최근 N시간 거래 횟수 과다. */
export const detectOverTrading = (
  trades: CoachTrade[],
  windowHours: number,
  threshold: number,
  now: Date
): BehaviorFinding | null => {
  const cutoff = hoursBefore(now, windowHours);
  const windowTrades = trades.filter((t) => t.transactionDate > cutoff);

  if (windowTrades.length < threshold) return null;

  const symbols = Array.from(
    new Set(windowTrades.map((t) => t.symbol))
  ).slice(0, 10);
  const count = windowTrades.length;

  return {
    dedupeKey: `overtrading:${windowHours}h`,
    title: "과다 거래 경고",
    summary: `최근 ${windowHours}시간 동안 ${count}회 거래가 감지되었습니다. (기준 ${threshold}회)`,
    severity: Math.min(
      100,
      40 + Math.round(((count - threshold) / threshold) * 60)
    ),
    confidence: 0.75,
    payload: {
      kind: "over_trading",
      windowHours,
      trades: count,
      threshold,
      symbols,
    },
  };
};

/**
 * 2) 손실 매도 의심.
 *
 * **현재가 대비 매도단가**로 손실률을 추정한다 — 매수 원가가 아니다. 원문의 한계를
 * 그대로 옮겼다(주석도 그렇게 적혀 있었다). 원가 기준 손익은 `ledger`(F001)가
 * 거래별 귀속을 만든 뒤의 일이다.
 */
export const detectPanicSell = (
  trades: CoachTrade[],
  windowHours: number,
  currentPrices: Map<string, number | null>,
  now: Date
): BehaviorFinding | null => {
  const cutoff = hoursBefore(now, windowHours);

  const sells = trades
    .filter((t) => t.transactionType === "sell")
    .filter((t) => t.transactionDate > cutoff);

  if (sells.length === 0) return null;

  const examples: Array<{ symbol: string; lossRate: number; soldAt: Date }> =
    [];
  let lossSellCount = 0;
  let lossSum = 0;

  for (const sell of sells) {
    const current = currentPrices.get(sell.symbol);
    if (!current || !sell.price) continue;

    const lossRate = Math.max(0, (current - sell.price) / current);

    if (lossRate >= 0.03) {
      lossSellCount++;
      lossSum += lossRate;

      if (examples.length < 5) {
        examples.push({
          symbol: sell.symbol,
          lossRate,
          soldAt: sell.transactionDate,
        });
      }
    }
  }

  if (lossSellCount === 0) return null;

  const avgSellLossRate = lossSum / lossSellCount;

  return {
    dedupeKey: `panicsell:${windowHours}h`,
    title: "패닉 셀 가능성",
    summary: `최근 ${windowHours}시간 내 손실 매도 의심 거래가 ${lossSellCount}건 감지되었습니다.`,
    severity: Math.min(
      100,
      45 + Math.round(avgSellLossRate * 200) + lossSellCount * 5
    ),
    confidence: 0.65,
    payload: {
      kind: "panic_sell",
      windowHours,
      sellCount: sells.length,
      lossSellCount,
      avgSellLossRate,
      examples,
    },
  };
};

/** 3) 최근 고점 근처 매수. 기준선(`recentHighs`)은 5분봉 최고 종가다. */
export const detectChasingHigh = (
  trades: CoachTrade[],
  windowHours: number,
  thresholdRatio: number,
  recentHighs: Map<string, number>,
  now: Date
): BehaviorFinding | null => {
  const cutoff = hoursBefore(now, windowHours);

  const buys = trades
    .filter((t) => t.transactionType === "buy")
    .filter((t) => t.transactionDate > cutoff);

  if (buys.length === 0) return null;

  const examples: Array<{
    symbol: string;
    buyPrice: number;
    recentHigh: number;
    boughtAt: Date;
  }> = [];
  let highChaseCount = 0;

  for (const buy of buys) {
    const recentHigh = recentHighs.get(buy.symbol);
    if (!recentHigh || !buy.price) continue;

    if (buy.price >= recentHigh * thresholdRatio) {
      highChaseCount++;

      if (examples.length < 5) {
        examples.push({
          symbol: buy.symbol,
          buyPrice: buy.price,
          recentHigh,
          boughtAt: buy.transactionDate,
        });
      }
    }
  }

  if (highChaseCount === 0) return null;

  const ratio = highChaseCount / buys.length;

  return {
    dedupeKey: `chasinghigh:${windowHours}h`,
    title: "추격 매수 경고",
    summary: `최근 ${windowHours}시간 내 고점 근처에서 매수가 ${highChaseCount}건 감지되었습니다.`,
    severity: Math.min(100, 40 + Math.round(ratio * 70)),
    confidence: 0.7,
    payload: {
      kind: "chasing_high",
      windowHours,
      buyCount: buys.length,
      highChaseCount,
      thresholdRatio,
      examples,
    },
  };
};

/**
 * 감지된 패턴 → 행동 규칙 — `behavior-coach.service.buildRules` 에서 옮겨왔다.
 *
 * 규칙이 하나도 안 걸리면 "패턴이 적다"는 문장을 준다. **빈 배열을 주지 않는다** —
 * 화면이 빈 칸을 "분석 실패"로 읽는다.
 */
export const buildBehaviorRules = (tags: string[]): string[] => {
  const rules = new Set<string>();

  if (tags.includes("over_trading")) {
    rules.add(
      "오늘 추가 거래 횟수를 제한하고, 같은 종목 재진입 전 30분을 기다리세요."
    );
  }

  if (tags.includes("panic_sell")) {
    rules.add("시장가 매도 전 최초 매수 논리가 깨졌는지 먼저 확인하세요.");
  }

  if (tags.includes("chasing_high")) {
    rules.add("급등 직후 진입보다 대기 가격 알림을 먼저 설정하세요.");
  }

  if (!rules.size) {
    rules.add(
      "현재 뚜렷한 반복 손실 패턴은 적지만, 거래 전 계획 기록은 유지하세요."
    );
  }

  return Array.from(rules);
};
