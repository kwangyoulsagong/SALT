import { http, HttpResponse } from "msw";
import { investmentsResponses } from "../responses/Investments";
export const investmentsHandlers = [
  http.get("/api/v1/investments/preview", async () => {
    const accessToken = "fjasdfjadlfjlajl";
    if (accessToken) {
      const totalAmountThisWeek = 800000; // 이번 주 총 지출 금액
      const totalAmountLastWeek = 1000000; // 지난 주 총 지출 금액
      const difference = Math.round(
        ((totalAmountLastWeek - totalAmountThisWeek) / totalAmountLastWeek) *
          100
      );

      return HttpResponse.json({
        difference,
        investments: investmentsResponses.preview(),
      });
    }
  }),
];
