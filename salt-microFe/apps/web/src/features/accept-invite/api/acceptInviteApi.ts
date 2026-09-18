import { ONBOARDING_ENDPOINTS } from "@/entities/auth";
import { apiFetch } from "@/shared/api";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

import type {
  AcceptInviteRequest,
  AcceptInviteResponse,
  InviteCheckResponse,
  InviteReasonCode,
} from "../model/types";

/**
 * 초대 확인·수락.
 *
 * **mutation 은 feature 가 갖는다** — `entities/auth/api` 는 조회만 둔다
 * (`fsd-entities.md`). 경로는 엔티티가 소유한 `ONBOARDING_ENDPOINTS` 를 쓴다.
 *
 * 둘 다 **토큰을 붙이지 않는다.** 계정이 생기기 전에 부르는 경로이고, `authHeader()` 를
 * 붙이면 이전 세션의 토큰이 남아 있을 때 엉뚱한 사용자로 요청이 나간다.
 *
 * `axios` 를 쓰지 않는 이유는 `entities/auth/api/onboardingApi.ts` 주석과 같다.
 */
export const acceptInviteApi = {
  check: async (code: string): Promise<InviteCheckResponse> => {
    const response = await apiFetch(
      `${INVESTMENTS_BASE_URL}${ONBOARDING_ENDPOINTS.inviteCheck(code)}`,
    );

    if (!response.ok) {
      throw new Error(`invite check failed: ${response.status}`);
    }

    return (await response.json()) as InviteCheckResponse;
  },

  /**
   * 코드 수락. 실패는 `InviteRejectedError` 다 — **HTTP 모양이 여기서 멈춘다.**
   *
   * 화면이 status 나 응답 본문 구조를 알면 BFF 계약이 바뀔 때 UI 가 깨진다.
   */
  accept: async (body: AcceptInviteRequest): Promise<AcceptInviteResponse> => {
    const response = await apiFetch(
      `${INVESTMENTS_BASE_URL}${ONBOARDING_ENDPOINTS.invite()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      throw new InviteRejectedError(await reasonCodeOf(response));
    }

    return (await response.json()) as AcceptInviteResponse;
  },
};

/**
 * 초대 거절. `reasonCode` 를 들고 있어 화면이 문구를 고른다.
 *
 * `Error` 를 상속하는 이유는 React Query 의 `error` 가 `Error` 타입이기 때문이다.
 * 메시지에 문장을 넣지 않는다 — 문장은 화면의 것이다.
 */
export class InviteRejectedError extends Error {
  constructor(readonly reasonCode: InviteReasonCode | null) {
    super("invite rejected");
    this.name = "InviteRejectedError";
  }
}

/**
 * BFF 가 실패 본문을 `{ reasonCode }` 로 준다 (`BFF-REQ-008` FR-9).
 *
 * 본문이 없거나 JSON 이 아니어도 던지지 않는다 — 5xx 나 프록시 오류가 그 모양이고,
 * 그때는 사유를 모르는 채로 "잠시 후 다시" 문구가 나가는 것이 맞다.
 */
const reasonCodeOf = async (response: Response): Promise<InviteReasonCode | null> => {
  try {
    const body = (await response.json()) as { reasonCode?: string } | null;
    return (body?.reasonCode as InviteReasonCode) ?? null;
  } catch {
    return null;
  }
};
