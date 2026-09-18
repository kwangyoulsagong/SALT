/** 서버가 주는 거절 사유. **문장이 아니라 코드다** — 문구는 이 슬라이스가 만든다. */
export type InviteReasonCode =
  | "INVITE_NOT_FOUND"
  | "INVITE_ALREADY_USED"
  | "INVITE_EXPIRED"
  | "INVITE_QUOTA_EXCEEDED"
  | "AUTH_EMAIL_TAKEN";

/** 입력 중 확인 결과. `quota` 는 오지 않는다 — 서버·BFF 가 두 겹으로 지운다. */
export interface InviteCheckResponse {
  valid: boolean;
  reasonCode?: "not_found" | "used" | "expired";
}

export interface AcceptInviteRequest {
  code: string;
  email: string;
  nickname: string;
  password: string;
}

export interface AcceptInviteResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    nickname: string;
    profileImageUrl: string | null;
  };
}
