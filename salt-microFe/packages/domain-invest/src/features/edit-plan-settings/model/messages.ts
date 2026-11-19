import { PLAN_ERROR_CODE } from "@/entities/plan";

/** 월 적립액 설정 문구 — 칸은 하나(밴드는 읽기 전용, D9) */
export const PLAN_SETTINGS_MESSAGES = {
  heading: "월 적립액",
  label: "한 달에 넣을 금액(원)",
  save: "저장",
  saveFirst: "이번 주 계획 만들기",
  current: (amount: string) => `지금 ${amount}원`,
  pending: (amount: string, week: string) => `${amount}원은 ${week} 주부터 반영돼요`,
  savedNextWeek: "저장했어요. 다음 주 계획부터 반영돼요",
  savedFirst: "저장했어요. 이번 주 계획이 나왔어요",
  allocation: (asset: string, pct: number, weekly: string | null) =>
    weekly === null ? `${asset} ${pct}%` : `${asset} ${pct}% · 주간 기본 ${weekly}원`,
  allocationNote: "나누는 비율과 밴드 표는 바꿀 수 없어요 — 과거 성적이 이 기본값으로 계산됐어요",
  invalid: (min: string, max: string, unit: string) => `${min}원부터 ${max}원까지, ${unit}원 단위로 적어 주세요`,
  failed: {
    [PLAN_ERROR_CODE.bandReadOnly]: "밴드 표는 바꿀 수 없어요",
  } as Record<string, string>,
  failedOther: "저장하지 못했어요. 잠시 뒤 다시 눌러 주세요.",
} as const;
