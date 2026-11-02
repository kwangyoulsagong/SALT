/** 공용 레이아웃 문구 (`i18n-policy.md`). 화면 문구가 아니라 모든 zone 이 같이 쓰는 머리 · 프로필 문구다. */
export const PROFILE_MENU_MESSAGES = {
  /** 스크린 리더가 읽는 메뉴 이름 */
  menuLabel: "내 계정 메뉴",
  settings: "설정",
  signOut: "로그아웃",
  profileImageAlt: "프로필 이미지",
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
