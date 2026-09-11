export const authResponses = {
  loginSuccess: () => ({
    user: {
      id: 1,
      nickname: "김솔트",
      email: "salt@example.com",
      profile: "https://static.toss.im/illusts/img-profile-07.png",
    },
    token: "mock-jwt-token",
  }),
  loginError: () => ({
    message: "아이디 또는 비밀번호가 일치하지 않습니다.",
  }),
};
