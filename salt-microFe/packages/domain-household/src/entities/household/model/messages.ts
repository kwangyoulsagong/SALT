import { formatPrice } from "@repo/web-shared/lib";

import type { CalendarDayState, CategoryKey, ChallengePhase, ChallengePresetKey, EmotionKey, GoalClock, HouseholdTrack } from "./types";

/**
 * 가계부 문구 — **사실만 말한다.** 칭찬 · 재촉 · 경고 · 명령형 0(`FE-REQ-057` 수용 기준 · FEATURE-013 정책 "차단 · 경고 팝업 없음").
 * 넘친 봉투는 "남은 돈 −3,000원" 숫자일 뿐 — 빨강 · 경고 아이콘 · "초과" 낱말을 쓰지 않는다. 상태 키 → 문장은 여기 한 곳.
 */
export const CATEGORY_LABEL: Readonly<Record<CategoryKey, string>> = {
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
};

/** 50/30/20 봉투 이름 */
export const BUCKET_LABEL: Readonly<Record<string, string>> = { needs: "꼭 필요한 데(50%)", wants: "하고 싶은 데(30%)" };

export const envelopeLabel = (key: string): string => BUCKET_LABEL[key] ?? CATEGORY_LABEL[key as CategoryKey] ?? key;

/** 원 단위 표시 — 서버 금액의 포맷만(계산 0). 음수는 부호를 글자로 */
export const formatWon = (value: number): string => (value < 0 ? `−${formatPrice(-value)}원` : `${formatPrice(value)}원`);

/** "2026-11" → "2026년 11월" — 글자만 바꾼다 */
export const formatMonth = (yearMonth: string): string => {
  const [year, month] = yearMonth.split("-");
  return `${year}년 ${Number(month)}월`;
};

/** "2026-11-04" → "11월 4일" */
export const formatDay = (date: string): string => {
  const [, month, day] = date.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
};

/** 고정비 찾기(가계부 S1e) — 사실만: 몇 번 · 얼마 · 다음 날짜 · 올랐으면 얼마. "아끼세요" · 경고 0 */
export const FIXED_COST_MESSAGES = {
  title: "매달 나가는 돈 같아요",
  description: "같은 곳에 비슷한 금액이 한 달 간격으로 세 번 이상 나갔어요",
  line: (count: number, amount: string, next: string) => `${count}번 · 지난번 ${amount} · 다음은 ${next}쯤`,
  increased: (previous: string, increase: string) => `앞 달 ${previous}보다 ${increase} 올랐어요`,
  /** 평소보다 큰 지출 — 내역 줄의 한 낱말(평가 0, 비교 숫자만) */
  typical: (amount: string) => `이 분류 보통 ${amount}`,
  unusualBadge: "평소보다 큼",
};

export const EXPENSE_MESSAGES = {
  loadFailed: "가계부를 불러오지 못했어요",
  signedOut: "로그인하면 가계부를 볼 수 있어요",
  spent: "이번 달 쓴 돈",
  spentOf: (month: string) => `${formatMonth(month)} 쓴 돈`,
  exact: "정확",
  approx: "대략",
  approxBadge: "대략",
  count: (n: number) => `${n}건`,
  remaining: "남은 돈",
  dailyAvailable: "하루에 쓸 수 있는 돈",
  daysLeft: (n: number) => `오늘 포함 ${n}일 남음`,
  unbudgeted: "봉투 밖 지출",
  noBudget: "예산을 정하면 봉투별 남은 돈이 보여요",
  envelopes: "봉투",
  category: "분류",
  envelopeSpent: (spent: string, budget: string) => `${spent} / ${budget}`,
  byCategory: "분류별",
  list: "쓴 내역",
  listEmpty: "이 달에 적은 지출이 없어요",
  installment: (n: number) => `${n}개월 할부`,
  delete: "지우기",
  deleteFailed: "지우지 못했어요",
} as const;

export const LANDING_MESSAGES = {
  title: "이번 달 끝에는",
  range: (low: string, high: string) => `${low} ~ ${high} 사이로 보여요`,
  note: "어제까지 쓴 돈 + 지난 날들의 쓰는 속도로 본 오늘부터 말일까지의 10 · 90% 구간이에요. 한 점으로 단정하지 않아요",
  historyShort: (days: number) => `기록한 날이 14일이 되면 구간을 보여 드려요(지금 ${days}일)`,
  monthOver: "오늘이 이 달 마지막 날이에요",
  scheduled: (amount: string) => `아직 확인 안 한 매달 나가는 돈 ${amount} 이 들어 있어요`,
  notCurrent: "지난 달은 실제로 쓴 돈만 보여요",
  trackTitle: "지난달 같은 날 본 구간",
  trackHit: (low: string, high: string, actual: string) => `${low} ~ ${high} 였고, 실제로 ${actual} — 구간 안이었어요`,
  trackMiss: (low: string, high: string, actual: string) => `${low} ~ ${high} 였고, 실제로 ${actual} — 구간 밖이었어요`,
  trackReason: {
    not_issued: "지난달 이맘때 낸 구간이 없어요",
    history_short: "지난달 이맘때는 기록이 짧아 구간을 내지 않았어요",
  } as Readonly<Record<string, string>>,
} as const;

/** 할부 띠(가계부 S1b FR-10) — 원거래는 산 달 합에 이미 들어 있다는 것을 같이 말한다 */
export const INSTALLMENT_MESSAGES = {
  title: "할부",
  empty: "이 달에 나가는 할부가 없어요",
  monthCharge: (amount: string) => `이 달 할부 청구 ${amount}`,
  line: (index: number, months: number) => `${months}개월 중 ${index}회차`,
  remaining: (amount: string, last: string) => `남은 청구 ${amount} · ${last}까지`,
  original: (amount: string) => `원래 ${amount}`,
  upcoming: "앞으로 6개월 청구",
  note: "산 달 지출에 이미 들어 있어요. 첫 청구는 산 다음 달로 보고, 원 단위로 나누고 남는 돈은 첫 달에 넣었어요 — 카드사 결제일은 몰라요",
} as const;

export const trackLine = (t: HouseholdTrack): string => {
  if (t.hit !== null && t.low !== null && t.high !== null && t.actual !== null) {
    return (t.hit ? LANDING_MESSAGES.trackHit : LANDING_MESSAGES.trackMiss)(formatWon(t.low), formatWon(t.high), formatWon(t.actual));
  }
  return LANDING_MESSAGES.trackReason[t.reason ?? ""] ?? LANDING_MESSAGES.trackReason.not_issued;
};

/** 목표 시계 한 줄(FEATURE-013 FR-8) — 사실만. "결혼 목표가 3일 늦어져요" */
export const goalClockLine = (clock: GoalClock): string | null => {
  switch (clock.state) {
    case "ok":
      return clock.delayDays === 0 ? `${clock.title} 목표에는 하루도 안 늦어져요` : `${clock.title} 목표가 ${clock.delayDays}일 늦어져요`;
    case "pending":
      return "목표에 미치는 영향을 계산 중이에요";
    case "none":
      return null;
  }
};

/**
 * 감정 태그 · 거울(가계부 S1c FR-13) — **측정만.** 감정으로 사람을 평가하는 문구 · 칭찬 · 재촉 0(FEATURE-013 정책).
 * 만족 1~5 는 숫자 그대로 — "좋아요/나빠요" 같은 낱말을 붙이지 않는다.
 */
export const EMOTION_LABEL: Readonly<Record<EmotionKey, string>> = {
  stress: "스트레스",
  reward: "보상",
  boredom: "지루함",
};

export const FEELING_MESSAGES = {
  tag: "그때 기분(선택)",
  feltNow: "지금 만족은?(선택)",
  feltScale: (v: number) => `${v}점`,
  askTitle: "어제 단 기분, 지금은 어때요?",
  askLine: (emotion: string, what: string, amount: string) => `${emotion} · ${what} ${amount}`,
  askFeltNow: (v: number) => `산 직후 ${v}점`,
  pass: "넘기기",
  answered: "적어 뒀어요",
  decided: "이미 답한 항목이에요",
  failed: "저장 못 했어요",
  mirrorTitle: "기분별 만족",
  mirrorNote: "기분을 단 지출의 산 직후 · 다음 날 만족을 점수별 건수로 보여 줘요. 평가하지 않아요",
  mirrorEmpty: "이 달엔 기분을 단 지출이 없어요",
  mirrorCount: (n: number) => `${n}건`,
  mirrorNow: "산 직후",
  mirrorNext: "다음 날",
  mirrorBar: (when: string, score: number, n: number) => `${when} ${score}점 ${n}건`,
} as const;

/** 무지출 달력(가계부 S1c FR-16) — 연속 일수 · "기록" 같은 압박 낱말 0. 기록 없는 날은 비워 둔다 */
export const CALENDAR_MESSAGES = {
  title: "안 쓴 날",
  note: "안 쓴 날에 표시하면 스티커가 붙어요. 적지 않은 날은 비워 둬요. 테두리 동그라미는 챌린지를 한 날이에요",
  count: (n: number) => `이 달 안 쓴 날 ${n}일`,
  /** 챌린지 한 날(가계부 S1d) — 개수만, 연속 0 */
  challengeCount: (n: number) => `챌린지 한 날 ${n}일`,
  challengeDay: "챌린지 한 날",
  weekdays: ["일", "월", "화", "수", "목", "금", "토"] as const,
  state: {
    future: "",
    spent: "쓴 날",
    no_spend: "안 쓴 날",
    blank: "기록 없음",
  } as Readonly<Record<CalendarDayState, string>>,
  dayLabel: (date: string, state: string, spent: string | null) => `${formatDay(date)} ${state}${spent ? ` ${spent}` : ""}`,
  mark: "안 쓴 날로 표시",
  unmark: "표시 지우기",
  failed: "표시하지 못했어요",
  hasExpense: "그날 적은 지출이 있어요",
} as const;

/** 노동시간 환산(가계부 S1c FR-15) — 분 → "2시간 18분". 계산은 서버, 여기는 글자만 */
export const formatWorkMinutes = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
};

export const WORK_MESSAGES = {
  line: (work: string) => `근무 ${work}`,
  total: (work: string) => `이 달 쓴 돈 = 근무 ${work}`,
  hourly: (amount: string) => `1시간 ${amount} 기준`,
} as const;

/**
 * 챌린지(가계부 S1d) — 사실만. **실패 · 재촉 · 칭찬 · 연속 0**. 끝난 챌린지는 기간이 지났든 그만뒀든 같은 "끝"(서버 단계 그대로).
 * 예시 이름은 키에 대한 글자일 뿐 — 사용자가 고쳐 저장한다.
 */
export const CHALLENGE_MESSAGES = {
  phase: { upcoming: "시작 전", running: "하는 중", ended: "끝" } as Readonly<Record<ChallengePhase, string>>,
  presets: {
    no_spend_weekend: "무지출 주말",
    skip_coffee: "커피 한 잔 아끼기",
    no_delivery: "배달 쉬기",
    no_taxi: "택시 대신 걷기",
  } as Readonly<Record<ChallengePresetKey, string>>,
  period: (startsOn: string, endsOn: string) => `${formatDay(startsOn)} ~ ${formatDay(endsOn)}`,
  endedOn: (date: string) => `${formatDay(date)}에 그만둠`,
  days: (n: number) => `한 날 ${n}일`,
  saved: (amount: string) => `아낀 돈 ${amount}`,
  contributed: (amount: string) => `목표에 보탠 돈 ${amount}`,
} as const;
