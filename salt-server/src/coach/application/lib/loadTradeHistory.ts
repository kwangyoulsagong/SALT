import {
  replayLedger,
  sortLedgerAscending,
  toKrBarClock,
  type CoachLedgerEntry,
  type DailyBar,
  type ForecastReader,
  type LedgerReplay,
  type OutcomeAssetType,
  type PortfolioProbe,
  type TradePlan,
  type TradePlanStore,
} from "../../domain";

/**
 * 거래 전 기간 재료 — 판정 배치(`EvaluateTradeDecisions`)와 미러(`GetBehaviorMirror`)가 같이 쓴다.
 *
 * 둘이 **같은 되감기**를 봐야 한다. 배치가 저장한 결과와 미러가 새로 센 처분효과가 다른 원가를 쓰면
 * "태그 비용 합"과 "처분효과"가 서로를 부정한다. 계산은 `domain/policy/tradeLedger` 이고 여기는 읽기만 한다.
 *
 * 쿼리: 거래 1 · 연결 계획 1 · 일봉 1(종목 전부 한 번에).
 *
 * 자산군마다 따로 읽는다(F011 FR-47) — 계획은 **이 자산군 거래에 연결된 것만**(연결 거래가 지워지면 `SetNull` 이라
 * 연결 계획의 거래는 늘 둘 중 한 자산군에 있다). 국내 주식 일봉은 실제 KST 하루 축으로 옮겨 준다(`toKrBarClock`).
 */

/** 한 사용자 거래를 한 번에 읽는 상한. 넘으면 합을 만들지 않는다(`truncated`) */
export const TRADE_HISTORY_LIMIT = 5000;
export const LINKED_PLAN_LIMIT = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type TradeHistory =
  | { status: "truncated" }
  | {
      status: "ok";
      entries: CoachLedgerEntry[];
      replay: LedgerReplay;
      plans: TradePlan[];
      barsBySymbol: Map<string, DailyBar[]>;
    };

export const loadTradeHistory = async (
  deps: { portfolio: PortfolioProbe; tradePlans: TradePlanStore; forecasts: ForecastReader },
  userId: string,
  assetType: OutcomeAssetType = "crypto"
): Promise<TradeHistory> => {
  const [ledger, linked] = await Promise.all([
    deps.portfolio.listLedgerSince(userId, new Date(0), TRADE_HISTORY_LIMIT, [assetType]),
    deps.tradePlans.listLinked(userId, LINKED_PLAN_LIMIT),
  ]);
  if (ledger.truncated) return { status: "truncated" };

  const entries = sortLedgerAscending(
    ledger.entries.map((entry) => ({ ...entry, symbol: entry.symbol.toUpperCase() }))
  );
  const entryIds = new Set(entries.map((entry) => entry.id));
  const plans = linked.filter((plan) => plan.transactionId !== null && entryIds.has(plan.transactionId));
  const symbols = [...new Set(entries.map((entry) => entry.symbol))];
  // 첫 거래 하루 전부터 — 산 날 봉이 비었을 때 직전 종가를 쓸 수 있게
  const from = entries.length ? new Date(entries[0].transactionDate.getTime() - 2 * DAY_MS) : new Date();
  const bars = await deps.forecasts.dailyCloses(symbols, from);
  const barsBySymbol = assetType === "kr_stock" ? toKrBarClock(bars) : bars;

  return { status: "ok", entries, replay: replayLedger(entries), plans, barsBySymbol };
};
