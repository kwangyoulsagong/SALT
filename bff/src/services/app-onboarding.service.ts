import { logger } from "../config/logger";
import { AppError } from "../utils/error.util";
import { backendApi } from "./backend-api.service";
import {
  toOnboardingStatusViewModel,
  type OnboardingStatusViewModel,
  type ServerOnboardingStatus,
} from "./onboarding.viewmodel";

export type { OnboardingStatusViewModel };

export interface InviteCheckResult {
  valid: boolean;
  /** 코드이고 문장이 아니다. 문구는 프론트 `shared/i18n` 이 만든다 (`BFF-REQ-008` FR-9). */
  reasonCode?: string;
}

export interface AcceptInviteInput {
  code: string;
  email: string;
  nickname: string;
  password: string;
}

export interface AcceptInviteResult {
  accessToken: string;
  refreshToken: string;
  user: unknown;
}

/**
 * 온보딩 (`BFF-REQ-007` G절 · `BFF-REQ-008` 신규 3).
 *
 * **BFF 는 초대 판정을 하지 않는다.** 코드 유효성·정원·만료는 전부 서버 도메인 규칙이고,
 * 여기서 한 번 더 판단하면 두 곳이 어긋날 때 어느 쪽이 진실인지 알 수 없게 된다.
 * 이 서비스가 하는 일은 봉투를 벗기고 `reasonCode` 를 **그대로** 올리는 것뿐이다.
 */
class AppOnboardingService {
  /**
   * 코드 유효성 확인. 무인증 경로다.
   *
   * 서버가 `quota` 를 주지 않기로 되어 있지만(`SRV-REQ-009` FR-4) **여기서도 한 번 더
   * 지운다.** 서버 판정이 바뀌어 정원 사유가 흘러나오면 그 순간 무인증 경로가 서비스
   * 상태를 노출하게 되고, 두 겹이면 한쪽이 틀려도 새지 않는다.
   */
  async checkInvite(code: string): Promise<InviteCheckResult> {
    const response = await backendApi.proxyRequest(
      "GET",
      `/auth/invite/check?code=${encodeURIComponent(code)}`
    );

    const data = response.data?.data ?? {};
    const valid = data.valid === true;
    const reasonCode = typeof data.reasonCode === "string" ? data.reasonCode : undefined;

    if (reasonCode === "quota") {
      logger.warn("서버가 invite/check 에서 정원 사유를 보냈다 — 화면에 내보내지 않는다");
      return { valid: true };
    }

    return valid ? { valid: true } : { valid: false, reasonCode };
  }

  /**
   * 코드 수락 = 계정 생성. 무인증 경로다.
   *
   * 실패는 서버 status 와 `code` 를 **보존**해서 올린다 (FR-64). 403 을 500 으로 바꾸면
   * 화면이 "만료된 코드"와 "서버 오류"를 구분하지 못한다.
   */
  async acceptInvite(input: AcceptInviteInput): Promise<AcceptInviteResult> {
    try {
      const response = await backendApi.proxyRequest(
        "POST",
        "/auth/invite/accept",
        input
      );

      const data = response.data?.data ?? {};
      return {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      };
    } catch (error) {
      throw toInviteError(error);
    }
  }

  async status(token: string): Promise<OnboardingStatusViewModel> {
    const response = await backendApi.proxyAuthRequest(
      "GET",
      "/onboarding/status",
      token
    );

    const data: ServerOnboardingStatus | undefined = response.data?.data;
    return toOnboardingStatusViewModel(data);
  }
}

/**
 * upstream 4xx → 같은 status 의 `AppError`. **`reasonCode` 를 메시지가 아니라 코드로
 * 실어 올린다.**
 *
 * 그대로 던지면 error middleware 가 `AppError` 가 아닌 것을 전부 500 으로 만들고,
 * "이미 사용된 코드"가 "서버 오류"로 보인다 (`backend-integration.md`).
 */
const toInviteError = (error: unknown): unknown => {
  const response = (error as { response?: { status?: number; data?: { code?: string } } })
    ?.response;
  const status = response?.status;
  if (!status || status >= 500) return error;

  return new InviteRejectedError(status, response?.data?.code ?? "INVITE_REJECTED");
};

/** 초대 거절. 컨트롤러가 `{ reasonCode }` 본문을 만드는 데 쓴다. */
export class InviteRejectedError extends AppError {
  constructor(
    status: number,
    readonly reasonCode: string
  ) {
    super("Invite rejected", status);
    Object.setPrototypeOf(this, InviteRejectedError.prototype);
  }
}

export const appOnboardingService = new AppOnboardingService();
