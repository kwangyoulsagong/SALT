/**
 * 포지션 뷰모델(F006 G절 · `BFF-REQ-027` FR-70~72 · `BFF-REQ-028` FR-40) — **순수 함수**. 계산은 서버, 여기선 이름 · 로고를 붙이고 모양만 맞춘다.
 * 금액 `null` 을 0 으로 바꾸지 않는다 · 레이더 `value: null` 을 0 으로 바꾸지 않는다(FE FR-92). 서버 `degraded` 는 지우지 않고 전달한다.
 *
 * ## 정의가 두 벌이다 — 홈 카드와 같은 방법
 *
 * `bff` 는 pnpm workspace 밖이라 `@repo/core` 를 import 하지 못한다. 같은 정의를 `salt-microFe/packages/core/src/portfolio/position.ts`
 * 에 두고 `__tests__/position-contract.test.ts` 가 아래 `CONTRACT` 블록을
 * 글자 그대로 대조한다.
 */

// CONTRACT:BEGIN PositionView
export type RadarAxisKey = "concentration" | "volatility" | "drawdown" | "news";
export type RadarReasonCode = "over_limit" | "within_limit" | "insufficient_data";
export type FlowRange = "1w" | "1m" | "3m" | "1y";

export interface NamedSymbol {
  symbol: string;
  name: string;
  logoUrl: string | null;
  assetType: string;
}

export interface PositionRadarAxis {
  key: RadarAxisKey;
  /** 0~100 점. 재료가 모자라면 null — 0 으로 그리지 않는다 */
  value: number | null;
  /** 원래 단위 — 집중도 · 뉴스 %, 변동성 연율 %, 낙폭 %(음수) */
  raw: number | null;
  limit: number;
  breached: boolean;
  reasonCode: RadarReasonCode;
  /** 집중도 축의 최대 비중 종목 이름 — 사유 문구에 쓴다 */
  subjectName: string | null;
}

export interface PositionOverviewVM {
  /** 보유 0 — Hero · 레이더 없이 첫 기록 안내 */
  empty: boolean;
  hero: {
    totalValueKrw: number;
    unrealizedProfitKrw: number;
    unrealizedProfitRatePct: number | null;
    investedKrw: number;
    holdingsCount: number;
    topWeight: (NamedSymbol & { pct: number }) | null;
    /** 매수 · 매도 금액을 뺀 시간가중. 30일 전부터 들고 있지 않았으면 null */
    return30dPct: number | null;
  } | null;
  radar: PositionRadarAxis[] | null;
  degraded: boolean;
  degradedReasons: string[];
  namesDegraded: boolean;
}

export interface PositionFlowVM {
  range: FlowRange;
  /** KST 날짜별 평가금(원) — 그날 실제 수량 × 일봉 종가 */
  points: Array<{ date: string; valueKrw: number }>;
  /** 시간가중 지수의 최대 낙폭 — 점이 2개 미만이면 null */
  maxDrawdown: { pct: number; peakDate: string; troughDate: string } | null;
  periodReturnPct: number | null;
  missingSymbols: string[];
  degraded: boolean;
  degradedReasons: string[];
}
// CONTRACT:END PositionView

export interface ServerPositionOverview {
  empty: boolean;
  hero: {
    totalValueKrw: number;
    unrealizedProfitKrw: number;
    unrealizedProfitRatePct: number | null;
    investedKrw: number;
    holdingsCount: number;
    topWeight: { symbol: string; assetType: string; pct: number } | null;
    return30dPct: number | null;
  } | null;
  radar: Array<{
    key: RadarAxisKey;
    value: number | null;
    raw: number | null;
    limit: number;
    breached: boolean;
    reasonCode: "over_limit" | "within_limit" | "insufficient_data";
    subject: string | null;
  }> | null;
  degraded: boolean;
  degradedReasons: string[];
}

export type ServerPositionFlow = PositionFlowVM;

const RADAR_KEYS: ReadonlySet<string> = new Set(["concentration", "volatility", "drawdown", "news"]);

export const toPositionOverviewViewModel = (
  server: ServerPositionOverview,
  names: ReadonlyMap<string, { name: string; logoUrl: string | null }>,
  namesDegraded: boolean,
): PositionOverviewVM => {
  const named = (symbol: string) => names.get(symbol.toUpperCase()) ?? { name: symbol, logoUrl: null };
  const hero = server.hero;
  return {
    empty: server.empty,
    hero: hero
      ? {
          totalValueKrw: hero.totalValueKrw,
          unrealizedProfitKrw: hero.unrealizedProfitKrw,
          unrealizedProfitRatePct: hero.unrealizedProfitRatePct,
          investedKrw: hero.investedKrw,
          holdingsCount: hero.holdingsCount,
          topWeight: hero.topWeight
            ? { symbol: hero.topWeight.symbol, assetType: hero.topWeight.assetType, pct: hero.topWeight.pct, ...named(hero.topWeight.symbol) }
            : null,
          return30dPct: hero.return30dPct,
        }
      : null,
    // 모르는 축 키는 싣지 않는다 — 화면이 문구를 못 고르는 축을 그리지 않게(FE FR-93)
    radar: server.radar
      ? server.radar
          .filter((axis) => RADAR_KEYS.has(axis.key))
          .map((axis) => ({
            key: axis.key,
            value: axis.value,
            raw: axis.raw,
            limit: axis.limit,
            breached: axis.breached,
            reasonCode: axis.reasonCode,
            subjectName: axis.subject ? named(axis.subject).name : null,
          }))
      : null,
    degraded: server.degraded,
    degradedReasons: server.degradedReasons,
    namesDegraded,
  };
};

export const toPositionFlowViewModel = (server: ServerPositionFlow): PositionFlowVM => ({
  range: server.range,
  points: server.points,
  maxDrawdown: server.maxDrawdown,
  periodReturnPct: server.periodReturnPct,
  missingSymbols: server.missingSymbols,
  degraded: server.degraded,
  degradedReasons: server.degradedReasons,
});
