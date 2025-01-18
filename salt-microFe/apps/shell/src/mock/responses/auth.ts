export const authResponses = {
  loginSuccess: () => ({
    id: 1,
    nickname: "광열",
    email: "user@example.com",
    token: "mock-jwt-token",
  }),
  loginError: () => ({
    message: "아이디 또는 비밀번호가 일치하지 않습니다.",
  }),
};
