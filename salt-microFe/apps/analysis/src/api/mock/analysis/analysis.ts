export const analysisApi = {
  analysisPreview: async () => {
    try {
      const response = await fetch("/api/v1/analysis/preview");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message || "이번주 지출 분석 가져오는데 실패했습니다."
        );
      }
      return data;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "이번주 지출 분석 가져오는데 오류 발생하였습니다."
      );
    }
  },
};
