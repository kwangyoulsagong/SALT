import type { KrFeed, KrMarket, KrSession, KrStatusBadge } from "@repo/core/marketKr";

/**
 * 국내 주식 문구(F011 `FE-REQ-041`). 확신 · 매매 지시 문구 0건 — 시세 사실만 말한다.
 * 상태 배지는 **글자로** 말한다(색만으로 상 · 하 · 거래정지를 가르지 않는다, F011 비기능 접근성).
 */
export const KR_STOCK_MESSAGES = {
  tabLabel: "국내 주식",
  regionLabel: "국내 주식 시세",
  loading: "국내 주식 시세를 불러오는 중입니다.",
  loadFailed: "국내 주식 시세를 불러오지 못했습니다.",
  /** BFF `unavailable` — 서버 5xx · 계약 깨짐. 0원으로 채운 표를 그리지 않는다 */
  unavailable: "국내 주식 시세를 잠시 볼 수 없습니다. 잠시 뒤 다시 불러와요.",
  retry: "다시 불러오기",
  empty: "보여 줄 국내 주식이 아직 없습니다.",
  signInRequired: "로그인하면 국내 주식 시세를 볼 수 있습니다.",
  tableHeaders: {
    name: "종목",
    price: "현재가",
    changeRate: "등락률",
    tradeValue: "거래대금",
    marketCap: "시가총액",
  },
  priceUnknown: "—",
  more: "더 보기",

  /** 장 상태 줄(FR-41) */
  session: {
    live: "정규장 · 실시간",
    liveRefused: "정규장 · 1분마다 갱신",
    notRegular: "정규장 아님",
    lastClose: (when: string) => `마지막 체결 ${when}`,
    nextOpen: (day: string, time: string) => `다음 개장 ${day} ${time}`,
    calendarGuess: "개장일은 평일 기준 추정",
    calendarGuessTitle: "오늘 휴장 여부를 아직 확인하지 못해 평일을 개장일로 봤어요",
    degraded: (since: string) => `시세 제공 지연 중 · ${since}부터`,
  },
  sessionNames: {
    pre_open: "장 시작 전",
    regular: "정규장",
    closing_auction: "장 마감 동시호가",
    after_hours_close: "시간외 종가",
    after_hours_single: "시간외 단일가",
    closed: "장 마감",
    holiday: "휴장일",
  } satisfies Record<KrSession, string>,
  /** 다음 개장 요일 — 오늘 · 내일은 글자로, 그 뒤는 요일 */
  relativeDay: (diff: number, weekday: number) =>
    diff === 0 ? "오늘" : diff === 1 ? "내일" : `${"일월화수목금토"[weekday]}요일`,

  markets: { KOSPI: "코스피", KOSDAQ: "코스닥" } satisfies Record<KrMarket, string>,

  /** 종목 상태 배지(FR-44) */
  statusBadges: {
    halted: "거래정지",
    administrative: "관리종목",
    caution: "투자주의",
    warning: "투자경고",
    danger: "투자위험",
    overheat: "단기과열",
  } satisfies Record<KrStatusBadge, string>,
  /** 상하한가(FR-43) — 배지는 한 글자, 스크린리더는 title · 숨은 글자로 전부 읽는다 */
  limit: {
    upper: { badge: "상", label: "상한가" },
    lower: { badge: "하", label: "하한가" },
  },
  /** 시세 출처(FR-45) — 실시간은 배지 없음 */
  feed: {
    poll_1m: { badge: "1분", title: "실시간 대신 1분마다 갱신되는 시세" },
    stale: { badge: (minutes: number) => `${minutes}분 전 시세`, title: "시세 제공이 늦어져 마지막으로 받은 값이에요" },
  } satisfies Record<Exclude<KrFeed, "realtime">, unknown>,

  /** 상세(FR-42 · 43 · 44 · 46) */
  detail: {
    blockName: "국내 주식 상세",
    back: "국내 주식으로 돌아가기",
    notFound: "이 종목의 시세를 볼 수 없습니다.",
    halted: (when: string) => `거래정지 · 마지막 체결 ${when}`,
    changeVsBase: "전일 대비",
    tickSize: (won: string) => `호가 단위 ${won}원`,
    stats: {
      open: "시가",
      high: "고가",
      low: "저가",
      basePrice: "기준가",
      upperLimit: "상한가",
      lowerLimit: "하한가",
      week52High: "52주 최고",
      week52Low: "52주 최저",
      marketCap: "시가총액",
      tradeValue: "거래대금",
      volume: "거래량",
      per: "PER",
      pbr: "PBR",
      foreignRate: "외국인 보유율",
      updatedAt: "시세 기준",
    },
    chartHeading: "차트",
    chartPeriods: { "1d": "일봉", "5m": "5분봉" },
    chartPeriodLabel: "차트 기간",
    chartName: (name: string, period: string) => `${name} ${period}`,
    chartUnavailable: "차트를 불러올 수 없습니다.",
    chartEmpty: "아직 쌓인 봉이 없습니다.",
    /** 5분봉은 실시간 집계부터 쌓인다 — 숨기지 않는다(FR-46) */
    coverage: (days: number) => `5분봉은 ${days}거래일치가 쌓였어요`,
    adjusted: "일봉은 수정주가 기준",
    /** 코치 · 전망은 아직 국내 주식을 판단하지 않는다(F011 슬라이스 4 · 5) */
    noCoach: "국내 주식은 아직 코치 판단 대상이 아니에요. 일봉 · 지표 · 표본이 차면 장기 판단부터 열려요.",
  },
} as const;
