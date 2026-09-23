/**
 * 로그인 문구. **서버는 코드만 주고 문장은 프론트가 만든다**(`i18n-policy.md`).
 *
 * 서버 코드는 `AUTH_INVALID_CREDENTIALS` 하나다 — 이메일이 없는 것과 비밀번호가 틀린 것을
 * 서버가 **일부러 구분하지 않는다**(계정 존재 여부가 노출된다). 문구도 구분하지 않는다.
 */
export const SIGN_IN_MESSAGES = {
  title: "로그인",
  subtitle: "초대받은 계정으로 들어갑니다.",

  emailLabel: "이메일",
  emailPlaceholder: "you@example.com",
  passwordLabel: "비밀번호",
  passwordPlaceholder: "비밀번호",

  submit: "로그인",
  submitting: "확인 중…",

  /** 초대 안내 (`FE-REQ-011` FR-63). 계정이 생기는 경로는 초대 코드 하나다. */
  inviteHint: "아직 계정이 없나요?",
  inviteAction: "초대 코드로 시작하기",

  invalidCredentials: "이메일 또는 비밀번호가 맞지 않습니다.",
  networkError: "연결이 닿지 않았습니다. 잠시 후 다시 시도해 주세요.",
  unknownError: "로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
} as const;

/** 서버 에러 코드 → 문구. 모르는 코드는 일반 문구로 떨어뜨린다. */
export const SIGN_IN_ERROR_MESSAGES: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: SIGN_IN_MESSAGES.invalidCredentials,
};
