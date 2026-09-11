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
