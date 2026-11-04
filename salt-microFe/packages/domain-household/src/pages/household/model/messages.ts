import { privatePageMetadata } from "@repo/web-shared/config";

/** 가계부 화면 문구 — 사실만 */
export const HOUSEHOLD_PAGE = {
  title: "가계부",
  description: "적은 지출로 이번 달이 어디쯤 닿을지 서버가 계산해요. 예산은 막지 않아요",
  add: "지출 적기",
  budget: "예산",
  recurring: "매달 나가는 돈",
  challenges: "챌린지",
  blockName: "가계부",
  emptyTitle: "이 달에 적은 지출이 없어요",
  emptyDescription: "금액부터 적으면 돼요. 결제 문자를 붙여넣어도 돼요",
  prev: "이전 달",
  next: "다음 달",
  current: "이번 달",
} as const;

/** 내 지출이 보이는 화면 — 검색에 싣지 않는다 */
export const metadata = privatePageMetadata("가계부");
