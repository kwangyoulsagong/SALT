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
  scene: {
    /** 장면 옆 글 — 그래픽은 aria-hidden 이라 진척을 글로도(FEATURE-012 접근성) */
    progress: (step: number, steps: number) => `${steps}칸 중 ${step}칸`,
  },
  stamps: {
    title: "도장판",
    count: (n: number) => `도장 ${n}개`,
    first: "첫 도장 — 목표를 만든 날",
  },
  unitLine: (name: string, count: number) => `모은 돈 = ${name} ${count}개`,
  postcard: {
    title: "엽서 보관함",
    line: (days: number, deposits: number) => `${days}일 · 적립 ${deposits}번`,
    period: (from: string, to: string) => `${from} → ${to}`,
    empty: "목표 금액에 닿은 목표가 생기면 여기에 엽서가 남아요",
  },
  missed: {
    title: "넣지 않은 달",
    none: (observed: number) => (observed === 0 ? "아직 다 지난 달이 없어요" : `지난 ${observed}개월 동안 매달 넣었어요`),
    skipped: (skipped: number, observed: number) => `지난 ${observed}개월 중 ${skipped}개월은 넣지 않았어요`,
    shift: (months: number) => (months === 0 ? "계획대로면 도달 월은 그대로예요" : `그 달들에 계획만큼 넣었다면 ${months}개월 빨랐어요`),
  },
  calculationState: {
    ok: "",
    reached: "이미 목표 금액에 닿았어요",
    deadline_too_close: "기한이 이번 달이거나 지났어요. 다음 달 이후 날짜에서 계산돼요",
    not_reachable: "이 월 적립으로는 100년 안에 닿지 않아요",
  } satisfies Record<CalculationState, string>,
} as const;
