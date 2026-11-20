/** 휴대폰 틀 문구(`FE-REQ-071`, `screen-mobile.md` §5 해요체) */
export const MOBILE_MESSAGES = {
  tabsLabel: "주요 메뉴",
  desktopView: "데스크톱 화면으로 보기",
  /** 화면 머리 뒤로(`MobileHead`) — 어디로 가는지 이름에 */
  back: (to: string) => `${to}(으)로 돌아가기`,
  loginTitle: "로그인",
  /** 설치한 iOS 웹앱은 Safari 와 저장소가 달라 한 번 더 로그인한다 */
  loginHint: "홈 화면에 추가한 앱에서는 한 번 더 로그인해요",
  offlineTitle: "연결이 끊겼어요",
  offlineBody: "다시 연결되면 이어서 볼 수 있어요",
  offlineRetry: "다시 시도",
} as const;

/** 휴대폰 홈 문구(`FE-REQ-072`) — 카드 제목 · 값은 BFF 가 준다. 데스크톱 홈(`entities/home` · `onboarding-flow`)과 같은 말 */
export const MOBILE_HOME_MESSAGES = {
  title: "홈",
  cardsLabel: "도메인 요약",
  degraded: "지금은 불러오지 못했어요",
  loadFailed: "요약을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.",
  signedOutOrFailed: "로그인하면 저축 · 가계부 · 투자 요약을 볼 수 있어요",
  signIn: "로그인",
  banner: (step: string) => `시작하기를 마저 끝내 주세요 · ${step}`,
  steps: { invite: "초대 코드", choose_domains: "쓸 것 고르기", first_input: "첫 기록" },
  recentTitle: "최근 기록",
  upcomingTitle: "다가오는 일",
  recentEmpty: "아직 기록이 없어요. 지출을 적거나 목표에 넣으면 여기 날짜 순으로 모여요.",
  upcomingEmpty: "다가오는 일이 없어요. 매달 나가는 돈이나 목표 기한을 정하면 여기 보여요.",
  unavailable: "지금은 불러오지 못했어요",
  expenseFallback: "지출",
  feedSub: (detail: string, date: string) => `${detail} · ${date}`,
} as const;
