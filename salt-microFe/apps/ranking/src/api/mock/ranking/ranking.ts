export const rankingApi = {
  myRanks: async () => {
    try {
      const response = await fetch("/api/v1/rank/myranks");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message || "이번달 순위를 가져오는데 실패했습니다."
        );
      }
      return data;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "이번달 순위를 가져오는데 오류 발생하였습니다."
      );
    }
  },
};
