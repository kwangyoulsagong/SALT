import { labelOr } from "@repo/web-shared/lib";

import { GOAL_MESSAGES } from "../model/messages";

/** 도달 한 줄이 읽는 칸 — 목록 · 저울 · 요약 띠의 구간 모양이 같다 */
export interface ReachLike {
  earlyMonth: string | null;
  lateMonth: string | null;
  planMonth: string | null;
  reason: string | null;
}

/**
 * 도달 한 줄 — 구간이 있으면 구간, 이른 끝만 있으면 "빠르면 …", 없으면 "계획대로면 X월", 그것도 없으면 이유(한 점 날짜를 단정하지 않는다, `FE-REQ-056` FR-5).
 * 달 글자만 바꾼다 — 날짜 계산 0. 목록 행 · 요약 띠 · 저울이 같이 쓴다
 */
export const reachText = (p: ReachLike): string => {
  if (p.earlyMonth && p.lateMonth) return GOAL_MESSAGES.projection.range(p.earlyMonth, p.lateMonth);
  if (p.earlyMonth) return GOAL_MESSAGES.projection.openLate(p.earlyMonth);
  if (p.planMonth) return GOAL_MESSAGES.projection.plan(p.planMonth);
  return labelOr(GOAL_MESSAGES.projectionReason, p.reason, "—");
};
