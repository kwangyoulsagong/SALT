import { PLAN_ERROR_CODE } from "@/entities/plan";

/** 적립 완료 체크 문구 — 사실만(칭찬 · 재촉 0, `FE-REQ-022` FR-54) */
export const COMPLETE_PLAN_MESSAGES = {
  heading: "이번 주 적립 기록",
  what: "실제로 넣은 금액을 적어요. 비우면 계획 금액으로 적어요. 주문은 하지 않아요.",
  amountLabel: (asset: string) => `${asset} 넣은 금액(원)`,
  submit: "이번 주 적립 완료",
  update: "적은 금액 고치기",
  done: "이번 주 적립을 기록했어요",
  failed: {
    [PLAN_ERROR_CODE.executionInvalid]: "적을 수 있는 금액 범위를 넘었어요. 금액을 줄여 다시 적어 주세요.",
    [PLAN_ERROR_CODE.weekNotCurrent]: "주가 바뀌었어요. 새 주 계획을 다시 불러왔어요.",
    [PLAN_ERROR_CODE.notConfigured]: "월 적립액을 먼저 정해 주세요.",
  } as Record<string, string>,
  failedOther: "기록하지 못했어요. 잠시 뒤 다시 눌러 주세요.",
} as const;
