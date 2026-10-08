import { KstDate, Money } from "../../../shared/domain";
import {
  monthStartQuantities,
  monthToDatePnl,
  type CoachHolding,
  type CoachLedgerEntry,
  type CoachProfile,
  type CoachProfileStore,
  type MarketProbe,
  type MonthToDateResult,
  type PortfolioProbe,
} from "../../domain";

/**
 * 리스크 예산이 보는 자산군 — 원화로 거래하는 둘(F011 슬라이스 4). 한 사람의 월 손실 한도는 시장을 가리지 않는다:
 * 코인에서 잃고 국내 주식에서 잃으면 둘 다 같은 예산을 쓴다. 미국 주식(`stock`)은 통화가 달라 넣지 않는다
 */
export const RISK_ASSET_TYPES = ["crypto", "kr_stock"] as const;

/**
 * 리스크 재료 조립 — 사이즈 계산(`CheckTradeSize`)과 리스크 게이지(`GetRiskBudget`)가 같이 쓴다.
 *
 * 두 유스케이스가 **같은 월 손익**을 봐야 한다. 각자 조립하면 게이지는 "예산 41% 사용"인데 사이즈 계산은
 * 다른 잔여로 %를 내는 일이 생긴다. 계산은 `domain/policy/riskBudget` 이고 여기는 읽기만 한다.
 *
 * 쿼리: 프로필 1 · 보유 1(전 자산군을 읽고 코인 · 국내 주식만) · 거래(최근 365일) 1 · 월초 종가(월초 보유 종목 수만큼, 보통 1~5).
 */

/** 거래를 한 번에 읽는 상한. 넘으면 `truncated` 이고 합을 만들지 않는다 */
export const RISK_LEDGER_LIMIT = 2000;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export interface RiskSnapshot {
  profile: CoachProfile | null;
  holdings: CoachHolding[];
  totalValue: Money;
  month: MonthToDateResult;
  /** 최근 365일 거래(최신이 앞) */
  ledger: { entries: CoachLedgerEntry[]; truncated: boolean };
  monthStart: Date;
  yearStart: Date;
}

/** KST 기준 이번 달 1일 · 올해 1월 1일 0시(UTC 시각) */
export const kstPeriodStarts = (now: Date): { monthStart: Date; yearStart: Date } => {
  const today = KstDate.today(now).toString();
  return {
    monthStart: KstDate.parse(`${today.slice(0, 7)}-01`).startOfDayUtc(),
    yearStart: KstDate.parse(`${today.slice(0, 4)}-01-01`).startOfDayUtc(),
  };
};

export const loadRiskSnapshot = async (
  deps: { profiles: CoachProfileStore; portfolio: PortfolioProbe; market: MarketProbe },
  userId: string,
  now: Date
): Promise<RiskSnapshot> => {
  const { monthStart, yearStart } = kstPeriodStarts(now);

  const [profile, allHoldings, ledger] = await Promise.all([
    deps.profiles.findByUser(userId),
    deps.portfolio.listHoldings(userId),
    deps.portfolio.listLedgerSince(userId, new Date(now.getTime() - YEAR_MS), RISK_LEDGER_LIMIT, RISK_ASSET_TYPES),
  ]);
  const holdings = allHoldings.filter(
    (holding) => !holding.assetType || (RISK_ASSET_TYPES as readonly string[]).includes(holding.assetType)
  );

  const totalValue = holdings.reduce(
    (sum, holding) => sum.plus(Money.krw(holding.currentValue)),
    Money.krw(0)
  );

  const monthTrades = ledger.entries.filter((entry) => entry.transactionDate >= monthStart);
  // 잘렸어도 가장 오래된 행이 월초 전이면 이번 달 거래는 다 읽은 것이다
  const oldest = ledger.entries[ledger.entries.length - 1];
  const monthComplete = !ledger.truncated || (oldest !== undefined && oldest.transactionDate < monthStart);

  const positions = holdings.map((holding) => ({
    symbol: holding.symbol,
    quantity: holding.totalQuantity,
    value: holding.currentValue,
  }));

  let month: MonthToDateResult;
  if (!monthComplete) {
    month = { status: "insufficient_data", missingCloses: [] };
  } else {
    const symbols = [...monthStartQuantities(positions, monthTrades).keys()];
    const closes = await Promise.all(
      // 월초 기준가는 일봉 — 5분봉은 30일 뒤 지워져 지난달 값이 사라진다
      symbols.map(async (symbol) => [symbol, await deps.market.closeAtOrAfter(symbol, monthStart, "d1")] as const)
    );
    const monthStartCloses = new Map<string, number>();
    for (const [symbol, close] of closes) {
      if (close !== null) monthStartCloses.set(symbol, close);
    }
    month = monthToDatePnl({ holdings: positions, trades: monthTrades, monthStartCloses });
  }

  return { profile, holdings, totalValue, month, ledger, monthStart, yearStart };
};
