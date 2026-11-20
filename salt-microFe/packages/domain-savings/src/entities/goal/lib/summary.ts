import type { SummaryBandItem } from "@repo/ui/summaryBand";

import { formatWon } from "../model/messages";
import type { SavingsOverview } from "../model/types";
import { reachText } from "./reachText";

/** 저축 요약 칸 문구 — 데스크톱 띠(`/goals`)와 휴대폰 요약(`/m/goals`)이 같은 말 */
export const GOAL_SUMMARY_MESSAGES = {
  label: "저축 요약",
  saved: "모은 돈",
  savedHint: (goals: number) => `목표 ${goals}개`,
  month: (month: string) => `${Number(month.slice(5, 7))}월에 넣은 돈`,
  active: "진행 중 목표",
  activeValue: (n: number) => `${n}개`,
  nearest: "가장 가까운 도달",
  none: "—",
  /** 띠 칸 하나만 실패 — 그 칸만(`FE-REQ-060` FR-13 `degraded`) */
  failed: "불러오지 못했어요",
} as const;

const S = GOAL_SUMMARY_MESSAGES;

/**
 * 저축 요약 칸(`FE-REQ-060` FR-2 · `FE-REQ-072` FR-2) — 값은 서버 `overview` 그대로(합산 0). 주인공은 모은 돈 하나.
 * 데스크톱은 `SummaryBand` 타일, 휴대폰은 `MobileSummary` 큰 숫자 한 줄 — 같은 칸 · 같은 값
 */
export const goalSummaryItems = (o: SavingsOverview): SummaryBandItem[] => [
  { key: "saved", label: S.saved, value: formatWon(o.totalSaved ?? 0), hint: S.savedHint(o.totalGoals), hero: true },
  { key: "month", label: S.month(o.month), value: formatWon(o.monthDeposited) },
  { key: "active", label: S.active, value: S.activeValue(o.activeGoals) },
  {
    key: "nearest",
    label: S.nearest,
    value: o.nearestReach ? reachText(o.nearestReach.projection) : S.none,
    hint: o.nearestReach?.title,
  },
];

/** 띠 실패 — 띠 자리를 지키고 그 칸만 한 줄(FR-13). 휴대폰은 주인공을 빼고 그린다 — 실패 문장을 30 큰 숫자로 보이지 않는다 */
export const GOAL_SUMMARY_FAILED: SummaryBandItem[] = [{ key: "saved", label: S.saved, value: S.failed, hero: true }];
