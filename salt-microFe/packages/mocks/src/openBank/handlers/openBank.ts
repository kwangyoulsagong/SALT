import { http, HttpResponse } from "msw";
import { openBankingResponses } from "../responses/openBankingResponse";

export const openBankHandlers = [
  // 인증 API
  http.post("/api/v1/bank/auth", async ({ request }) => {
    const body = (await request.json()) as { name: string; birth: string };
    const { name, birth } = body;
    if (name === "사공광열" && birth === "990117")
      return HttpResponse.json(openBankingResponses.generateAuthResponse());
  }),

  // 계좌 목록 조회 API
  http.get("/api/v1/bank/account/list", async ({ request }) => {
    const authorization = request.headers.get("Authorization");
    const userId = authorization?.split(" ")[1] || "default";
    return HttpResponse.json(openBankingResponses.generateAccountList(userId));
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
