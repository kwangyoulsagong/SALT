export const goalsApi = {
  myGoals: async () => {
    try {
      const response = await fetch("/api/v1/mygoals");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "내 목표에 가져온는데 실패했습니다.");
      }
      return data;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "내 목표 가져오는데 오류 발생하였습니다."
      );
    }
  },
  GoalsProcess: async () => {
    try {
      const response = await fetch("/api/v1/goals");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message || "내 목표 리스트를 가져온는데 실패했습니다."
        );
      }
      return data;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "내 목표 리스트를 가져오는데 오류 발생하였습니다."
      );
    }
  },
};
