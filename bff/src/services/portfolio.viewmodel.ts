/**
 * 보유 요약 뷰모델 매핑 — **순수 함수**. import 가 없다.
 */

/** 홈 "주식" 섹션 한 줄 (`BFF-REQ-008`). */
export interface PortfolioSummaryItemVM {
  symbol: string;
  /** 사람이 읽는 이름. 시세 목록에서 찾지 못하면 **심볼을 그대로 쓴다** */
  name: string;
  assetType: string;
  currentValue: number;
  profitRate: number;
}

export interface PortfolioSummaryVM {
  items: PortfolioSummaryItemVM[];
  totalKrw: number;
  /**
   * 환율 기준. **지금은 언제나 `null`** 이다 — 보유가 전부 원화 크립토이고 `fx`
   * 컨텍스트가 없다. 화면은 값이 있을 때만 "환율 기준"을 렌더한다.
   */
  fxRateUsed: number | null;
  fxBasisCode: string | null;
  /**
   * 종목명을 못 붙였다. 이름 조회가 실패해도 **금액은 내려보낸다** — 이름이 없다고
   * 보유가 없는 것은 아니다 (`bff-architecture.md` §5).
   */
  namesDegraded: boolean;
}

export interface ServerPortfolioSummary {
  items?: Array<{
    symbol: string;
    assetType: string;
    currentValue: number;
    profitRate: number;
  }>;
  totalKrw?: number;
  fxRateUsed?: number | null;
  fxBasisCode?: string | null;
}

export const toPortfolioSummaryViewModel = (
  summary: ServerPortfolioSummary | undefined,
  nameBySymbol: ReadonlyMap<string, string>,
  namesDegraded: boolean,
): PortfolioSummaryVM => ({
  items: (summary?.items ?? []).map((item) => ({
    symbol: item.symbol,
    name: nameBySymbol.get(item.symbol.toUpperCase()) ?? item.symbol,
    assetType: item.assetType,
    currentValue: item.currentValue,
    profitRate: item.profitRate,
  })),
  totalKrw: summary?.totalKrw ?? 0,
  fxRateUsed: summary?.fxRateUsed ?? null,
  fxBasisCode: summary?.fxBasisCode ?? null,
  namesDegraded,
});
