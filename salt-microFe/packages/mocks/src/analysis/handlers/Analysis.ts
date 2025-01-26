import { http, HttpResponse } from "msw";
import { analysisResponses } from "../responses/Analysis";
export const analysisHandlers = [
  http.get("/api/v1/analysis/preview", async () => {
    const accessToken = "fjasdfjadlfjlajl";
    if (accessToken) {
      const totalAmountThisWeek = 800000; // 이번 주 총 지출 금액
      const totalAmountLastWeek = 1000000; // 지난 주 총 지출 금액
      const difference = Math.round(
        ((totalAmountLastWeek - totalAmountThisWeek) / totalAmountLastWeek) *
          100
      );

      return HttpResponse.json({
        totalAmount: totalAmountThisWeek,
        difference,
        analysis: analysisResponses.preview(),
      });
    }
  }),
];
