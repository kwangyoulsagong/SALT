/** 공용 레이아웃 문구 (`i18n-policy.md`). 화면 문구가 아니라 모든 zone 이 같이 쓰는 머리 · 프로필 문구다. */
export const PROFILE_MENU_MESSAGES = {
  /** 스크린 리더가 읽는 메뉴 이름 */
  menuLabel: "내 계정 메뉴",
  settings: "설정",
  signOut: "로그아웃",
  profileImageAlt: "프로필 이미지",
} as const;

/** 앱 내비게이션(`FE-REQ-054`) — 탭 이름 · 순서는 `@repo/core/navigation` 한 벌(앱과 같다) */
export const NAVIGATION_FRAME_MESSAGES = {
  /** 머리 링크 줄 · 하단 탭의 화면 리더 이름 */
  navLabel: "주요 메뉴",
  /** 머리 검색칸(`FE-REQ-067` FR-2) — 화면 리더 앞말 · 칸 안 글자(키 `/` 뒤) */
  searchLabel: "종목 검색",
  searchHint: " 를 눌러 검색해요",
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
