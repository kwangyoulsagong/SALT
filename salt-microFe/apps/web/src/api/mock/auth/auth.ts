import { LoginRequest } from "./types";

export const authApi = {
  login: async (body: LoginRequest) => {
    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "로그인에 실패했습니다.");
      }

      return data;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "로그인 중 오류가 발생했습니다."
      );
    }
  },
};
