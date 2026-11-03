import { formatPrice } from "@repo/web-shared/lib";

import type { CalculationState, GoalTemplateKey, MilestoneState, ProjectionReason } from "./types";

/**
 * 저축 문구 — **사실만 말한다.** 칭찬 · 재촉 · 명령형 0(`FE-REQ-056` 수용 기준 2 · FEATURE-012 정책). 상태 키 → 문장은 여기 한 곳.
 * 한 점 날짜를 단정하지 않는다 — 구간이 없으면 "계획대로면"을 붙인다(FR-5).
 */
export const TEMPLATE_LABEL: Readonly<Record<GoalTemplateKey, string>> = {
  wedding: "결혼",
  housing: "주거",
  first_car: "첫 차",
  travel: "여행",
  emergency: "비상금",
  childbirth: "출산",
  other: "기타",
};

/** 원 단위 표시 — 서버 금액의 포맷만(계산 0). 저축 화면의 금액 표기는 이 한 곳(코드 리뷰 2026-11-03: 4파일에 '원' 이 흩어져 있었다) */
export const formatWon = (value: number): string => `${formatPrice(value)}원`;

/** "2027-11" → "2027년 11월" — 글자만 바꾼다(날짜 계산 0) */
export const formatMonth = (yearMonth: string): string => {
  const [year, month] = yearMonth.split("-");
  return `${year}년 ${Number(month)}월`;
};

export const GOAL_MESSAGES = {
  loadFailed: "목표를 불러오지 못했어요",
  saved: "모은 돈",
  remaining: "남은 돈",
  target: "목표 금액",
  monthlyPlan: "월 계획",
  depositCount: (n: number) => `적립 ${n}회`,
  baselineUnverified: "기준 금액은 원문을 확인하기 전이라 비워 두었어요",
  completed: "목표 금액에 닿았어요",
  milestone: {
    title: (month: string) => `${formatMonth(month)} 이정표`,
    deposited: "넣은 돈",
    plan: "계획",
    difference: "차이",
  },
  milestoneState: {
    no_plan: "월 계획이 없어 비교하지 않아요",
    under_plan: "계획보다 적게 넣었어요",
    plan_met: "계획만큼 넣었어요",
    reached: "목표 금액에 닿아 계획과 비교하지 않아요",
  } satisfies Record<MilestoneState, string>,
  projection: {
    title: "도달 시점",
    range: (early: string, late: string) => `${formatMonth(early)} ~ ${formatMonth(late)}`,
    openLate: (early: string) => `빠르면 ${formatMonth(early)}, 늦은 쪽은 정할 수 없어요`,
    plan: (month: string) => `계획대로면 ${formatMonth(month)}`,
    basis: (months: number) => `지난 ${months}개월 적립 기록의 10 · 90% 구간`,
    trackPending: "이 구간이 맞았는지는 3개월 뒤부터 쌓여요",
  },
  projectionReason: {
    history_short: "다 찬 달 기록이 3개월이 안 돼 구간 대신 계획만 보여 줘요",
    reached: "이미 목표 금액에 닿았어요",
    slow_side_open: "적립하지 않은 달이 있어 늦은 쪽 끝을 정할 수 없어요",
    no_plan: "월 계획이 없어 계산할 수 없어요",
    degraded: "지금은 구간을 계산하지 못해 계획값만 보여 줘요. 기록은 그대로예요",
  } satisfies Record<ProjectionReason, string>,
  calculationState: {
    ok: "",
    reached: "이미 목표 금액에 닿았어요",
    deadline_too_close: "기한이 이번 달이거나 지났어요. 다음 달 이후 날짜에서 계산돼요",
    not_reachable: "이 월 적립으로는 100년 안에 닿지 않아요",
  } satisfies Record<CalculationState, string>,
} as const;
