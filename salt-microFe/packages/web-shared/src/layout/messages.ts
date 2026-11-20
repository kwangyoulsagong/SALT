/** 공용 레이아웃 문구 (`i18n-policy.md`). 화면 문구가 아니라 모든 zone 이 같이 쓰는 머리 · 프로필 문구다. */
export const PROFILE_MENU_MESSAGES = {
  /** 스크린 리더가 읽는 메뉴 이름 */
  menuLabel: "내 계정 메뉴",
  settings: "설정",
  signOut: "로그아웃",
  /** 로그인 없이 보는 화면(`FE-REQ-070`) — 프로필 자리 */
  signIn: "로그인",
  profileImageAlt: "프로필 이미지",
} as const;

/** 머리 알림 벨(F006 `FE-REQ-030` FR-81) — 안 읽은 수는 서버 값, 99 를 넘으면 "99+" */
export const ALERT_BELL_MESSAGES = {
  label: (count: number) => (count > 0 ? `알림 ${count}건 안 읽음` : "알림"),
  badge: (count: number) => (count > 99 ? "99+" : String(count)),
} as const;

/** 앱 내비게이션(`FE-REQ-054`) — 탭 이름 · 순서는 `@repo/core/navigation` 한 벌(앱과 같다) */
export const NAVIGATION_FRAME_MESSAGES = {
  /** 레일 · 하단 탭의 화면 리더 이름 */
  navLabel: "주요 메뉴",
  /** 머리 로고 링크 이름(`FE-REQ-051` FR-1) */
  brandHomeLabel: "SALT 홈",
} as const;

export const PROFILE_MENU_ITEM = {
  settings: "settings",
  signOut: "sign-out",
} as const;

/** 404 (`FE-REQ-044` P-15) — 잘못된 종목 코드로 상세에 들어온 경우가 가장 흔하다 */
export const NOT_FOUND_MESSAGES = {
  title: "찾는 화면이 없어요",
  description: "종목 코드가 바뀌었거나 주소가 잘못됐을 수 있어요.",
  toInvestments: "투자 화면으로",
} as const;

/**
 * 로그인 문구 — 셸 `/` · 휴대폰 `/m/login` 이 같이 쓴다(2026-11-20 셸 `features/sign-in` 에서 내림). **서버는 코드만 주고 문장은 프론트가 만든다**(`i18n-policy.md`).
 *
 * 서버 코드는 `AUTH_INVALID_CREDENTIALS` 하나다 — 이메일이 없는 것과 비밀번호가 틀린 것을
 * 서버가 **일부러 구분하지 않는다**(계정 존재 여부가 노출된다). 문구도 구분하지 않는다.
 */
export const SIGN_IN_MESSAGES = {
  title: "로그인",

  emailLabel: "이메일",
  emailPlaceholder: "이메일",
  passwordLabel: "비밀번호",
  passwordPlaceholder: "비밀번호",

  submit: "로그인",
  submitting: "확인 중…",

  /** 초대 안내 — 계정이 생기는 경로는 초대 코드 하나다. */
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
