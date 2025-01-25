import { http, HttpResponse } from "msw";

import { goalResponses } from "../responses/Goals";

export const goalsHandlers = [
  http.get("/api/v1/mygoals", async () => {
    const accessToken = "fjasdfjadlfjlajl";
    if (accessToken) {
      return HttpResponse.json(goalResponses.myGoals());
    }
  }),
  http.get("/api/v1/goals", async () => {
    const accessToken = "fjasdfjadlfjlajl";
    if (accessToken) {
      return HttpResponse.json(goalResponses.GoalsProcess());
    }
  }),
];
