import { PORTFOLIO_MESSAGES } from "../model/messages";
import { AnalysisGraphBar, InvestmentsAnalysisData } from "../model/types";

/**
 * 주간 카테고리 비교를 막대 높이(%)로 바꾼다.
 *
 * **금액 계산이 아니다** — 서버가 준 두 주치 금액의 표시 비율만 만든다.
 * 금액 계산은 서버가 한다(전 영역 공통 수용 기준).
 */
export const buildAnalysisGraph = ({
  thisWeekData,
  lastWeekData,
}: InvestmentsAnalysisData): AnalysisGraphBar[] => {
  if (
    !Array.isArray(thisWeekData) ||
    !Array.isArray(lastWeekData) ||
    thisWeekData.length !== lastWeekData.length
  ) {
    throw new Error(PORTFOLIO_MESSAGES.mismatchedShape);
  }

  return lastWeekData.map((lastWeek, index) => {
    const thisWeek = thisWeekData[index];
    if (lastWeek.category !== thisWeek.category) {
      throw new Error(PORTFOLIO_MESSAGES.mismatchedCategory);
    }

    const percentage =
      ((lastWeek.amount + thisWeek.amount) / lastWeek.amount) * 100 - 100;

    return {
      id: index,
      category: thisWeek.category,
      percent: percentage.toFixed(2),
    };
  });
};
