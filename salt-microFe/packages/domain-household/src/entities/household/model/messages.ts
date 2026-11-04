import { formatPrice } from "@repo/web-shared/lib";

import type { CategoryKey, GoalClock, HouseholdTrack } from "./types";

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
  notCurrent: "지난 달은 실제로 쓴 돈만 보여요",
  trackTitle: "지난달 같은 날 본 구간",
  trackHit: (low: string, high: string, actual: string) => `${low} ~ ${high} 였고, 실제로 ${actual} — 구간 안이었어요`,
  trackMiss: (low: string, high: string, actual: string) => `${low} ~ ${high} 였고, 실제로 ${actual} — 구간 밖이었어요`,
  trackReason: {
    not_issued: "지난달 이맘때 낸 구간이 없어요",
    history_short: "지난달 이맘때는 기록이 짧아 구간을 내지 않았어요",
  } as Readonly<Record<string, string>>,
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
