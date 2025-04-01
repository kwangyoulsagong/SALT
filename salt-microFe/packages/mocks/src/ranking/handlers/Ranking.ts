import { http, HttpResponse } from "msw";
import { RankingResponses } from "../responses/Ranking";
export const rankingHandlers = [
  http.get("/api/v1/rank/myranks", async () => {
    const accessToken = "fjasdfjadlfjlajl";
    if (accessToken) {
      return HttpResponse.json(RankingResponses.MyRanks());
    }
  }),
];
