/** 휴대폰 틀 문구(`FE-REQ-071`, `screen-mobile.md` §5 해요체) */
export const MOBILE_MESSAGES = {
  tabsLabel: "주요 메뉴",
  /** 탭 화면은 F019 순서 2 가 옮겨 온다 — 그때까지 한 장 */
  pendingBody: "휴대폰 화면을 준비하고 있어요. 지금은 데스크톱 화면에서 볼 수 있어요.",
  desktopView: "데스크톱 화면으로 보기",
  loginTitle: "로그인",
  /** 설치한 iOS 웹앱은 Safari 와 저장소가 달라 한 번 더 로그인한다 */
  loginHint: "홈 화면에 추가한 앱에서는 한 번 더 로그인해요",
  offlineTitle: "연결이 끊겼어요",
  offlineBody: "다시 연결되면 이어서 볼 수 있어요",
  offlineRetry: "다시 시도",
} as const;
