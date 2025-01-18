import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/v1/auth", () => {
    return HttpResponse.json({
      id: 1,
      nickname: "광열",
      email: "user@example.com",
    });
  }),
];
