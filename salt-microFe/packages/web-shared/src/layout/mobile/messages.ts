import { HOME_CARD_PILL_LABEL } from "@repo/core/labels";

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
  /** 마지막 화면 한 벌 띠(`FE-REQ-073` FR-2) — 끊김이면 "오프라인", 연결은 됐는데 받기 실패면 그 사실대로 */
  offlineStamp: (time: string) => `오프라인 · ${time} 기준`,
  failedStamp: (time: string) => `불러오지 못했어요 · ${time} 기준`,
  snapshotNote: "마지막으로 본 숫자예요. 연결되면 새로 받아요",
  /** 오프라인 한 장 아래 — 한 벌이 있는 다른 탭으로(문서 이동 → 서비스 워커가 같은 장을 준다) */
  offlineNavLabel: "마지막으로 본 화면",
  offlineNav: { home: "홈", goals: "저축", household: "가계부" },
  /** 쓰기 막힘(`FE-REQ-073` FR-3) — 큐 · 낙관적 갱신 없이 이유 한 줄 */
  writeOffline: "연결이 끊겨 지금은 적을 수 없어요. 연결되면 다시 눌러 주세요",
} as const;

/** 설치 안내(`FE-REQ-073` FR-4) — 첫 진입에 띄우지 않고 · 닫으면 다시 안 뜸 · 설치한 앱(standalone)에선 0 */
export const MOBILE_INSTALL_MESSAGES = {
  title: "홈 화면에 추가하기",
  body: "앱처럼 바로 열고, 연결이 끊겨도 마지막으로 본 숫자를 볼 수 있어요",
  install: "홈 화면에 추가",
  howTo: "추가하는 법 보기",
  close: "설치 안내 닫기",
  sheetTitle: "홈 화면에 추가하는 법",
  steps: ["아래쪽 공유 버튼을 눌러요", "‘홈 화면에 추가’를 골라요", "오른쪽 위 ‘추가’를 눌러요"],
  sheetClose: "닫기",
  figureLabel: "공유 버튼과 홈 화면에 추가 메뉴",
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
  quick: { label: "바로 하기", expense: ["지출", "적기"], deposit: ["목표에", "넣기"] },
  shortcuts: { label: "바로가기", report: "코치 리포트", calendar: "이번 달 달력", goals: "내 저축 목표" },
  settings: "홈 화면 설정",
  /** 도메인 카드 오른쪽 회색 알약 — 그 도메인의 다음 행동(누르면 카드 전체와 같은 곳) */
  pill: HOME_CARD_PILL_LABEL,
  feedSub: (detail: string, date: string) => `${detail} · ${date}`,
} as const;

/**
 * 알림 칸(`FE-REQ-078`) — 도메인 셋 켬/끔 = 데스크톱 설정과 같은 값(서버 한 벌). 이 휴대폰이 울리는지는 이 기기 구독.
 * 잠금 화면 문장은 서버가 정한다(금액 · 이름 · 종목 0 — `SRV-REQ-062`)
 */
export const MOBILE_PUSH_MESSAGES = {
  title: "알림",
  body: "켠 알림은 이 휴대폰으로도 와요. 잠금 화면엔 금액 · 이름을 보이지 않아요",
  domains: {
    invest: { label: "투자", hint: "코치 판단이 바뀌면" },
    savings: { label: "저축", hint: "목표에 닿으면" },
    household: { label: "가계부", hint: "고정비가 지난번보다 오르면" },
  } as Record<string, { label: string; hint: string } | undefined>,
  install: "홈 화면에 추가한 앱에서 켤 수 있어요",
  unsupported: "이 브라우저에서는 알림을 받을 수 없어요",
  denied: "알림이 막혀 있어요. 기기 설정 › 알림에서 SALT 를 허용해 주세요",
  refused: "알림을 허용하지 않아 켜지 않았어요",
  failed: "저장하지 못했어요. 잠시 후 다시 눌러 주세요",
  offline: "연결이 끊겨 지금은 바꿀 수 없어요",
} as const;
