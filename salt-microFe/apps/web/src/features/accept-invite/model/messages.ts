import type { InviteReasonCode } from "./types";

/**
 * 초대 화면 문구.
 *
 * **서버가 문장을 만들지 않는다.** 서버·BFF 는 `reasonCode` 만 주고 여기서 문장이 된다
 * (`BFF-REQ-008` FR-9 · `i18n-policy.md`). 그래서 문구를 바꾸는 데 배포가 한 번이면 된다.
 */
export const ACCEPT_INVITE_MESSAGES = {
  title: "초대 코드",
  description: "받으신 초대 코드를 입력해 주세요.",
  codeLabel: "초대 코드",
  codePlaceholder: "예: ABCD2345",
  emailLabel: "이메일",
  emailPlaceholder: "you@example.com",
  nicknameLabel: "닉네임",
  nicknamePlaceholder: "2자 이상",
  passwordLabel: "비밀번호",
  passwordPlaceholder: "8자 이상",
  submit: "시작하기",
  submitting: "확인 중…",
  codeValid: "사용할 수 있는 코드입니다.",
  checking: "코드를 확인하고 있어요…",
  unknownError: "잠시 후 다시 시도해 주세요.",
} as const;

/**
 * 거절 사유별 문구 (`FE-REQ-010` FR-24 — **3종이 각각 달라야 한다**).
 *
 * 같은 문구로 뭉치면 사용자가 무엇을 해야 할지 모른다: 없는 코드는 다시 입력하는 것이고,
 * 이미 쓴 코드와 만료된 코드는 **새 코드를 받아야 하는 것**이다.
 *
 * `INVITE_QUOTA_EXCEEDED` 는 입력 중에는 오지 않고 **수락 시점에만** 온다. 코드는
 * 멀쩡한데 자리가 없는 상황이라 사용자가 고칠 수 있는 것이 없다 — 그 사실을 그대로 쓴다.
 */
export const INVITE_REASON_MESSAGES: Record<InviteReasonCode, string> = {
  INVITE_NOT_FOUND: "코드를 찾을 수 없습니다. 다시 확인해 주세요.",
  INVITE_ALREADY_USED: "이미 사용된 코드입니다. 새 코드를 요청해 주세요.",
  INVITE_EXPIRED: "만료된 코드입니다. 새 코드를 요청해 주세요.",
  INVITE_QUOTA_EXCEEDED: "지금은 가입 인원이 가득 찼습니다.",
  AUTH_EMAIL_TAKEN: "이미 가입된 이메일입니다. 로그인해 주세요.",
};

/** 입력 중 확인이 주는 짧은 사유. 수락 시점 문구와 어조를 맞춘다. */
export const INVITE_CHECK_MESSAGES = {
  not_found: "코드를 찾을 수 없습니다.",
  used: "이미 사용된 코드입니다.",
  expired: "만료된 코드입니다.",
} as const;
