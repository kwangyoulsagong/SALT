import { Text } from "@repo/ui/text";

import { won } from "../lib/format";
import { PLAN_MESSAGES as M } from "../model/messages";
import type { WeeklyPlanVM } from "../model/types";
import { assetLine, assetLines, stack, total } from "./plan.css";

/**
 * 이번 주 총액 하나 + 자산별 한 줄(`FE-REQ-022` FR-1 · 2). 금액은 서버가 1,000원 단위로 반올림한 값 그대로 — 더하지 않는다(총액도 서버 값).
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
      <ul className={assetLines}>
        {plan.items.map((item) => (
          <li key={item.asset} className={assetLine}>
            <span>{M.asset[item.asset]}</span>
            <span>{item.amountKrw === null ? "—" : M.amount(won(item.amountKrw))}</span>
          </li>
        ))}
      </ul>
      {provisional ? (
        <Text variant="caption" color="tertiary">
          {M.provisional}
        </Text>
      ) : null}
    </div>
  );
};
