/**
 * 해설 지난 날 보기 문구(`FE-REQ-079` · `i18n-policy.md`). 해요체 · 원인 단정어 0 · 확신 · 명령형 0.
 * 숫자는 서버 값을 그대로 넣기만 한다 — 좋다 · 맞았다 같은 평가 문장은 두지 않는다(빗나간 날도 같은 문장)
 */
export const EXPLANATION_DAYS_MESSAGES = {
  navLabel: "해설 날짜",
  today: "오늘",
  /** `11/25(화)` */
  day: (monthDay: string, weekday: string) => `${monthDay}(${weekday})`,
  weekdays: ["일", "월", "화", "수", "목", "금", "토"] as const,
  prevAria: (day: string) => `이전 해설 보기 — ${day}`,
  prevNoneAria: "이전 해설이 없어요",
  nextAria: (day: string) => `다음 해설 보기 — ${day}`,
  nextTodayAria: "오늘 해설로 돌아가기",
  /** 지난 날 머리 — 그때 쓴 글이라는 것을 늘 먼저 */
  pastAsOf: (day: string, clock: string) => `${day} ${clock}에 쓴 해설이에요 · 그 뒤 소식은 담지 않았어요`,
  verdict: (label: string) => `그날 판단 ${label}`,
  /** 그날 **종가** 기준 — 문장 속 "오늘 …%"는 쓴 시각의 값이라 다를 수 있다(머리 줄이 쓴 시각을 말한다) */
  dayChange: (rate: string) => `그날 종가 ${rate}`,
  since: (rate: string) => `그 뒤 지금까지 ${rate}`,
  /** 판정 라벨이 없을 때(모르는 코드) — 판단 칸을 지어내지 않는다 */
  verdictUnknown: "그날 판단 기록 없음",
  backToToday: "오늘 해설 보기",
  empty: "아직 지난 날 해설이 없어요",
  failed: "지난 해설을 불러오지 못했어요",
} as const;
