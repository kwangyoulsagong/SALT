import axios from "axios";

import { ONBOARDING_ENDPOINTS } from "@/entities/auth";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

import type {
  AcceptInviteRequest,
  AcceptInviteResponse,
  InviteCheckResponse,
} from "../model/types";

/**
 * 초대 확인·수락.
 *
 * **mutation 은 feature 가 갖는다** — `entities/auth/api` 는 조회만 둔다
 * (`fsd-entities.md`). 경로는 엔티티가 소유한 `ONBOARDING_ENDPOINTS` 를 쓴다.
 *
 * 둘 다 **토큰을 붙이지 않는다.** 계정이 생기기 전에 부르는 경로이고, `authHeader()` 를
 * 붙이면 이전 세션의 토큰이 남아 있을 때 엉뚱한 사용자로 요청이 나간다.
 */
export const acceptInviteApi = {
  check: async (code: string): Promise<InviteCheckResponse> => {
    const { data } = await axios.get<InviteCheckResponse>(
      `${INVESTMENTS_BASE_URL}${ONBOARDING_ENDPOINTS.inviteCheck(code)}`,
    );
    return data;
  },
  accept: async (body: AcceptInviteRequest): Promise<AcceptInviteResponse> => {
    const { data } = await axios.post<AcceptInviteResponse>(
      `${INVESTMENTS_BASE_URL}${ONBOARDING_ENDPOINTS.invite()}`,
      body,
    );
    return data;
  },
};
