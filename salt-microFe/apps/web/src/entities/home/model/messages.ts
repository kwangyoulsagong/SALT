/** 홈 요약 카드 문구 (`i18n-policy.md`). 카드 제목 · 값 문구는 BFF 가 준다 — 여기는 상태 문구만 */
export const HOME_CARD_MESSAGES = {
  loading: "요약을 불러오는 중…",
  loadFailed: "요약을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.",
  /** 카드 하나를 받지 못했을 때 — 0 으로 그리지 않는다 */
  degraded: "지금은 불러오지 못했어요",
  /** 비어 있는 카드의 예시 그림 표지 — 실제 값으로 읽히지 않게 */
  sample: "예시",
} as const;

/** 홈 둘째 줄 — 최근 기록 · 다가오는 일(`FE-REQ-048` FR-13). 줄 안 문구(지출 · 저축에 넣음 …)는 BFF 가 준다 */
export const HOME_FEED_MESSAGES = {
  recentTitle: "최근 기록",
  upcomingTitle: "다가오는 일",
  recentEmpty: "아직 기록이 없어요. 지출을 적거나 목표에 넣으면 여기 날짜 순으로 모여요.",
  upcomingEmpty: "다가오는 일이 없어요. 매달 나가는 돈이나 목표 기한을 정하면 여기 보여요.",
  unavailable: "지금은 불러오지 못했어요",
  expenseFallback: "지출",
  sub: (detail: string, date: string) => `${detail} · ${date}`,
} as const;

/**
 * 홈 대시보드 블록 문구(2026-11-26 — 숫자 띠 · 지출 흐름 · 저축 목표 · 시장 · 코치 브리핑 · 증시 일정 · 최근 알림).
 * 값 · 문장은 서버 · BFF 가 준다 — 여기는 블록 이름 · 상태 · 빈 안내만
 */
export const HOME_DASHBOARD_MESSAGES = {
  kpiLabel: "한눈에 보기",
  planTitle: "이번 주 적립",
  planEmpty: "적립액을 정하면 이번 주 금액이 보여요",
  planAction: "적립 정하기",
  planItems: (count: number) => `자산 ${count}개`,
  spendingTitle: "이번 달 지출 흐름",
  spendingEmpty: "지출을 적으면 날마다 쓴 돈이 막대로 쌓여요",
  goalsTitle: "저축 목표",
  goalsEmpty: "목표를 만들면 얼마나 모였는지 여기 보여요",
  investTitle: "투자 흐름",
  investEmpty: "보유를 기록하면 평가금 흐름이 선으로 그려져요",
  marketTitle: "시장",
  marketEmpty: "지금은 시세를 불러오지 못했어요",
  marketIndex: "지수",
  briefingTitle: "오늘의 코치 브리핑",
  briefingEmpty: "보유나 계획이 생기면 오늘 볼 것을 정리해 드려요",
  briefingAction: "코치에게 묻기",
  eventsTitle: "증시 일정",
  daysUntil: (days: number) => (days <= 0 ? "오늘" : `D-${days}`),
  month: (month: number) => `${month}월`,
  monthDay: (month: number, day: number) => `${month}월 ${day}일`,
  /** 원화 표시 — 쉼표는 화면 서식(`formatPrice`), 값은 서버 */
  krw: (formatted: string) => `${formatted}원`,
  loading: "불러오는 중",
  alertsTitle: "최근 알림",
  alertsEmpty: "아직 받은 알림이 없어요. 켠 도메인에서 일이 생기면 여기 모여요",
  alertsAll: "전체 보기",
  unavailable: "지금은 불러오지 못했어요",
  more: "더 보기",
} as const;

/** 적립 자산 이름 — 서버 자산 코드(`btc` · `kospi`)의 표시 이름(코치 대화 문장과 같은 이름) */
export const HOME_PLAN_ASSET_LABEL: Readonly<Record<string, string>> = { btc: "비트코인", kospi: "코스피" };
