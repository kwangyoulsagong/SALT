import { Text } from "@repo/ui/text";

import { won } from "../lib/format";
import { PLAN_MESSAGES as M } from "../model/messages";
import type { WeeklyPlanVM } from "../model/types";
import { stack, total } from "./plan.css";

/**
 * 이번 주 총액 하나(`FE-REQ-022` FR-1 · 2). 금액은 서버가 1,000원 단위로 반올림한 값 그대로 — 더하지 않는다(총액도 서버 값).
 * 자산별 금액은 바로 아래 자산 카드의 분해 줄에만 둔다 — 같은 숫자를 두 번 쓰지 않는다(`screen-desktop.md` §5)
 * 아직 굳지 않은 주(예측 회차 전)는 "잠정"을 같이 쓴다
 */
export const PlanTotal = ({ plan }: { plan: WeeklyPlanVM }) => {
  if (plan.totalKrw === null) return null;
  const provisional = plan.items.some((i) => !i.fixed);
  return (
    <div className={stack}>
      <Text color="tertiary">
        {M.totalLabel} · {M.weekOf(plan.weekOf)}
      </Text>
      <p className={total} aria-label={M.totalAria(won(plan.totalKrw))}>
        {M.amount(won(plan.totalKrw))}
      </p>
      {provisional ? (
        <Text variant="caption" color="tertiary">
          {M.provisional}
        </Text>
      ) : null}
    </div>
  );
};
