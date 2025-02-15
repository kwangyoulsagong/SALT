import { http, HttpResponse } from "msw";
import { openBankingResponses } from "../responses/openBankingResponse.js";

export const openBankHandlers = [
  // 인증 API
  http.post("/api/v1/bank/auth", async () => {
    return HttpResponse.json(openBankingResponses.generateAuthResponse());
  }),

  // 계좌 목록 조회 API
  http.get("/api/v1/bank/account/list", async ({ request }) => {
    const userId = request.headers.get("user-seq-no");
    return HttpResponse.json(
      openBankingResponses.generateAccountList(userId || "default")
    );
  }),

  // 계좌 상세정보 조회 API
  http.get(
    "/api/v1/bank/account/detail/:fintech_use_num",
    async ({ params }) => {
      const fintech = Array.isArray(params.fintech_use_num)
        ? params.fintech_use_num[0]
        : params.fintech_use_num;

      return HttpResponse.json(
        openBankingResponses.generateAccountDetail(fintech)
      );
    }
  ),

  // 거래내역 조회 API
  http.get(
    "/api/v1/bank/account/transaction/:fintech_use_num",
    async ({ params }) => {
      const fintech = Array.isArray(params.fintech_use_num)
        ? params.fintech_use_num[0]
        : params.fintech_use_num;

      return HttpResponse.json(
        openBankingResponses.generateTransactionHistory(fintech)
      );
    }
  ),
];
