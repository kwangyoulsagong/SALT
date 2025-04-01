import { http, HttpResponse } from "msw";
import { LoginRequest } from "../types/auth";
import { authResponses } from "../responses/auth";

export const authHandlers = [
  http.post("/api/v1/auth/login", async ({ request }) => {
    const data = (await request.json()) as LoginRequest;

    if (data?.id === "sgky0511" && data?.password === "ky4400") {
      return HttpResponse.json(authResponses.loginSuccess());
    }

    return new HttpResponse(JSON.stringify(authResponses.loginError()), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }),
];
