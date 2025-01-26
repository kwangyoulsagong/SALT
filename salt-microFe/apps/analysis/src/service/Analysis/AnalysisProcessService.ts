interface AnalysisProcessProps {
  data: {
    thisWeekData: [
      {
        category: string;
        amount: number;
      }
    ];
    lastWeekData: [
      {
        category: string;
        amount: number;
      }
    ];
  };
}
export class AnalysisProcessService {
  Analysis({
    data,
  }: AnalysisProcessProps): {
    id: number;
    category: string;
    percent: string;
  }[] {
    const { thisWeekData, lastWeekData } = data;
    if (
      !Array.isArray(thisWeekData) ||
      !Array.isArray(lastWeekData) ||
      thisWeekData.length !== lastWeekData.length
    ) {
      throw new Error(
        "데이터 형식이 올바르지 않거나 배열 길이가 일치하지 않습니다."
      );
    }
    const graphs = [];
    for (let i = 0; i < lastWeekData.length; i++) {
      if (lastWeekData[i].category !== thisWeekData[i].category) {
        throw new Error("카테고리가 일치하지 않습니다.");
      }
      const percentage =
        ((lastWeekData[i].amount + thisWeekData[i].amount) /
          lastWeekData[i].amount) *
          100 -
        100;
      graphs.push({
        id: i,
        category: thisWeekData[i].category,
        percent: percentage.toFixed(2),
      });
    }
    return graphs;
  }
}
