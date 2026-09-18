/** 포트폴리오(투자 요약) 슬라이스의 데이터 계약. */

export interface WeeklyCategoryAmount {
  category: string;
  amount: number;
}

export interface InvestmentsAnalysisData {
  thisWeekData: WeeklyCategoryAmount[];
  lastWeekData: WeeklyCategoryAmount[];
}

export interface InvestmentsPreview {
  difference: number;
  investments: InvestmentsAnalysisData;
}

/** 막대 그래프 한 칸. */
export interface AnalysisGraphBar {
  id: number;
  category: string;
  percent: string;
}

/**
 * 홈 "주식" 섹션 한 줄. **BFF 가 소유한 뷰모델**이다 (`/api/app/portfolio/summary`).
 *
 * 평가금액과 손익률은 **서버가 계산한다** — 프론트는 표시만 한다(전 영역 공통 수용 기준).
 */
export interface PortfolioSummaryItem {
  symbol: string;
  /** 시세 목록에서 찾은 이름. 못 찾으면 심볼이 들어 있다 */
  name: string;
  assetType: string;
  currentValue: number;
  profitRate: number;
}

export interface PortfolioSummary {
  items: PortfolioSummaryItem[];
  totalKrw: number;
  /** 환율 기준. 지금은 언제나 `null` — 보유가 전부 원화 크립토다 */
  fxRateUsed: number | null;
  fxBasisCode: string | null;
  /** 종목명을 못 붙였다. 금액은 그대로 믿을 수 있다 */
  namesDegraded: boolean;
}
