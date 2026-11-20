/**
 * 도메인 코드 이름표 — 여러 zone 이 같이 읽는 것만(2026-11-18 F006 알림 화면).
 *
 * 셸 알림 화면은 저축 목표 틀 · 가계부 분류 · 코치 모드 코드를 문장에 넣어야 하는데 셸은 `domain-*` 를 import 하지 못한다(`ADR-005` §2).
 * 이름표를 셸에 한 벌 더 두면 갈라진다 — 그래서 여기 한 벌이고, 도메인 문구 파일(`TEMPLATE_LABEL` · `CATEGORY_LABEL` · `COACH_MESSAGES.modes`)이 이것을 가리킨다.
 * 문장은 두지 않는다 — 이름표만. 문장은 각 화면 `messages.ts`.
 */

export const GOAL_TEMPLATE_LABEL = {
  wedding: "결혼",
  housing: "주거",
  first_car: "첫 차",
  travel: "여행",
  emergency: "비상금",
  childbirth: "출산",
  other: "기타",
} as const;

/** 가계부 기본 분류 12개. 내 분류(`u_…`)는 이름이 서버 값이라 여기 없다 */
export const HOUSEHOLD_CATEGORY_LABEL = {
  food: "식비",
  cafe: "카페 · 간식",
  transport: "교통",
  housing: "주거 · 공과금",
  telecom: "통신",
  living: "생활",
  health: "의료",
  education: "교육",
  shopping: "쇼핑",
  culture: "문화 · 여가",
  gift: "경조사 · 선물",
  other: "기타",
} as const;

export const COACH_MODE_LABEL = { scalp: "단타", long_term: "장기" } as const;

/** 코드 → 이름표. 모르는 코드는 undefined — 원문 코드를 화면에 내지 않는다 */
export const labelOf = <T extends Record<string, string>>(table: T, code: string | undefined): string | undefined =>
  code !== undefined && Object.prototype.hasOwnProperty.call(table, code) ? table[code as keyof T] : undefined;

/**
 * 홈 도메인 카드 오른쪽 회색 알약 — 그 도메인의 다음 행동 한 단어(누르면 카드 전체와 같은 곳).
 * 휴대폰 `/m/home` · 데스크톱 홈 카드가 같이 쓴다(`FE-REQ-076` FR-5 — 셸 entities 와 `layout/mobile` 이 서로를 import 하지 못해 여기 한 벌)
 */
export const HOME_CARD_PILL_LABEL = { savings: "넣기", household: "적기", invest: "보기", tips: "보기" } as const;
