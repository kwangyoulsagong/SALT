const bankToken = localStorage.getItem("bankToken");
export const bankApi = {
  auth: async (body: object) => {
    try {
      const response = await fetch("/api/v1/bank/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "오픈 뱅킹 회원 인증에 실패 했습니다.");
      }
      return data;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "오픈 뱅킹 회원 인증에 오류가 발생하였습니다."
      );
    }
  },
  accountList: async () => {
    try {
      const response = await fetch("/api/v1/bank/account/list", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bankToken}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message || "오픈 뱅킹 회원 계좌조회에 실패 했습니다."
        );
      }
      return data;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "오픈 뱅킹 회원 계좌조회에 오류가 발생하였습니다."
      );
    }
  },
};
